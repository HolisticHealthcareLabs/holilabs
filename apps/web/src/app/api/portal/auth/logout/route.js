"use strict";
/**
 * Patient Logout API
 *
 * POST /api/portal/auth/logout - Logout patient and clear session
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.POST = POST;
const server_1 = require("next/server");
const patient_session_1 = require("@/lib/auth/patient-session");
exports.dynamic = 'force-dynamic';
async function POST(request) {
    try {
        // Clear patient session
        await (0, patient_session_1.clearPatientSession)();
        return server_1.NextResponse.json({
            success: true,
            message: 'Logged out successfully',
        }, { status: 200 });
    }
    catch (error) {
        console.error('Error logging out:', error);
        return server_1.NextResponse.json({
            error: 'Failed to logout',
            details: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map