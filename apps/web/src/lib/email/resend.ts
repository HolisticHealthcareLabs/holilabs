import { Resend } from 'resend';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

/**
 * Resend Client Initialization
 * Uses the RESEND_API_KEY from environment variables.
 */
export const resend = new Resend(env.RESEND_API_KEY);

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  react?: React.ReactElement;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
}

/**
 * Helper to send branded emails via Resend
 */
export async function sendEmail(options: SendEmailOptions) {
  const { to, subject, react, html, text, from = env.FROM_EMAIL, replyTo, cc, bcc } = options;

  try {
    const { data, error } = await resend.emails.send({
      from: from || 'Holi Labs <invites@holilabs.xyz>',
      to,
      subject,
      react,
      html,
      text: text || '',
      replyTo,
      cc,
      bcc,
    });

    if (error) {
      logger.error({ error, to, subject }, 'Failed to send email via Resend');
      return { success: false, error };
    }

    logger.info({ id: data?.id, to, subject }, 'Email sent successfully via Resend');
    return { success: true, data };
  } catch (error) {
    logger.error({ error, to, subject }, 'Unexpected error sending email via Resend');
    return { success: false, error };
  }
}
/**
 * Check if Resend is properly configured with an API key
 */
export function isResendConfigured(): boolean {
  return !!env.RESEND_API_KEY && env.RESEND_API_KEY !== 're_123456789';
}

/**
 * Send magic link email for patient authentication
 */
export async function sendMagicLinkEmail(
  email: string,
  patientName: string,
  magicLinkUrl: string,
  expiresAt: Date
) {
  const expiryTime = expiresAt.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return sendEmail({
    to: email,
    subject: '🔐 Tu enlace de acceso a Holi Labs',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 16px; padding: 30px; margin-bottom: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Acceso a tu Portal</h1>
        </div>
        <p style="font-size: 16px; color: #374151; line-height: 1.6;">Hola ${patientName},</p>
        <p style="font-size: 16px; color: #374151; line-height: 1.6;">Haz clic en el botón de abajo para acceder de forma segura:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${magicLinkUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">Acceder a mi Portal →</a>
        </div>
        <p style="font-size: 14px; color: #6b7280;">Este enlace expira a las ${expiryTime}.</p>
      </div>
    `,
  });
}

/**
 * Send OTP (One-Time Password) email
 */
export async function sendOTPEmail(email: string, otp: string) {
  return sendEmail({
    to: email,
    subject: `Tu código de verificación: ${otp}`,
    html: `
      <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px; text-align: center; border: 1px solid #eee; border-radius: 10px;">
        <h2>Código de Verificación</h2>
        <p>Tu código para acceder a Holi Labs es:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #3b82f6; margin: 20px 0; padding: 10px; background: #f0f7ff; border-radius: 8px;">
          ${otp}
        </div>
        <p style="font-size: 12px; color: #666;">Este código expira en 5 minutos.</p>
      </div>
    `,
  });
}

/**
 * Send appointment reminder email
 */
export async function sendAppointmentReminderEmail(
  patientEmail: string,
  patientName: string,
  appointmentDate: Date,
  clinicianName: string,
  appointmentType: string
) {
  const dateStr = appointmentDate.toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return sendEmail({
    to: patientEmail,
    subject: `Recordatorio: Cita con ${clinicianName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>🗓️ Recordatorio de Cita</h2>
        <p>Hola <strong>${patientName}</strong>, recuerda tu próxima cita:</p>
        <div style="background: #f3f4f6; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
          <p><strong>Fecha:</strong> ${dateStr}</p>
          <p><strong>Médico:</strong> ${clinicianName}</p>
          <p><strong>Tipo:</strong> ${appointmentType}</p>
        </div>
      </div>
    `,
  });
}
