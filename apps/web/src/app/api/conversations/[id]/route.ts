/**
 * Conversation Detail API
 *
 * GET /api/conversations/[id] - Get conversation with messages (cursor pagination)
 * PATCH /api/conversations/[id] - Update conversation (archive, mute, pin)
 * DELETE /api/conversations/[id] - Leave conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { checkRateLimit } from '@/lib/rate-limit';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * GET - Get conversation details with paginated messages
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const rateLimitError = await checkRateLimit(request, 'api');
    if (rateLimitError) return rateLimitError;

    const { id: conversationId } = await context.params;
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const cursor = searchParams.get('cursor');
    const direction = searchParams.get('direction') || 'before'; // 'before' or 'after'

    const userId = context.user?.id;
    const userType = context.user?.role === 'PATIENT' ? 'PATIENT' : 'CLINICIAN';

    // Verify user is a participant
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId,
        userType,
        isActive: true,
      },
    });

    if (!participant) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found or access denied' },
        { status: 404 }
      );
    }

    // Get conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        participants: {
          where: { isActive: true },
          select: {
            id: true,
            userId: true,
            userType: true,
            displayName: true,
            isOnline: true,
            lastSeenAt: true,
            unreadCount: true,
            isMuted: true,
            isPinned: true,
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Build message query with cursor pagination
    const messageWhereClause: any = { conversationId };

    if (cursor) {
      const cursorMessage = await prisma.conversationMessage.findUnique({
        where: { id: cursor },
        select: { createdAt: true },
      });

      if (cursorMessage) {
        messageWhereClause.createdAt = direction === 'before'
          ? { lt: cursorMessage.createdAt }
          : { gt: cursorMessage.createdAt };
      }
    }

    const messages = await prisma.conversationMessage.findMany({
      where: messageWhereClause,
      include: {
        readReceipts: {
          select: {
            readerId: true,
            readerType: true,
            readAt: true,
          },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            senderId: true,
            senderType: true,
          },
        },
      },
      orderBy: { createdAt: direction === 'before' ? 'desc' : 'asc' },
      take: limit + 1,
    });

    // Check pagination
    const hasMore = messages.length > limit;
    const results = hasMore ? messages.slice(0, limit) : messages;

    // Reverse if fetching before (we want oldest to newest for display)
    if (direction === 'before') {
      results.reverse();
    }

    const nextCursor = hasMore
      ? direction === 'before'
        ? results[0]?.id
        : results[results.length - 1]?.id
      : null;

    // Transform messages with read status
    const transformedMessages = results.map((msg) => ({
      id: msg.id,
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      senderType: msg.senderType,
      content: msg.content,
      messageType: msg.messageType,
      attachments: msg.attachments,
      replyTo: msg.replyTo,
      deliveredAt: msg.deliveredAt,
      isEdited: msg.isEdited,
      editedAt: msg.editedAt,
      isDeleted: msg.isDeleted,
      createdAt: msg.createdAt,
      // Read status for current user
      isReadByMe: msg.readReceipts.some(
        (r) => r.readerId === userId && r.readerType === userType
      ),
      // Read receipts for sender to see who read their message
      readBy: msg.senderId === userId && msg.senderType === userType
        ? msg.readReceipts.map((r) => ({
            readerId: r.readerId,
            readerType: r.readerType,
            readAt: r.readAt,
          }))
        : undefined,
    }));

    // Update last seen
    await prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: { lastSeenAt: new Date() },
    });

    await createAuditLog({
      action: 'READ',
      resource: 'Conversation',
      resourceId: conversationId,
      details: {
        conversationId,
        userId,
        userType,
        messagesCount: results.length,
        accessType: 'CONVERSATION_DETAIL',
      },
      success: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        conversation: {
          id: conversation.id,
          patientId: conversation.patientId,
          patientName: `${conversation.patient.firstName} ${conversation.patient.lastName}`,
          title: conversation.title,
          isArchived: conversation.isArchived,
          createdAt: conversation.createdAt,
          participants: conversation.participants,
        },
        messages: transformedMessages,
        pagination: {
          hasMore,
          nextCursor,
          direction,
        },
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
 * PATCH - Update conversation settings for the user
 */
export const PATCH = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const rateLimitError = await checkRateLimit(request, 'api');
    if (rateLimitError) return rateLimitError;

    const { id: conversationId } = await context.params;
    const body = await request.json();
    const { isMuted, isPinned, isArchived } = body;

    const userId = context.user?.id;
    const userType = context.user?.role === 'PATIENT' ? 'PATIENT' : 'CLINICIAN';

    // Find participant record
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId,
        userType,
        isActive: true,
      },
    });

    if (!participant) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found or access denied' },
        { status: 404 }
      );
    }

    // Update participant preferences
    const updateData: any = {};
    if (typeof isMuted === 'boolean') updateData.isMuted = isMuted;
    if (typeof isPinned === 'boolean') updateData.isPinned = isPinned;

    if (Object.keys(updateData).length > 0) {
      await prisma.conversationParticipant.update({
        where: { id: participant.id },
        data: updateData,
      });
    }

    // Archive conversation (affects all participants)
    if (typeof isArchived === 'boolean') {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          isArchived,
          archivedAt: isArchived ? new Date() : null,
        },
      });
    }

    logger.info({
      event: 'conversation_updated',
      conversationId,
      userId,
      userType,
      updates: { isMuted, isPinned, isArchived },
    });

    return NextResponse.json({
      success: true,
      data: { updated: true },
    });
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN', 'NURSE', 'STAFF'],
    allowPatientAuth: true,
    skipCsrf: true,
  }
);

/**
 * DELETE - Leave conversation (soft delete participant)
 */
export const DELETE = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const rateLimitError = await checkRateLimit(request, 'api');
    if (rateLimitError) return rateLimitError;

    const { id: conversationId } = await context.params;

    const userId = context.user?.id;
    const userType = context.user?.role === 'PATIENT' ? 'PATIENT' : 'CLINICIAN';

    // Find participant record
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId,
        userType,
        isActive: true,
      },
    });

    if (!participant) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found or access denied' },
        { status: 404 }
      );
    }

    // Soft delete - mark as inactive
    await prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: {
        isActive: false,
        leftAt: new Date(),
      },
    });

    logger.info({
      event: 'conversation_left',
      conversationId,
      userId,
      userType,
    });

    await createAuditLog({
      action: 'DELETE',
      resource: 'ConversationParticipant',
      resourceId: participant.id,
      details: {
        conversationId,
        userId,
        userType,
        accessType: 'CONVERSATION_LEAVE',
      },
      success: true,
    });

    return NextResponse.json({
      success: true,
      data: { left: true },
    });
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN', 'NURSE', 'STAFF'],
    allowPatientAuth: true,
    skipCsrf: true,
  }
);
