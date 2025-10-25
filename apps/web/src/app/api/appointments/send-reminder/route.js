"use strict";
/**
 * Send Appointment Reminder API
 * Sends SMS reminder for a specific appointment
 *
 * POST /api/appointments/send-reminder
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = exports.dynamic = void 0;
const server_1 = require("next/server");
const prisma_1 = require("@/lib/prisma");
const middleware_1 = require("@/lib/api/middleware");
const sms_1 = require("@/lib/sms");
const zod_1 = require("zod");
// Force dynamic rendering
exports.dynamic = 'force-dynamic';
const SendReminderSchema = zod_1.z.object({
    appointmentId: zod_1.z.string().cuid(),
    force: zod_1.z.boolean().optional(), // Force send even if already sent
});
exports.POST = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    const body = await request.json();
    const validated = SendReminderSchema.parse(body);
    // Fetch appointment with patient and clinician details
    const appointment = await prisma_1.prisma.appointment.findUnique({
        where: { id: validated.appointmentId },
        include: {
            patient: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                },
            },
            clinician: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                },
            },
        },
    });
    if (!appointment) {
        return server_1.NextResponse.json({
            success: false,
            error: 'Appointment not found',
        }, { status: 404 });
    }
    // Check if reminder already sent (unless force flag is set)
    if (appointment.reminderSent && !validated.force) {
        return server_1.NextResponse.json({
            success: false,
            error: 'Reminder already sent for this appointment',
            data: {
                reminderSentAt: appointment.reminderSentAt,
            },
        }, { status: 400 });
    }
    // Check if appointment is in the past
    if (appointment.startTime < new Date()) {
        return server_1.NextResponse.json({
            success: false,
            error: 'Cannot send reminder for past appointment',
        }, { status: 400 });
    }
    // Check if patient has phone number
    if (!appointment.patient.phone) {
        return server_1.NextResponse.json({
            success: false,
            error: 'Patient has no phone number on file',
        }, { status: 400 });
    }
    // Send SMS reminder
    const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`;
    const clinicianName = `Dr. ${appointment.clinician.firstName} ${appointment.clinician.lastName}`;
    const smsResult = await (0, sms_1.sendAppointmentReminderSMS)(appointment.patient.phone, patientName, appointment.startTime, clinicianName);
    if (!smsResult) {
        return server_1.NextResponse.json({
            success: false,
            error: 'Failed to send SMS reminder',
        }, { status: 500 });
    }
    // Update appointment reminder status
    const updatedAppointment = await prisma_1.prisma.appointment.update({
        where: { id: validated.appointmentId },
        data: {
            reminderSent: true,
            reminderSentAt: new Date(),
        },
    });
    return server_1.NextResponse.json({
        success: true,
        data: {
            appointmentId: updatedAppointment.id,
            reminderSentAt: updatedAppointment.reminderSentAt,
            sentTo: appointment.patient.phone,
        },
        message: 'SMS reminder sent successfully',
    });
}, {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
    audit: { action: 'UPDATE', resource: 'Appointment' },
});
//# sourceMappingURL=route.js.map