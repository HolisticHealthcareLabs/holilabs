/**
 * Conversation Detail API
 *
 * GET /api/conversations/[id] - Get conversation with messages (cursor pagination)
 * PATCH /api/conversations/[id] - Update conversation (archive, mute, pin)
 * DELETE /api/conversations/[id] - Leave conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { requirePatientSession } from '@/lib/auth/patient-session';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { checkRateLimit } from '@/lib/rate-limit';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * GET - Get conversation details with paginated messages
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitError = await checkRateLimit(request, 'api');
    if (rateLimitError) return rateLimitError;

    const { id: conversationId } = await context.params;
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const cursor = searchParams.get('cursor');
    const direction = searchParams.get('direction') || 'before'; // 'before' or 'after'

    // Determine user identity
    const clinicianSession = await auth();
    let userId: string;
    let userType: 'CLINICIAN' | 'PATIENT';

    if (clinicianSession?.user?.id) {
      userId = clinicianSession.user.id;
      userType = 'CLINICIAN';
    } else {
      try {
        const patientSession = await requirePatientSession();
        userId = patientSession.patientId;
        userType = 'PATIENT';
      } catch {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

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
  } catch (error) {
    logger.error({
      event: 'get_conversation_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { success: false, error: 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update conversation settings for the user
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitError = await checkRateLimit(request, 'api');
    if (rateLimitError) return rateLimitError;

    const { id: conversationId } = await context.params;
    const body = await request.json();
    const { isMuted, isPinned, isArchived } = body;

    // Determine user identity
    const clinicianSession = await auth();
    let userId: string;
    let userType: 'CLINICIAN' | 'PATIENT';

    if (clinicianSession?.user?.id) {
      userId = clinicianSession.user.id;
      userType = 'CLINICIAN';
    } else {
      try {
        const patientSession = await requirePatientSession();
        userId = patientSession.patientId;
        userType = 'PATIENT';
      } catch {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

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
  } catch (error) {
    logger.error({
      event: 'update_conversation_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { success: false, error: 'Failed to update conversation' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Leave conversation (soft delete participant)
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitError = await checkRateLimit(request, 'api');
    if (rateLimitError) return rateLimitError;

    const { id: conversationId } = await context.params;

    // Determine user identity
    const clinicianSession = await auth();
    let userId: string;
    let userType: 'CLINICIAN' | 'PATIENT';

    if (clinicianSession?.user?.id) {
      userId = clinicianSession.user.id;
      userType = 'CLINICIAN';
    } else {
      try {
        const patientSession = await requirePatientSession();
        userId = patientSession.patientId;
        userType = 'PATIENT';
      } catch {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

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
  } catch (error) {
    logger.error({
      event: 'leave_conversation_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { success: false, error: 'Failed to leave conversation' },
      { status: 500 }
    );
  }
}
