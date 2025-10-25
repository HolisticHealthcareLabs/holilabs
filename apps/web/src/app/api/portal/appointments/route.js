"use strict";
/**
 * Patient Appointments API
 *
 * GET /api/portal/appointments
 * Fetch all appointments for authenticated patient
 *
 * POST /api/portal/appointments
 * Request a new appointment
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
const patient_session_1 = require("@/lib/auth/patient-session");
const prisma_1 = require("@/lib/prisma");
const logger_1 = __importDefault(require("@/lib/logger"));
const zod_1 = require("zod");
// Query parameters schema
// TODO: RESCHEDULED status doesn't exist in AppointmentStatus enum
const AppointmentsQuerySchema = zod_1.z.object({
    status: zod_1.z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS']).optional(),
    upcoming: zod_1.z.coerce.boolean().optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(50),
});
// Create appointment request schema
const CreateAppointmentSchema = zod_1.z.object({
    reason: zod_1.z.string().min(10, 'Describe el motivo de la consulta (mínimo 10 caracteres)'),
    preferredDate: zod_1.z.string(), // ISO date
    preferredTime: zod_1.z.enum(['MORNING', 'AFTERNOON', 'EVENING']),
    type: zod_1.z.enum(['IN_PERSON', 'VIRTUAL', 'PHONE']).default('IN_PERSON'),
    notes: zod_1.z.string().optional(),
    urgency: zod_1.z.enum(['ROUTINE', 'URGENT', 'EMERGENCY']).default('ROUTINE'),
});
async function GET(request) {
    try {
        // Authenticate patient
        const session = await (0, patient_session_1.requirePatientSession)();
        // Parse query parameters
        const searchParams = request.nextUrl.searchParams;
        const queryValidation = AppointmentsQuerySchema.safeParse({
            status: searchParams.get('status'),
            upcoming: searchParams.get('upcoming'),
            limit: searchParams.get('limit'),
        });
        if (!queryValidation.success) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Invalid query parameters',
                details: queryValidation.error.errors,
            }, { status: 400 });
        }
        const { status, upcoming, limit } = queryValidation.data;
        // Build filter conditions
        const where = {
            patientId: session.patientId,
        };
        if (status) {
            where.status = status;
        }
        if (upcoming !== undefined) {
            if (upcoming) {
                where.startTime = {
                    gte: new Date(),
                };
                // TODO: RESCHEDULED status doesn't exist - using SCHEDULED and CONFIRMED
                where.status = {
                    in: ['SCHEDULED', 'CONFIRMED'],
                };
            }
            else {
                where.OR = [
                    { startTime: { lt: new Date() } },
                    { status: { in: ['COMPLETED', 'CANCELLED', 'NO_SHOW'] } },
                ];
            }
        }
        // Fetch appointments
        const appointments = await prisma_1.prisma.appointment.findMany({
            where,
            include: {
                clinician: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        specialty: true,
                        licenseNumber: true,
                    },
                },
                // TODO: recordingSessions relation doesn't exist in Prisma schema yet
                // recordingSessions: {
                //   select: {
                //     id: true,
                //     audioDuration: true,
                //     status: true,
                //   },
                // },
            },
            orderBy: {
                startTime: 'desc',
            },
            take: limit,
        });
        // Separate into upcoming and past
        const now = new Date();
        // TODO: RESCHEDULED status doesn't exist - using SCHEDULED and CONFIRMED
        const upcomingAppointments = appointments.filter((apt) => apt.startTime >= now && ['SCHEDULED', 'CONFIRMED'].includes(apt.status));
        const pastAppointments = appointments.filter((apt) => apt.startTime < now ||
            ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(apt.status));
        logger_1.default.info({
            event: 'patient_appointments_fetched',
            patientId: session.patientId,
            patientUserId: session.userId,
            count: appointments.length,
            upcoming: upcomingAppointments.length,
            past: pastAppointments.length,
        });
        return server_1.NextResponse.json({
            success: true,
            data: {
                appointments,
                summary: {
                    total: appointments.length,
                    upcoming: upcomingAppointments.length,
                    past: pastAppointments.length,
                },
                upcomingAppointments,
                pastAppointments,
            },
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
            event: 'patient_appointments_fetch_error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return server_1.NextResponse.json({
            success: false,
            error: 'Error al cargar las citas.',
        }, { status: 500 });
    }
}
async function POST(request) {
    try {
        // Authenticate patient
        const session = await (0, patient_session_1.requirePatientSession)();
        // Parse and validate request body
        const body = await request.json();
        const validation = CreateAppointmentSchema.safeParse(body);
        if (!validation.success) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Datos inválidos',
                details: validation.error.errors,
            }, { status: 400 });
        }
        const { reason, preferredDate, preferredTime, type, notes, urgency } = validation.data;
        // Map VIRTUAL to TELEHEALTH for Prisma schema compatibility
        const appointmentType = type === 'VIRTUAL' ? 'TELEHEALTH' : type;
        // Get patient's assigned clinician
        const patient = await prisma_1.prisma.patient.findUnique({
            where: { id: session.patientId },
            select: {
                assignedClinicianId: true,
                assignedClinician: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
        if (!patient?.assignedClinicianId) {
            return server_1.NextResponse.json({
                success: false,
                error: 'No tienes un médico asignado. Por favor, contacta a soporte.',
            }, { status: 400 });
        }
        // Parse preferred date
        const requestedDate = new Date(preferredDate);
        // Set approximate time based on preference
        let appointmentStart = new Date(requestedDate);
        if (preferredTime === 'MORNING') {
            appointmentStart.setHours(9, 0, 0, 0);
        }
        else if (preferredTime === 'AFTERNOON') {
            appointmentStart.setHours(14, 0, 0, 0);
        }
        else {
            appointmentStart.setHours(17, 0, 0, 0);
        }
        const appointmentEnd = new Date(appointmentStart.getTime() + 30 * 60 * 1000); // 30 min duration
        // Create appointment request with PENDING status
        const appointment = await prisma_1.prisma.appointment.create({
            data: {
                patientId: session.patientId,
                clinicianId: patient.assignedClinicianId,
                title: reason,
                description: notes || `Solicitud de ${type === 'VIRTUAL' ? 'consulta virtual' : type === 'PHONE' ? 'consulta telefónica' : 'consulta presencial'}`,
                startTime: appointmentStart,
                endTime: appointmentEnd,
                type: appointmentType,
                status: 'SCHEDULED', // Set to SCHEDULED - clinic will confirm
                // TODO: urgency field doesn't exist in Prisma schema yet
                // urgency,
            },
            include: {
                clinician: {
                    select: {
                        firstName: true,
                        lastName: true,
                        specialty: true,
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
                action: 'CREATE',
                resource: 'Appointment',
                resourceId: appointment.id,
                success: true,
                details: {
                    preferredTime,
                    urgency,
                },
            },
        });
        logger_1.default.info({
            event: 'appointment_requested',
            patientId: session.patientId,
            patientUserId: session.userId,
            appointmentId: appointment.id,
            type,
            urgency,
        });
        return server_1.NextResponse.json({
            success: true,
            message: 'Tu solicitud de cita ha sido enviada. Te contactaremos pronto para confirmar.',
            data: appointment,
        }, { status: 201 });
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
            event: 'appointment_request_error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return server_1.NextResponse.json({
            success: false,
            error: 'Error al solicitar la cita.',
        }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map