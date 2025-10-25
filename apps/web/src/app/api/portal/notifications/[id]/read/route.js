"use strict";
/**
 * Mark Notification as Read API
 *
 * POST /api/portal/notifications/[id]/read - Mark notification as read
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const patient_session_1 = require("@/lib/auth/patient-session");
const prisma_1 = require("@/lib/prisma");
const logger_1 = __importDefault(require("@/lib/logger"));
async function POST(request, { params }) {
    try {
        // Authenticate patient
        const session = await (0, patient_session_1.requirePatientSession)();
        const notificationId = params.id;
        // Find notification
        const notification = await prisma_1.prisma.notification.findUnique({
            where: { id: notificationId },
        });
        if (!notification) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Notificación no encontrada.',
            }, { status: 404 });
        }
        // Verify ownership
        if (notification.recipientId !== session.patientId || notification.recipientType !== 'PATIENT') {
            return server_1.NextResponse.json({
                success: false,
                error: 'No tienes permiso para acceder a esta notificación.',
            }, { status: 403 });
        }
        // Mark as read
        const updatedNotification = await prisma_1.prisma.notification.update({
            where: { id: notificationId },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });
        logger_1.default.info({
            event: 'notification_marked_read',
            notificationId,
            patientId: session.patientId,
        });
        return server_1.NextResponse.json({
            success: true,
            message: 'Notificación marcada como leída.',
            data: updatedNotification,
        }, { status: 200 });
    }
    catch (error) {
        if (error instanceof Error && error.message.includes('Unauthorized')) {
            return server_1.NextResponse.json({
                success: false,
                error: 'No autorizado. Por favor, inicia sesión.',
            }, { status: 401 });
        }
        logger_1.default.error({
            event: 'notification_mark_read_error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return server_1.NextResponse.json({
            success: false,
            error: 'Error al marcar notificación como leída.',
        }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map