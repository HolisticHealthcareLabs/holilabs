/**
 * Twilio SMS & WhatsApp Integration
 *
 * Handles sending SMS and WhatsApp messages via Twilio API
 * Used for OTP codes, appointment reminders, and notifications
 */

import twilio from 'twilio';
import logger from '@/lib/logger';

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER;
const TWILIO_WHATSAPP = process.env.TWILIO_WHATSAPP_NUMBER;

interface SendSMSOptions {
  to: string;
  message: string;
  from?: string;
}

interface SendWhatsAppOptions {
  to: string;
  message: string;
}

/**
 * Send SMS message via Twilio
 */
export async function sendSMS(options: SendSMSOptions): Promise<boolean> {
  try {
    const { to, message, from = TWILIO_PHONE } = options;

    if (!from) {
      logger.error({
        event: 'twilio_sms_missing_config',
        error: 'TWILIO_PHONE_NUMBER not configured',
      });
      return false;
    }

    // Format phone number to E.164 format if needed
    const formattedPhone = formatPhoneNumber(to);

    const twilioMessage = await twilioClient.messages.create({
      body: message,
      from: from,
      to: formattedPhone,
    });

    logger.info({
      event: 'twilio_sms_sent',
      messageSid: twilioMessage.sid,
      to: formattedPhone,
      status: twilioMessage.status,
    });

    return twilioMessage.status !== 'failed';
  } catch (error) {
    logger.error({
      event: 'twilio_sms_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      to: options.to,
    });
    return false;
  }
}

/**
 * Send WhatsApp message via Twilio
 */
export async function sendWhatsApp(options: SendWhatsAppOptions): Promise<boolean> {
  try {
    const { to, message } = options;

    if (!TWILIO_WHATSAPP) {
      logger.error({
        event: 'twilio_whatsapp_missing_config',
        error: 'TWILIO_WHATSAPP_NUMBER not configured',
      });
      return false;
    }

    // Format phone for WhatsApp
    const formattedPhone = formatPhoneNumber(to);
    const whatsappTo = `whatsapp:${formattedPhone}`;

    const twilioMessage = await twilioClient.messages.create({
      body: message,
      from: TWILIO_WHATSAPP,
      to: whatsappTo,
    });

    logger.info({
      event: 'twilio_whatsapp_sent',
      messageSid: twilioMessage.sid,
      to: whatsappTo,
      status: twilioMessage.status,
    });

    return twilioMessage.status !== 'failed';
  } catch (error) {
    logger.error({
      event: 'twilio_whatsapp_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      to: options.to,
    });
    return false;
  }
}

/**
 * Send OTP code via SMS
 */
export async function sendOTPCode(phone: string, code: string): Promise<boolean> {
  const message = `Tu código de verificación de Holi Labs es: ${code}. Válido por 10 minutos.`;
  return sendSMS({ to: phone, message });
}

/**
 * Send appointment reminder via SMS
 */
export async function sendAppointmentReminder(
  phone: string,
  appointmentDetails: {
    patientName: string;
    clinicianName: string;
    date: string;
    time: string;
  }
): Promise<boolean> {
  const { patientName, clinicianName, date, time } = appointmentDetails;
  const message = `Hola ${patientName}! Recordatorio: Tienes una cita con ${clinicianName} el ${date} a las ${time}. Holi Labs.`;
  return sendSMS({ to: phone, message });
}

/**
 * Send appointment confirmation via SMS
 */
export async function sendAppointmentConfirmation(
  phone: string,
  appointmentDetails: {
    patientName: string;
    clinicianName: string;
    date: string;
    time: string;
    confirmUrl: string;
  }
): Promise<boolean> {
  const { patientName, clinicianName, date, time, confirmUrl } = appointmentDetails;
  const message = `Hola ${patientName}! Tu cita con ${clinicianName} el ${date} a las ${time} ha sido agendada. Confirma aquí: ${confirmUrl}`;
  return sendSMS({ to: phone, message });
}

/**
 * Format phone number to E.164 format (+[country code][number])
 * Currently handles US/international formats
 */
function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // If already starts with +, return as is
  if (phone.startsWith('+')) {
    return phone.replace(/\s/g, '');
  }

  // US number (10 digits)
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }

  // Already has country code (11+ digits)
  if (cleaned.length >= 11) {
    return `+${cleaned}`;
  }

  // Default: assume it needs +1 prefix
  return `+1${cleaned}`;
}

/**
 * Validate phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
}

/**
 * Check Twilio configuration
 */
export function isTwilioConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  );
}
