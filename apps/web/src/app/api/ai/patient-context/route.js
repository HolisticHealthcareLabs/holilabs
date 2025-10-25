"use strict";
/**
 * Patient Context API
 *
 * Generate formatted patient context for AI prompts
 *
 * GET /api/ai/patient-context?patientId=xxx&format=full|soap|scribe|summary
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
const server_1 = require("next/server");
const patient_data_fetcher_1 = require("@/lib/ai/patient-data-fetcher");
const patient_context_formatter_1 = require("@/lib/ai/patient-context-formatter");
exports.dynamic = 'force-dynamic';
async function GET(request) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const patientId = searchParams.get('patientId');
        const format = searchParams.get('format') || 'full';
        const chiefComplaint = searchParams.get('chiefComplaint');
        const appointmentReason = searchParams.get('appointmentReason');
        // Validate patientId
        if (!patientId) {
            return server_1.NextResponse.json({ error: 'patientId is required' }, { status: 400 });
        }
        // Fetch patient with all related data
        const patient = await (0, patient_data_fetcher_1.fetchPatientWithContext)(patientId);
        if (!patient) {
            return server_1.NextResponse.json({ error: 'Patient not found' }, { status: 404 });
        }
        // Generate context based on format
        let context;
        switch (format) {
            case 'soap':
                if (!chiefComplaint) {
                    return server_1.NextResponse.json({ error: 'chiefComplaint is required for SOAP format' }, { status: 400 });
                }
                context = (0, patient_context_formatter_1.formatPatientContextForSOAP)(patient, chiefComplaint);
                break;
            case 'scribe':
                if (!appointmentReason) {
                    return server_1.NextResponse.json({ error: 'appointmentReason is required for scribe format' }, { status: 400 });
                }
                context = (0, patient_context_formatter_1.formatPatientContextForScribe)(patient, appointmentReason);
                break;
            case 'summary':
                context = (0, patient_context_formatter_1.formatPatientSummary)(patient);
                break;
            case 'full':
            default:
                context = (0, patient_context_formatter_1.formatPatientContext)(patient);
                break;
        }
        return server_1.NextResponse.json({
            success: true,
            patient: {
                id: patient.id,
                name: `${patient.firstName} ${patient.lastName}`,
                mrn: patient.mrn,
            },
            format,
            context,
        });
    }
    catch (error) {
        console.error('Error generating patient context:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map