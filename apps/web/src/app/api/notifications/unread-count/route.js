"use strict";
/**
 * Notifications Unread Count API
 *
 * GET /api/notifications/unread-count
 * Get unread notification count for authenticated user
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
        // Check if it's a clinician or patient request
        const clinicianSession = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        if (clinicianSession?.user?.id) {
            // Clinician unread count
            const count = await (0, notifications_1.getUnreadCount)(clinicianSession.user.id, 'CLINICIAN');
            return server_1.NextResponse.json({
                success: true,
                data: { count },
            }, { status: 200 });
        }
        // Try patient session
        try {
            const patientSession = await (0, patient_session_1.requirePatientSession)();
            const count = await (0, notifications_1.getUnreadCount)(patientSession.patientId, 'PATIENT');
            return server_1.NextResponse.json({
                success: true,
                data: { count },
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
            event: 'unread_count_fetch_error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return server_1.NextResponse.json({
            success: false,
            error: 'Error al cargar conteo de notificaciones.',
        }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map