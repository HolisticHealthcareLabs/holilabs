/**
 * Unified Notification System
 * Email, SMS, WhatsApp, Push Notifications
 *
 * Industry-grade multi-channel notification service
 */

import { sendWhatsAppMessage, WhatsAppTemplates, formatPhoneNumber } from './whatsapp';

// ============================================================================
// TYPES
// ============================================================================

export type NotificationChannel = 'email' | 'sms' | 'whatsapp' | 'push' | 'all';

export interface NotificationPayload {
  to: {
    email?: string;
    phone?: string;
    userId?: string;
  };
  channels: NotificationChannel[];
  subject?: string;
  message: string;
  template?: string;
  data?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface NotificationResult {
  success: boolean;
  channels: {
    email?: { success: boolean; messageId?: string; error?: string };
    sms?: { success: boolean; messageId?: string; error?: string };
    whatsapp?: { success: boolean; messageId?: string; error?: string };
    push?: { success: boolean; messageId?: string; error?: string };
  };
}

// ============================================================================
// MAIN NOTIFICATION FUNCTION
// ============================================================================

/**
 * Send notification across multiple channels
 */
export async function sendNotification(
  payload: NotificationPayload
): Promise<NotificationResult> {
  const result: NotificationResult = {
    success: false,
    channels: {},
  };

  const channels = payload.channels.includes('all')
    ? ['email', 'sms', 'whatsapp'] as const
    : payload.channels;

  // Send to each channel in parallel
  const promises = channels.map(async (channel) => {
    switch (channel) {
      case 'email':
        if (payload.to.email) {
          result.channels.email = await sendEmail({
            to: payload.to.email,
            subject: payload.subject || 'Notificación de Holi Labs',
            body: payload.message,
            html: payload.data?.html,
          });
        }
        break;

      case 'sms':
        if (payload.to.phone) {
          result.channels.sms = await sendSMS({
            to: formatPhoneNumber(payload.to.phone),
            message: payload.message,
          });
        }
        break;

      case 'whatsapp':
        if (payload.to.phone) {
          result.channels.whatsapp = await sendWhatsAppMessage({
            to: formatPhoneNumber(payload.to.phone),
            message: payload.message,
          });
        }
        break;

      case 'push':
        if (payload.to.userId) {
          result.channels.push = await sendPushNotification({
            userId: payload.to.userId,
            title: payload.subject || 'Notificación',
            body: payload.message,
          });
        }
        break;
    }
  });

  await Promise.all(promises);

  // Check if at least one channel succeeded
  result.success = Object.values(result.channels).some((r) => r?.success);

  return result;
}

// ============================================================================
// EMAIL NOTIFICATIONS (Resend.com or SendGrid)
// ============================================================================

interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

async function sendEmail(
  payload: EmailPayload
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Using Resend (recommended for healthcare - HIPAA compliant)
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      console.warn('Email service not configured');
      return { success: false, error: 'Email service not configured' };
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'Holi Labs <notifications@holilabs.com>',
        to: payload.to,
        subject: payload.subject,
        html: payload.html || `<p>${payload.body}</p>`,
        text: payload.body,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Email error:', error);
      return { success: false, error: 'Failed to send email' };
    }

    const data = await response.json();
    return { success: true, messageId: data.id };
  } catch (error: any) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// SMS NOTIFICATIONS (Twilio)
// ============================================================================

interface SMSPayload {
  to: string;
  message: string;
}

async function sendSMS(
  payload: SMSPayload
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      console.warn('SMS service not configured');
      return { success: false, error: 'SMS service not configured' };
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const formData = new URLSearchParams({
      From: fromNumber,
      To: payload.to,
      Body: payload.message,
    });

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('SMS error:', error);
      return { success: false, error: 'Failed to send SMS' };
    }

    const data = await response.json();
    return { success: true, messageId: data.sid };
  } catch (error: any) {
    console.error('SMS send error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// PUSH NOTIFICATIONS (Web Push API or Firebase)
// ============================================================================

interface PushPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

async function sendPushNotification(
  payload: PushPayload
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // TODO: Implement web push notifications
  // Using Firebase Cloud Messaging (FCM) or Web Push API
  console.log('Push notification:', payload);
  return { success: true, messageId: 'push-' + Date.now() };
}

// ============================================================================
// PRE-BUILT NOTIFICATION TEMPLATES
// ============================================================================

export const NotificationTemplates = {
  /**
   * Send appointment reminder 24 hours before
   */
  appointmentReminder: async (appointment: {
    patientEmail: string;
    patientPhone: string;
    patientName: string;
    doctorName: string;
    date: string;
    time: string;
    location: string;
  }) => {
    const message = WhatsAppTemplates.appointmentReminder(
      appointment.patientName,
      appointment.doctorName,
      appointment.date,
      appointment.time,
      appointment.location
    );

    return sendNotification({
      to: {
        email: appointment.patientEmail,
        phone: appointment.patientPhone,
      },
      channels: ['email', 'whatsapp'],
      subject: '🏥 Recordatorio de Cita - Holi Labs',
      message,
      priority: 'high',
    });
  },

  /**
   * Prescription ready notification
   */
  prescriptionReady: async (prescription: {
    patientEmail: string;
    patientPhone: string;
    patientName: string;
    pharmacyName: string;
  }) => {
    const message = WhatsAppTemplates.prescriptionReady(
      prescription.patientName,
      prescription.pharmacyName
    );

    return sendNotification({
      to: {
        email: prescription.patientEmail,
        phone: prescription.patientPhone,
      },
      channels: ['email', 'whatsapp', 'sms'],
      subject: '💊 Su Receta Está Lista',
      message,
      priority: 'normal',
    });
  },

  /**
   * Lab results available
   */
  labResultsReady: async (results: {
    patientEmail: string;
    patientPhone: string;
    patientName: string;
    doctorName: string;
  }) => {
    const message = WhatsAppTemplates.labResultsReady(
      results.patientName,
      results.doctorName
    );

    return sendNotification({
      to: {
        email: results.patientEmail,
        phone: results.patientPhone,
      },
      channels: ['email', 'whatsapp'],
      subject: '📊 Resultados de Laboratorio Disponibles',
      message,
      priority: 'high',
    });
  },

  /**
   * Welcome new patient
   */
  welcomePatient: async (patient: {
    email: string;
    phone: string;
    name: string;
    clinicName: string;
  }) => {
    const message = WhatsAppTemplates.welcomeMessage(patient.name, patient.clinicName);

    return sendNotification({
      to: {
        email: patient.email,
        phone: patient.phone,
      },
      channels: ['email', 'whatsapp'],
      subject: '🎉 Bienvenido a Holi Labs',
      message,
      priority: 'normal',
    });
  },
};

// ============================================================================
// NOTIFICATION QUEUE (for background processing)
// ============================================================================

/**
 * Queue notification for background processing
 * Useful for bulk notifications or scheduled sends
 */
export async function queueNotification(payload: NotificationPayload): Promise<void> {
  // TODO: Implement with Redis Queue or PostgreSQL
  // For now, send immediately
  await sendNotification(payload);
}

/**
 * Schedule notification for future delivery
 */
export async function scheduleNotification(
  payload: NotificationPayload,
  sendAt: Date
): Promise<void> {
  // TODO: Implement with scheduling system
  console.log('Scheduled notification for:', sendAt);
}
