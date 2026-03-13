/**
 * Socket.IO Server Setup
 *
 * Handles WebSocket connections for real-time prevention updates
 */

import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { SocketEvent, SocketRoom, SocketNotification, createRoomName } from './events';

// Global Socket.IO server instance
let io: SocketIOServer | null = null;

export interface SocketConfig {
  cors?: {
    origin: string | string[];
    credentials: boolean;
  };
  path?: string;
  pingTimeout?: number;
  pingInterval?: number;
}

/**
 * Initialize Socket.IO server
 */
export function initSocketServer(httpServer: HTTPServer, config?: SocketConfig): SocketIOServer {
  if (io) {
    console.error('[SocketServer]', { event: 'already_initialized' });
    return io;
  }

  io = new SocketIOServer(httpServer, {
    path: config?.path || '/api/socket',
    cors: config?.cors || {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      credentials: true,
    },
    pingTimeout: config?.pingTimeout || 60000,
    pingInterval: config?.pingInterval || 25000,
  });

  // Connection handling
  io.on('connection', (socket) => {
    console.error('[SocketServer]', { event: 'client_connected', socketId: socket.id });

    // Handle authentication
    socket.on('authenticate', (data: { userId: string; token?: string }) => {
      const { userId } = data;

      // Join user-specific room
      const userRoom = createRoomName(SocketRoom.USER, userId);
      socket.join(userRoom);

      // Store user info on socket
      (socket as any).userId = userId;

      console.error('[SocketServer]', { event: 'user_authenticated', userId, room: userRoom });
      socket.emit('authenticated', { success: true, userId });
    });

    // Handle joining specific resource rooms
    socket.on('join_room', (data: { roomType: SocketRoom; resourceId: string }) => {
      const { roomType, resourceId } = data;
      const roomName = createRoomName(roomType, resourceId);

      socket.join(roomName);
      console.error('[SocketServer]', { event: 'room_joined', socketId: socket.id, room: roomName });
      socket.emit('room_joined', { roomName });
    });

    // Handle leaving rooms
    socket.on('leave_room', (data: { roomType: SocketRoom; resourceId: string }) => {
      const { roomType, resourceId } = data;
      const roomName = createRoomName(roomType, resourceId);

      socket.leave(roomName);
      console.error('[SocketServer]', { event: 'room_left', socketId: socket.id, room: roomName });
      socket.emit('room_left', { roomName });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.error('[SocketServer]', { event: 'client_disconnected', socketId: socket.id, reason });
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`✗ Socket error for ${socket.id}:`, error);
    });
  });

  console.error('[SocketServer]', { event: 'initialized' });
  return io;
}

/**
 * Get Socket.IO server instance
 */
export function getSocketServer(): SocketIOServer | null {
  return io;
}

/**
 * Emit event to specific user
 */
export function emitToUser(userId: string, event: SocketEvent, notification: SocketNotification) {
  if (!io) {
    console.warn('Socket.IO server not initialized');
    return;
  }

  const userRoom = createRoomName(SocketRoom.USER, userId);
  io.to(userRoom).emit(event, notification);

  console.error('[SocketServer]', { event: 'emit_to_user', socketEvent: event, userId });
}

/**
 * Emit event to specific room
 */
export function emitToRoom(roomType: SocketRoom, resourceId: string, event: SocketEvent, notification: SocketNotification) {
  if (!io) {
    console.warn('Socket.IO server not initialized');
    return;
  }

  const roomName = createRoomName(roomType, resourceId);
  io.to(roomName).emit(event, notification);

  console.error('[SocketServer]', { event: 'emit_to_room', socketEvent: event, room: roomName });
}

/**
 * Emit event to all connected users
 */
export function emitToAll(event: SocketEvent, notification: SocketNotification) {
  if (!io) {
    console.warn('Socket.IO server not initialized');
    return;
  }

  io.emit(event, notification);
  console.error('[SocketServer]', { event: 'emit_to_all', socketEvent: event });
}

/**
 * Emit event to multiple users
 */
export function emitToUsers(userIds: string[], event: SocketEvent, notification: SocketNotification) {
  if (!io) {
    console.warn('Socket.IO server not initialized');
    return;
  }

  userIds.forEach((userId) => {
    emitToUser(userId, event, notification);
  });

  console.error('[SocketServer]', { event: 'emit_to_users', socketEvent: event, count: userIds.length });
}

/**
 * Get connected users count
 */
export function getConnectedUsersCount(): number {
  if (!io) return 0;
  return io.sockets.sockets.size;
}

/**
 * Get users in a specific room
 */
export async function getUsersInRoom(roomType: SocketRoom, resourceId: string): Promise<string[]> {
  if (!io) return [];

  const roomName = createRoomName(roomType, resourceId);
  const sockets = await io.in(roomName).fetchSockets();

  return sockets.map((socket) => (socket as any).userId).filter(Boolean);
}

/**
 * Disconnect all sockets (cleanup on server shutdown)
 */
export function disconnectAll() {
  if (!io) return;

  io.disconnectSockets();
  io.close();
  io = null;

  console.error('[SocketServer]', { event: 'all_connections_closed' });
}

// Export types
export type { SocketIOServer };
