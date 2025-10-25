"use strict";
/**
 * Start Recording Session API
 *
 * POST /api/recordings/start
 * Start a new audio recording session for a consultation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const prisma_1 = require("@/lib/prisma");
const logger_1 = __importDefault(require("@/lib/logger"));
const zod_1 = require("zod");
const next_auth_1 = require("next-auth");
const auth_1 = require("@/lib/auth");
const StartRecordingSchema = zod_1.z.object({
    appointmentId: zod_1.z.string().uuid(),
    patientId: zod_1.z.string().uuid(),
});
async function POST(request) {
    try {
        // Authenticate user
        const session = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        if (!session?.user?.id) {
            return server_1.NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
        }
        // Parse and validate request
        const body = await request.json();
        const validation = StartRecordingSchema.safeParse(body);
        if (!validation.success) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Datos inválidos',
                details: validation.error.errors,
            }, { status: 400 });
        }
        const { appointmentId, patientId } = validation.data;
        // Verify appointment exists and belongs to this clinician
        const appointment = await prisma_1.prisma.appointment.findUnique({
            where: { id: appointmentId },
            include: {
                clinician: true, // TODO: Fixed - clinician is already a User, no nested 'user' relation exists
                patient: true,
            },
        });
        if (!appointment) {
            return server_1.NextResponse.json({ success: false, error: 'Cita no encontrada' }, { status: 404 });
        }
        if (appointment.clinician.id !== session.user.id) {
            return server_1.NextResponse.json({ success: false, error: 'No tienes permiso para grabar esta cita' }, { status: 403 });
        }
        // Check if there's already an active recording for this appointment
        const existingRecording = await prisma_1.prisma.scribeSession.findFirst({
            where: {
                appointmentId,
                status: 'RECORDING',
            },
        });
        if (existingRecording) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Ya existe una grabación activa para esta cita',
            }, { status: 400 });
        }
        // Create new recording session
        const recording = await prisma_1.prisma.scribeSession.create({
            data: {
                appointmentId,
                patientId,
                clinicianId: appointment.clinicianId, // TODO: Added required clinicianId field
                status: 'RECORDING',
                startedAt: new Date(),
            },
            include: {
                appointment: {
                    select: {
                        title: true,
                        startTime: true,
                    },
                },
                patient: {
                    select: {
                        firstName: true,
                        lastName: true,
                        // TODO: patientId field doesn't exist on Patient model, using id instead
                        id: true,
                    },
                },
            },
        });
        // Create audit log
        await prisma_1.prisma.auditLog.create({
            data: {
                userId: session.user.id,
                userEmail: session.user.email || '',
                ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
                action: 'CREATE',
                resource: 'RecordingSession',
                resourceId: recording.id,
                success: true,
                details: {
                    appointmentId,
                    patientId,
                },
            },
        });
        logger_1.default.info({
            event: 'recording_started',
            userId: session.user.id,
            recordingId: recording.id,
            appointmentId,
            patientId,
        });
        return server_1.NextResponse.json({
            success: true,
            message: 'Grabación iniciada',
            data: recording,
        }, { status: 201 });
    }
    catch (error) {
        logger_1.default.error({
            event: 'recording_start_error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return server_1.NextResponse.json({
            success: false,
            error: 'Error al iniciar grabación',
        }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map