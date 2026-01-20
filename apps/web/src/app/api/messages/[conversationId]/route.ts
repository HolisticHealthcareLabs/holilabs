/**
 * Conversation Messages API
 *
 * GET /api/messages/[conversationId] - Get messages for a conversation (with cursor pagination)
 * PATCH /api/messages/[conversationId] - Mark conversation as read
 *
 * Query Parameters for GET:
 * - limit: Number of messages to fetch (default: 50, max: 100)
 * - cursor: Message ID to start from (for pagination)
 * - direction: 'before' (older) or 'after' (newer) - default: 'before'
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { requirePatientSession } from '@/lib/auth/patient-session';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { emitReadReceipt, emitUnreadCountUpdate } from '@/lib/socket-server';
import { updateMessageIndex } from '@/lib/search/meilisearch';

export const dynamic = 'force-dynamic';

interface PaginatedMessagesResponse {
  messages: any[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
    prevCursor: string | null;
    totalCount?: number;
  };
}

/**
 * Build cursor-based pagination query
 */
async function fetchPaginatedMessages(
  patientId: string,
  options: {
    limit: number;
    cursor?: string;
    direction: 'before' | 'after';
  }
): Promise<PaginatedMessagesResponse> {
  const { limit, cursor, direction } = options;
  const take = Math.min(limit, 100); // Cap at 100

  // Build where clause
  const whereClause: any = {
    patientId,
    archivedAt: null,
  };

  // If cursor provided, add cursor condition
  if (cursor) {
    const cursorMessage = await prisma.message.findUnique({
      where: { id: cursor },
      select: { createdAt: true },
    });

    if (cursorMessage) {
      whereClause.createdAt = direction === 'before'
        ? { lt: cursorMessage.createdAt }
        : { gt: cursorMessage.createdAt };
    }
  }

  // Fetch messages with +1 to determine hasMore
  const messages = await prisma.message.findMany({
    where: whereClause,
    include: {
      patient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { createdAt: direction === 'before' ? 'desc' : 'asc' },
    take: take + 1, // +1 to check if there are more
  });

  // Check if there are more messages
  const hasMore = messages.length > take;
  const resultMessages = hasMore ? messages.slice(0, take) : messages;

  // Reverse if fetching before (to maintain chronological order in response)
  if (direction === 'before') {
    resultMessages.reverse();
  }

  // Determine cursors
  const firstMessage = resultMessages[0];
  const lastMessage = resultMessages[resultMessages.length - 1];

  return {
    messages: resultMessages,
    pagination: {
      hasMore,
      nextCursor: hasMore && lastMessage ? lastMessage.id : null,
      prevCursor: firstMessage ? firstMessage.id : null,
    },
  };
}

/**
 * GET - Get messages for a conversation with cursor-based pagination
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const { conversationId } = params;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const cursor = searchParams.get('cursor') || undefined;
    const direction = (searchParams.get('direction') || 'before') as 'before' | 'after';

    // Check if it's a clinician or patient request
    const clinicianSession = await getServerSession(authOptions);

    if (clinicianSession?.user?.id) {
      // Get messages for this patient (conversationId is patientId for clinicians)
      const result = await fetchPaginatedMessages(conversationId, {
        limit,
        cursor,
        direction,
      });

      // Get unread count for this conversation
      const unreadCount = await prisma.message.count({
        where: {
          patientId: conversationId,
          toUserId: clinicianSession.user.id,
          readAt: null,
          archivedAt: null,
        },
      });

      // HIPAA Audit Log: Clinician accessed patient messages
      await createAuditLog({
        action: 'READ',
        resource: 'Message',
        resourceId: conversationId,
        details: {
          patientId: conversationId,
          messagesCount: result.messages.length,
          accessType: 'MESSAGE_CONVERSATION_DETAIL',
          pagination: { cursor, direction, limit },
        },
        success: true,
      });

      return NextResponse.json({
        success: true,
        data: {
          messages: result.messages,
          pagination: result.pagination,
          unreadCount,
        },
      });
    }

    // Try patient session
    try {
      const patientSession = await requirePatientSession();

      // Get messages between patient and their clinician
      const result = await fetchPaginatedMessages(patientSession.patientId, {
        limit,
        cursor,
        direction,
      });

      // Get unread count for patient
      const unreadCount = await prisma.message.count({
        where: {
          patientId: patientSession.patientId,
          toUserId: patientSession.patientId,
          readAt: null,
          archivedAt: null,
        },
      });

      // HIPAA Audit Log: Patient accessed their messages
      await createAuditLog({
        action: 'READ',
        resource: 'Message',
        resourceId: patientSession.patientId,
        details: {
          patientId: patientSession.patientId,
          conversationId,
          messagesCount: result.messages.length,
          accessType: 'PATIENT_MESSAGE_CONVERSATION_DETAIL',
          pagination: { cursor, direction, limit },
        },
        success: true,
      });

      return NextResponse.json({
        success: true,
        data: {
          messages: result.messages,
          pagination: result.pagination,
          unreadCount,
        },
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
    const readAt = new Date();

    // Check if it's a clinician or patient request
    const clinicianSession = await getServerSession(authOptions);

    if (clinicianSession?.user?.id) {
      // Get unread message IDs before marking as read
      const unreadMessages = await prisma.message.findMany({
        where: {
          patientId: conversationId,
          toUserId: clinicianSession.user.id,
          readAt: null,
        },
        select: { id: true, fromUserId: true, fromUserType: true },
      });

      const messageIds = unreadMessages.map((m) => m.id);

      if (messageIds.length > 0) {
        // Mark messages from this patient as read
        await prisma.message.updateMany({
          where: {
            id: { in: messageIds },
          },
          data: {
            readAt,
          },
        });

        // Emit read receipt to conversation room
        emitReadReceipt({
          conversationId,
          readerId: clinicianSession.user.id,
          readerType: 'CLINICIAN',
          messageIds,
          readAt,
        });

        // Notify each sender that their messages were read
        const senderGroups = unreadMessages.reduce((acc, msg) => {
          const key = `${msg.fromUserType}:${msg.fromUserId}`;
          if (!acc[key]) {
            acc[key] = { userId: msg.fromUserId, userType: msg.fromUserType as 'CLINICIAN' | 'PATIENT' };
          }
          return acc;
        }, {} as Record<string, { userId: string; userType: 'CLINICIAN' | 'PATIENT' }>);

        // Emit unread count update (now 0 for this clinician)
        emitUnreadCountUpdate(
          clinicianSession.user.id,
          'CLINICIAN',
          conversationId,
          0
        );

        // Update search index to mark messages as read
        try {
          await Promise.all(
            messageIds.map((id) => updateMessageIndex({ id, isRead: true }))
          );
        } catch (searchError) {
          logger.warn({
            event: 'message_search_update_error',
            messageIds,
            error: searchError instanceof Error ? searchError.message : 'Unknown error',
          });
        }
      }

      logger.info({
        event: 'conversation_marked_read',
        userId: clinicianSession.user.id,
        userType: 'clinician',
        conversationId,
        messagesMarked: messageIds.length,
      });

      // HIPAA Audit Log: Clinician marked conversation as read
      await createAuditLog({
        action: 'UPDATE',
        resource: 'Message',
        resourceId: conversationId,
        details: {
          patientId: conversationId,
          action: 'mark_conversation_read',
          messagesMarked: messageIds.length,
          accessType: 'MESSAGE_MARK_READ',
        },
        success: true,
      });

      return NextResponse.json({
        success: true,
        message: 'Conversación marcada como leída',
        data: { messagesMarked: messageIds.length },
      });
    }

    // Try patient session
    try {
      const patientSession = await requirePatientSession();

      // Get unread message IDs before marking as read
      const unreadMessages = await prisma.message.findMany({
        where: {
          patientId: patientSession.patientId,
          toUserId: patientSession.patientId,
          readAt: null,
        },
        select: { id: true, fromUserId: true, fromUserType: true },
      });

      const messageIds = unreadMessages.map((m) => m.id);

      if (messageIds.length > 0) {
        // Mark messages from clinician as read
        await prisma.message.updateMany({
          where: {
            id: { in: messageIds },
          },
          data: {
            readAt,
          },
        });

        // Emit read receipt to conversation room
        emitReadReceipt({
          conversationId: patientSession.patientId,
          readerId: patientSession.patientId,
          readerType: 'PATIENT',
          messageIds,
          readAt,
        });

        // Emit unread count update (now 0 for this patient)
        emitUnreadCountUpdate(
          patientSession.patientId,
          'PATIENT',
          patientSession.patientId,
          0
        );

        // Update search index to mark messages as read
        try {
          await Promise.all(
            messageIds.map((id) => updateMessageIndex({ id, isRead: true }))
          );
        } catch (searchError) {
          logger.warn({
            event: 'message_search_update_error',
            messageIds,
            error: searchError instanceof Error ? searchError.message : 'Unknown error',
          });
        }
      }

      logger.info({
        event: 'conversation_marked_read',
        patientId: patientSession.patientId,
        userType: 'patient',
        conversationId,
        messagesMarked: messageIds.length,
      });

      // HIPAA Audit Log: Patient marked conversation as read
      await createAuditLog({
        action: 'UPDATE',
        resource: 'Message',
        resourceId: patientSession.patientId,
        details: {
          patientId: patientSession.patientId,
          conversationId,
          action: 'mark_conversation_read',
          messagesMarked: messageIds.length,
          accessType: 'PATIENT_MESSAGE_MARK_READ',
        },
        success: true,
      });

      return NextResponse.json({
        success: true,
        message: 'Conversación marcada como leída',
        data: { messagesMarked: messageIds.length },
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
