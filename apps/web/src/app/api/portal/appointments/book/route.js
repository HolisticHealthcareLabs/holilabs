"use strict";
/**
 * Book Appointment API
 * Creates a new appointment and sends confirmation notification
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const patient_session_1 = require("@/lib/auth/patient-session");
const prisma_1 = require("@/lib/prisma");
const zod_1 = require("zod");
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
const bookingSchema = zod_1.z.object({
    clinicianId: zod_1.z.string().cuid(),
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
    time: zod_1.z.string().regex(/^\d{2}:\d{2}$/), // HH:mm
    type: zod_1.z.enum(['IN_PERSON', 'TELEHEALTH', 'PHONE']),
    reason: zod_1.z.string().min(3).max(500),
    notes: zod_1.z.string().max(1000).optional(),
});
const APPOINTMENT_DURATION_MINUTES = 30;
async function POST(request) {
    try {
        // Authenticate patient
        const session = await (0, patient_session_1.requirePatientSession)();
        // Parse request body
        const body = await request.json();
        const validated = bookingSchema.parse(body);
        // Get patient info
        const patient = await prisma_1.prisma.patient.findUnique({
            where: { id: session.patientId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
            },
        });
        if (!patient) {
            return server_1.NextResponse.json({ success: false, error: 'Patient not found' }, { status: 404 });
        }
        // Get clinician info
        const clinician = await prisma_1.prisma.user.findUnique({
            where: { id: validated.clinicianId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
            },
        });
        if (!clinician || clinician.role !== 'CLINICIAN') {
            return server_1.NextResponse.json({ success: false, error: 'Clinician not found' }, { status: 404 });
        }
        // Parse datetime
        const startTime = (0, date_fns_1.parse)(`${validated.date} ${validated.time}`, 'yyyy-MM-dd HH:mm', new Date());
        const endTime = (0, date_fns_1.addMinutes)(startTime, APPOINTMENT_DURATION_MINUTES);
        // Check if slot is still available (race condition protection)
        const conflictingAppointment = await prisma_1.prisma.appointment.findFirst({
            where: {
                clinicianId: validated.clinicianId,
                status: {
                    notIn: ['CANCELLED', 'NO_SHOW'],
                },
                OR: [
                    {
                        AND: [
                            { startTime: { lte: startTime } },
                            { endTime: { gt: startTime } },
                        ],
                    },
                    {
                        AND: [
                            { startTime: { lt: endTime } },
                            { endTime: { gte: endTime } },
                        ],
                    },
                    {
                        AND: [
                            { startTime: { gte: startTime } },
                            { endTime: { lte: endTime } },
                        ],
                    },
                ],
            },
        });
        if (conflictingAppointment) {
            return server_1.NextResponse.json({
                success: false,
                error: 'This time slot is no longer available',
            }, { status: 409 });
        }
        // Generate title based on type
        const typeLabels = {
            IN_PERSON: 'Consulta Presencial',
            TELEHEALTH: 'Consulta Virtual',
            PHONE: 'Consulta Telefónica',
        };
        const title = `${typeLabels[validated.type]} - ${validated.reason}`;
        // Create appointment
        const appointment = await prisma_1.prisma.appointment.create({
            data: {
                patientId: session.patientId,
                clinicianId: validated.clinicianId,
                title,
                description: validated.notes || null,
                startTime,
                endTime,
                type: validated.type,
                status: 'SCHEDULED',
            },
            include: {
                clinician: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                patient: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });
        // Create audit log
        await prisma_1.prisma.auditLog.create({
            data: {
                userId: session.userId,
                userEmail: patient.email,
                action: 'CREATE',
                resource: 'Appointment',
                resourceId: appointment.id,
                details: {
                    clinicianId: validated.clinicianId,
                    startTime: startTime.toISOString(),
                    type: validated.type,
                    reason: validated.reason,
                },
                ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
                userAgent: request.headers.get('user-agent') || 'unknown',
            },
        });
        // Format date for notifications
        const formattedDate = (0, date_fns_1.format)(startTime, "EEEE, d 'de' MMMM 'a las' HH:mm", {
            locale: locale_1.es,
        });
        // Send confirmation notification to patient
        await prisma_1.prisma.notification.create({
            data: {
                recipientId: session.patientId,
                recipientType: 'PATIENT',
                type: 'APPOINTMENT_CONFIRMED',
                title: 'Cita confirmada',
                message: `Tu cita con Dr. ${clinician.firstName} ${clinician.lastName} ha sido confirmada para el ${formattedDate}`,
                priority: 'HIGH',
                actionUrl: `/portal/dashboard/appointments/${appointment.id}`,
                actionLabel: 'Ver detalles',
            },
        });
        // Send notification to clinician
        await prisma_1.prisma.notification.create({
            data: {
                recipientId: clinician.id,
                recipientType: 'CLINICIAN',
                type: 'APPOINTMENT_CONFIRMED',
                title: 'Nueva cita agendada',
                message: `${patient.firstName} ${patient.lastName} ha agendado una cita para el ${formattedDate}`,
                priority: 'NORMAL',
                actionUrl: `/clinician/appointments/${appointment.id}`,
                actionLabel: 'Ver detalles',
            },
        });
        return server_1.NextResponse.json({
            success: true,
            data: {
                appointment: {
                    id: appointment.id,
                    title: appointment.title,
                    startTime: appointment.startTime,
                    endTime: appointment.endTime,
                    type: appointment.type,
                    status: appointment.status,
                    clinician: {
                        name: `Dr. ${clinician.firstName} ${clinician.lastName}`,
                        email: clinician.email,
                    },
                },
            },
            message: 'Appointment booked successfully',
        });
    }
    catch (error) {
        console.error('Appointment booking error:', error);
        if (error instanceof zod_1.z.ZodError) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Invalid booking data',
                details: error.errors,
            }, { status: 400 });
        }
        return server_1.NextResponse.json({
            success: false,
            error: 'Failed to book appointment',
        }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map