"use strict";
/**
 * Appointment Confirmation System
 * Handles magic link generation, confirmation, and reschedule requests
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateConfirmationToken = generateConfirmationToken;
exports.createConfirmationLink = createConfirmationLink;
exports.getAppointmentByToken = getAppointmentByToken;
exports.confirmAppointment = confirmAppointment;
exports.cancelAppointment = cancelAppointment;
exports.requestReschedule = requestReschedule;
exports.getAvailableSlots = getAvailableSlots;
exports.formatAppointmentDetails = formatAppointmentDetails;
const prisma_1 = require("@/lib/prisma");
const crypto_1 = __importDefault(require("crypto"));
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
/**
 * Generate unique confirmation token
 */
function generateConfirmationToken() {
    return crypto_1.default.randomBytes(32).toString('base64url');
}
/**
 * Create confirmation link for appointment
 */
async function createConfirmationLink(appointmentId) {
    const token = generateConfirmationToken();
    await prisma_1.prisma.appointment.update({
        where: { id: appointmentId },
        data: {
            confirmationToken: token,
            confirmationStatus: 'SENT',
            confirmationSentAt: new Date(),
        },
    });
    // In production, use your actual domain
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://holilabs.com';
    return `${baseUrl}/confirm/${token}`;
}
/**
 * Get appointment by confirmation token
 */
async function getAppointmentByToken(token) {
    const appointment = await prisma_1.prisma.appointment.findUnique({
        where: { confirmationToken: token },
        include: {
            patient: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    email: true,
                },
            },
            clinician: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    specialty: true,
                },
            },
        },
    });
    return appointment;
}
/**
 * Confirm appointment
 */
async function confirmAppointment(token) {
    const appointment = await getAppointmentByToken(token);
    if (!appointment) {
        throw new Error('Appointment not found');
    }
    if (appointment.status === 'CANCELLED') {
        throw new Error('This appointment has been cancelled');
    }
    if (appointment.status === 'COMPLETED') {
        throw new Error('This appointment has already been completed');
    }
    // Check if appointment is in the past
    if (new Date(appointment.startTime) < new Date()) {
        throw new Error('This appointment is in the past');
    }
    await prisma_1.prisma.appointment.update({
        where: { id: appointment.id },
        data: {
            confirmationStatus: 'CONFIRMED',
            confirmedAt: new Date(),
            status: 'CONFIRMED',
        },
    });
    return appointment;
}
/**
 * Cancel appointment
 */
async function cancelAppointment(token, reason) {
    const appointment = await getAppointmentByToken(token);
    if (!appointment) {
        throw new Error('Appointment not found');
    }
    if (appointment.status === 'CANCELLED') {
        throw new Error('This appointment is already cancelled');
    }
    if (appointment.status === 'COMPLETED') {
        throw new Error('Cannot cancel a completed appointment');
    }
    await prisma_1.prisma.appointment.update({
        where: { id: appointment.id },
        data: {
            confirmationStatus: 'CANCELLED_BY_PATIENT',
            status: 'CANCELLED',
            description: reason || `Cancelada por el paciente el ${new Date().toISOString()}`,
        },
    });
    // Create notification for clinician
    await prisma_1.prisma.notification.create({
        data: {
            recipientId: appointment.clinicianId,
            recipientType: 'CLINICIAN',
            type: 'APPOINTMENT_CANCELLED',
            title: 'Cita cancelada por paciente',
            message: `${appointment.patient.firstName} ${appointment.patient.lastName} canceló su cita del ${(0, date_fns_1.format)(appointment.startTime, "d 'de' MMMM 'a las' HH:mm", { locale: locale_1.es })}`,
            priority: 'HIGH',
            actionUrl: `/dashboard/appointments/${appointment.id}`,
            actionLabel: 'Ver detalles',
        },
    });
    return appointment;
}
/**
 * Request reschedule
 */
async function requestReschedule(token, newTime, reason) {
    const appointment = await getAppointmentByToken(token);
    if (!appointment) {
        throw new Error('Appointment not found');
    }
    if (appointment.status === 'CANCELLED') {
        throw new Error('Cannot reschedule a cancelled appointment');
    }
    if (appointment.status === 'COMPLETED') {
        throw new Error('Cannot reschedule a completed appointment');
    }
    await prisma_1.prisma.appointment.update({
        where: { id: appointment.id },
        data: {
            confirmationStatus: 'RESCHEDULE_REQUESTED',
            rescheduleRequested: true,
            rescheduleRequestedAt: new Date(),
            rescheduleNewTime: newTime,
            rescheduleReason: reason,
            rescheduleApproved: null, // Reset approval status
        },
    });
    // Create notification for clinician
    await prisma_1.prisma.notification.create({
        data: {
            recipientId: appointment.clinicianId,
            recipientType: 'CLINICIAN',
            type: 'APPOINTMENT_RESCHEDULED',
            title: 'Solicitud de reagendamiento',
            message: `${appointment.patient.firstName} ${appointment.patient.lastName} solicita reagendar su cita a ${(0, date_fns_1.format)(newTime, "d 'de' MMMM 'a las' HH:mm", { locale: locale_1.es })}`,
            priority: 'HIGH',
            actionUrl: `/dashboard/appointments/${appointment.id}`,
            actionLabel: 'Revisar solicitud',
        },
    });
    return appointment;
}
/**
 * Get available time slots for rescheduling
 */
async function getAvailableSlots(clinicianId, startDate, endDate) {
    // Get clinician's existing appointments
    const existingAppointments = await prisma_1.prisma.appointment.findMany({
        where: {
            clinicianId,
            startTime: {
                gte: startDate,
                lte: endDate,
            },
            status: {
                notIn: ['CANCELLED', 'NO_SHOW'],
            },
        },
        orderBy: {
            startTime: 'asc',
        },
    });
    // Generate available slots (9 AM - 5 PM, 30-minute intervals)
    const slots = [];
    let currentTime = new Date(startDate);
    currentTime.setHours(9, 0, 0, 0);
    const endTime = new Date(endDate);
    endTime.setHours(17, 0, 0, 0);
    while (currentTime < endTime) {
        // Skip weekends
        if (currentTime.getDay() !== 0 && currentTime.getDay() !== 6) {
            // Check if slot is available
            const isAvailable = !existingAppointments.some((apt) => {
                const aptStart = new Date(apt.startTime);
                const aptEnd = new Date(apt.endTime);
                return currentTime >= aptStart && currentTime < aptEnd;
            });
            if (isAvailable && currentTime > new Date()) {
                slots.push(new Date(currentTime));
            }
        }
        // Move to next 30-minute slot
        currentTime = addMinutes(currentTime, 30);
    }
    return slots;
}
function addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes * 60000);
}
/**
 * Format appointment details for notifications
 */
function formatAppointmentDetails(appointment) {
    return {
        patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
        clinicianName: `Dr. ${appointment.clinician.firstName} ${appointment.clinician.lastName}`,
        date: (0, date_fns_1.format)(appointment.startTime, "EEEE, d 'de' MMMM", { locale: locale_1.es }),
        time: (0, date_fns_1.format)(appointment.startTime, 'HH:mm', { locale: locale_1.es }),
        dateTime: (0, date_fns_1.format)(appointment.startTime, "d 'de' MMMM 'a las' HH:mm", { locale: locale_1.es }),
        type: appointment.type,
    };
}
//# sourceMappingURL=confirmation.js.map