"use strict";
/**
 * Recording Detail API
 *
 * GET /api/recordings/[id]
 * Fetch recording session details
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const prisma_1 = require("@/lib/prisma");
const logger_1 = __importDefault(require("@/lib/logger"));
const next_auth_1 = require("next-auth");
const auth_1 = require("@/lib/auth");
async function GET(request, { params }) {
    try {
        // Authenticate user
        const session = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        if (!session?.user?.id) {
            return server_1.NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
        }
        const recordingId = params.id;
        // Fetch recording with all related data
        // TODO: recordingSession model doesn't exist - using scribeSession instead
        const recording = await prisma_1.prisma.scribeSession.findUnique({
            where: { id: recordingId },
            include: {
                appointment: {
                    select: {
                        id: true,
                        title: true,
                        startTime: true,
                        clinicianId: true,
                    },
                },
                patient: {
                    select: {
                        id: true,
                        // TODO: patientId field doesn't exist - using mrn instead
                        mrn: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
        if (!recording) {
            return server_1.NextResponse.json({ success: false, error: 'Grabación no encontrada' }, { status: 404 });
        }
        // Verify access (clinician who recorded it or patient)
        const isAuthorized = recording.appointment.clinicianId === session.user.id ||
            recording.patientId === session.user.id;
        if (!isAuthorized) {
            return server_1.NextResponse.json({ success: false, error: 'No tienes permiso para ver esta grabación' }, { status: 403 });
        }
        logger_1.default.info({
            event: 'recording_viewed',
            userId: session.user.id,
            recordingId,
        });
        return server_1.NextResponse.json({
            success: true,
            data: recording,
        }, { status: 200 });
    }
    catch (error) {
        logger_1.default.error({
            event: 'recording_fetch_error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return server_1.NextResponse.json({
            success: false,
            error: 'Error al cargar grabación',
        }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map