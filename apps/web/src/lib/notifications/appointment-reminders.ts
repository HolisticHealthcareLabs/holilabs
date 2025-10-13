/**
 * Appointment Reminder Service
 * Orchestrates sending reminders via multiple channels
 */

import { createConfirmationLink, formatAppointmentDetails } from '../appointments/confirmation';
import { sendAppointmentConfirmationSMS } from './sms';
import { sendAppointmentConfirmationEmail } from './email';
import { sendPushNotification } from '../notifications/send-push';
import { prisma } from '../prisma';
import logger from '../logger';

interface ReminderResult {
  success: boolean;
  channels: {
    push?: boolean;
    sms?: boolean;
    email?: boolean;
  };
  error?: string;
}

/**
 * Send appointment confirmation reminder via all available channels
 * Priority: Push → SMS → Email
 */
export async function sendAppointmentReminder(
  appointmentId: string
): Promise<ReminderResult> {
  try {
    // Get appointment with patient and clinician details
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          include: {
            patientUser: true,
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
      return {
        success: false,
        channels: {},
        error: 'Appointment not found',
      };
    }

    // Generate confirmation link
    const confirmationUrl = await createConfirmationLink(appointmentId);

    // Format appointment details
    const details = formatAppointmentDetails(appointment);

    const channels: ReminderResult['channels'] = {};

    // 1. Try Push Notification first (FREE, instant)
    if (appointment.patient.patientUser) {
      try {
        const pushResult = await sendPushNotification({
          userId: appointment.patient.patientUser.id,
          payload: {
            title: 'Confirma tu cita médica',
            body: `Cita con ${details.clinicianName} el ${details.dateTime}`,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            data: {
              type: 'appointment_confirmation',
              url: confirmationUrl,
              appointmentId: appointment.id,
            },
            actions: [
              {
                action: 'confirm',
                title: 'Confirmar',
              },
              {
                action: 'view',
                title: 'Ver Detalles',
              },
            ],
          },
          urgency: 'high',
        });

        channels.push = pushResult.success;

        // Update confirmation method if push succeeded
        if (pushResult.success && pushResult.sentCount > 0) {
          await prisma.appointment.update({
            where: { id: appointmentId },
            data: { confirmationMethod: 'push' },
          });
        }
      } catch (error) {
        console.error('Push notification error:', error);
        channels.push = false;
      }
    }

    // 2. Try SMS (cheap, high open rate)
    if (appointment.patient.phone) {
      try {
        const smsSuccess = await sendAppointmentConfirmationSMS(
          appointment.patient.phone,
          details.patientName,
          details.dateTime,
          details.clinicianName,
          confirmationUrl
        );

        channels.sms = smsSuccess;

        // Update confirmation method if SMS succeeded
        if (smsSuccess) {
          await prisma.appointment.update({
            where: { id: appointmentId },
            data: { confirmationMethod: 'sms' },
          });
        }
      } catch (error) {
        console.error('SMS error:', error);
        channels.sms = false;
      }
    }

    // 3. Fallback to Email (FREE, reliable)
    if (appointment.patient.email) {
      try {
        const emailSuccess = await sendAppointmentConfirmationEmail(
          appointment.patient.email,
          details.patientName,
          details.dateTime,
          details.clinicianName,
          appointment.type,
          confirmationUrl
        );

        channels.email = emailSuccess;

        // Update confirmation method if email succeeded and nothing else did
        if (emailSuccess && !channels.push && !channels.sms) {
          await prisma.appointment.update({
            where: { id: appointmentId },
            data: { confirmationMethod: 'email' },
          });
        }
      } catch (error) {
        console.error('Email error:', error);
        channels.email = false;
      }
    }

    // Determine overall success (at least one channel worked)
    const success = Object.values(channels).some((result) => result === true);

    // Log result
    logger.info({
      event: 'appointment_reminder_sent',
      appointmentId,
      patientId: appointment.patientId,
      channels,
      success,
    });

    return {
      success,
      channels,
    };
  } catch (error) {
    logger.error({
      event: 'appointment_reminder_error',
      appointmentId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      success: false,
      channels: {},
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send reminders for all appointments tomorrow
 */
export async function sendRemindersForTomorrow(): Promise<{
  total: number;
  sent: number;
  failed: number;
}> {
  // Get tomorrow's date range
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const dayAfterTomorrow = new Date(tomorrow);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

  // Find appointments tomorrow that need reminders
  const appointments = await prisma.appointment.findMany({
    where: {
      startTime: {
        gte: tomorrow,
        lt: dayAfterTomorrow,
      },
      status: {
        in: ['SCHEDULED', 'CONFIRMED'],
      },
      confirmationStatus: {
        in: ['PENDING', 'SENT'], // Don't spam if already confirmed
      },
      reminderSent: false, // Haven't sent reminder yet
    },
    select: {
      id: true,
    },
  });

  let sent = 0;
  let failed = 0;

  for (const appointment of appointments) {
    const result = await sendAppointmentReminder(appointment.id);

    if (result.success) {
      sent++;

      // Mark reminder as sent
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          reminderSent: true,
          reminderSentAt: new Date(),
        },
      });
    } else {
      failed++;
    }

    // Add small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  logger.info({
    event: 'daily_reminders_completed',
    total: appointments.length,
    sent,
    failed,
  });

  return {
    total: appointments.length,
    sent,
    failed,
  };
}
