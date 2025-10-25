"use strict";
/**
 * Mark All Notifications as Read API
 *
 * PUT /api/notifications/read-all
 * Mark all notifications as read for authenticated user
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PUT = PUT;
const server_1 = require("next/server");
const next_auth_1 = require("next-auth");
const auth_1 = require("@/lib/auth");
const patient_session_1 = require("@/lib/auth/patient-session");
const notifications_1 = require("@/lib/notifications");
const logger_1 = __importDefault(require("@/lib/logger"));
async function PUT(request) {
    try {
        // Check if it's a clinician or patient request
        const clinicianSession = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        if (clinicianSession?.user?.id) {
            // Mark all clinician notifications as read
            const result = await (0, notifications_1.markAllNotificationsAsRead)(clinicianSession.user.id, 'CLINICIAN');
            return server_1.NextResponse.json({
                success: true,
                message: 'Todas las notificaciones marcadas como leídas',
                data: { count: result.count },
            }, { status: 200 });
        }
        // Try patient session
        try {
            const patientSession = await (0, patient_session_1.requirePatientSession)();
            // Mark all patient notifications as read
            const result = await (0, notifications_1.markAllNotificationsAsRead)(patientSession.patientId, 'PATIENT');
            return server_1.NextResponse.json({
                success: true,
                message: 'Todas las notificaciones marcadas como leídas',
                data: { count: result.count },
            }, { status: 200 });
        }
        catch (error) {
            // Not a patient either
            return server_1.NextResponse.json({
                success: false,
                error: 'No autorizado. Por favor, inicia sesión.',
            }, { status: 401 });
        }
    }
    catch (error) {
        logger_1.default.error({
            event: 'mark_all_notifications_read_error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return server_1.NextResponse.json({
            success: false,
            error: 'Error al marcar notificaciones como leídas.',
        }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map