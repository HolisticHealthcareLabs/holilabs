/**
 * SMS Notification Service (Twilio)
 *
 * Simple, reliable SMS delivery for healthcare notifications
 */

import twilio from 'twilio';
import logger from './logger';

const getTwilioClient = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials not configured');
  }

  return twilio(accountSid, authToken);
};

const FROM_PHONE = process.env.TWILIO_PHONE_NUMBER || '';

export interface SendSMSOptions {
  to: string;
  message: string;
}

/**
 * Send SMS via Twilio
 */
export async function sendSMS(options: SendSMSOptions) {
  try {
    const { to, message } = options;

    // Validate required fields
    if (!to || !message) {
      throw new Error('SMS requires recipient phone and message');
    }

    // Check if Twilio is configured
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      logger.warn({
        event: 'sms_send_skipped',
        reason: 'Twilio credentials not configured',
        to,
      });
      return { success: false, error: 'SMS service not configured' };
    }

    if (!FROM_PHONE) {
      logger.warn({
        event: 'sms_send_skipped',
        reason: 'TWILIO_PHONE_NUMBER not configured',
        to,
      });
      return { success: false, error: 'SMS phone number not configured' };
    }

    // Format phone number (add +52 for Mexico if not present)
    let formattedPhone = to.trim();
    if (!formattedPhone.startsWith('+')) {
      // Assume Mexico if no country code
      formattedPhone = `+52${formattedPhone}`;
    }

    // Send SMS
    const client = getTwilioClient();
    const response = await client.messages.create({
      body: message,
      from: FROM_PHONE,
      to: formattedPhone,
    });

    logger.info({
      event: 'sms_sent',
      to: formattedPhone,
      messageId: response.sid,
      status: response.status,
    });

    return { success: true, data: response };
  } catch (error) {
    logger.error({
      event: 'sms_send_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      to: options.to,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send SMS',
    };
  }
}

/**
 * Send appointment reminder SMS
 */
export async function sendAppointmentReminderSMS(
  phoneNumber: string,
  patientName: string,
  appointmentDate: Date,
  clinicianName: string
) {
  const dateStr = appointmentDate.toLocaleDateString('es-MX', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const message = `Hola ${patientName}, recordatorio de tu cita con ${clinicianName} el ${dateStr}. Por favor llega 10 min antes. - Holi Labs`;

  return sendSMS({
    to: phoneNumber,
    message,
  });
}

/**
 * Send new message notification SMS
 */
export async function sendNewMessageSMS(
  phoneNumber: string,
  recipientName: string,
  senderName: string
) {
  const message = `Hola ${recipientName}, ${senderName} te ha enviado un mensaje. Revisa tu portal en holilabs.com - Holi Labs`;

  return sendSMS({
    to: phoneNumber,
    message,
  });
}

/**
 * Send consultation completed SMS
 */
export async function sendConsultationCompletedSMS(
  phoneNumber: string,
  patientName: string,
  clinicianName: string
) {
  const message = `Hola ${patientName}, tu consulta con ${clinicianName} ha sido completada. Las notas médicas ya están disponibles en tu portal. - Holi Labs`;

  return sendSMS({
    to: phoneNumber,
    message,
  });
}

/**
 * Send OTP code SMS
 */
export async function sendOTPCodeSMS(phoneNumber: string, code: string) {
  const message = `Tu código de verificación de Holi Labs es: ${code}. Válido por 10 minutos. No compartas este código.`;

  return sendSMS({
    to: phoneNumber,
    message,
  });
}

/**
 * Send magic link SMS
 */
export async function sendMagicLinkSMS(phoneNumber: string, link: string) {
  const message = `Tu enlace de acceso a Holi Labs: ${link}\n\nVálido por 15 minutos. No compartas este enlace.`;

  return sendSMS({
    to: phoneNumber,
    message,
  });
}

/**
 * Send prescription ready SMS
 */
export async function sendPrescriptionReadySMS(
  phoneNumber: string,
  patientName: string,
  clinicianName: string
) {
  const message = `Hola ${patientName}, ${clinicianName} ha creado una nueva receta para ti. Revisa tu portal para ver los detalles. - Holi Labs`;

  return sendSMS({
    to: phoneNumber,
    message,
  });
}

/**
 * Validate phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
  // Basic validation for Mexican phone numbers
  const phoneRegex = /^(\+52)?[0-9]{10}$/;
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  return phoneRegex.test(cleaned);
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+52')) {
    const number = cleaned.slice(3);
    return `+52 ${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6)}`;
  }

  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }

  return phone;
}
