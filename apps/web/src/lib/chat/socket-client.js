"use strict";
/**
 * Socket.io Client for Real-time Chat
 *
 * Client-side connection to Socket.io server with authentication
 */
'use client';
/**
 * Socket.io Client for Real-time Chat
 *
 * Client-side connection to Socket.io server with authentication
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSocket = getSocket;
exports.initSocket = initSocket;
exports.connectSocket = connectSocket;
exports.disconnectSocket = disconnectSocket;
exports.joinConversation = joinConversation;
exports.leaveConversation = leaveConversation;
exports.emitTypingStart = emitTypingStart;
exports.emitTypingStop = emitTypingStop;
exports.emitMessageRead = emitMessageRead;
const socket_io_client_1 = require("socket.io-client");
let socket = null;
function getSocket() {
    return socket;
}
/**
 * Get authentication token for Socket.io connection
 * For clinicians: NextAuth session token
 * For patients: Patient session JWT
 */
async function getAuthToken(userType) {
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
    }
    else {
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
function initSocket(authToken) {
    if (socket?.connected) {
        return socket;
    }
    socket = (0, socket_io_client_1.io)({
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
async function connectSocket(userId, userType) {
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
    }
    catch (error) {
        console.error('Failed to connect socket:', error);
        throw error;
    }
}
function disconnectSocket() {
    if (socket?.connected) {
        socket.disconnect();
    }
}
function joinConversation(conversationId) {
    socket?.emit('join_conversation', { conversationId });
}
function leaveConversation(conversationId) {
    socket?.emit('leave_conversation', { conversationId });
}
function emitTypingStart(conversationId, userId, userName) {
    socket?.emit('typing_start', { conversationId, userId, userName });
}
function emitTypingStop(conversationId, userId) {
    socket?.emit('typing_stop', { conversationId, userId });
}
function emitMessageRead(messageId, userId) {
    socket?.emit('message_read', { messageId, userId });
}
//# sourceMappingURL=socket-client.js.map