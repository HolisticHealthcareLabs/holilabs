"use strict";
/**
 * Individual Notification API
 *
 * PUT /api/notifications/[id]
 * Mark notification as read
 *
 * DELETE /api/notifications/[id]
 * Delete notification
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PUT = PUT;
exports.DELETE = DELETE;
const server_1 = require("next/server");
const next_auth_1 = require("next-auth");
const auth_1 = require("@/lib/auth");
const patient_session_1 = require("@/lib/auth/patient-session");
const notifications_1 = require("@/lib/notifications");
const prisma_1 = require("@/lib/prisma");
const logger_1 = __importDefault(require("@/lib/logger"));
async function PUT(request, { params }) {
    try {
        const notificationId = params.id;
        // Check if it's a clinician or patient request
        const clinicianSession = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        let userId;
        let userType;
        if (clinicianSession?.user?.id) {
            userId = clinicianSession.user.id;
            userType = 'CLINICIAN';
        }
        else {
            try {
                const patientSession = await (0, patient_session_1.requirePatientSession)();
                userId = patientSession.patientId;
                userType = 'PATIENT';
            }
            catch (error) {
                return server_1.NextResponse.json({
                    success: false,
                    error: 'No autorizado. Por favor, inicia sesión.',
                }, { status: 401 });
            }
        }
        // Verify notification belongs to user
        const notification = await prisma_1.prisma.notification.findUnique({
            where: { id: notificationId },
        });
        if (!notification) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Notificación no encontrada',
            }, { status: 404 });
        }
        if (notification.recipientId !== userId ||
            notification.recipientType !== userType) {
            return server_1.NextResponse.json({
                success: false,
                error: 'No tienes permiso para actualizar esta notificación',
            }, { status: 403 });
        }
        // Mark as read
        const updated = await (0, notifications_1.markNotificationAsRead)(notificationId);
        return server_1.NextResponse.json({
            success: true,
            message: 'Notificación marcada como leída',
            data: updated,
        }, { status: 200 });
    }
    catch (error) {
        logger_1.default.error({
            event: 'notification_update_error',
            notificationId: params.id,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return server_1.NextResponse.json({
            success: false,
            error: 'Error al actualizar notificación.',
        }, { status: 500 });
    }
}
async function DELETE(request, { params }) {
    try {
        const notificationId = params.id;
        // Check if it's a clinician or patient request
        const clinicianSession = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        let userId;
        let userType;
        if (clinicianSession?.user?.id) {
            userId = clinicianSession.user.id;
            userType = 'CLINICIAN';
        }
        else {
            try {
                const patientSession = await (0, patient_session_1.requirePatientSession)();
                userId = patientSession.patientId;
                userType = 'PATIENT';
            }
            catch (error) {
                return server_1.NextResponse.json({
                    success: false,
                    error: 'No autorizado. Por favor, inicia sesión.',
                }, { status: 401 });
            }
        }
        // Verify notification belongs to user
        const notification = await prisma_1.prisma.notification.findUnique({
            where: { id: notificationId },
        });
        if (!notification) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Notificación no encontrada',
            }, { status: 404 });
        }
        if (notification.recipientId !== userId ||
            notification.recipientType !== userType) {
            return server_1.NextResponse.json({
                success: false,
                error: 'No tienes permiso para eliminar esta notificación',
            }, { status: 403 });
        }
        // Delete notification
        await (0, notifications_1.deleteNotification)(notificationId);
        return server_1.NextResponse.json({
            success: true,
            message: 'Notificación eliminada',
        }, { status: 200 });
    }
    catch (error) {
        logger_1.default.error({
            event: 'notification_delete_error',
            notificationId: params.id,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return server_1.NextResponse.json({
            success: false,
            error: 'Error al eliminar notificación.',
        }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map