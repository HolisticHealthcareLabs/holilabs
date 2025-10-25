"use strict";
/**
 * Patient Medical Record Detail API
 *
 * GET /api/portal/records/[id]
 * Fetch single medical record with full details
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
        const recordId = params.id;
        // Fetch record with full details
        const record = await prisma_1.prisma.sOAPNote.findUnique({
            where: {
                id: recordId,
            },
            include: {
                patient: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        dateOfBirth: true,
                        mrn: true,
                    },
                },
                clinician: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        specialty: true,
                        licenseNumber: true,
                        npi: true,
                    },
                },
                session: {
                    select: {
                        id: true,
                        audioFileName: true,
                        audioDuration: true,
                        createdAt: true,
                        appointment: {
                            select: {
                                id: true,
                                title: true,
                                type: true,
                                startTime: true,
                            },
                        },
                    },
                },
            },
        });
        // Check if record exists
        if (!record) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Registro no encontrado.',
            }, { status: 404 });
        }
        // Verify record belongs to authenticated patient
        if (record.patientId !== session.patientId) {
            logger_1.default.warn({
                event: 'unauthorized_record_access_attempt',
                patientUserId: session.userId,
                requestedPatientId: record.patientId,
                recordId,
            });
            return server_1.NextResponse.json({
                success: false,
                error: 'No autorizado para ver este registro.',
            }, { status: 403 });
        }
        // Log access for HIPAA compliance
        logger_1.default.info({
            event: 'patient_record_viewed',
            patientId: session.patientId,
            patientUserId: session.userId,
            recordId,
            clinicianId: record.clinicianId,
        });
        return server_1.NextResponse.json({
            success: true,
            data: record,
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
            event: 'patient_record_fetch_error',
            error: error instanceof Error ? error.message : 'Unknown error',
            recordId: params.id,
        });
        return server_1.NextResponse.json({
            success: false,
            error: 'Error al cargar el registro médico.',
        }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map