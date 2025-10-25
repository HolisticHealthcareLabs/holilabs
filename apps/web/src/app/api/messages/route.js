"use strict";
/**
 * Messages API
 *
 * GET /api/messages - Get user's conversations
 * POST /api/messages - Send a new message
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
const next_auth_1 = require("next-auth");
const auth_1 = require("@/lib/auth");
const patient_session_1 = require("@/lib/auth/patient-session");
const prisma_1 = require("@/lib/prisma");
const socket_server_1 = require("@/lib/socket-server");
const notifications_1 = require("@/lib/notifications");
const logger_1 = __importDefault(require("@/lib/logger"));
const rate_limit_1 = require("@/lib/rate-limit");
exports.dynamic = 'force-dynamic';
/**
 * GET - Get conversations for a user
 */
async function GET(request) {
    try {
        // Rate limiting
        const rateLimitError = await (0, rate_limit_1.checkRateLimit)(request, 'api');
        if (rateLimitError)
            return rateLimitError;
        const searchParams = request.nextUrl.searchParams;
        const limit = parseInt(searchParams.get('limit') || '50');
        // Check if it's a clinician or patient request
        const clinicianSession = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        if (clinicianSession?.user?.id) {
            // Get clinician's conversations
            const messages = await prisma_1.prisma.message.findMany({
                where: {
                    OR: [
                        { fromUserId: clinicianSession.user.id, fromUserType: 'CLINICIAN' },
                        { toUserId: clinicianSession.user.id, toUserType: 'CLINICIAN' },
                    ],
                    archivedAt: null,
                },
                include: {
                    patient: true,
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
            });
            // Group by patient to create conversations
            const conversationsMap = new Map();
            for (const message of messages) {
                const key = message.patientId;
                if (!conversationsMap.has(key)) {
                    conversationsMap.set(key, {
                        id: key,
                        patientId: message.patientId,
                        patientName: `${message.patient.firstName} ${message.patient.lastName}`,
                        patientAvatar: null,
                        lastMessage: message.body,
                        lastMessageAt: message.createdAt,
                        unreadCount: 0,
                        messages: [],
                    });
                }
                const conversation = conversationsMap.get(key);
                conversation.messages.push(message);
                // Count unread messages (messages TO the clinician that haven't been read)
                if (message.toUserId === clinicianSession.user.id && !message.readAt) {
                    conversation.unreadCount++;
                }
            }
            const conversations = Array.from(conversationsMap.values());
            return server_1.NextResponse.json({
                success: true,
                data: { conversations },
            });
        }
        // Try patient session
        try {
            const patientSession = await (0, patient_session_1.requirePatientSession)();
            // Get patient's conversations
            const messages = await prisma_1.prisma.message.findMany({
                where: {
                    patientId: patientSession.patientId,
                    archivedAt: null,
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
            });
            // For patients, there's typically one conversation with their assigned clinician
            const patient = await prisma_1.prisma.patient.findUnique({
                where: { id: patientSession.patientId },
                include: { assignedClinician: true },
            });
            const conversations = patient?.assignedClinician ? [{
                    id: patient.assignedClinicianId,
                    clinicianId: patient.assignedClinicianId,
                    clinicianName: `Dr. ${patient.assignedClinician.firstName} ${patient.assignedClinician.lastName}`,
                    clinicianAvatar: null,
                    lastMessage: messages[0]?.body || 'Inicia una conversación',
                    lastMessageAt: messages[0]?.createdAt || new Date(),
                    unreadCount: messages.filter(m => m.toUserId === patientSession.patientId && !m.readAt).length,
                    messages,
                }] : [];
            return server_1.NextResponse.json({
                success: true,
                data: { conversations },
            });
        }
        catch (error) {
            return server_1.NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
        }
    }
    catch (error) {
        logger_1.default.error({
            event: 'get_messages_error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return server_1.NextResponse.json({ success: false, error: 'Error al obtener mensajes' }, { status: 500 });
    }
}
/**
 * POST - Send a new message
 */
async function POST(request) {
    try {
        // Rate limiting for message sending
        const rateLimitError = await (0, rate_limit_1.checkRateLimit)(request, 'messages');
        if (rateLimitError)
            return rateLimitError;
        const body = await request.json();
        const { toUserId, toUserType, patientId, subject, messageBody, attachments } = body;
        if (!toUserId || !toUserType || !patientId || (!messageBody && (!attachments || attachments.length === 0))) {
            return server_1.NextResponse.json({ success: false, error: 'Faltan campos requeridos (mensaje o archivos)' }, { status: 400 });
        }
        // Check if it's a clinician or patient request
        const clinicianSession = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        let fromUserId;
        let fromUserType;
        let fromUserName;
        if (clinicianSession?.user?.id) {
            fromUserId = clinicianSession.user.id;
            fromUserType = 'CLINICIAN';
            const clinician = await prisma_1.prisma.user.findUnique({
                where: { id: fromUserId },
            });
            fromUserName = `Dr. ${clinician?.firstName || 'Doctor'} ${clinician?.lastName || ''}`;
        }
        else {
            // Try patient session
            try {
                const patientSession = await (0, patient_session_1.requirePatientSession)();
                fromUserId = patientSession.patientId;
                fromUserType = 'PATIENT';
                const patient = await prisma_1.prisma.patient.findUnique({
                    where: { id: fromUserId },
                });
                fromUserName = `${patient?.firstName || 'Paciente'} ${patient?.lastName || ''}`;
            }
            catch (error) {
                return server_1.NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
            }
        }
        // Create message
        const message = await prisma_1.prisma.message.create({
            data: {
                fromUserId,
                fromUserType,
                toUserId,
                toUserType,
                patientId,
                subject: subject || null,
                body: messageBody || '',
                attachments: attachments && attachments.length > 0 ? attachments : null,
            },
            include: {
                patient: true,
            },
        });
        // Emit real-time notification
        (0, socket_server_1.emitNewMessage)(message);
        // Send notification
        await (0, notifications_1.notifyNewMessage)(toUserId, toUserType === 'CLINICIAN' ? 'CLINICIAN' : 'PATIENT', fromUserName, message.id);
        logger_1.default.info({
            event: 'message_sent',
            messageId: message.id,
            fromUserId,
            fromUserType,
            toUserId,
            toUserType,
            patientId,
        });
        return server_1.NextResponse.json({
            success: true,
            data: { message },
        });
    }
    catch (error) {
        logger_1.default.error({
            event: 'send_message_error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return server_1.NextResponse.json({ success: false, error: 'Error al enviar mensaje' }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map