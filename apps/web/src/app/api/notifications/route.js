"use strict";
/**
 * Notifications API
 *
 * GET /api/notifications
 * Fetch notifications for authenticated user
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const next_auth_1 = require("next-auth");
const auth_1 = require("@/lib/auth");
const patient_session_1 = require("@/lib/auth/patient-session");
const notifications_1 = require("@/lib/notifications");
const logger_1 = __importDefault(require("@/lib/logger"));
async function GET(request) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');
        const unreadOnly = searchParams.get('unreadOnly') === 'true';
        // Check if it's a clinician or patient request
        const clinicianSession = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        if (clinicianSession?.user?.id) {
            // Clinician notifications
            const notifications = await (0, notifications_1.getNotifications)(clinicianSession.user.id, 'CLINICIAN', {
                limit,
                offset,
                unreadOnly,
            });
            logger_1.default.info({
                event: 'notifications_fetched',
                userId: clinicianSession.user.id,
                userType: 'CLINICIAN',
                count: notifications.length,
            });
            return server_1.NextResponse.json({
                success: true,
                data: notifications,
            }, { status: 200 });
        }
        // Try patient session
        try {
            const patientSession = await (0, patient_session_1.requirePatientSession)();
            const notifications = await (0, notifications_1.getNotifications)(patientSession.patientId, 'PATIENT', {
                limit,
                offset,
                unreadOnly,
            });
            logger_1.default.info({
                event: 'notifications_fetched',
                patientId: patientSession.patientId,
                userType: 'PATIENT',
                count: notifications.length,
            });
            return server_1.NextResponse.json({
                success: true,
                data: notifications,
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
            event: 'notifications_fetch_error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return server_1.NextResponse.json({
            success: false,
            error: 'Error al cargar notificaciones.',
        }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map