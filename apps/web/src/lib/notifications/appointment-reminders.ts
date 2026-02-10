/**
 * Appointment Reminder Service
 * Orchestrates sending reminders via multiple channels
 * Priority: WhatsApp (98% open rate) → Push → Email → SMS
 */

import { createConfirmationLink, formatAppointmentDetails } from '../appointments/confirmation';
import { sendAppointmentConfirmationSMS } from './sms';
import { sendAppointmentConfirmationEmail } from './email';
import { sendPushNotification } from '../notifications/send-push';
import { sendAppointmentConfirmationWhatsApp } from './whatsapp';
import { prisma } from '../prisma';
import logger from '../logger';
import {
  buildReminderLifecycleEvent,
  buildReminderRetryState,
  DEFAULT_REMINDER_RETRY_POLICY,
  evaluateReminderConsent,
  type ReminderDispatchChannel,
} from './reminder-policy';

interface ReminderResult {
  success: boolean;
  channels: {
    whatsapp?: boolean;
    push?: boolean;
    sms?: boolean;
    email?: boolean;
  };
  error?: string;
}

function logReminderFailureEvent(input: {
  appointmentId: string;
  patientId: string;
  channel: ReminderDispatchChannel;
  templateName: string;
  error: string;
}) {
  const retryState = buildReminderRetryState(1, DEFAULT_REMINDER_RETRY_POLICY);
  logger.error(
    buildReminderLifecycleEvent({
      stage: 'fail',
      patientId: input.patientId,
      channel: input.channel,
      templateName: input.templateName,
      category: 'appointment',
      reminderId: input.appointmentId,
      error: input.error,
      retryState,
    })
  );

  if (retryState.escalationReady) {
    logger.error(
      buildReminderLifecycleEvent({
        stage: 'escalation',
        patientId: input.patientId,
        channel: input.channel,
        templateName: input.templateName,
        category: 'appointment',
        reminderId: input.appointmentId,
        error: retryState.escalationReason || input.error,
        retryState,
      })
    );
  }
}

/**
 * Check if current time is within patient's quiet hours
 */
function checkQuietHours(preferences: any): boolean {
  if (!preferences.quietHoursStart || !preferences.quietHoursEnd) {
    return false;
  }

  try {
    const now = new Date();
    const timezone = preferences.timezone || 'America/Mexico_City';

    // Get current time in patient's timezone
    const currentTime = now.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });

    const quietStart = preferences.quietHoursStart;
    const quietEnd = preferences.quietHoursEnd;

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (quietStart > quietEnd) {
      return currentTime >= quietStart || currentTime < quietEnd;
    }

    // Handle same-day quiet hours (e.g., 12:00 to 14:00)
    return currentTime >= quietStart && currentTime < quietEnd;
  } catch {
    return false;
  }
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
            preferences: true, // Include preferences
            consents: {
              where: {
                isActive: true,
                revokedAt: null,
                OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
              },
              select: {
                type: true,
              },
            },
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

    // Get or create default preferences
    let preferences = appointment.patient.preferences;
    if (!preferences) {
      preferences = await prisma.patientPreferences.create({
        data: {
          patientId: appointment.patientId,
        },
      });
    }

    // Check if we're in quiet hours (skip for emergency override)
    const isQuietHours = checkQuietHours(preferences);
    if (isQuietHours && !preferences.allowEmergencyOverride) {
      logReminderFailureEvent({
        appointmentId,
        patientId: appointment.patientId,
        channel: 'PUSH',
        templateName: 'Appointment Reminder',
        error: 'Skipped: quiet hours active',
      });

      logger.info({
        event: 'reminder_skipped_quiet_hours',
        appointmentId,
        patientId: appointment.patientId,
      });

      return {
        success: false,
        channels: {},
        error: 'Skipped: quiet hours active',
      };
    }

    // Generate confirmation link
    const confirmationUrl = await createConfirmationLink(appointmentId);

    // Format appointment details
    const details = formatAppointmentDetails(appointment);

    const channels: ReminderResult['channels'] = {};
    const activeConsentTypes = appointment.patient.consents.map((consent) => consent.type);

    // 1. Try WhatsApp FIRST (98% open rate, 97% of LATAM has it, $0.005/msg)
    if (appointment.patient.phone) {
      const whatsappConsent = evaluateReminderConsent({
        channel: 'WHATSAPP',
        category: 'appointment',
        preferences,
        activeConsentTypes,
      });

      if (!whatsappConsent.allowed) {
        channels.whatsapp = false;
        logReminderFailureEvent({
          appointmentId,
          patientId: appointment.patientId,
          channel: 'WHATSAPP',
          templateName: 'Appointment Reminder',
          error: whatsappConsent.reason || 'Consent denied for WhatsApp reminder',
        });
      } else {
        logger.info(
          buildReminderLifecycleEvent({
            stage: 'sent',
            patientId: appointment.patientId,
            channel: 'WHATSAPP',
            templateName: 'Appointment Reminder',
            category: 'appointment',
            reminderId: appointmentId,
          })
        );

      try {
        const whatsappSuccess = await sendAppointmentConfirmationWhatsApp(
          appointment.patient.phone,
          details.patientName,
          details.dateTime,
          details.clinicianName,
          confirmationUrl,
          'es' // Spanish for LATAM
        );

        channels.whatsapp = whatsappSuccess;

        if (whatsappSuccess) {
          await prisma.appointment.update({
            where: { id: appointmentId },
            data: { confirmationMethod: 'whatsapp' },
          });

          logger.info(
            buildReminderLifecycleEvent({
              stage: 'success',
              patientId: appointment.patientId,
              channel: 'WHATSAPP',
              templateName: 'Appointment Reminder',
              category: 'appointment',
              reminderId: appointmentId,
            })
          );
        } else {
          logReminderFailureEvent({
            appointmentId,
            patientId: appointment.patientId,
            channel: 'WHATSAPP',
            templateName: 'Appointment Reminder',
            error: 'WhatsApp dispatch returned false',
          });
        }
      } catch (error) {
        channels.whatsapp = false;
        logReminderFailureEvent({
          appointmentId,
          patientId: appointment.patientId,
          channel: 'WHATSAPP',
          templateName: 'Appointment Reminder',
          error: error instanceof Error ? error.message : 'Unknown WhatsApp error',
        });
      }
      }
    }

    // 2. Try Push Notification (FREE, instant, but requires app installed)
    if (!channels.whatsapp && appointment.patient.patientUser) {
      const pushConsent = evaluateReminderConsent({
        channel: 'PUSH',
        category: 'appointment',
        preferences,
        activeConsentTypes,
      });

      if (!pushConsent.allowed) {
        channels.push = false;
        logReminderFailureEvent({
          appointmentId,
          patientId: appointment.patientId,
          channel: 'PUSH',
          templateName: 'Appointment Reminder',
          error: pushConsent.reason || 'Consent denied for push reminder',
        });
      } else {
        logger.info(
          buildReminderLifecycleEvent({
            stage: 'sent',
            patientId: appointment.patientId,
            channel: 'PUSH',
            templateName: 'Appointment Reminder',
            category: 'appointment',
            reminderId: appointmentId,
          })
        );

      try {
        const pushResult = await sendPushNotification({
          userId: appointment.patient.patientUser.id,
          payload: {
            title: 'Confirma tu cita medica',
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

          logger.info(
            buildReminderLifecycleEvent({
              stage: 'success',
              patientId: appointment.patientId,
              channel: 'PUSH',
              templateName: 'Appointment Reminder',
              category: 'appointment',
              reminderId: appointmentId,
            })
          );
        } else {
          logReminderFailureEvent({
            appointmentId,
            patientId: appointment.patientId,
            channel: 'PUSH',
            templateName: 'Appointment Reminder',
            error: pushResult.errors.join(', ') || 'Push dispatch returned no successful sends',
          });
        }
      } catch (error) {
        channels.push = false;
        logReminderFailureEvent({
          appointmentId,
          patientId: appointment.patientId,
          channel: 'PUSH',
          templateName: 'Appointment Reminder',
          error: error instanceof Error ? error.message : 'Unknown push error',
        });
      }
      }
    }

    // 3. Fallback to Email (FREE, reliable, 20% open rate)
    if (!channels.whatsapp && !channels.push && appointment.patient.email) {
      const emailConsent = evaluateReminderConsent({
        channel: 'EMAIL',
        category: 'appointment',
        preferences,
        activeConsentTypes,
      });

      if (!emailConsent.allowed) {
        channels.email = false;
        logReminderFailureEvent({
          appointmentId,
          patientId: appointment.patientId,
          channel: 'EMAIL',
          templateName: 'Appointment Reminder',
          error: emailConsent.reason || 'Consent denied for email reminder',
        });
      } else {
        logger.info(
          buildReminderLifecycleEvent({
            stage: 'sent',
            patientId: appointment.patientId,
            channel: 'EMAIL',
            templateName: 'Appointment Reminder',
            category: 'appointment',
            reminderId: appointmentId,
          })
        );

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

        // Update confirmation method if email succeeded
        if (emailSuccess) {
          await prisma.appointment.update({
            where: { id: appointmentId },
            data: { confirmationMethod: 'email' },
          });

          logger.info(
            buildReminderLifecycleEvent({
              stage: 'success',
              patientId: appointment.patientId,
              channel: 'EMAIL',
              templateName: 'Appointment Reminder',
              category: 'appointment',
              reminderId: appointmentId,
            })
          );
        } else {
          logReminderFailureEvent({
            appointmentId,
            patientId: appointment.patientId,
            channel: 'EMAIL',
            templateName: 'Appointment Reminder',
            error: 'Email dispatch returned false',
          });
        }
      } catch (error) {
        channels.email = false;
        logReminderFailureEvent({
          appointmentId,
          patientId: appointment.patientId,
          channel: 'EMAIL',
          templateName: 'Appointment Reminder',
          error: error instanceof Error ? error.message : 'Unknown email error',
        });
      }
      }
    }

    // 4. Last resort: SMS (more expensive at $0.02/msg vs $0.005 for WhatsApp)
    if (!channels.whatsapp && !channels.push && !channels.email && appointment.patient.phone) {
      const smsConsent = evaluateReminderConsent({
        channel: 'SMS',
        category: 'appointment',
        preferences,
        activeConsentTypes,
      });

      if (!smsConsent.allowed) {
        channels.sms = false;
        logReminderFailureEvent({
          appointmentId,
          patientId: appointment.patientId,
          channel: 'SMS',
          templateName: 'Appointment Reminder',
          error: smsConsent.reason || 'Consent denied for SMS reminder',
        });
      } else {
        logger.info(
          buildReminderLifecycleEvent({
            stage: 'sent',
            patientId: appointment.patientId,
            channel: 'SMS',
            templateName: 'Appointment Reminder',
            category: 'appointment',
            reminderId: appointmentId,
          })
        );

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

          logger.info(
            buildReminderLifecycleEvent({
              stage: 'success',
              patientId: appointment.patientId,
              channel: 'SMS',
              templateName: 'Appointment Reminder',
              category: 'appointment',
              reminderId: appointmentId,
            })
          );
        } else {
          logReminderFailureEvent({
            appointmentId,
            patientId: appointment.patientId,
            channel: 'SMS',
            templateName: 'Appointment Reminder',
            error: 'SMS dispatch returned false',
          });
        }
      } catch (error) {
        channels.sms = false;
        logReminderFailureEvent({
          appointmentId,
          patientId: appointment.patientId,
          channel: 'SMS',
          templateName: 'Appointment Reminder',
          error: error instanceof Error ? error.message : 'Unknown SMS error',
        });
      }
      }
    }

    // Determine overall success (at least one channel worked)
    const success = Object.values(channels).some((result) => result === true);

    if (!success) {
      const escalationChannel: ReminderDispatchChannel =
        channels.whatsapp === false
          ? 'WHATSAPP'
          : channels.push === false
            ? 'PUSH'
            : channels.email === false
              ? 'EMAIL'
              : 'SMS';

      logger.error(
        buildReminderLifecycleEvent({
          stage: 'escalation',
          patientId: appointment.patientId,
          channel: escalationChannel,
          templateName: 'Appointment Reminder',
          category: 'appointment',
          reminderId: appointmentId,
          error: 'No reminder channel succeeded',
          retryState: buildReminderRetryState(
            DEFAULT_REMINDER_RETRY_POLICY.maxAttempts,
            DEFAULT_REMINDER_RETRY_POLICY
          ),
        })
      );
    }

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
