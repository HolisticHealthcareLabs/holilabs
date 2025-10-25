"use strict";
/**
 * Socket.io Server for Real-time Chat
 *
 * Handles real-time messaging between clinicians and patients
 * Features: typing indicators, read receipts, online status
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocketServer = initSocketServer;
exports.getSocketServer = getSocketServer;
exports.emitNewMessage = emitNewMessage;
exports.emitTypingIndicator = emitTypingIndicator;
exports.emitUserOnline = emitUserOnline;
exports.emitUserOffline = emitUserOffline;
const socket_io_1 = require("socket.io");
const prisma_1 = require("./prisma");
const logger_1 = __importDefault(require("./logger"));
const auth_1 = require("./auth");
let io;
function initSocketServer(httpServer) {
    if (io) {
        return io;
    }
    io = new socket_io_1.Server(httpServer, {
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
                logger_1.default.warn({
                    event: 'socket_auth_failed',
                    reason: 'no_token',
                    socketId: socket.id,
                });
                return next(new Error('Authentication required'));
            }
            // Verify token
            const user = await (0, auth_1.verifySocketToken)(token);
            if (!user) {
                logger_1.default.warn({
                    event: 'socket_auth_failed',
                    reason: 'invalid_token',
                    socketId: socket.id,
                });
                return next(new Error('Invalid authentication token'));
            }
            // Attach user data to socket
            socket.data.userId = user.userId;
            socket.data.userType = user.userType;
            logger_1.default.info({
                event: 'socket_authenticated',
                userId: user.userId,
                userType: user.userType,
                socketId: socket.id,
            });
            next();
        }
        catch (error) {
            logger_1.default.error({
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
        logger_1.default.info({
            event: 'socket_connected',
            userId,
            userType,
            socketId: socket.id,
        });
        // Automatically join user room
        const roomId = `user:${userType}:${userId}`;
        socket.join(roomId);
        logger_1.default.info({
            event: 'user_auto_joined_room',
            userId,
            userType,
            roomId,
            socketId: socket.id,
        });
        // Notify user is online
        socket.broadcast.emit('user_online', { userId, userType });
        // Legacy join handler for backward compatibility (now authenticated)
        socket.on('join', ({ userId: requestedUserId, userType: requestedUserType }) => {
            // Verify the requested userId matches the authenticated user
            if (requestedUserId !== socket.data.userId || requestedUserType !== socket.data.userType) {
                logger_1.default.warn({
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
            logger_1.default.info({
                event: 'user_joined_room',
                userId,
                userType,
                roomId,
                socketId: socket.id,
            });
        });
        // Join conversation room
        socket.on('join_conversation', ({ conversationId }) => {
            socket.join(`conversation:${conversationId}`);
            logger_1.default.info({
                event: 'joined_conversation',
                conversationId,
                socketId: socket.id,
            });
        });
        // Leave conversation room
        socket.on('leave_conversation', ({ conversationId }) => {
            socket.leave(`conversation:${conversationId}`);
            logger_1.default.info({
                event: 'left_conversation',
                conversationId,
                socketId: socket.id,
            });
        });
        // Typing indicator
        socket.on('typing_start', ({ conversationId, userId, userName }) => {
            socket.to(`conversation:${conversationId}`).emit('user_typing', {
                conversationId,
                userId,
                userName,
            });
        });
        socket.on('typing_stop', ({ conversationId, userId }) => {
            socket.to(`conversation:${conversationId}`).emit('user_stopped_typing', {
                conversationId,
                userId,
            });
        });
        // New message (sent from server after DB insert)
        socket.on('message_sent', (message) => {
            // Emit to recipient
            const recipientRoom = `user:${message.toUserType}:${message.toUserId}`;
            io?.to(recipientRoom).emit('new_message', message);
            // Emit to conversation room
            io?.to(`conversation:${message.conversationId}`).emit('message_received', message);
        });
        // Message read receipt
        socket.on('message_read', async ({ messageId, userId }) => {
            try {
                const message = await prisma_1.prisma.message.update({
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
                logger_1.default.info({
                    event: 'message_marked_read',
                    messageId,
                    userId,
                });
            }
            catch (error) {
                logger_1.default.error({
                    event: 'message_read_error',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    messageId,
                });
            }
        });
        // User disconnection
        socket.on('disconnect', () => {
            logger_1.default.info({
                event: 'socket_disconnected',
                socketId: socket.id,
            });
        });
        // Error handling
        socket.on('error', (error) => {
            logger_1.default.error({
                event: 'socket_error',
                error: error instanceof Error ? error.message : 'Unknown error',
                socketId: socket.id,
            });
        });
    });
    return io;
}
function getSocketServer() {
    return io;
}
/**
 * Emit a new message to the recipient
 */
function emitNewMessage(message) {
    if (!io)
        return;
    const recipientRoom = `user:${message.toUserType}:${message.toUserId}`;
    io.to(recipientRoom).emit('new_message', message);
}
/**
 * Emit typing indicator
 */
function emitTypingIndicator(conversationId, userId, userName) {
    if (!io)
        return;
    io.to(`conversation:${conversationId}`).emit('user_typing', {
        conversationId,
        userId,
        userName,
    });
}
/**
 * Emit user online status
 */
function emitUserOnline(userId, userType) {
    if (!io)
        return;
    io.emit('user_online', { userId, userType });
}
/**
 * Emit user offline status
 */
function emitUserOffline(userId, userType) {
    if (!io)
        return;
    io.emit('user_offline', { userId, userType });
}
//# sourceMappingURL=socket-server.js.map