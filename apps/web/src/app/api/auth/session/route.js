"use strict";
/**
 * Session API Route
 *
 * GET /api/auth/session - Get current user session
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
const server_1 = require("next/server");
const next_auth_1 = require("next-auth");
const auth_1 = require("@/lib/auth");
const patient_session_1 = require("@/lib/auth/patient-session");
exports.dynamic = 'force-dynamic';
async function GET(request) {
    try {
        // Try clinician session first
        const clinicianSession = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        if (clinicianSession?.user?.id) {
            return server_1.NextResponse.json({
                user: {
                    id: clinicianSession.user.id,
                    email: clinicianSession.user.email,
                    firstName: clinicianSession.user.firstName,
                    lastName: clinicianSession.user.lastName,
                    role: clinicianSession.user.role,
                    type: 'CLINICIAN',
                },
            });
        }
        // Try patient session
        try {
            const patientSession = await (0, patient_session_1.requirePatientSession)();
            return server_1.NextResponse.json({
                user: {
                    id: patientSession.patientId,
                    email: patientSession.email,
                    type: 'PATIENT',
                },
            });
        }
        catch (error) {
            // No session found
            return server_1.NextResponse.json({ user: null }, { status: 401 });
        }
    }
    catch (error) {
        console.error('Session error:', error);
        return server_1.NextResponse.json({ error: 'Failed to get session' }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map