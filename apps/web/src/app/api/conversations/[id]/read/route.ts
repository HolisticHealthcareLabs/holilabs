/**
 * Conversation Read Receipts API
 *
 * POST /api/conversations/[id]/read - Mark messages as read
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { requirePatientSession } from '@/lib/auth/patient-session';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { checkRateLimit } from '@/lib/rate-limit';
import { getSocketServer } from '@/lib/socket-server';

export const dynamic = 'force-dynamic';

/**
 * POST - Mark messages as read up to a specific message
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
    const { messageId } = body; // Optional: Mark all messages up to this ID as read

    // Determine reader identity
    const clinicianSession = await auth();
    let readerId: string;
    let readerType: 'CLINICIAN' | 'PATIENT';

    if (clinicianSession?.user?.id) {
      readerId = clinicianSession.user.id;
      readerType = 'CLINICIAN';
    } else {
      try {
        const patientSession = await requirePatientSession();
        readerId = patientSession.patientId;
        readerType = 'PATIENT';
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
        userId: readerId,
        userType: readerType,
        isActive: true,
      },
    });

    if (!participant) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found or access denied' },
        { status: 404 }
      );
    }

    // Get messages to mark as read (all unread messages from others)
    const whereClause: Record<string, unknown> = {
      conversationId,
      NOT: {
        AND: {
          senderId: readerId,
          senderType: readerType,
        },
      },
      readReceipts: {
        none: {
          readerId,
          readerType,
        },
      },
    };

    // If messageId provided, only mark messages up to that one
    if (messageId) {
      const targetMessage = await prisma.conversationMessage.findFirst({
        where: { id: messageId, conversationId },
        select: { createdAt: true },
      });
      if (targetMessage) {
        whereClause.createdAt = { lte: targetMessage.createdAt };
      }
    }

    const unreadMessages = await prisma.conversationMessage.findMany({
      where: whereClause,
      select: { id: true, senderId: true, senderType: true },
      orderBy: { createdAt: 'asc' },
    });

    if (unreadMessages.length === 0) {
      return NextResponse.json({
        success: true,
        data: { markedCount: 0 },
      });
    }

    const now = new Date();

    // Create read receipts in bulk
    await prisma.messageReadReceipt.createMany({
      data: unreadMessages.map((msg) => ({
        messageId: msg.id,
        readerId,
        readerType,
        readAt: now,
      })),
      skipDuplicates: true,
    });

    // Update participant's last read info and reset unread count
    const lastReadMsgId = unreadMessages[unreadMessages.length - 1].id;
    await prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: {
        lastReadAt: now,
        lastReadMsgId,
        unreadCount: 0,
      },
    });

    // Emit read receipts via Socket.IO
    try {
      const io = getSocketServer();
      if (io) {
        // Group messages by sender for efficient notification
        const senderMessages = new Map<string, string[]>();
        for (const msg of unreadMessages) {
          const key = `${msg.senderType}:${msg.senderId}`;
          if (!senderMessages.has(key)) {
            senderMessages.set(key, []);
          }
          senderMessages.get(key)!.push(msg.id);
        }

        // Notify each sender that their messages were read
        for (const [key, msgIds] of senderMessages) {
          const [senderType, senderId] = key.split(':');
          const senderRoom = senderType === 'CLINICIAN' ? `user:${senderId}` : `patient:${senderId}`;

          io.to(senderRoom).emit('messages_read', {
            conversationId,
            messageIds: msgIds,
            readerId,
            readerType,
            readAt: now,
          });
        }

        // Also emit to conversation room
        io.to(`conversation:${conversationId}`).emit('read_receipts_updated', {
          conversationId,
          readerId,
          readerType,
          messageCount: unreadMessages.length,
          readAt: now,
        });
      }
    } catch (socketError) {
      logger.warn({
        event: 'socket_emit_read_receipts_failed',
        conversationId,
        error: socketError instanceof Error ? socketError.message : 'Unknown error',
      });
    }

    logger.info({
      event: 'messages_marked_read',
      conversationId,
      readerId,
      readerType,
      messageCount: unreadMessages.length,
    });

    return NextResponse.json({
      success: true,
      data: {
        markedCount: unreadMessages.length,
        lastReadMsgId,
        readAt: now,
      },
    });
  } catch (error) {
    logger.error({
      event: 'mark_read_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { success: false, error: 'Failed to mark messages as read' },
      { status: 500 }
    );
  }
}
