/**
 * Appointment Reminder Service
 * Orchestrates sending reminders via multiple channels
 * Priority: WhatsApp (98% open rate) → Push → Email → SMS
 */

import { createConfirmationLink, formatAppointmentDetails } from '../appointments/confirmation';
import { randomUUID } from 'node:crypto';
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
  executeReminderWithRetry,
  type ReminderDispatchChannel,
  type ReminderRetryState,
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

async function persistReminderFailureRecord(input: {
  appointmentId: string;
  patientId: string;
  channel: ReminderDispatchChannel;
  templateName: string;
  error: string;
  correlationId: string;
  retryState: ReminderRetryState;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: 'system',
        userEmail: 'system@holilabs.com',
        action: 'NOTIFY',
        resource: 'AppointmentReminder',
        resourceId: input.appointmentId,
        ipAddress: 'system',
        details: {
          patientId: input.patientId,
          channel: input.channel,
          templateName: input.templateName,
          correlationId: input.correlationId,
          reason: input.error,
          policyState: {
            attempt: input.retryState.attempt,
            maxAttempts: input.retryState.maxAttempts,
            remainingAttempts: input.retryState.remainingAttempts,
            nextAttempt: input.retryState.nextAttempt,
            nextRetryAt: input.retryState.nextRetryAt,
            escalationReady: input.retryState.escalationReady,
            escalationReason: input.retryState.escalationReason ?? null,
            state: input.retryState.state,
            terminal: input.retryState.terminal,
          },
        },
        success: false,
        errorMessage: input.error,
      },
    });
  } catch (persistError) {
    logger.error({
      event: 'appointment_reminder_failure_persist_error',
      appointmentId: input.appointmentId,
      patientId: input.patientId,
      channel: input.channel,
      correlationId: input.correlationId,
      error:
        persistError instanceof Error
          ? persistError.message
          : 'Failed to persist appointment reminder failure metadata',
    });
  }
}

async function logReminderFailureEvent(input: {
  appointmentId: string;
  patientId: string;
  channel: ReminderDispatchChannel;
  templateName: string;
  error: string;
  correlationId: string;
  attempt?: number;
  retryState?: ReminderRetryState;
  logEscalation?: boolean;
}) {
  const attempt = input.attempt ?? 1;
  const retryState =
    input.retryState ?? buildReminderRetryState(attempt, DEFAULT_REMINDER_RETRY_POLICY);
  logger.error(
    buildReminderLifecycleEvent({
      stage: 'fail',
      patientId: input.patientId,
      channel: input.channel,
      templateName: input.templateName,
      category: 'appointment',
      attempt,
      reminderId: input.appointmentId,
      error: input.error,
      correlationId: input.correlationId,
      retryState,
    })
  );

  await persistReminderFailureRecord({
    appointmentId: input.appointmentId,
    patientId: input.patientId,
    channel: input.channel,
    templateName: input.templateName,
    error: input.error,
    correlationId: input.correlationId,
    retryState,
  });

  if (retryState.escalationReady && (input.logEscalation ?? true)) {
    logger.error(
      buildReminderLifecycleEvent({
        stage: 'escalation_open',
        patientId: input.patientId,
        channel: input.channel,
        templateName: input.templateName,
        category: 'appointment',
        attempt,
        reminderId: input.appointmentId,
        error: retryState.escalationReason || input.error,
        correlationId: input.correlationId,
        retryState,
      })
    );
  }
}

async function executeChannelWithRetry(input: {
  appointmentId: string;
  patientId: string;
  channel: ReminderDispatchChannel;
  templateName: string;
  correlationId: string;
  executeAttempt: (attempt: number) => Promise<boolean>;
}) {
  const execution = await executeReminderWithRetry({
    policy: DEFAULT_REMINDER_RETRY_POLICY,
    executeAttempt: async (attempt) => {
      logger.info(
        buildReminderLifecycleEvent({
          stage: 'send',
          patientId: input.patientId,
          channel: input.channel,
          templateName: input.templateName,
          category: 'appointment',
          reminderId: input.appointmentId,
          attempt,
          correlationId: input.correlationId,
        })
      );

      return input.executeAttempt(attempt);
    },
    onAttemptFailure: async ({ attempt, retryState, error }) => {
      await logReminderFailureEvent({
        appointmentId: input.appointmentId,
        patientId: input.patientId,
        channel: input.channel,
        templateName: input.templateName,
        error: error || `Failed to send reminder via ${input.channel}`,
        correlationId: input.correlationId,
        attempt,
        retryState,
        logEscalation: false,
      });
    },
    onRetryScheduled: ({ attempt, retryState, error }) => {
      logger.warn({
        event: retryState.hooks.retryScheduledEvent,
        appointmentId: input.appointmentId,
        correlationId: input.correlationId,
        patientId: input.patientId,
        channel: input.channel,
        templateName: input.templateName,
        attempt,
        nextRetryAt: retryState.nextRetryAt,
        reason: error,
      });
    },
    onEscalationOpen: ({ attempt, retryState, error }) => {
      logger.error(
        buildReminderLifecycleEvent({
          stage: 'escalation_open',
          patientId: input.patientId,
          channel: input.channel,
          templateName: input.templateName,
          category: 'appointment',
          attempt,
          reminderId: input.appointmentId,
          error: retryState.escalationReason || error || 'Escalation threshold reached',
          correlationId: input.correlationId,
          retryState,
        })
      );
    },
    onEscalationClosed: ({ attempt, retryState }) => {
      logger.info(
        buildReminderLifecycleEvent({
          stage: 'escalation_closed',
          patientId: input.patientId,
          channel: input.channel,
          templateName: input.templateName,
          category: 'appointment',
          reminderId: input.appointmentId,
          attempt,
          correlationId: input.correlationId,
          retryState,
        })
      );
    },
  });

  return execution;
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

    const baseCorrelationId = `appointment-reminder:${appointmentId}:${randomUUID()}`;

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
      await logReminderFailureEvent({
        appointmentId,
        patientId: appointment.patientId,
        channel: 'PUSH',
        templateName: 'Appointment Reminder',
        error: 'Skipped: quiet hours active',
        correlationId: `${baseCorrelationId}:quiet-hours`,
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
        await logReminderFailureEvent({
          appointmentId,
          patientId: appointment.patientId,
          channel: 'WHATSAPP',
          templateName: 'Appointment Reminder',
          error: whatsappConsent.reason || 'Consent denied for WhatsApp reminder',
          correlationId: `${baseCorrelationId}:whatsapp`,
        });
      } else {
        const whatsappExecution = await executeChannelWithRetry({
          appointmentId,
          patientId: appointment.patientId,
          channel: 'WHATSAPP',
          templateName: 'Appointment Reminder',
          correlationId: `${baseCorrelationId}:whatsapp`,
          executeAttempt: async () => {
            const whatsappSuccess = await sendAppointmentConfirmationWhatsApp(
              appointment.patient.phone!,
              details.patientName,
              details.dateTime,
              details.clinicianName,
              confirmationUrl,
              'es'
            );
            if (!whatsappSuccess) {
              throw new Error('WhatsApp dispatch returned false');
            }
            return true;
          },
        });

        channels.whatsapp = whatsappExecution.success;

        if (whatsappExecution.success) {
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
              attempt: whatsappExecution.attemptsUsed,
              correlationId: `${baseCorrelationId}:whatsapp`,
            })
          );
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
        await logReminderFailureEvent({
          appointmentId,
          patientId: appointment.patientId,
          channel: 'PUSH',
          templateName: 'Appointment Reminder',
          error: pushConsent.reason || 'Consent denied for push reminder',
          correlationId: `${baseCorrelationId}:push`,
        });
      } else {
        const pushExecution = await executeChannelWithRetry({
          appointmentId,
          patientId: appointment.patientId,
          channel: 'PUSH',
          templateName: 'Appointment Reminder',
          correlationId: `${baseCorrelationId}:push`,
          executeAttempt: async () => {
            const pushResult = await sendPushNotification({
              userId: appointment.patient.patientUser!.id,
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

            if (!pushResult.success || pushResult.sentCount <= 0) {
              throw new Error(
                pushResult.errors.join(', ') || 'Push dispatch returned no successful sends'
              );
            }
            return true;
          },
        });

        channels.push = pushExecution.success;

        if (pushExecution.success) {
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
              attempt: pushExecution.attemptsUsed,
              correlationId: `${baseCorrelationId}:push`,
            })
          );
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
        await logReminderFailureEvent({
          appointmentId,
          patientId: appointment.patientId,
          channel: 'EMAIL',
          templateName: 'Appointment Reminder',
          error: emailConsent.reason || 'Consent denied for email reminder',
          correlationId: `${baseCorrelationId}:email`,
        });
      } else {
        const emailExecution = await executeChannelWithRetry({
          appointmentId,
          patientId: appointment.patientId,
          channel: 'EMAIL',
          templateName: 'Appointment Reminder',
          correlationId: `${baseCorrelationId}:email`,
          executeAttempt: async () => {
            const emailSuccess = await sendAppointmentConfirmationEmail(
              appointment.patient.email!,
              details.patientName,
              details.dateTime,
              details.clinicianName,
              appointment.type,
              confirmationUrl
            );
            if (!emailSuccess) {
              throw new Error('Email dispatch returned false');
            }
            return true;
          },
        });

        channels.email = emailExecution.success;

        if (emailExecution.success) {
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
              attempt: emailExecution.attemptsUsed,
              correlationId: `${baseCorrelationId}:email`,
            })
          );
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
        await logReminderFailureEvent({
          appointmentId,
          patientId: appointment.patientId,
          channel: 'SMS',
          templateName: 'Appointment Reminder',
          error: smsConsent.reason || 'Consent denied for SMS reminder',
          correlationId: `${baseCorrelationId}:sms`,
        });
      } else {
        const smsExecution = await executeChannelWithRetry({
          appointmentId,
          patientId: appointment.patientId,
          channel: 'SMS',
          templateName: 'Appointment Reminder',
          correlationId: `${baseCorrelationId}:sms`,
          executeAttempt: async () => {
            const smsSuccess = await sendAppointmentConfirmationSMS(
              appointment.patient.phone!,
              details.patientName,
              details.dateTime,
              details.clinicianName,
              confirmationUrl
            );
            if (!smsSuccess) {
              throw new Error('SMS dispatch returned false');
            }
            return true;
          },
        });

        channels.sms = smsExecution.success;

        if (smsExecution.success) {
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
              attempt: smsExecution.attemptsUsed,
              correlationId: `${baseCorrelationId}:sms`,
            })
          );
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
          stage: 'escalation_open',
          patientId: appointment.patientId,
          channel: escalationChannel,
          templateName: 'Appointment Reminder',
          category: 'appointment',
          reminderId: appointmentId,
          error: 'No reminder channel succeeded',
          correlationId: `${baseCorrelationId}:aggregate`,
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
      correlationId: `${baseCorrelationId}:aggregate`,
      patientId: appointment.patientId,
      channels,
      success,
    });

    return {
      success,
      channels,
    };
  } catch (error) {
    const correlationId = `appointment-reminder:${appointmentId}:${randomUUID()}:fatal`;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(
      buildReminderLifecycleEvent({
        stage: 'fail',
        patientId: 'unknown',
        channel: 'PUSH',
        templateName: 'Appointment Reminder',
        category: 'appointment',
        reminderId: appointmentId,
        correlationId,
        error: errorMessage,
        retryState: buildReminderRetryState(1, DEFAULT_REMINDER_RETRY_POLICY),
      })
    );

    logger.error({
      event: 'appointment_reminder_error',
      appointmentId,
      correlationId,
      error: errorMessage,
    });

    return {
      success: false,
      channels: {},
      error: errorMessage,
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
