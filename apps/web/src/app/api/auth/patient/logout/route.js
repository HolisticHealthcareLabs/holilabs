"use strict";
/**
 * Patient Logout API
 *
 * POST /api/auth/patient/logout
 * Clear patient session and logout
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const headers_1 = require("next/headers");
const logger_1 = __importDefault(require("@/lib/logger"));
async function POST() {
    try {
        // Clear session cookie
        const cookieStore = (0, headers_1.cookies)();
        cookieStore.delete('patient-session');
        logger_1.default.info({
            event: 'patient_logout',
        });
        return server_1.NextResponse.json({
            success: true,
            message: 'Sesión cerrada exitosamente',
        }, { status: 200 });
    }
    catch (error) {
        logger_1.default.error({
            event: 'patient_logout_error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return server_1.NextResponse.json({
            success: false,
            error: 'Error al cerrar sesión',
        }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map