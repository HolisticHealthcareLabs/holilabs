/**
 * Email Service
 * Unified email sending service with support for multiple providers
 * Supports: Resend, SendGrid, AWS SES, Nodemailer (SMTP)
 */

import { Resend } from 'resend';

// Email provider configuration
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'resend'; // 'resend' | 'sendgrid' | 'ses' | 'smtp'
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@holilabs.com';
const FROM_NAME = process.env.FROM_NAME || 'Holi Labs';

// Initialize Resend (default provider)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send email using configured provider
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  try {
    const from = options.from || `${FROM_NAME} <${FROM_EMAIL}>`;

    switch (EMAIL_PROVIDER) {
      case 'resend':
        return await sendViaResend({ ...options, from });

      case 'sendgrid':
        return await sendViaSendGrid({ ...options, from });

      case 'ses':
        return await sendViaSES({ ...options, from });

      case 'smtp':
        return await sendViaSMTP({ ...options, from });

      default:
        // Fallback to console log in development
        if (process.env.NODE_ENV === 'development') {
          console.log('📧 [EMAIL] Would send:', {
            to: options.to,
            subject: options.subject,
            from,
          });
          return { success: true, messageId: 'dev-' + Date.now() };
        }
        throw new Error(`Unknown email provider: ${EMAIL_PROVIDER}`);
    }
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send email via Resend
 */
async function sendViaResend(options: EmailOptions): Promise<EmailResult> {
  if (!resend) {
    throw new Error('Resend API key not configured');
  }

  try {
    const result = await resend.emails.send({
      from: options.from!,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
      cc: options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : undefined,
      bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]) : undefined,
      attachments: options.attachments,
    });

    return {
      success: true,
      messageId: result.data?.id || 'unknown',
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Send email via SendGrid
 */
async function sendViaSendGrid(options: EmailOptions): Promise<EmailResult> {
  // Implementation for SendGrid
  // Requires: npm install @sendgrid/mail
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  try {
    const msg = {
      to: options.to,
      from: options.from!,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
      cc: options.cc,
      bcc: options.bcc,
      attachments: options.attachments,
    };

    const result = await sgMail.send(msg);
    return {
      success: true,
      messageId: result[0].headers['x-message-id'],
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Send email via AWS SES
 */
async function sendViaSES(options: EmailOptions): Promise<EmailResult> {
  // Implementation for AWS SES
  // Requires: npm install @aws-sdk/client-ses
  const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

  const client = new SESClient({
    region: process.env.AWS_REGION || 'us-east-1',
  });

  try {
    const command = new SendEmailCommand({
      Source: options.from!,
      Destination: {
        ToAddresses: Array.isArray(options.to) ? options.to : [options.to],
        CcAddresses: options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : undefined,
        BccAddresses: options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]) : undefined,
      },
      Message: {
        Subject: { Data: options.subject },
        Body: {
          Html: { Data: options.html },
          Text: options.text ? { Data: options.text } : undefined,
        },
      },
      ReplyToAddresses: options.replyTo ? [options.replyTo] : undefined,
    });

    const result = await client.send(command);
    return {
      success: true,
      messageId: result.MessageId,
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Send email via SMTP (Nodemailer)
 */
async function sendViaSMTP(options: EmailOptions): Promise<EmailResult> {
  // Implementation for SMTP
  // Requires: npm install nodemailer
  const nodemailer = require('nodemailer');

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    const result = await transporter.sendMail({
      from: options.from!,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
      cc: options.cc,
      bcc: options.bcc,
      attachments: options.attachments,
    });

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Send email to multiple recipients in batch
 */
export async function sendBulkEmail(
  recipients: string[],
  options: Omit<EmailOptions, 'to'>
): Promise<{ success: number; failed: number; results: EmailResult[] }> {
  const results = await Promise.all(
    recipients.map((email) =>
      sendEmail({
        ...options,
        to: email,
      })
    )
  );

  const success = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return { success, failed, results };
}

/**
 * Queue email for background sending (uses database queue)
 */
export async function queueEmail(options: EmailOptions): Promise<string> {
  const { prisma } = await import('@/lib/prisma');

  const emailQueue = await prisma.emailQueue.create({
    data: {
      to: Array.isArray(options.to) ? options.to.join(',') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      from: options.from,
      replyTo: options.replyTo,
      cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(',') : options.cc) : null,
      bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(',') : options.bcc) : null,
      status: 'PENDING',
      attempts: 0,
      scheduledFor: new Date(),
    },
  });

  return emailQueue.id;
}

/**
 * Process email queue (call from cron job)
 */
export async function processEmailQueue(limit = 50): Promise<{ processed: number; failed: number }> {
  const { prisma } = await import('@/lib/prisma');

  const emails = await prisma.emailQueue.findMany({
    where: {
      status: 'PENDING',
      attempts: { lt: 3 },
      scheduledFor: { lte: new Date() },
    },
    take: limit,
    orderBy: { createdAt: 'asc' },
  });

  let processed = 0;
  let failed = 0;

  for (const email of emails) {
    try {
      const result = await sendEmail({
        to: email.to.split(','),
        subject: email.subject,
        html: email.html,
        text: email.text || undefined,
        from: email.from || undefined,
        replyTo: email.replyTo || undefined,
        cc: email.cc ? email.cc.split(',') : undefined,
        bcc: email.bcc ? email.bcc.split(',') : undefined,
      });

      if (result.success) {
        await prisma.emailQueue.update({
          where: { id: email.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            messageId: result.messageId,
          },
        });
        processed++;
      } else {
        await prisma.emailQueue.update({
          where: { id: email.id },
          data: {
            status: email.attempts >= 2 ? 'FAILED' : 'PENDING',
            attempts: { increment: 1 },
            lastError: result.error,
          },
        });
        failed++;
      }
    } catch (error) {
      console.error(`Failed to send email ${email.id}:`, error);
      await prisma.emailQueue.update({
        where: { id: email.id },
        data: {
          status: email.attempts >= 2 ? 'FAILED' : 'PENDING',
          attempts: { increment: 1 },
          lastError: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      failed++;
    }
  }

  return { processed, failed };
}
