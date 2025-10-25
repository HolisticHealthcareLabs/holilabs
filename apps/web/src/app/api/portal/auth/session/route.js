"use strict";
/**
 * Patient Session API
 *
 * GET /api/portal/auth/session - Get current patient session
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
const server_1 = require("next/server");
const patient_session_1 = require("@/lib/auth/patient-session");
exports.dynamic = 'force-dynamic';
async function GET(request) {
    try {
        // Get current session
        const session = await (0, patient_session_1.getPatientSession)();
        if (!session) {
            return server_1.NextResponse.json({ error: 'No active session' }, { status: 401 });
        }
        // Get patient data
        const patientUser = await (0, patient_session_1.getCurrentPatient)();
        if (!patientUser) {
            return server_1.NextResponse.json({ error: 'Patient not found' }, { status: 404 });
        }
        return server_1.NextResponse.json({
            success: true,
            session: {
                patientUserId: patientUser.id,
                patientId: patientUser.patient.id,
                email: patientUser.email,
                expiresAt: new Date(session.expiresAt).toISOString(),
            },
            patient: {
                id: patientUser.patient.id,
                mrn: patientUser.patient.mrn,
                firstName: patientUser.patient.firstName,
                lastName: patientUser.patient.lastName,
                dateOfBirth: patientUser.patient.dateOfBirth,
                gender: patientUser.patient.gender,
                email: patientUser.patient.email,
                phone: patientUser.patient.phone,
            },
        }, { status: 200 });
    }
    catch (error) {
        console.error('Error fetching session:', error);
        return server_1.NextResponse.json({
            error: 'Failed to fetch session',
            details: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map