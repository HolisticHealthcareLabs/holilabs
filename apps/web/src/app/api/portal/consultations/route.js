"use strict";
/**
 * Patient Consultations API
 *
 * GET /api/portal/consultations
 * Fetch all consultation recordings for authenticated patient
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const patient_session_1 = require("@/lib/auth/patient-session");
const logger_1 = __importDefault(require("@/lib/logger"));
async function GET(request) {
    try {
        // Authenticate patient
        const session = await (0, patient_session_1.requirePatientSession)();
        // TODO: recordingSession model doesn't exist in Prisma schema yet
        // Fetch all recordings for this patient
        // const recordings = await prisma.recordingSession.findMany({
        //   where: {
        //     patientId: session.patientId,
        //     status: {
        //       in: ['COMPLETED', 'PROCESSING', 'TRANSCRIBING'],
        //     },
        //   },
        //   include: {
        //     appointment: {
        //       select: {
        //         id: true,
        //         title: true,
        //         startTime: true,
        //       },
        //     },
        //   },
        //   orderBy: {
        //     startedAt: 'desc',
        //   },
        // });
        const recordings = []; // Temporary empty array until model is added
        logger_1.default.info({
            event: 'patient_consultations_fetched',
            patientId: session.patientId,
            patientUserId: session.userId,
            count: recordings.length,
        });
        return server_1.NextResponse.json({
            success: true,
            data: recordings,
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
            event: 'patient_consultations_fetch_error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return server_1.NextResponse.json({
            success: false,
            error: 'Error al cargar consultas.',
        }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map