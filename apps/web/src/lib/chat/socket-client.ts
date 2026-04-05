/**
 * Socket.io Client for Real-time Chat
 *
 * Client-side connection to Socket.io server with authentication
 */

'use client';

import { io, Socket } from 'socket.io-client';
import { logger } from '@/lib/logger';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

/**
 * Get authentication token for Socket.io connection
 * For clinicians: NextAuth session token
 * For patients: Patient session JWT
 */
async function getAuthToken(userType: 'CLINICIAN' | 'PATIENT'): Promise<string> {
  if (userType === 'CLINICIAN') {
    // Mint a signed JWT on the server (required by verifySocketToken)
    const res = await fetch('/api/auth/socket-token', { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.token) return data.token;
    throw new Error(data?.error || 'No clinician session found');
  } else {
    // Patient session cookie is HttpOnly, so we must ask the server for the token.
    const res = await fetch('/api/portal/auth/whoami', { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (data?.token) {
      return data.token; // Patient session JWT
    }
    throw new Error('No patient session found');
  }
}

export function initSocket(authToken: string): Socket {
  if (socket?.connected) {
    return socket;
  }

  socket = io({
    path: '/api/socket.io',
    autoConnect: false,
    // Prevent infinite retry loops when the Socket.IO server is not running.
    reconnection: false,
    timeout: 2000,
    auth: {
      token: authToken,
    },
  });

  socket.on('connect', () => {
    logger.debug('[SocketClient] connected', { socketId: socket?.id });
  });

  socket.on('disconnect', () => {
    logger.debug('[SocketClient] disconnected');
  });

  socket.on('connect_error', (error) => {
    logger.error({ err: error }, '[SocketClient] connection_error');
  });

  socket.on('error', (error) => {
    logger.error({ err: error }, '[SocketClient] socket_error');
  });

  return socket;
}

export async function connectSocket(userId: string, userType: 'CLINICIAN' | 'PATIENT') {
  try {
    // Get authentication token
    const authToken = await getAuthToken(userType);

    if (!socket) {
      socket = initSocket(authToken);
    }

    if (!socket.connected) {
      socket.connect();
    }

    // Legacy join event (now authenticated)
    socket.emit('join', { userId, userType });
  } catch (error) {
    logger.error({ err: error }, '[SocketClient] failed_to_connect_socket');
    // Don't crash the UI for non-critical realtime features
    return;
  }
}

export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect();
  }
}

export function joinConversation(conversationId: string) {
  socket?.emit('join_conversation', { conversationId });
}

export function leaveConversation(conversationId: string) {
  socket?.emit('leave_conversation', { conversationId });
}

export function emitTypingStart(conversationId: string, userId: string, userName: string) {
  socket?.emit('typing_start', { conversationId, userId, userName });
}

export function emitTypingStop(conversationId: string, userId: string) {
  socket?.emit('typing_stop', { conversationId, userId });
}

export function emitMessageRead(messageId: string, userId: string) {
  socket?.emit('message_read', { messageId, userId });
}
