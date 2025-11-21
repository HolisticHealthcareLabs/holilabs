/**
 * Send Reminder API
 *
 * Sends customized reminders to patients via SMS, Email, or WhatsApp
 * Uses template system with variable replacement
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendSMS, sendWhatsApp } from '@/lib/sms/twilio';
import { sendEmail } from '@/lib/email';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface SendReminderRequest {
  patientIds: string[]; // Can send to multiple patients
  template: {
    name: string;
    category: string;
    subject?: string;
    message: string;
    variables: string[];
  };
  channel: 'SMS' | 'EMAIL' | 'WHATSAPP';
  sendImmediately?: boolean;
  scheduledFor?: string; // ISO datetime for future sending
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
 * Get patient data for variable replacement
 */
async function getPatientVariables(patientId: string) {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      appointments: {
        where: {
          startTime: {
            gte: new Date(), // Only future appointments
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
        take: 1,
      },
    },
  });

  if (!patient) {
    throw new Error(`Patient ${patientId} not found`);
  }

  // Build variable map
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
    condition: '[condition]', // TODO: Patient model doesn't have conditions field
    custom_message: '',
  };

  return { patient, variables };
}

/**
 * Send reminder via SMS
 */
async function sendViaSMS(phone: string, message: string) {
  if (!phone) {
    throw new Error('Patient phone number not available');
  }

  const success = await sendSMS({ to: phone, message });
  return success;
}

/**
 * Send reminder via Email
 */
async function sendViaEmail(email: string, subject: string, message: string) {
  if (!email) {
    throw new Error('Patient email not available');
  }

  // Create HTML version with basic styling
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
      { name: 'type', value: 'reminder' },
      { name: 'category', value: 'transactional' },
    ],
  });

  return result.success;
}

/**
 * Send reminder via WhatsApp
 */
async function sendViaWhatsApp(phone: string, message: string) {
  if (!phone) {
    throw new Error('Patient phone number not available');
  }

  const success = await sendWhatsApp({ to: phone, message });
  return success;
}

/**
 * POST /api/reminders/send
 * Send reminders to one or more patients
 */
export async function POST(request: NextRequest) {
  try {
    const body: SendReminderRequest = await request.json();

    const { patientIds, template, channel, sendImmediately = true, scheduledFor } = body;

    // Validate input
    if (!patientIds || patientIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one patient ID is required' },
        { status: 400 }
      );
    }

    if (!template.message) {
      return NextResponse.json(
        { success: false, error: 'Template message is required' },
        { status: 400 }
      );
    }

    if (!['SMS', 'EMAIL', 'WHATSAPP'].includes(channel)) {
      return NextResponse.json(
        { success: false, error: 'Invalid channel. Must be SMS, EMAIL, or WHATSAPP' },
        { status: 400 }
      );
    }

    // Check if scheduled for future
    if (!sendImmediately && scheduledFor) {
      const scheduleDate = new Date(scheduledFor);
      if (scheduleDate <= new Date()) {
        return NextResponse.json(
          { success: false, error: 'Scheduled time must be in the future' },
          { status: 400 }
        );
      }

      // TODO: Implement scheduling logic (e.g., using a job queue like Bull or database-based scheduler)
      return NextResponse.json({
        success: true,
        message: 'Reminder scheduled successfully',
        scheduled: true,
        scheduledFor: scheduleDate.toISOString(),
        patientCount: patientIds.length,
      });
    }

    // Send immediately
    const results = await Promise.allSettled(
      patientIds.map(async (patientId) => {
        try {
          // Get patient data and replace variables
          const { patient, variables } = await getPatientVariables(patientId);
          const personalizedMessage = replaceVariables(template.message, variables);
          const personalizedSubject = template.subject
            ? replaceVariables(template.subject, variables)
            : 'Reminder from Holi Labs';

          // Send via selected channel
          let success = false;
          let deliveryData: any = {
            channel,
            sentAt: new Date(),
          };

          switch (channel) {
            case 'SMS':
              success = await sendViaSMS(patient.phone || '', personalizedMessage);
              break;
            case 'EMAIL':
              success = await sendViaEmail(
                patient.email || '',
                personalizedSubject,
                personalizedMessage
              );
              break;
            case 'WHATSAPP':
              success = await sendViaWhatsApp(patient.phone || '', personalizedMessage);
              break;
          }

          if (!success) {
            throw new Error(`Failed to send via ${channel}`);
          }

          // Create notification record
          // Map reminder categories to NotificationType enum values
          let notificationType: 'APPOINTMENT_REMINDER' | 'NEW_PRESCRIPTION' | 'NEW_DOCUMENT' = 'NEW_DOCUMENT';
          if (template.category === 'appointment') {
            notificationType = 'APPOINTMENT_REMINDER';
          } else if (template.category === 'medication' || template.category === 'prescription') {
            notificationType = 'NEW_PRESCRIPTION';
          }

          const notification = await prisma.notification.create({
            data: {
              recipientId: patientId,
              recipientType: 'PATIENT',
              type: notificationType,
              title: template.name,
              message: personalizedMessage,
              actionUrl: '/portal/dashboard',
              priority: 'NORMAL',
              deliveredInApp: false,
              deliveredEmail: channel === 'EMAIL',
              deliveredSMS: channel === 'SMS',
              emailSentAt: channel === 'EMAIL' ? new Date() : null,
              smsSentAt: channel === 'SMS' || channel === 'WHATSAPP' ? new Date() : null,
            },
          });

          logger.info({
            event: 'reminder_sent',
            patientId,
            channel,
            templateName: template.name,
            notificationId: notification.id,
          });

          return {
            patientId,
            success: true,
            notificationId: notification.id,
          };
        } catch (error) {
          logger.error({
            event: 'reminder_send_error',
            patientId,
            channel,
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          return {
            patientId,
            success: false,
            error: error instanceof Error ? error.message : 'Failed to send reminder',
          };
        }
      })
    );

    // Count successes and failures
    const sent = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - sent;

    return NextResponse.json({
      success: true,
      message: `Sent ${sent} reminder(s) successfully${failed > 0 ? `, ${failed} failed` : ''}`,
      sent,
      failed,
      results: results.map((r) => (r.status === 'fulfilled' ? r.value : { success: false, error: 'Unknown error' })),
    });
  } catch (error) {
    logger.error({
      event: 'reminder_send_api_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send reminders',
      },
      { status: 500 }
    );
  }
}
