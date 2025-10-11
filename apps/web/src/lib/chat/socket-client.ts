/**
 * Socket.io Client for Real-time Chat
 *
 * Client-side connection to Socket.io server with authentication
 */

'use client';

import { io, Socket } from 'socket.io-client';

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
    // Get NextAuth session token (stored in cookies)
    // For now, create a simple token - in production, get from session
    const response = await fetch('/api/auth/session');
    const session = await response.json();

    if (session?.user?.id) {
      // Create auth token
      return Buffer.from(JSON.stringify({ userId: session.user.id, type: 'CLINICIAN' })).toString('base64');
    }
    throw new Error('No clinician session found');
  } else {
    // For patients, get token from cookie
    const cookies = document.cookie.split(';');
    const sessionCookie = cookies.find(c => c.trim().startsWith('patient-session='));

    if (sessionCookie) {
      const token = sessionCookie.split('=')[1];
      return token; // Patient session is already a JWT token
    }
    throw new Error('No patient session found');
  }
}

export function initSocket(authToken: string): Socket {
  if (socket?.connected) {
    return socket;
  }

  socket = io({
    path: '/api/socket',
    autoConnect: false,
    auth: {
      token: authToken,
    },
  });

  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket?.id);
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
    console.error('Error message:', error.message);
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
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
    console.error('Failed to connect socket:', error);
    throw error;
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
