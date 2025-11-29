/**
 * Socket.io Server for Real-time Chat
 *
 * Handles real-time messaging between clinicians and patients
 * Features: typing indicators, read receipts, online status
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { prisma } from './prisma';
import logger from './logger';
import { verifySocketToken } from './auth';

export type SocketServer = SocketIOServer;

let io: SocketIOServer | undefined;

export function initSocketServer(httpServer: HTTPServer): SocketIOServer {
  if (io) {
    return io;
  }

  io = new SocketIOServer(httpServer, {
    path: '/api/socket',
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      credentials: true,
    },
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        logger.warn({
          event: 'socket_auth_failed',
          reason: 'no_token',
          socketId: socket.id,
        });
        return next(new Error('Authentication required'));
      }

      // Verify token
      const user = await verifySocketToken(token);

      if (!user) {
        logger.warn({
          event: 'socket_auth_failed',
          reason: 'invalid_token',
          socketId: socket.id,
        });
        return next(new Error('Invalid authentication token'));
      }

      // Attach user data to socket
      socket.data.userId = user.userId;
      socket.data.userType = user.userType;

      logger.info({
        event: 'socket_authenticated',
        userId: user.userId,
        userType: user.userType,
        socketId: socket.id,
      });

      next();
    } catch (error) {
      logger.error({
        event: 'socket_auth_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        socketId: socket.id,
      });
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    const userType = socket.data.userType;

    logger.info({
      event: 'socket_connected',
      userId,
      userType,
      socketId: socket.id,
    });

    // Automatically join user room
    const roomId = `user:${userType}:${userId}`;
    socket.join(roomId);

    logger.info({
      event: 'user_auto_joined_room',
      userId,
      userType,
      roomId,
      socketId: socket.id,
    });

    // Notify user is online
    socket.broadcast.emit('user_online', { userId, userType });

    // Legacy join handler for backward compatibility (now authenticated)
    socket.on('join', ({ userId: requestedUserId, userType: requestedUserType }: { userId: string; userType: string }) => {
      // Verify the requested userId matches the authenticated user
      if (requestedUserId !== socket.data.userId || requestedUserType !== socket.data.userType) {
        logger.warn({
          event: 'unauthorized_join_attempt',
          authenticatedUserId: socket.data.userId,
          requestedUserId,
          socketId: socket.id,
        });
        socket.emit('error', { message: 'Unauthorized: Cannot join room for different user' });
        return;
      }

      const roomId = `user:${userType}:${userId}`;
      socket.join(roomId);

      logger.info({
        event: 'user_joined_room',
        userId,
        userType,
        roomId,
        socketId: socket.id,
      });
    });

    // Join conversation room
    socket.on('join_conversation', ({ conversationId }: { conversationId: string }) => {
      socket.join(`conversation:${conversationId}`);

      logger.info({
        event: 'joined_conversation',
        conversationId,
        socketId: socket.id,
      });
    });

    // Leave conversation room
    socket.on('leave_conversation', ({ conversationId }: { conversationId: string }) => {
      socket.leave(`conversation:${conversationId}`);

      logger.info({
        event: 'left_conversation',
        conversationId,
        socketId: socket.id,
      });
    });

    // Typing indicator
    socket.on('typing_start', ({ conversationId, userId, userName }: {
      conversationId: string;
      userId: string;
      userName: string;
    }) => {
      socket.to(`conversation:${conversationId}`).emit('user_typing', {
        conversationId,
        userId,
        userName,
      });
    });

    socket.on('typing_stop', ({ conversationId, userId }: {
      conversationId: string;
      userId: string;
    }) => {
      socket.to(`conversation:${conversationId}`).emit('user_stopped_typing', {
        conversationId,
        userId,
      });
    });

    // New message (sent from server after DB insert)
    socket.on('message_sent', (message: any) => {
      // Emit to recipient
      const recipientRoom = `user:${message.toUserType}:${message.toUserId}`;
      io?.to(recipientRoom).emit('new_message', message);

      // Emit to conversation room
      io?.to(`conversation:${message.conversationId}`).emit('message_received', message);
    });

    // Message read receipt
    socket.on('message_read', async ({ messageId, userId }: {
      messageId: string;
      userId: string;
    }) => {
      try {
        const message = await prisma.message.update({
          where: { id: messageId },
          data: { readAt: new Date() },
          include: { patient: true },
        });

        // Notify sender
        const senderRoom = `user:${message.fromUserType}:${message.fromUserId}`;
        io?.to(senderRoom).emit('message_read_receipt', {
          messageId,
          readAt: message.readAt,
        });

        logger.info({
          event: 'message_marked_read',
          messageId,
          userId,
        });
      } catch (error) {
        logger.error({
          event: 'message_read_error',
          error: error instanceof Error ? error.message : 'Unknown error',
          messageId,
        });
      }
    });

    // User disconnection
    socket.on('disconnect', () => {
      logger.info({
        event: 'socket_disconnected',
        socketId: socket.id,
      });
    });

    // Co-Pilot handlers
    socket.on('co_pilot:join_session', ({ sessionId }: { sessionId: string }) => {
      const roomId = `co-pilot:${sessionId}`;
      socket.join(roomId);
      logger.info({
        event: 'co_pilot_session_joined',
        sessionId,
        userId,
        socketId: socket.id,
      });
    });

    socket.on('co_pilot:audio_chunk', ({ sessionId, audioData }: { sessionId: string; audioData: ArrayBuffer }) => {
      // Forward audio chunk to room for processing
      socket.to(`co-pilot:${sessionId}`).emit('co_pilot:audio_received', {
        sessionId,
        audioData,
        timestamp: Date.now(),
      });
    });

    socket.on('co_pilot:leave_session', ({ sessionId }: { sessionId: string }) => {
      socket.leave(`co-pilot:${sessionId}`);
      logger.info({
        event: 'co_pilot_session_left',
        sessionId,
        userId,
        socketId: socket.id,
      });
    });

    // Error handling
    socket.on('error', (error) => {
      logger.error({
        event: 'socket_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        socketId: socket.id,
      });
    });
  });

  return io;
}

export function getSocketServer(): SocketIOServer | undefined {
  return io;
}

/**
 * Emit a new message to the recipient
 */
export function emitNewMessage(message: any) {
  if (!io) return;

  const recipientRoom = `user:${message.toUserType}:${message.toUserId}`;
  io.to(recipientRoom).emit('new_message', message);
}

/**
 * Emit typing indicator
 */
export function emitTypingIndicator(conversationId: string, userId: string, userName: string) {
  if (!io) return;

  io.to(`conversation:${conversationId}`).emit('user_typing', {
    conversationId,
    userId,
    userName,
  });
}

/**
 * Emit user online status
 */
export function emitUserOnline(userId: string, userType: string) {
  if (!io) return;

  io.emit('user_online', { userId, userType });
}

/**
 * Emit user offline status
 */
export function emitUserOffline(userId: string, userType: string) {
  if (!io) return;

  io.emit('user_offline', { userId, userType });
}

/**
 * Emit appointment notification
 */
export function emitAppointmentNotification(
  userId: string,
  userType: 'CLINICIAN' | 'PATIENT',
  data: { date: string; time?: string; provider?: string }
) {
  if (!io) return;

  const roomId = `user:${userType}:${userId}`;
  io.to(roomId).emit('notification:appointment', data);

  logger.info({
    event: 'notification_sent',
    type: 'appointment',
    userId,
    userType,
  });
}

/**
 * Emit medication reminder notification
 */
export function emitMedicationReminder(
  userId: string,
  data: { message: string; medicationName?: string }
) {
  if (!io) return;

  const roomId = `user:PATIENT:${userId}`;
  io.to(roomId).emit('notification:medication', data);

  logger.info({
    event: 'notification_sent',
    type: 'medication',
    userId,
  });
}

/**
 * Emit lab result notification
 */
export function emitLabResultNotification(
  userId: string,
  userType: 'CLINICIAN' | 'PATIENT',
  data: { message: string; testName?: string }
) {
  if (!io) return;

  const roomId = `user:${userType}:${userId}`;
  io.to(roomId).emit('notification:lab', data);

  logger.info({
    event: 'notification_sent',
    type: 'lab',
    userId,
    userType,
  });
}
