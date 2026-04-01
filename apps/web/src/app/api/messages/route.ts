/**
 * Messages API
 *
 * GET /api/messages - Get user's conversations
 * POST /api/messages - Send a new message
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute, verifyPatientAccess } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { emitNewMessage, emitUnreadCountUpdate } from '@/lib/socket-server';
import { notifyNewMessage } from '@/lib/notifications';
import { indexMessage, MessageSearchDocument } from '@/lib/search/meilisearch';
import logger from '@/lib/logger';
import { checkRateLimit } from '@/lib/rate-limit';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * GET - Get conversations for a user
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const rateLimitError = await checkRateLimit(request, 'api');
    if (rateLimitError) return rateLimitError;

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');

    const userId = context.user?.id;
    const isPatient = context.user?.role === 'PATIENT';

    if (isPatient) {
      const messages = await prisma.message.findMany({
        where: {
          patientId: userId,
          archivedAt: null,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      const patient = await prisma.patient.findUnique({
        where: { id: userId },
        include: { assignedClinician: true },
      });

      const conversations = patient?.assignedClinician ? [{
        id: patient.assignedClinicianId,
        clinicianId: patient.assignedClinicianId,
        clinicianName: `Dr. ${patient.assignedClinician.firstName} ${patient.assignedClinician.lastName}`,
        clinicianAvatar: null,
        lastMessage: messages[0]?.body || 'Inicia una conversación',
        lastMessageAt: messages[0]?.createdAt || new Date(),
        unreadCount: messages.filter(m => m.toUserId === userId && !m.readAt).length,
        messages,
      }] : [];

      await createAuditLog({
        action: 'READ',
        resource: 'Message',
        resourceId: userId,
        details: {
          patientId: userId,
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
    }

    // Clinician path
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { fromUserId: userId, fromUserType: 'CLINICIAN' },
          { toUserId: userId, toUserType: 'CLINICIAN' },
        ],
        archivedAt: null,
      },
      include: {
        patient: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

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
      if (message.toUserId === userId && !message.readAt) {
        conversation.unreadCount++;
      }
    }

    const conversations = Array.from(conversationsMap.values());

    await createAuditLog({
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
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN', 'NURSE', 'STAFF'],
    allowPatientAuth: true,
    skipCsrf: true,
  }
);

/**
 * POST - Send a new message
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
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

    const hasAccess = await verifyPatientAccess(context.user!.id, patientId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied: no clinical relationship with this patient' },
        { status: 403 }
      );
    }

    const fromUserId = context.user?.id;
    const fromUserType = context.user?.role === 'PATIENT' ? 'PATIENT' : 'CLINICIAN';
    let fromUserName: string;

    if (fromUserType === 'CLINICIAN') {
      const clinician = await prisma.user.findUnique({
        where: { id: fromUserId },
      });
      fromUserName = `Dr. ${clinician?.firstName || 'Doctor'} ${clinician?.lastName || ''}`;
    } else {
      const patient = await prisma.patient.findUnique({
        where: { id: fromUserId },
      });
      fromUserName = `${patient?.firstName || 'Paciente'} ${patient?.lastName || ''}`;
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

    // Index message in Meilisearch for search
    try {
      const searchDoc: MessageSearchDocument = {
        id: message.id,
        patientId: message.patientId,
        fromUserId,
        fromUserType,
        fromUserName,
        toUserId,
        toUserType,
        body: message.body,
        subject: message.subject,
        hasAttachments: !!(attachments && attachments.length > 0),
        isRead: false,
        createdAt: message.createdAt.getTime(),
      };
      await indexMessage(searchDoc);
    } catch (searchError) {
      // Log but don't fail the request if search indexing fails
      logger.warn({
        event: 'message_search_index_error',
        messageId: message.id,
        error: searchError instanceof Error ? searchError.message : 'Unknown error',
      });
    }

    // Emit real-time notification
    emitNewMessage(message);

    // Emit unread count update to recipient
    const recipientUnreadCount = await prisma.message.count({
      where: {
        patientId,
        toUserId,
        toUserType,
        readAt: null,
        archivedAt: null,
      },
    });
    emitUnreadCountUpdate(toUserId, toUserType, patientId, recipientUnreadCount);

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
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN', 'NURSE', 'STAFF'],
    allowPatientAuth: true,
    skipCsrf: true,
  }
);
