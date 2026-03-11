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
import { createProtectedRoute } from '@/lib/api/middleware';
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
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const { conversationId } = await context.params;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const cursor = searchParams.get('cursor') || undefined;
    const direction = (searchParams.get('direction') || 'before') as 'before' | 'after';

    const userId = context.user?.id;
    const isPatient = context.user?.role === 'PATIENT';

    const patientIdForQuery = isPatient ? userId : conversationId;

    const result = await fetchPaginatedMessages(patientIdForQuery, {
      limit,
      cursor,
      direction,
    });

    const unreadCount = await prisma.message.count({
      where: {
        patientId: patientIdForQuery,
        toUserId: userId,
        readAt: null,
        archivedAt: null,
      },
    });

    await createAuditLog({
      action: 'READ',
      resource: 'Message',
      resourceId: patientIdForQuery,
      details: {
        patientId: patientIdForQuery,
        conversationId,
        messagesCount: result.messages.length,
        accessType: isPatient ? 'PATIENT_MESSAGE_CONVERSATION_DETAIL' : 'MESSAGE_CONVERSATION_DETAIL',
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
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN', 'NURSE', 'STAFF'],
    allowPatientAuth: true,
    skipCsrf: true,
  }
);

/**
 * PATCH - Mark all messages in conversation as read
 */
export const PATCH = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const { conversationId } = await context.params;
    const readAt = new Date();

    const userId = context.user?.id;
    const isPatient = context.user?.role === 'PATIENT';
    const patientIdForQuery = isPatient ? userId : conversationId;

    const unreadMessages = await prisma.message.findMany({
      where: {
        patientId: patientIdForQuery,
        toUserId: userId,
        readAt: null,
      },
      select: { id: true, fromUserId: true, fromUserType: true },
    });

    const messageIds = unreadMessages.map((m) => m.id);

    if (messageIds.length > 0) {
      await prisma.message.updateMany({
        where: { id: { in: messageIds } },
        data: { readAt },
      });

      emitReadReceipt({
        conversationId: patientIdForQuery,
        readerId: userId,
        readerType: isPatient ? 'PATIENT' : 'CLINICIAN',
        messageIds,
        readAt,
      });

      emitUnreadCountUpdate(userId, isPatient ? 'PATIENT' : 'CLINICIAN', patientIdForQuery, 0);

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
      userId,
      userType: isPatient ? 'patient' : 'clinician',
      conversationId,
      messagesMarked: messageIds.length,
    });

    await createAuditLog({
      action: 'UPDATE',
      resource: 'Message',
      resourceId: patientIdForQuery,
      details: {
        patientId: patientIdForQuery,
        conversationId,
        action: 'mark_conversation_read',
        messagesMarked: messageIds.length,
        accessType: isPatient ? 'PATIENT_MESSAGE_MARK_READ' : 'MESSAGE_MARK_READ',
      },
      success: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Conversación marcada como leída',
      data: { messagesMarked: messageIds.length },
    });
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN', 'NURSE', 'STAFF'],
    allowPatientAuth: true,
    skipCsrf: true,
  }
);
