"use strict";
/**
 * Stop Recording Session API
 *
 * POST /api/recordings/[id]/stop
 * Stop an active recording session
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const prisma_1 = require("@/lib/prisma");
const logger_1 = __importDefault(require("@/lib/logger"));
const next_auth_1 = require("next-auth");
const auth_1 = require("@/lib/auth");
async function POST(request, { params }) {
    try {
        // Authenticate user
        const session = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        if (!session?.user?.id) {
            return server_1.NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
        }
        const recordingId = params.id;
        // Get recording session
        const recording = await prisma_1.prisma.scribeSession.findUnique({
            where: { id: recordingId },
            include: {
                appointment: {
                    include: {
                        clinician: true, // TODO: Fixed - clinician is already a User, no nested 'user' relation exists
                    },
                },
            },
        });
        if (!recording) {
            return server_1.NextResponse.json({ success: false, error: 'Grabación no encontrada' }, { status: 404 });
        }
        // Verify ownership
        if (recording.appointment.clinician.id !== session.user.id) {
            return server_1.NextResponse.json({ success: false, error: 'No tienes permiso para detener esta grabación' }, { status: 403 });
        }
        // Check if already stopped
        if (recording.status !== 'RECORDING') {
            return server_1.NextResponse.json({
                success: false,
                error: 'Esta grabación ya fue detenida',
            }, { status: 400 });
        }
        // Calculate duration
        const startedAt = new Date(recording.startedAt);
        const endedAt = new Date();
        const durationSeconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);
        // Update recording session
        const updatedRecording = await prisma_1.prisma.scribeSession.update({
            where: { id: recordingId },
            data: {
                status: 'PROCESSING',
                endedAt,
                audioDuration: durationSeconds,
            },
            include: {
                appointment: {
                    select: {
                        title: true,
                    },
                },
                patient: {
                    select: {
                        firstName: true,
                        lastName: true,
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
                action: 'UPDATE',
                resource: 'RecordingSession',
                resourceId: recordingId,
                success: true,
                details: {
                    status: 'stopped',
                    durationSeconds,
                },
            },
        });
        logger_1.default.info({
            event: 'recording_stopped',
            userId: session.user.id,
            recordingId,
            durationSeconds,
        });
        return server_1.NextResponse.json({
            success: true,
            message: 'Grabación detenida',
            data: updatedRecording,
        }, { status: 200 });
    }
    catch (error) {
        logger_1.default.error({
            event: 'recording_stop_error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return server_1.NextResponse.json({
            success: false,
            error: 'Error al detener grabación',
        }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map