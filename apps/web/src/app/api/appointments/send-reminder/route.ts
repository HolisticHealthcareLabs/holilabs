/**
 * Send Appointment Reminder API
 * Sends SMS reminder for a specific appointment
 *
 * POST /api/appointments/send-reminder
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { sendAppointmentReminderSMS } from '@/lib/sms';
import { z } from 'zod';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const SendReminderSchema = z.object({
  appointmentId: z.string().cuid(),
  force: z.boolean().optional(), // Force send even if already sent
});

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const body = await request.json();
    const validated = SendReminderSchema.parse(body);

    // Fetch appointment with patient and clinician details
    const appointment = await prisma.appointment.findUnique({
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
      return NextResponse.json(
        {
          success: false,
          error: 'Appointment not found',
        },
        { status: 404 }
      );
    }

    // Check if reminder already sent (unless force flag is set)
    if (appointment.reminderSent && !validated.force) {
      return NextResponse.json(
        {
          success: false,
          error: 'Reminder already sent for this appointment',
          data: {
            reminderSentAt: appointment.reminderSentAt,
          },
        },
        { status: 400 }
      );
    }

    // Check if appointment is in the past
    if (appointment.startTime < new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot send reminder for past appointment',
        },
        { status: 400 }
      );
    }

    // Check if patient has phone number
    if (!appointment.patient.phone) {
      return NextResponse.json(
        {
          success: false,
          error: 'Patient has no phone number on file',
        },
        { status: 400 }
      );
    }

    // Send SMS reminder
    const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`;
    const clinicianName = `Dr. ${appointment.clinician.firstName} ${appointment.clinician.lastName}`;
    const timeStr = appointment.startTime.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const smsResult = await sendAppointmentReminderSMS(
      appointment.patient.phone,
      patientName,
      timeStr,
      clinicianName
    );

    if (!smsResult) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send SMS reminder',
        },
        { status: 500 }
      );
    }

    // Update appointment reminder status
    const updatedAppointment = await prisma.appointment.update({
      where: { id: validated.appointmentId },
      data: {
        reminderSent: true,
        reminderSentAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        appointmentId: updatedAppointment.id,
        reminderSentAt: updatedAppointment.reminderSentAt,
        sentTo: appointment.patient.phone,
      },
      message: 'SMS reminder sent successfully',
    });
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
    audit: { action: 'UPDATE', resource: 'Appointment' },
  }
);
