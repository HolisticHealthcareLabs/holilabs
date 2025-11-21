/**
 * Reminder Executor Job
 *
 * Background job that executes scheduled reminders
 * Runs every minute to check for reminders that need to be sent
 */

import { prisma } from '@/lib/prisma';
import { sendSMS, sendWhatsApp } from '@/lib/sms/twilio';
import { sendEmail } from '@/lib/email';
import logger from '@/lib/logger';

interface PatientData {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  appointments?: Array<{
    startTime: Date;
    clinician?: {
      firstName: string;
      lastName: string;
    } | null;
  }>;
  medications?: Array<{
    name: string;
  }>;
}

/**
 * Replace template variables with actual patient data
 */
function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template;

  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value);
  });

  return result;
}

/**
 * Get patient variables for template replacement
 */
async function getPatientVariables(patientId: string): Promise<Record<string, string>> {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      appointments: {
        where: {
          startTime: {
            gte: new Date(),
          },
        },
        orderBy: {
          startTime: 'asc',
        },
        take: 1,
        include: {
          clinician: true,
        },
      },
      medications: {
        where: {
          isActive: true,
        },
        take: 1,
      },
    },
  });

  if (!patient) {
    throw new Error(`Patient ${patientId} not found`);
  }

  const variables: Record<string, string> = {
    patient_name: `${patient.firstName} ${patient.lastName}`,
    provider_name: patient.appointments[0]?.clinician?.firstName
      ? `Dr. ${patient.appointments[0].clinician.firstName} ${patient.appointments[0].clinician.lastName}`
      : 'Dr. [Provider Name]',
    clinic_name: 'Holi Labs',
    clinic_phone: process.env.CLINIC_PHONE_NUMBER || '(555) 123-4567',
    appointment_date: patient.appointments[0]?.startTime
      ? new Date(patient.appointments[0].startTime).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '[Date]',
    appointment_time: patient.appointments[0]?.startTime
      ? new Date(patient.appointments[0].startTime).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '[Time]',
    next_appointment: patient.appointments[0]?.startTime
      ? new Date(patient.appointments[0].startTime).toLocaleDateString('en-US')
      : 'your next appointment',
    medication_name: patient.medications[0]?.name || '[Medication]',
    lab_result: 'your lab results',
    condition: '[condition]',
    custom_message: '',
  };

  return variables;
}

/**
 * Send reminder via SMS
 */
async function sendViaSMS(phone: string, message: string): Promise<boolean> {
  if (!phone) {
    throw new Error('Patient phone number not available');
  }
  return await sendSMS({ to: phone, message });
}

/**
 * Send reminder via Email
 */
async function sendViaEmail(email: string, subject: string, message: string): Promise<boolean> {
  if (!email) {
    throw new Error('Patient email not available');
  }

  const htmlMessage = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px; padding: 30px; margin-bottom: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">📨 Reminder from Holi Labs</h1>
      </div>

      <div style="background: #f9fafb; border-left: 4px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0; color: #1f2937; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">${message}</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/portal/dashboard"
           style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Visit Patient Portal
        </a>
      </div>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />

      <p style="font-size: 14px; color: #6b7280; text-align: center;">
        This is an automated reminder from your healthcare provider.<br/>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}" style="color: #10b981; text-decoration: none;">Holi Labs</a> - Digital Healthcare
      </p>
    </div>
  `;

  const result = await sendEmail({
    to: email,
    subject: subject || 'Reminder from Holi Labs',
    html: htmlMessage,
    text: message,
    tags: [
      { name: 'type', value: 'scheduled_reminder' },
      { name: 'category', value: 'transactional' },
    ],
  });

  return result.success;
}

/**
 * Send reminder via WhatsApp
 */
async function sendViaWhatsApp(phone: string, message: string): Promise<boolean> {
  if (!phone) {
    throw new Error('Patient phone number not available');
  }
  return await sendWhatsApp({ to: phone, message });
}

/**
 * Calculate next execution time for recurring reminders
 */
function calculateNextExecution(
  currentDate: Date,
  pattern: string,
  interval: number
): Date {
  const next = new Date(currentDate);

  switch (pattern) {
    case 'DAILY':
      next.setDate(next.getDate() + interval);
      break;
    case 'WEEKLY':
      next.setDate(next.getDate() + interval * 7);
      break;
    case 'MONTHLY':
      next.setMonth(next.getMonth() + interval);
      break;
    case 'YEARLY':
      next.setFullYear(next.getFullYear() + interval);
      break;
  }

  return next;
}

/**
 * Execute a single scheduled reminder
 */
async function executeReminder(reminderId: string): Promise<{
  success: boolean;
  sent: number;
  failed: number;
  errors: string[];
}> {
  const reminder = await prisma.scheduledReminder.findUnique({
    where: { id: reminderId },
  });

  if (!reminder) {
    throw new Error(`Reminder ${reminderId} not found`);
  }

  const patientIds = reminder.patientIds as string[];
  const results = {
    success: true,
    sent: 0,
    failed: 0,
    errors: [] as string[],
  };

  // Send to each patient
  for (const patientId of patientIds) {
    try {
      // Get patient data and replace variables
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        include: {
          appointments: {
            where: { startTime: { gte: new Date() } },
            orderBy: { startTime: 'asc' },
            take: 1,
            include: { clinician: true },
          },
          medications: {
            where: { isActive: true },
            take: 1,
          },
        },
      });

      if (!patient) {
        results.failed++;
        results.errors.push(`Patient ${patientId} not found`);
        continue;
      }

      const variables = await getPatientVariables(patientId);
      const personalizedMessage = replaceVariables(reminder.templateMessage, variables);
      const personalizedSubject = reminder.templateSubject
        ? replaceVariables(reminder.templateSubject, variables)
        : 'Reminder from Holi Labs';

      // Send via selected channel
      let sendSuccess = false;

      switch (reminder.channel) {
        case 'SMS':
          sendSuccess = await sendViaSMS(patient.phone || '', personalizedMessage);
          break;
        case 'EMAIL':
          sendSuccess = await sendViaEmail(
            patient.email || '',
            personalizedSubject,
            personalizedMessage
          );
          break;
        case 'WHATSAPP':
          sendSuccess = await sendViaWhatsApp(patient.phone || '', personalizedMessage);
          break;
      }

      if (sendSuccess) {
        results.sent++;

        // Create notification record
        await prisma.notification.create({
          data: {
            recipientId: patientId,
            recipientType: 'PATIENT',
            type: 'APPOINTMENT_REMINDER',
            title: reminder.templateName,
            message: personalizedMessage,
            actionUrl: '/portal/dashboard',
            priority: 'NORMAL',
            deliveredInApp: false,
            deliveredEmail: reminder.channel === 'EMAIL',
            deliveredSMS: reminder.channel === 'SMS' || reminder.channel === 'WHATSAPP',
            emailSentAt: reminder.channel === 'EMAIL' ? new Date() : null,
            smsSentAt: reminder.channel === 'SMS' || reminder.channel === 'WHATSAPP' ? new Date() : null,
          },
        });
      } else {
        results.failed++;
        results.errors.push(`Failed to send to patient ${patientId}`);
      }
    } catch (error) {
      results.failed++;
      results.errors.push(
        `Error sending to patient ${patientId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  return results;
}

/**
 * Update reminder after execution
 */
async function updateReminderAfterExecution(
  reminderId: string,
  results: {
    success: boolean;
    sent: number;
    failed: number;
    errors: string[];
  }
): Promise<void> {
  const reminder = await prisma.scheduledReminder.findUnique({
    where: { id: reminderId },
  });

  if (!reminder) {
    throw new Error(`Reminder ${reminderId} not found`);
  }

  const isRecurring = !!reminder.recurrencePattern;
  const now = new Date();

  if (isRecurring) {
    // Calculate next execution
    const nextExecution = calculateNextExecution(
      now,
      reminder.recurrencePattern!,
      reminder.recurrenceInterval!
    );

    // Check if we should continue recurring
    let shouldContinue = true;

    if (reminder.recurrenceEndDate && nextExecution > reminder.recurrenceEndDate) {
      shouldContinue = false;
    }

    if (
      reminder.recurrenceCount &&
      reminder.executionCount + 1 >= reminder.recurrenceCount
    ) {
      shouldContinue = false;
    }

    await prisma.scheduledReminder.update({
      where: { id: reminderId },
      data: {
        lastExecuted: now,
        nextExecution: shouldContinue ? nextExecution : null,
        executionCount: reminder.executionCount + 1,
        lastExecutionResults: results,
        status: shouldContinue ? 'ACTIVE' : 'COMPLETED',
      },
    });
  } else {
    // One-time reminder - mark as sent or failed
    await prisma.scheduledReminder.update({
      where: { id: reminderId },
      data: {
        lastExecuted: now,
        nextExecution: null,
        executionCount: reminder.executionCount + 1,
        lastExecutionResults: results,
        status: results.sent > 0 ? 'SENT' : 'FAILED',
      },
    });
  }
}

/**
 * Main job function - Execute all due reminders
 */
export async function executeScheduledReminders(): Promise<{
  processed: number;
  successful: number;
  failed: number;
}> {
  const stats = {
    processed: 0,
    successful: 0,
    failed: 0,
  };

  try {
    const now = new Date();

    // Find all reminders that are due
    const dueReminders = await prisma.scheduledReminder.findMany({
      where: {
        OR: [
          {
            // One-time reminders that are due
            status: 'PENDING',
            scheduledFor: {
              lte: now,
            },
          },
          {
            // Recurring reminders that are due
            status: 'ACTIVE',
            nextExecution: {
              lte: now,
            },
          },
        ],
      },
      orderBy: {
        scheduledFor: 'asc',
      },
    });

    logger.info({
      event: 'reminder_executor_run',
      dueRemindersCount: dueReminders.length,
      timestamp: now.toISOString(),
    });

    // Execute each reminder
    for (const reminder of dueReminders) {
      try {
        stats.processed++;

        const results = await executeReminder(reminder.id);
        await updateReminderAfterExecution(reminder.id, results);

        if (results.sent > 0) {
          stats.successful++;
        } else {
          stats.failed++;
        }

        logger.info({
          event: 'reminder_executed',
          reminderId: reminder.id,
          sent: results.sent,
          failed: results.failed,
          errors: results.errors,
        });
      } catch (error) {
        stats.failed++;

        logger.error({
          event: 'reminder_execution_error',
          reminderId: reminder.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });

        // Mark reminder as failed
        await prisma.scheduledReminder.update({
          where: { id: reminder.id },
          data: {
            status: 'FAILED',
            lastExecutionResults: {
              success: false,
              sent: 0,
              failed: 1,
              errors: [error instanceof Error ? error.message : 'Unknown error'],
            },
          },
        });
      }
    }

    logger.info({
      event: 'reminder_executor_complete',
      processed: stats.processed,
      successful: stats.successful,
      failed: stats.failed,
    });
  } catch (error) {
    logger.error({
      event: 'reminder_executor_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
  }

  return stats;
}
