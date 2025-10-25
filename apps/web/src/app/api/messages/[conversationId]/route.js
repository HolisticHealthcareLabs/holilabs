"use strict";
/**
 * Conversation Messages API
 *
 * GET /api/messages/[conversationId] - Get messages for a conversation
 * PATCH /api/messages/[conversationId] - Mark conversation as read
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
exports.PATCH = PATCH;
const server_1 = require("next/server");
const next_auth_1 = require("next-auth");
const auth_1 = require("@/lib/auth");
const patient_session_1 = require("@/lib/auth/patient-session");
const prisma_1 = require("@/lib/prisma");
const logger_1 = __importDefault(require("@/lib/logger"));
exports.dynamic = 'force-dynamic';
/**
 * GET - Get all messages for a conversation
 */
async function GET(request, { params }) {
    try {
        const { conversationId } = params;
        const searchParams = request.nextUrl.searchParams;
        const limit = parseInt(searchParams.get('limit') || '100');
        // Check if it's a clinician or patient request
        const clinicianSession = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        if (clinicianSession?.user?.id) {
            // Get messages for this patient (conversationId is patientId for clinicians)
            const messages = await prisma_1.prisma.message.findMany({
                where: {
                    patientId: conversationId,
                    archivedAt: null,
                },
                include: {
                    patient: true,
                },
                orderBy: { createdAt: 'asc' },
                take: limit,
            });
            return server_1.NextResponse.json({
                success: true,
                data: { messages },
            });
        }
        // Try patient session
        try {
            const patientSession = await (0, patient_session_1.requirePatientSession)();
            // Get messages between patient and their clinician (conversationId is clinicianId)
            const messages = await prisma_1.prisma.message.findMany({
                where: {
                    patientId: patientSession.patientId,
                    archivedAt: null,
                },
                orderBy: { createdAt: 'asc' },
                take: limit,
            });
            return server_1.NextResponse.json({
                success: true,
                data: { messages },
            });
        }
        catch (error) {
            return server_1.NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
        }
    }
    catch (error) {
        logger_1.default.error({
            event: 'get_conversation_messages_error',
            error: error instanceof Error ? error.message : 'Unknown error',
            conversationId: params.conversationId,
        });
        return server_1.NextResponse.json({ success: false, error: 'Error al obtener mensajes' }, { status: 500 });
    }
}
/**
 * PATCH - Mark all messages in conversation as read
 */
async function PATCH(request, { params }) {
    try {
        const { conversationId } = params;
        // Check if it's a clinician or patient request
        const clinicianSession = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        if (clinicianSession?.user?.id) {
            // Mark messages from this patient as read
            await prisma_1.prisma.message.updateMany({
                where: {
                    patientId: conversationId,
                    toUserId: clinicianSession.user.id,
                    readAt: null,
                },
                data: {
                    readAt: new Date(),
                },
            });
            logger_1.default.info({
                event: 'conversation_marked_read',
                userId: clinicianSession.user.id,
                userType: 'clinician',
                conversationId,
            });
            return server_1.NextResponse.json({
                success: true,
                message: 'Conversación marcada como leída',
            });
        }
        // Try patient session
        try {
            const patientSession = await (0, patient_session_1.requirePatientSession)();
            // Mark messages from clinician as read
            await prisma_1.prisma.message.updateMany({
                where: {
                    patientId: patientSession.patientId,
                    toUserId: patientSession.patientId,
                    readAt: null,
                },
                data: {
                    readAt: new Date(),
                },
            });
            logger_1.default.info({
                event: 'conversation_marked_read',
                patientId: patientSession.patientId,
                userType: 'patient',
                conversationId,
            });
            return server_1.NextResponse.json({
                success: true,
                message: 'Conversación marcada como leída',
            });
        }
        catch (error) {
            return server_1.NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
        }
    }
    catch (error) {
        logger_1.default.error({
            event: 'mark_conversation_read_error',
            error: error instanceof Error ? error.message : 'Unknown error',
            conversationId: params.conversationId,
        });
        return server_1.NextResponse.json({ success: false, error: 'Error al marcar conversación como leída' }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map