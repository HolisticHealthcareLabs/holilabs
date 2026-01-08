/**
 * SendGrid Email Provider (Fallback)
 *
 * Fallback email provider when Resend fails
 * Used automatically by email queue on final retry attempt
 *
 * @module email/sendgrid
 */

import * as sgMail from '@sendgrid/mail';
import logger from '@/lib/logger';

/**
 * SendGrid email options (matches Resend interface)
 */
export interface SendGridEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
}

/**
 * SendGrid email result
 */
export interface SendGridEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Initialize SendGrid client
 */
function initializeSendGrid(): boolean {
  const apiKey = process.env.SENDGRID_API_KEY;

  if (!apiKey) {
    logger.warn({
      event: 'sendgrid_not_configured',
      message: 'SENDGRID_API_KEY not set, fallback unavailable',
    });
    return false;
  }

  try {
    sgMail.setApiKey(apiKey);
    return true;
  } catch (error) {
    logger.error({
      event: 'sendgrid_init_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Send email via SendGrid
 *
 * @param options - Email options matching Resend interface
 * @returns Promise with success status and message ID
 *
 * @example
 * ```typescript
 * const result = await sendEmail({
 *   to: 'patient@example.com',
 *   subject: 'Test Email',
 *   html: '<p>Hello from SendGrid</p>',
 *   text: 'Hello from SendGrid'
 * });
 *
 * if (result.success) {
 *   console.log('Email sent:', result.messageId);
 * }
 * ```
 */
export async function sendEmail(
  options: SendGridEmailOptions
): Promise<SendGridEmailResult> {
  // Initialize SendGrid
  const initialized = initializeSendGrid();

  if (!initialized) {
    // Fall back to console log in development
    if (process.env.NODE_ENV === 'development') {
      logger.warn({
        event: 'sendgrid_dev_mode',
        message: 'SendGrid not configured, logging email instead',
        to: options.to,
        subject: options.subject,
      });

      console.log('[SENDGRID DEV MODE] Would send email:', {
        to: options.to,
        subject: options.subject,
        html: options.html.substring(0, 100) + '...',
      });

      return {
        success: false,
        error: 'SendGrid not configured',
      };
    }

    return {
      success: false,
      error: 'SendGrid API key not configured',
    };
  }

  try {
    const fromEmail = process.env.SENDGRID_FROM_EMAIL ||
                      process.env.FROM_EMAIL ||
                      'noreply@holilabs.com';
    const fromName = process.env.FROM_NAME || 'Holi Labs';

    // Build SendGrid message
    const message: sgMail.MailDataRequired = {
      to: Array.isArray(options.to) ? options.to : [options.to],
      from: {
        email: fromEmail,
        name: fromName,
      },
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
      cc: options.cc,
      bcc: options.bcc,
      trackingSettings: {
        clickTracking: {
          enable: false, // Disable click tracking for privacy
        },
        openTracking: {
          enable: false, // Disable open tracking for privacy
        },
      },
      mailSettings: {
        sandboxMode: {
          enable: process.env.NODE_ENV === 'test',
        },
      },
    };

    // Send email
    const response = await sgMail.send(message);

    // Extract message ID from response
    const messageId = response[0]?.headers?.['x-message-id'] || 'unknown';

    logger.info({
      event: 'sendgrid_email_sent',
      messageId,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      statusCode: response[0]?.statusCode,
    });

    return {
      success: true,
      messageId,
    };
  } catch (error) {
    // Handle SendGrid errors
    let errorMessage = 'Unknown error';
    let errorDetails: any = {};

    if (error && typeof error === 'object' && 'response' in error) {
      const sgError = error as any;
      errorMessage = sgError.message || 'SendGrid API error';
      errorDetails = {
        statusCode: sgError.code,
        body: sgError.response?.body,
      };
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    logger.error({
      event: 'sendgrid_send_error',
      error: errorMessage,
      errorDetails,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Send multiple emails in batch
 *
 * @param emails - Array of email options
 * @returns Array of results for each email
 */
export async function sendBatchEmails(
  emails: SendGridEmailOptions[]
): Promise<SendGridEmailResult[]> {
  logger.info({
    event: 'sendgrid_batch_send_started',
    count: emails.length,
  });

  const results = await Promise.allSettled(
    emails.map((email) => sendEmail(email))
  );

  const successCount = results.filter(
    (r) => r.status === 'fulfilled' && r.value.success
  ).length;

  logger.info({
    event: 'sendgrid_batch_send_complete',
    total: emails.length,
    success: successCount,
    failed: emails.length - successCount,
  });

  return results.map((result) =>
    result.status === 'fulfilled'
      ? result.value
      : { success: false, error: 'Promise rejected' }
  );
}

/**
 * Verify SendGrid API key and configuration
 *
 * @returns True if SendGrid is properly configured
 */
export async function verifySendGridConfig(): Promise<boolean> {
  const initialized = initializeSendGrid();

  if (!initialized) {
    return false;
  }

  try {
    // SendGrid doesn't have a direct "verify" endpoint
    // So we check if the API key is set and properly formatted
    const apiKey = process.env.SENDGRID_API_KEY;

    if (!apiKey || !apiKey.startsWith('SG.')) {
      logger.error({
        event: 'sendgrid_config_invalid',
        message: 'SendGrid API key format is invalid',
      });
      return false;
    }

    logger.info({
      event: 'sendgrid_config_verified',
      message: 'SendGrid configuration is valid',
    });

    return true;
  } catch (error) {
    logger.error({
      event: 'sendgrid_config_verify_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Check if SendGrid is configured
 */
export function isSendGridConfigured(): boolean {
  return !!process.env.SENDGRID_API_KEY;
}

/**
 * Get SendGrid configuration status
 */
export function getSendGridStatus() {
  const configured = isSendGridConfigured();
  const apiKey = process.env.SENDGRID_API_KEY;

  return {
    configured,
    fromEmail: process.env.SENDGRID_FROM_EMAIL || process.env.FROM_EMAIL,
    fromName: process.env.FROM_NAME,
    apiKeySet: !!apiKey,
    apiKeyValid: apiKey?.startsWith('SG.') || false,
  };
}
