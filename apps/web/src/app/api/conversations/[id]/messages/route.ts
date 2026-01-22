/**
 * Conversation Messages API
 *
 * POST /api/conversations/[id]/messages - Send a message in a conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { requirePatientSession } from '@/lib/auth/patient-session';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { checkRateLimit } from '@/lib/rate-limit';
import { createAuditLog } from '@/lib/audit';
import { getSocketServer } from '@/lib/socket-server';

export const dynamic = 'force-dynamic';

/**
 * POST - Send a message in a conversation
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitError = await checkRateLimit(request, 'api');
    if (rateLimitError) return rateLimitError;

    const { id: conversationId } = await context.params;
    const body = await request.json();
    const { content, messageType = 'TEXT', attachments, replyToId } = body;

    if (!content?.trim() && !attachments?.length) {
      return NextResponse.json(
        { success: false, error: 'Message content or attachments required' },
        { status: 400 }
      );
    }

    // Determine sender identity
    const clinicianSession = await auth();
    let senderId: string;
    let senderType: 'CLINICIAN' | 'PATIENT';
    let senderName: string;

    if (clinicianSession?.user?.id) {
      senderId = clinicianSession.user.id;
      senderType = 'CLINICIAN';

      const clinician = await prisma.user.findUnique({
        where: { id: senderId },
        select: { firstName: true, lastName: true },
      });
      senderName = `Dr. ${clinician?.firstName || ''} ${clinician?.lastName || ''}`.trim();
    } else {
      try {
        const patientSession = await requirePatientSession();
        senderId = patientSession.patientId;
        senderType = 'PATIENT';

        const patient = await prisma.patient.findUnique({
          where: { id: senderId },
          select: { firstName: true, lastName: true },
        });
        senderName = `${patient?.firstName || ''} ${patient?.lastName || ''}`.trim();
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
        userId: senderId,
        userType: senderType,
        isActive: true,
      },
    });

    if (!participant) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found or access denied' },
        { status: 404 }
      );
    }

    // Validate replyToId if provided
    if (replyToId) {
      const replyMessage = await prisma.conversationMessage.findFirst({
        where: { id: replyToId, conversationId },
      });
      if (!replyMessage) {
        return NextResponse.json(
          { success: false, error: 'Reply message not found' },
          { status: 400 }
        );
      }
    }

    // Create message and update conversation in transaction
    const [message, _conversation] = await prisma.$transaction([
      prisma.conversationMessage.create({
        data: {
          conversationId,
          senderId,
          senderType,
          content: content?.trim() || '',
          messageType,
          attachments: attachments || null,
          replyToId: replyToId || null,
          deliveredAt: new Date(),
        },
        include: {
          replyTo: {
            select: {
              id: true,
              content: true,
              senderId: true,
              senderType: true,
            },
          },
        },
      }),
      prisma.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: new Date(),
          lastMessageText: content?.substring(0, 255) || '[Attachment]',
        },
      }),
    ]);

    // Increment unread count for all other participants
    await prisma.conversationParticipant.updateMany({
      where: {
        conversationId,
        isActive: true,
        NOT: {
          AND: {
            userId: senderId,
            userType: senderType,
          },
        },
      },
      data: {
        unreadCount: { increment: 1 },
      },
    });

    // Get other participants for Socket.IO notification
    const otherParticipants = await prisma.conversationParticipant.findMany({
      where: {
        conversationId,
        isActive: true,
        NOT: {
          AND: {
            userId: senderId,
            userType: senderType,
          },
        },
      },
      select: {
        userId: true,
        userType: true,
      },
    });

    // Emit Socket.IO event
    try {
      const io = getSocketServer();
      if (io) {
        const messagePayload = {
          id: message.id,
          conversationId,
          senderId,
          senderType,
          senderName,
          content: message.content,
          messageType: message.messageType,
          attachments: message.attachments,
          replyTo: message.replyTo,
          deliveredAt: message.deliveredAt,
          createdAt: message.createdAt,
        };

        // Emit to conversation room
        io.to(`conversation:${conversationId}`).emit('new_message', messagePayload);

        // Also emit to individual user rooms for participants not in the conversation room
        for (const p of otherParticipants) {
          const userRoom = p.userType === 'CLINICIAN' ? `user:${p.userId}` : `patient:${p.userId}`;
          io.to(userRoom).emit('conversation_update', {
            conversationId,
            lastMessageAt: new Date(),
            lastMessageText: content?.substring(0, 255) || '[Attachment]',
            hasNewMessage: true,
          });
        }
      }
    } catch (socketError) {
      // Don't fail the request if Socket.IO fails
      logger.warn({
        event: 'socket_emit_failed',
        conversationId,
        messageId: message.id,
        error: socketError instanceof Error ? socketError.message : 'Unknown error',
      });
    }

    logger.info({
      event: 'message_sent',
      conversationId,
      messageId: message.id,
      senderId,
      senderType,
      messageType,
    });

    await createAuditLog({
      action: 'CREATE',
      resource: 'ConversationMessage',
      resourceId: message.id,
      details: {
        conversationId,
        messageId: message.id,
        senderId,
        senderType,
        messageType,
        hasAttachments: !!attachments?.length,
        accessType: 'MESSAGE_SEND',
      },
      success: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        message: {
          id: message.id,
          conversationId: message.conversationId,
          senderId: message.senderId,
          senderType: message.senderType,
          senderName,
          content: message.content,
          messageType: message.messageType,
          attachments: message.attachments,
          replyTo: message.replyTo,
          deliveredAt: message.deliveredAt,
          createdAt: message.createdAt,
        },
      },
    });
  } catch (error) {
    logger.error({
      event: 'send_message_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { success: false, error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
