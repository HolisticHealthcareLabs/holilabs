/**
 * Appointment Reminder Service
 * Automated reminder emails for upcoming appointments
 * @compliance HIPAA §164.506 - Treatment communications
 */

import { prisma } from '@/lib/prisma';
import { queueEmail } from '@/lib/email/email-service';
import { appointmentReminderTemplate } from '@/lib/email/templates';

/**
 * Find appointments that need reminders
 * Default: Send 24 hours before appointment
 */
export async function findAppointmentsNeedingReminders(
  hoursBeforeAppointment = 24
): Promise<any[]> {
  const now = new Date();
  const reminderWindowStart = new Date(now.getTime() + hoursBeforeAppointment * 60 * 60 * 1000);
  const reminderWindowEnd = new Date(
    reminderWindowStart.getTime() + 60 * 60 * 1000
  ); // 1 hour window

  const appointments = await prisma.appointment.findMany({
    where: {
      // Appointments in the reminder window
      startTime: {
        gte: reminderWindowStart,
        lte: reminderWindowEnd,
      },
      // Not already sent
      reminderSent: false,
      // Only scheduled appointments
      status: {
        in: ['SCHEDULED', 'CONFIRMED'],
      },
    },
    include: {
      patient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          preferredName: true,
        },
      },
      clinician: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          specialty: true,
        },
      },
    },
    orderBy: {
      startTime: 'asc',
    },
  });

  return appointments;
}

/**
 * Send appointment reminder email
 */
export async function sendAppointmentReminder(appointmentId: string): Promise<boolean> {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            preferredName: true,
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

    if (!appointment) {
      console.error(`[Reminder] Appointment ${appointmentId} not found`);
      return false;
    }

    // Check if patient has email
    if (!appointment.patient.email) {
      console.warn(
        `[Reminder] Patient ${appointment.patientId} has no email, skipping reminder`
      );
      // Mark as sent to avoid repeated attempts
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          reminderSent: true,
          reminderSentAt: new Date(),
        },
      });
      return false;
    }

    // Prepare email data
    const patientName =
      appointment.patient.preferredName ||
      `${appointment.patient.firstName} ${appointment.patient.lastName}`;
    const doctorName = `Dr. ${appointment.clinician.firstName} ${appointment.clinician.lastName}`;
    const location = appointment.branchAddress || appointment.branch || 'Our office';

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const rescheduleUrl = `${baseUrl}/portal/appointments/${appointmentId}`;

    // Generate email template
    const { subject, html, text } = appointmentReminderTemplate({
      patientName,
      appointmentDate: appointment.startTime,
      doctorName,
      appointmentType: appointment.title,
      location,
      rescheduleUrl,
    });

    // Queue email
    const emailId = await queueEmail({
      to: appointment.patient.email,
      subject,
      html,
      text,
    });

    // Mark reminder as sent
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        reminderSent: true,
        reminderSentAt: new Date(),
      },
    });

    console.log(
      `[Reminder] Queued reminder for appointment ${appointmentId}, Email ID: ${emailId}`
    );

    return true;
  } catch (error) {
    console.error(`[Reminder] Failed to send reminder for appointment ${appointmentId}:`, error);
    return false;
  }
}

/**
 * Process all pending appointment reminders
 * Call from cron job
 */
export async function processAppointmentReminders(
  hoursBeforeAppointment = 24
): Promise<{ processed: number; failed: number; skipped: number }> {
  console.log('[Reminder] Starting appointment reminder processing...');

  const appointments = await findAppointmentsNeedingReminders(hoursBeforeAppointment);

  console.log(`[Reminder] Found ${appointments.length} appointments needing reminders`);

  let processed = 0;
  let failed = 0;
  let skipped = 0;

  for (const appointment of appointments) {
    try {
      const sent = await sendAppointmentReminder(appointment.id);
      if (sent) {
        processed++;
      } else {
        skipped++;
      }
    } catch (error) {
      console.error(`[Reminder] Error processing appointment ${appointment.id}:`, error);
      failed++;
    }
  }

  console.log(
    `[Reminder] Completed: ${processed} sent, ${skipped} skipped, ${failed} failed`
  );

  return { processed, failed, skipped };
}

/**
 * Send immediate reminder for a specific appointment (manual trigger)
 */
export async function sendImmediateReminder(appointmentId: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        status: true,
        startTime: true,
        reminderSent: true,
      },
    });

    if (!appointment) {
      return { success: false, message: 'Appointment not found' };
    }

    if (appointment.status === 'CANCELLED') {
      return { success: false, message: 'Cannot send reminder for cancelled appointment' };
    }

    // Allow resending even if already sent (manual override)
    const sent = await sendAppointmentReminder(appointmentId);

    if (sent) {
      return { success: true, message: 'Reminder sent successfully' };
    } else {
      return { success: false, message: 'Failed to send reminder (no email or error)' };
    }
  } catch (error) {
    console.error('[Reminder] Error sending immediate reminder:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
