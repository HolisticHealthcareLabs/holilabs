/**
 * Conversation Messages API
 *
 * GET /api/messages/[conversationId] - Get messages for a conversation
 * PATCH /api/messages/[conversationId] - Mark conversation as read
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { requirePatientSession } from '@/lib/auth/patient-session';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * GET - Get all messages for a conversation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const { conversationId } = params;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100');

    // Check if it's a clinician or patient request
    const clinicianSession = await getServerSession(authOptions);

    if (clinicianSession?.user?.id) {
      // Get messages for this patient (conversationId is patientId for clinicians)
      const messages = await prisma.message.findMany({
        where: {
          patientId: conversationId,
          archivedAt: null,
        },
        include: {
          patient: true,
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
      });

      // HIPAA Audit Log: Clinician accessed patient messages
      await createAuditLog({
        userId: clinicianSession.user.id,
        userEmail: clinicianSession.user.email || 'unknown',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        action: 'READ',
        resource: 'Message',
        resourceId: conversationId,
        details: {
          patientId: conversationId,
          messagesCount: messages.length,
          accessType: 'MESSAGE_CONVERSATION_DETAIL',
        },
        success: true,
      });

      return NextResponse.json({
        success: true,
        data: { messages },
      });
    }

    // Try patient session
    try {
      const patientSession = await requirePatientSession();

      // Get messages between patient and their clinician (conversationId is clinicianId)
      const messages = await prisma.message.findMany({
        where: {
          patientId: patientSession.patientId,
          archivedAt: null,
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
      });

      // HIPAA Audit Log: Patient accessed their messages
      await createAuditLog({
        userId: patientSession.patientId,
        userEmail: patientSession.email || 'patient@portal.access',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        action: 'READ',
        resource: 'Message',
        resourceId: patientSession.patientId,
        details: {
          patientId: patientSession.patientId,
          conversationId,
          messagesCount: messages.length,
          accessType: 'PATIENT_MESSAGE_CONVERSATION_DETAIL',
        },
        success: true,
      });

      return NextResponse.json({
        success: true,
        data: { messages },
      });
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }
  } catch (error) {
    logger.error({
      event: 'get_conversation_messages_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      conversationId: params.conversationId,
    });

    return NextResponse.json(
      { success: false, error: 'Error al obtener mensajes' },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Mark all messages in conversation as read
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const { conversationId } = params;

    // Check if it's a clinician or patient request
    const clinicianSession = await getServerSession(authOptions);

    if (clinicianSession?.user?.id) {
      // Mark messages from this patient as read
      await prisma.message.updateMany({
        where: {
          patientId: conversationId,
          toUserId: clinicianSession.user.id,
          readAt: null,
        },
        data: {
          readAt: new Date(),
        },
      });

      logger.info({
        event: 'conversation_marked_read',
        userId: clinicianSession.user.id,
        userType: 'clinician',
        conversationId,
      });

      // HIPAA Audit Log: Clinician marked conversation as read
      await createAuditLog({
        userId: clinicianSession.user.id,
        userEmail: clinicianSession.user.email || 'unknown',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        action: 'UPDATE',
        resource: 'Message',
        resourceId: conversationId,
        details: {
          patientId: conversationId,
          action: 'mark_conversation_read',
          accessType: 'MESSAGE_MARK_READ',
        },
        success: true,
      });

      return NextResponse.json({
        success: true,
        message: 'Conversación marcada como leída',
      });
    }

    // Try patient session
    try {
      const patientSession = await requirePatientSession();

      // Mark messages from clinician as read
      await prisma.message.updateMany({
        where: {
          patientId: patientSession.patientId,
          toUserId: patientSession.patientId,
          readAt: null,
        },
        data: {
          readAt: new Date(),
        },
      });

      logger.info({
        event: 'conversation_marked_read',
        patientId: patientSession.patientId,
        userType: 'patient',
        conversationId,
      });

      // HIPAA Audit Log: Patient marked conversation as read
      await createAuditLog({
        userId: patientSession.patientId,
        userEmail: patientSession.email || 'patient@portal.access',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        action: 'UPDATE',
        resource: 'Message',
        resourceId: patientSession.patientId,
        details: {
          patientId: patientSession.patientId,
          conversationId,
          action: 'mark_conversation_read',
          accessType: 'PATIENT_MESSAGE_MARK_READ',
        },
        success: true,
      });

      return NextResponse.json({
        success: true,
        message: 'Conversación marcada como leída',
      });
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }
  } catch (error) {
    logger.error({
      event: 'mark_conversation_read_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      conversationId: params.conversationId,
    });

    return NextResponse.json(
      { success: false, error: 'Error al marcar conversación como leída' },
      { status: 500 }
    );
  }
}
