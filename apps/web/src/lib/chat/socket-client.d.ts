/**
 * Socket.io Client for Real-time Chat
 *
 * Client-side connection to Socket.io server with authentication
 */
import { Socket } from 'socket.io-client';
export declare function getSocket(): Socket | null;
export declare function initSocket(authToken: string): Socket;
export declare function connectSocket(userId: string, userType: 'CLINICIAN' | 'PATIENT'): Promise<void>;
export declare function disconnectSocket(): void;
export declare function joinConversation(conversationId: string): void;
export declare function leaveConversation(conversationId: string): void;
export declare function emitTypingStart(conversationId: string, userId: string, userName: string): void;
export declare function emitTypingStop(conversationId: string, userId: string): void;
export declare function emitMessageRead(messageId: string, userId: string): void;
//# sourceMappingURL=socket-client.d.ts.map