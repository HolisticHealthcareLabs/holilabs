"use strict";
/**
 * Individual Appointment API
 *
 * GET /api/portal/appointments/[id] - Get appointment details
 * PATCH /api/portal/appointments/[id] - Cancel appointment
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.PATCH = PATCH;
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
                error: 'Appointment ID is required',
            }, { status: 400 });
        }
        // Fetch appointment with full details
        const appointment = await prisma_1.prisma.appointment.findUnique({
            where: { id },
            include: {
                clinician: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        specialty: true,
                        licenseNumber: true,
                        email: true,
                    },
                },
                patient: {
                    select: {
                        id: true,
                        mrn: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
        if (!appointment) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Cita no encontrada.',
            }, { status: 404 });
        }
        // Verify the appointment belongs to the authenticated patient
        if (appointment.patientId !== session.patientId) {
            logger_1.default.warn({
                event: 'unauthorized_appointment_access_attempt',
                patientId: session.patientId,
                requestedAppointmentId: id,
                actualAppointmentPatientId: appointment.patientId,
            });
            return server_1.NextResponse.json({
                success: false,
                error: 'No tienes permiso para acceder a esta cita.',
            }, { status: 403 });
        }
        // Log access for HIPAA compliance
        logger_1.default.info({
            event: 'patient_appointment_accessed',
            patientId: session.patientId,
            appointmentId: appointment.id,
        });
        return server_1.NextResponse.json({
            success: true,
            data: appointment,
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
            event: 'patient_appointment_fetch_error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return server_1.NextResponse.json({
            success: false,
            error: 'Error al cargar la cita.',
        }, { status: 500 });
    }
}
async function PATCH(request, { params }) {
    try {
        // Authenticate patient
        const session = await (0, patient_session_1.requirePatientSession)();
        const { id } = params;
        const body = await request.json();
        const { action } = body;
        if (!id) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Appointment ID is required',
            }, { status: 400 });
        }
        if (action !== 'cancel') {
            return server_1.NextResponse.json({
                success: false,
                error: 'Invalid action',
            }, { status: 400 });
        }
        // Fetch appointment
        const appointment = await prisma_1.prisma.appointment.findUnique({
            where: { id },
            select: {
                id: true,
                patientId: true,
                status: true,
                startTime: true,
            },
        });
        if (!appointment) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Cita no encontrada.',
            }, { status: 404 });
        }
        // Verify the appointment belongs to the authenticated patient
        if (appointment.patientId !== session.patientId) {
            logger_1.default.warn({
                event: 'unauthorized_appointment_cancel_attempt',
                patientId: session.patientId,
                requestedAppointmentId: id,
            });
            return server_1.NextResponse.json({
                success: false,
                error: 'No tienes permiso para cancelar esta cita.',
            }, { status: 403 });
        }
        // Check if appointment can be cancelled
        if (appointment.status === 'CANCELLED') {
            return server_1.NextResponse.json({
                success: false,
                error: 'Esta cita ya está cancelada.',
            }, { status: 400 });
        }
        if (appointment.status === 'COMPLETED') {
            return server_1.NextResponse.json({
                success: false,
                error: 'No puedes cancelar una cita completada.',
            }, { status: 400 });
        }
        // Check if appointment is in the past
        if (new Date(appointment.startTime) < new Date()) {
            return server_1.NextResponse.json({
                success: false,
                error: 'No puedes cancelar una cita que ya pasó.',
            }, { status: 400 });
        }
        // Cancel appointment
        const updatedAppointment = await prisma_1.prisma.appointment.update({
            where: { id },
            data: {
                status: 'CANCELLED',
                description: `Cancelada por el paciente el ${new Date().toISOString()}`,
            },
            include: {
                clinician: {
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
                userId: session.userId,
                userEmail: session.email,
                ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
                action: 'UPDATE',
                resource: 'Appointment',
                resourceId: appointment.id,
                success: true,
                details: {
                    action: 'cancel',
                    previousStatus: appointment.status,
                    newStatus: 'CANCELLED',
                },
            },
        });
        logger_1.default.info({
            event: 'appointment_cancelled_by_patient',
            patientId: session.patientId,
            appointmentId: appointment.id,
        });
        return server_1.NextResponse.json({
            success: true,
            message: 'Cita cancelada exitosamente.',
            data: updatedAppointment,
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
            event: 'appointment_cancel_error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return server_1.NextResponse.json({
            success: false,
            error: 'Error al cancelar la cita.',
        }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map