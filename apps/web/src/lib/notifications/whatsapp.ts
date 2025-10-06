/**
 * WhatsApp Integration Service
 * Powered by Twilio WhatsApp Business API
 *
 * Features:
 * - Appointment reminders
 * - Prescription notifications
 * - Lab results alerts
 * - Two-way messaging
 */

export interface WhatsAppMessage {
  to: string; // Phone number in E.164 format (e.g., +525512345678)
  message: string;
  mediaUrl?: string; // Optional image/PDF attachment
}

export interface WhatsAppTemplate {
  name: string;
  language: string;
  components: any[];
}

/**
 * Send WhatsApp message via Twilio
 */
export async function sendWhatsAppMessage(
  params: WhatsAppMessage
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER; // e.g., 'whatsapp:+14155238886'

    if (!accountSid || !authToken || !fromNumber) {
      console.error('Missing Twilio credentials');
      return {
        success: false,
        error: 'WhatsApp service not configured',
      };
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const formData = new URLSearchParams({
      From: fromNumber,
      To: `whatsapp:${params.to}`,
      Body: params.message,
    });

    if (params.mediaUrl) {
      formData.append('MediaUrl', params.mediaUrl);
    }

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
      console.error('Twilio error:', error);
      return {
        success: false,
        error: 'Failed to send WhatsApp message',
      };
    }

    const data = await response.json();

    return {
      success: true,
      messageId: data.sid,
    };
  } catch (error: any) {
    console.error('WhatsApp send error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Send approved template message (for opt-in users)
 */
export async function sendWhatsAppTemplate(
  to: string,
  template: WhatsAppTemplate
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Twilio supports pre-approved templates for WhatsApp Business
  // See: https://www.twilio.com/docs/whatsapp/tutorial/send-whatsapp-notification-messages-templates

  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      return {
        success: false,
        error: 'WhatsApp service not configured',
      };
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const contentSid = template.name; // Template SID from Twilio console

    const formData = new URLSearchParams({
      From: fromNumber,
      To: `whatsapp:${to}`,
      ContentSid: contentSid,
      ContentVariables: JSON.stringify(template.components),
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
      console.error('Twilio template error:', error);
      return {
        success: false,
        error: 'Failed to send template message',
      };
    }

    const data = await response.json();

    return {
      success: true,
      messageId: data.sid,
    };
  } catch (error: any) {
    console.error('WhatsApp template error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// ============================================================================
// PRE-BUILT MESSAGE TEMPLATES
// ============================================================================

export const WhatsAppTemplates = {
  /**
   * Appointment Reminder
   */
  appointmentReminder: (
    patientName: string,
    doctorName: string,
    date: string,
    time: string,
    location: string
  ) => {
    return `🏥 *Recordatorio de Cita - Holi Labs*

Hola ${patientName},

Le recordamos su cita médica:

👨‍⚕️ *Doctor:* Dr. ${doctorName}
📅 *Fecha:* ${date}
🕐 *Hora:* ${time}
📍 *Ubicación:* ${location}

Por favor, llegue 10 minutos antes de su cita.

Si necesita reprogramar, responda a este mensaje.

_Gracias por confiar en Holi Labs_`;
  },

  /**
   * Prescription Ready
   */
  prescriptionReady: (patientName: string, pharmacyName: string) => {
    return `💊 *Receta Lista - Holi Labs*

Hola ${patientName},

Su receta electrónica ya está disponible en:

🏪 *Farmacia:* ${pharmacyName}

Puede recogerla presentando su identificación.

¿Necesita ayuda? Responda a este mensaje.`;
  },

  /**
   * Lab Results Ready
   */
  labResultsReady: (patientName: string, doctorName: string) => {
    return `📊 *Resultados de Laboratorio - Holi Labs*

Hola ${patientName},

Sus resultados de laboratorio ya están disponibles.

👨‍⚕️ *Doctor:* Dr. ${doctorName}

Inicie sesión en Holi Labs para verlos o agende una cita de seguimiento.

_Resultados protegidos con blockchain_`;
  },

  /**
   * Payment Reminder
   */
  paymentReminder: (patientName: string, amount: string, dueDate: string) => {
    return `💳 *Recordatorio de Pago - Holi Labs*

Hola ${patientName},

Tiene un pago pendiente:

💰 *Monto:* $${amount}
📅 *Vencimiento:* ${dueDate}

Puede pagar en línea o en recepción.

¿Preguntas? Responda a este mensaje.`;
  },

  /**
   * Welcome Message
   */
  welcomeMessage: (patientName: string, clinicName: string) => {
    return `🎉 *Bienvenido a Holi Labs*

Hola ${patientName},

¡Gracias por unirse a *${clinicName}*!

Ya puede:
✅ Agendar citas
✅ Ver recetas
✅ Recibir resultados
✅ Chat con su doctor

Descargue la app o visite holilabs.com

_Su salud, protegida con blockchain_`;
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validate phone number format (E.164)
 */
export function isValidPhoneNumber(phone: string): boolean {
  // E.164 format: +[country code][number]
  // Example: +525512345678 (Mexico)
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phone);
}

/**
 * Format phone number to E.164
 */
export function formatPhoneNumber(phone: string, countryCode: string = '+52'): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');

  // If it doesn't start with +, add country code
  if (phone.startsWith('+')) {
    return phone;
  }

  // Add country code
  return `${countryCode}${cleaned}`;
}

/**
 * Check if user has opted in to WhatsApp notifications
 */
export async function hasWhatsAppOptIn(patientId: string): Promise<boolean> {
  // Check consent in database
  const { prisma } = await import('@/lib/prisma');

  const consent = await prisma.consent.findFirst({
    where: {
      patientId,
      type: 'DATA_SHARING', // Or create specific WHATSAPP_NOTIFICATIONS type
      isActive: true,
    },
  });

  return !!consent;
}
