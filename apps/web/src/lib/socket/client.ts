/**
 * Socket.IO Client Connection Manager
 *
 * Handles client-side WebSocket connections with auto-reconnect
 */

import { io, Socket } from 'socket.io-client';
import { SocketEvent, SocketRoom, SocketNotification, createRoomName } from './events';

// Client socket instance
let socket: Socket | null = null;

export interface SocketClientConfig {
  userId: string;
  token?: string;
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

/**
 * Initialize socket client connection
 */
export function initSocketClient(config: SocketClientConfig): Socket {
  if (socket && socket.connected) {
    console.log('✓ Socket already connected');
    return socket;
  }

  const socketUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  socket = io(socketUrl, {
    path: '/api/socket.io',
    autoConnect: config.autoConnect !== false,
    reconnection: config.reconnection !== false,
    reconnectionAttempts: config.reconnectionAttempts || 5,
    reconnectionDelay: config.reconnectionDelay || 1000,
    withCredentials: true,
  });

  // Connection event handlers
  socket.on('connect', () => {
    console.log('✓ Socket connected:', socket?.id);

    // Authenticate user
    socket?.emit('authenticate', {
      userId: config.userId,
      token: config.token,
    });
  });

  socket.on('authenticated', (data: { success: boolean; userId: string }) => {
    console.log('✓ Socket authenticated:', data.userId);
  });

  socket.on('disconnect', (reason) => {
    console.log('✗ Socket disconnected:', reason);

    // Auto-reconnect on intentional disconnect
    if (reason === 'io server disconnect') {
      socket?.connect();
    }
  });

  socket.on('connect_error', (error) => {
    console.error('✗ Socket connection error:', error.message);
  });

  socket.on('error', (error) => {
    console.error('✗ Socket error:', error);
  });

  return socket;
}

/**
 * Get socket client instance
 */
export function getSocketClient(): Socket | null {
  return socket;
}

/**
 * Disconnect socket client
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('✓ Socket disconnected');
  }
}

/**
 * Join a specific room
 */
export function joinRoom(roomType: SocketRoom, resourceId: string) {
  if (!socket) {
    console.warn('Socket not initialized');
    return;
  }

  socket.emit('join_room', { roomType, resourceId });
  console.log(`→ Joining room: ${roomType}${resourceId}`);
}

/**
 * Leave a specific room
 */
export function leaveRoom(roomType: SocketRoom, resourceId: string) {
  if (!socket) {
    console.warn('Socket not initialized');
    return;
  }

  socket.emit('leave_room', { roomType, resourceId });
  console.log(`→ Leaving room: ${roomType}${resourceId}`);
}

/**
 * Subscribe to specific event
 */
export function subscribeToEvent(
  event: SocketEvent,
  callback: (notification: SocketNotification) => void
): () => void {
  if (!socket) {
    console.warn('Socket not initialized');
    return () => {};
  }

  socket.on(event, callback);
  console.log(`✓ Subscribed to event: ${event}`);

  // Return unsubscribe function
  return () => {
    socket?.off(event, callback);
    console.log(`✓ Unsubscribed from event: ${event}`);
  };
}

/**
 * Subscribe to multiple events
 */
export function subscribeToEvents(
  events: SocketEvent[],
  callback: (notification: SocketNotification) => void
): () => void {
  const unsubscribers = events.map((event) => subscribeToEvent(event, callback));

  // Return function to unsubscribe from all
  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
}

/**
 * Check if socket is connected
 */
export function isSocketConnected(): boolean {
  return socket?.connected || false;
}

/**
 * Get socket connection status
 */
export function getSocketStatus(): {
  connected: boolean;
  id: string | undefined;
} {
  return {
    connected: socket?.connected || false,
    id: socket?.id,
  };
}

// Export Socket type
export type { Socket };
