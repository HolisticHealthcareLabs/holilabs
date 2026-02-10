/**
 * Consent Expiration Reminder Service
 * Sends email reminders before consent expiration
 * @compliance HIPAA §164.508 - Informed consent
 */

import { prisma } from '@/lib/prisma';
import { queueEmail } from '@/lib/email/email-service';
import { consentExpirationTemplate } from '@/lib/email/templates';
import logger from '@/lib/logger';
import {
  buildReminderLifecycleEvent,
  buildReminderRetryState,
  DEFAULT_REMINDER_RETRY_POLICY,
} from '@/lib/notifications/reminder-policy';

export interface ConsentNeedingReminder {
  id: string;
  patientId: string;
  type: string;
  title: string;
  expiresAt: Date;
  patient: {
    email: string | null;
    firstName: string;
    lastName: string;
    preferredName: string | null;
  };
}

/**
 * Find consents expiring soon that need reminders
 * Default: 7 days before expiration
 */
export async function findConsentsNeedingReminders(
  daysBeforeExpiration = 7
): Promise<ConsentNeedingReminder[]> {
  const now = new Date();
  const reminderDate = new Date(now.getTime() + daysBeforeExpiration * 24 * 60 * 60 * 1000);
  const reminderDateEnd = new Date(reminderDate.getTime() + 24 * 60 * 60 * 1000); // 1 day window

  const consents = await prisma.consent.findMany({
    where: {
      isActive: true,
      expiresAt: {
        not: null,
        gte: reminderDate,
        lte: reminderDateEnd,
      },
      // Only send reminder once per consent
      reminderSent: false,
    },
    include: {
      patient: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
          preferredName: true,
        },
      },
    },
  });

  return consents.filter((c) => c.expiresAt !== null) as ConsentNeedingReminder[];
}

/**
 * Send consent expiration reminder email
 */
export async function sendConsentExpirationReminder(consentId: string): Promise<boolean> {
  try {
    const consent = await prisma.consent.findUnique({
      where: { id: consentId },
      include: {
        patient: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            preferredName: true,
          },
        },
      },
    });

    if (!consent) {
      logger.error(
        buildReminderLifecycleEvent({
          stage: 'fail',
          patientId: 'unknown',
          channel: 'EMAIL',
          templateName: 'Consent Expiration Reminder',
          category: 'consent',
          reminderId: consentId,
          error: `Consent ${consentId} not found`,
          retryState: buildReminderRetryState(1, DEFAULT_REMINDER_RETRY_POLICY),
        })
      );
      return false;
    }

    if (!consent.expiresAt) {
      logger.warn(
        buildReminderLifecycleEvent({
          stage: 'fail',
          patientId: consent.patientId,
          channel: 'EMAIL',
          templateName: 'Consent Expiration Reminder',
          category: 'consent',
          reminderId: consentId,
          error: `Consent ${consentId} has no expiration date`,
          retryState: buildReminderRetryState(1, DEFAULT_REMINDER_RETRY_POLICY),
        })
      );
      return false;
    }

    // Check if patient has email
    if (!consent.patient.email) {
      logger.warn(
        buildReminderLifecycleEvent({
          stage: 'fail',
          patientId: consent.patientId,
          channel: 'EMAIL',
          templateName: 'Consent Expiration Reminder',
          category: 'consent',
          reminderId: consentId,
          error: `Patient ${consent.patientId} has no email, skipping reminder`,
          retryState: buildReminderRetryState(1, DEFAULT_REMINDER_RETRY_POLICY),
        })
      );
      // Mark as sent to avoid repeated attempts
      await prisma.consent.update({
        where: { id: consentId },
        data: {
          reminderSent: true,
          reminderSentAt: new Date(),
        },
      });
      return false;
    }

    // Prepare email data
    const patientName =
      consent.patient.preferredName ||
      `${consent.patient.firstName} ${consent.patient.lastName}`;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const renewUrl = `${baseUrl}/portal/dashboard/privacy?consentId=${consentId}`;

    // Generate email template
    const { subject, html, text } = consentExpirationTemplate({
      patientName,
      consentType: consent.title,
      expiresAt: consent.expiresAt,
      renewUrl,
    });

    logger.info(
      buildReminderLifecycleEvent({
        stage: 'sent',
        patientId: consent.patientId,
        channel: 'EMAIL',
        templateName: 'Consent Expiration Reminder',
        category: 'consent',
        reminderId: consentId,
      })
    );

    // Queue email
    const emailId = await queueEmail({
      to: consent.patient.email,
      subject,
      html,
      text,
    });

    // Mark reminder as sent
    await prisma.consent.update({
      where: { id: consentId },
      data: {
        reminderSent: true,
        reminderSentAt: new Date(),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: 'system',
        userEmail: 'system@holilabs.com',
        action: 'SEND_CONSENT_REMINDER',
        resource: 'Consent',
        resourceId: consentId,
        ipAddress: 'system',
        details: {
          consentType: consent.type,
          patientId: consent.patientId,
          emailId,
          expiresAt: consent.expiresAt,
        },
        success: true,
      },
    });

    logger.info(
      buildReminderLifecycleEvent({
        stage: 'success',
        patientId: consent.patientId,
        channel: 'EMAIL',
        templateName: 'Consent Expiration Reminder',
        category: 'consent',
        reminderId: consentId,
      })
    );

    return true;
  } catch (error) {
    const retryState = buildReminderRetryState(1, DEFAULT_REMINDER_RETRY_POLICY);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(
      buildReminderLifecycleEvent({
        stage: 'fail',
        patientId: 'unknown',
        channel: 'EMAIL',
        templateName: 'Consent Expiration Reminder',
        category: 'consent',
        reminderId: consentId,
        error: errorMessage,
        retryState,
      })
    );

    if (retryState.escalationReady) {
      logger.error(
        buildReminderLifecycleEvent({
          stage: 'escalation',
          patientId: 'unknown',
          channel: 'EMAIL',
          templateName: 'Consent Expiration Reminder',
          category: 'consent',
          reminderId: consentId,
          error: retryState.escalationReason || errorMessage,
          retryState,
        })
      );
    }
    return false;
  }
}

/**
 * Process all pending consent expiration reminders
 * Call from cron job
 */
export async function processConsentReminders(
  daysBeforeExpiration = 7
): Promise<{ processed: number; failed: number; skipped: number }> {
  logger.info({ event: 'consent_reminder_processing_started', daysBeforeExpiration });

  const consents = await findConsentsNeedingReminders(daysBeforeExpiration);

  logger.info({
    event: 'consent_reminder_candidates_loaded',
    count: consents.length,
    daysBeforeExpiration,
  });

  let processed = 0;
  let failed = 0;
  let skipped = 0;

  for (const consent of consents) {
    try {
      const sent = await sendConsentExpirationReminder(consent.id);
      if (sent) {
        processed++;
      } else {
        skipped++;
      }
    } catch (error) {
      logger.error({
        event: 'consent_reminder_processing_error',
        consentId: consent.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      failed++;
    }
  }

  logger.info({
    event: 'consent_reminder_processing_completed',
    processed,
    skipped,
    failed,
  });

  return { processed, failed, skipped };
}

/**
 * Send immediate reminder for a specific consent (manual trigger)
 */
export async function sendImmediateConsentReminder(consentId: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const consent = await prisma.consent.findUnique({
      where: { id: consentId },
      select: {
        id: true,
        isActive: true,
        expiresAt: true,
        reminderSent: true,
      },
    });

    if (!consent) {
      return { success: false, message: 'Consent not found' };
    }

    if (!consent.isActive) {
      return { success: false, message: 'Cannot send reminder for inactive consent' };
    }

    if (!consent.expiresAt) {
      return { success: false, message: 'Consent has no expiration date' };
    }

    // Allow resending even if already sent (manual override)
    const sent = await sendConsentExpirationReminder(consentId);

    if (sent) {
      return { success: true, message: 'Reminder sent successfully' };
    } else {
      return { success: false, message: 'Failed to send reminder (no email or error)' };
    }
  } catch (error) {
    logger.error({
      event: 'consent_immediate_reminder_error',
      consentId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
