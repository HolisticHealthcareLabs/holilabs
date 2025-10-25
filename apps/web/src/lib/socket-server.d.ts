/**
 * Socket.io Server for Real-time Chat
 *
 * Handles real-time messaging between clinicians and patients
 * Features: typing indicators, read receipts, online status
 */
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
export type SocketServer = SocketIOServer;
export declare function initSocketServer(httpServer: HTTPServer): SocketIOServer;
export declare function getSocketServer(): SocketIOServer | undefined;
/**
 * Emit a new message to the recipient
 */
export declare function emitNewMessage(message: any): void;
/**
 * Emit typing indicator
 */
export declare function emitTypingIndicator(conversationId: string, userId: string, userName: string): void;
/**
 * Emit user online status
 */
export declare function emitUserOnline(userId: string, userType: string): void;
/**
 * Emit user offline status
 */
export declare function emitUserOffline(userId: string, userType: string): void;
//# sourceMappingURL=socket-server.d.ts.map