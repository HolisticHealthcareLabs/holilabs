"use strict";
/**
 * Individual Medication API
 *
 * GET /api/portal/medications/[id] - Get medication details
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const patient_session_1 = require("@/lib/auth/patient-session");
const prisma_1 = require("@/lib/prisma");
const logger_1 = __importDefault(require("@/lib/logger"));
async function GET(request, { params }) {
    try {
        // Authenticate patient
        const session = await (0, patient_session_1.requirePatientSession)();
        const { id } = params;
        if (!id) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Medication ID is required',
            }, { status: 400 });
        }
        // Fetch medication with full details
        const medication = await prisma_1.prisma.medication.findUnique({
            where: { id },
            // TODO: prescriber relation doesn't exist in Prisma schema yet
            // include: {
            //   prescriber: {
            //     select: {
            //       id: true,
            //       firstName: true,
            //       lastName: true,
            //       specialty: true,
            //       phone: true,
            //     },
            //   },
            // },
        });
        if (!medication) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Medicamento no encontrado.',
            }, { status: 404 });
        }
        // Verify the medication belongs to the authenticated patient
        if (medication.patientId !== session.patientId) {
            logger_1.default.warn({
                event: 'unauthorized_medication_access_attempt',
                patientId: session.patientId,
                requestedMedicationId: id,
                actualMedicationPatientId: medication.patientId,
            });
            return server_1.NextResponse.json({
                success: false,
                error: 'No tienes permiso para acceder a este medicamento.',
            }, { status: 403 });
        }
        // Log access for HIPAA compliance
        logger_1.default.info({
            event: 'patient_medication_accessed',
            patientId: session.patientId,
            medicationId: medication.id,
        });
        return server_1.NextResponse.json({
            success: true,
            data: medication,
        }, { status: 200 });
    }
    catch (error) {
        // Check if it's an auth error
        if (error instanceof Error && error.message.includes('Unauthorized')) {
            return server_1.NextResponse.json({
                success: false,
                error: 'No autorizado. Por favor, inicia sesión.',
            }, { status: 401 });
        }
        logger_1.default.error({
            event: 'patient_medication_fetch_error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return server_1.NextResponse.json({
            success: false,
            error: 'Error al cargar medicamento.',
        }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map