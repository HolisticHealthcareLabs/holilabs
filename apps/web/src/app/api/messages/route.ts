/**
 * Messages API
 *
 * GET /api/messages - Get user's conversations
 * POST /api/messages - Send a new message
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { requirePatientSession } from '@/lib/auth/patient-session';
import { prisma } from '@/lib/prisma';
import { emitNewMessage } from '@/lib/socket-server';
import { notifyNewMessage } from '@/lib/notifications';
import logger from '@/lib/logger';
import { checkRateLimit } from '@/lib/rate-limit';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * GET - Get conversations for a user
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitError = await checkRateLimit(request, 'api');
    if (rateLimitError) return rateLimitError;

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');

    // Check if it's a clinician or patient request
    const clinicianSession = await getServerSession(authOptions);

    if (clinicianSession?.user?.id) {
      // Get clinician's conversations
      const messages = await prisma.message.findMany({
        where: {
          OR: [
            { fromUserId: clinicianSession.user.id, fromUserType: 'CLINICIAN' },
            { toUserId: clinicianSession.user.id, toUserType: 'CLINICIAN' },
          ],
          archivedAt: null,
        },
        include: {
          patient: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      // Group by patient to create conversations
      const conversationsMap = new Map();

      for (const message of messages) {
        const key = message.patientId;

        if (!conversationsMap.has(key)) {
          conversationsMap.set(key, {
            id: key,
            patientId: message.patientId,
            patientName: `${message.patient.firstName} ${message.patient.lastName}`,
            patientAvatar: null,
            lastMessage: message.body,
            lastMessageAt: message.createdAt,
            unreadCount: 0,
            messages: [],
          });
        }

        const conversation = conversationsMap.get(key);
        conversation.messages.push(message);

        // Count unread messages (messages TO the clinician that haven't been read)
        if (message.toUserId === clinicianSession.user.id && !message.readAt) {
          conversation.unreadCount++;
        }
      }

      const conversations = Array.from(conversationsMap.values());

      // HIPAA Audit Log: Clinician accessed patient message conversations
      await createAuditLog({
        userAgent: request.headers.get('user-agent') || 'unknown',
        action: 'READ',
        resource: 'Message',
        resourceId: 'conversations',
        details: {
          conversationsCount: conversations.length,
          messagesCount: messages.length,
          accessType: 'MESSAGE_CONVERSATIONS_LIST',
        },
        success: true,
      });

      return NextResponse.json({
        success: true,
        data: { conversations },
      });
    }

    // Try patient session
    try {
      const patientSession = await requirePatientSession();

      // Get patient's conversations
      const messages = await prisma.message.findMany({
        where: {
          patientId: patientSession.patientId,
          archivedAt: null,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      // For patients, there's typically one conversation with their assigned clinician
      const patient = await prisma.patient.findUnique({
        where: { id: patientSession.patientId },
        include: { assignedClinician: true },
      });

      const conversations = patient?.assignedClinician ? [{
        id: patient.assignedClinicianId,
        clinicianId: patient.assignedClinicianId,
        clinicianName: `Dr. ${patient.assignedClinician.firstName} ${patient.assignedClinician.lastName}`,
        clinicianAvatar: null,
        lastMessage: messages[0]?.body || 'Inicia una conversación',
        lastMessageAt: messages[0]?.createdAt || new Date(),
        unreadCount: messages.filter(m => m.toUserId === patientSession.patientId && !m.readAt).length,
        messages,
      }] : [];

      // HIPAA Audit Log: Patient accessed message conversations
      await createAuditLog({
        userAgent: request.headers.get('user-agent') || 'unknown',
        action: 'READ',
        resource: 'Message',
        resourceId: patientSession.patientId,
        details: {
          patientId: patientSession.patientId,
          conversationsCount: conversations.length,
          messagesCount: messages.length,
          accessType: 'PATIENT_MESSAGE_CONVERSATIONS_LIST',
        },
        success: true,
      });

      return NextResponse.json({
        success: true,
        data: { conversations },
      });
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }
  } catch (error) {
    logger.error({
      event: 'get_messages_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { success: false, error: 'Error al obtener mensajes' },
      { status: 500 }
    );
  }
}

/**
 * POST - Send a new message
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting for message sending
    const rateLimitError = await checkRateLimit(request, 'messages');
    if (rateLimitError) return rateLimitError;

    const body = await request.json();
    const { toUserId, toUserType, patientId, subject, messageBody, attachments } = body;

    if (!toUserId || !toUserType || !patientId || (!messageBody && (!attachments || attachments.length === 0))) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos (mensaje o archivos)' },
        { status: 400 }
      );
    }

    // Check if it's a clinician or patient request
    const clinicianSession = await getServerSession(authOptions);

    let fromUserId: string;
    let fromUserType: 'CLINICIAN' | 'PATIENT';
    let fromUserName: string;

    if (clinicianSession?.user?.id) {
      fromUserId = clinicianSession.user.id;
      fromUserType = 'CLINICIAN';

      const clinician = await prisma.user.findUnique({
        where: { id: fromUserId },
      });
      fromUserName = `Dr. ${clinician?.firstName || 'Doctor'} ${clinician?.lastName || ''}`;
    } else {
      // Try patient session
      try {
        const patientSession = await requirePatientSession();
        fromUserId = patientSession.patientId;
        fromUserType = 'PATIENT';

        const patient = await prisma.patient.findUnique({
          where: { id: fromUserId },
        });
        fromUserName = `${patient?.firstName || 'Paciente'} ${patient?.lastName || ''}`;
      } catch (error) {
        return NextResponse.json(
          { success: false, error: 'No autorizado' },
          { status: 401 }
        );
      }
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        fromUserId,
        fromUserType,
        toUserId,
        toUserType,
        patientId,
        subject: subject || null,
        body: messageBody || '',
        attachments: attachments && attachments.length > 0 ? attachments : null,
      },
      include: {
        patient: true,
      },
    });

    // Emit real-time notification
    emitNewMessage(message);

    // Send notification
    await notifyNewMessage(
      toUserId,
      toUserType === 'CLINICIAN' ? 'CLINICIAN' : 'PATIENT',
      fromUserName,
      message.id
    );

    logger.info({
      event: 'message_sent',
      messageId: message.id,
      fromUserId,
      fromUserType,
      toUserId,
      toUserType,
      patientId,
    });

    // HIPAA Audit Log: Message sent
    await createAuditLog({
      userAgent: request.headers.get('user-agent') || 'unknown',
      action: 'CREATE',
      resource: 'Message',
      resourceId: message.id,
      details: {
        messageId: message.id,
        fromUserId,
        fromUserType,
        toUserId,
        toUserType,
        patientId,
        hasAttachments: attachments && attachments.length > 0,
        accessType: 'MESSAGE_SEND',
      },
      success: true,
    });

    return NextResponse.json({
      success: true,
      data: { message },
    });
  } catch (error) {
    logger.error({
      event: 'send_message_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { success: false, error: 'Error al enviar mensaje' },
      { status: 500 }
    );
  }
}
