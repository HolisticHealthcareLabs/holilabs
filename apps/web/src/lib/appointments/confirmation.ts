/**
 * Appointment Confirmation System
 * Handles magic link generation, confirmation, and reschedule requests
 */

import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { addDays, addHours, format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Generate unique confirmation token
 */
export function generateConfirmationToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Create confirmation link for appointment
 */
export async function createConfirmationLink(appointmentId: string): Promise<string> {
  const token = generateConfirmationToken();

  await prisma.appointment.update({
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
export async function getAppointmentByToken(token: string) {
  const appointment = await prisma.appointment.findUnique({
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
export async function confirmAppointment(token: string) {
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

  await prisma.appointment.update({
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
export async function cancelAppointment(token: string, reason?: string) {
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

  await prisma.appointment.update({
    where: { id: appointment.id },
    data: {
      confirmationStatus: 'CANCELLED_BY_PATIENT',
      status: 'CANCELLED',
      description: reason || `Cancelada por el paciente el ${new Date().toISOString()}`,
    },
  });

  // Create notification for clinician
  await prisma.notification.create({
    data: {
      recipientId: appointment.clinicianId,
      recipientType: 'CLINICIAN',
      type: 'APPOINTMENT_CANCELLED',
      title: 'Cita cancelada por paciente',
      message: `${appointment.patient.firstName} ${appointment.patient.lastName} canceló su cita del ${format(appointment.startTime, "d 'de' MMMM 'a las' HH:mm", { locale: es })}`,
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
export async function requestReschedule(
  token: string,
  newTime: Date,
  reason?: string
) {
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

  await prisma.appointment.update({
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
  await prisma.notification.create({
    data: {
      recipientId: appointment.clinicianId,
      recipientType: 'CLINICIAN',
      type: 'APPOINTMENT_RESCHEDULED',
      title: 'Solicitud de reagendamiento',
      message: `${appointment.patient.firstName} ${appointment.patient.lastName} solicita reagendar su cita a ${format(newTime, "d 'de' MMMM 'a las' HH:mm", { locale: es })}`,
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
export async function getAvailableSlots(
  clinicianId: string,
  startDate: Date,
  endDate: Date
) {
  // Get clinician's existing appointments
  const existingAppointments = await prisma.appointment.findMany({
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
  const slots: Date[] = [];
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

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}

/**
 * Format appointment details for notifications
 */
export function formatAppointmentDetails(appointment: any) {
  return {
    patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
    clinicianName: `Dr. ${appointment.clinician.firstName} ${appointment.clinician.lastName}`,
    date: format(appointment.startTime, "EEEE, d 'de' MMMM", { locale: es }),
    time: format(appointment.startTime, 'HH:mm', { locale: es }),
    dateTime: format(appointment.startTime, "d 'de' MMMM 'a las' HH:mm", { locale: es }),
    type: appointment.type,
  };
}
