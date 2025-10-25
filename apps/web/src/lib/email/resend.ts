/**
 * Resend Email Service
 *
 * Production-grade email delivery for Holi Labs
 * Handles magic links, OTP codes, appointment reminders, and notifications
 */

import { Resend } from 'resend';
import logger from '@/lib/logger';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Holi Labs <noreply@holilabs.com>';
const FROM_NAME = 'Holi Labs';

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
}

/**
 * Send email via Resend
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  try {
    if (!process.env.RESEND_API_KEY) {
      logger.warn({
        event: 'resend_not_configured',
        message: 'RESEND_API_KEY not set, email not sent',
        to: options.to,
      });
      console.log('[DEV MODE] Would send email:', {
        to: options.to,
        subject: options.subject,
      });
      return false; // Fail silently in dev mode
    }

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
      cc: options.cc,
      bcc: options.bcc,
    });

    if (error) {
      logger.error({
        event: 'resend_send_error',
        error: error.message,
        to: options.to,
        subject: options.subject,
      });
      return false;
    }

    logger.info({
      event: 'resend_email_sent',
      emailId: data?.id,
      to: options.to,
      subject: options.subject,
    });

    return true;
  } catch (error) {
    logger.error({
      event: 'resend_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      to: options.to,
    });
    return false;
  }
}

/**
 * Send magic link email for passwordless login
 */
export async function sendMagicLinkEmail(
  email: string,
  magicLink: string,
  patientName: string
): Promise<boolean> {
  const subject = '🔐 Tu enlace mágico de acceso a Holi Labs';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center; }
    .logo { font-size: 32px; margin-bottom: 10px; }
    .header-title { color: #ffffff; font-size: 24px; font-weight: bold; margin: 0; }
    .content { padding: 40px 30px; }
    .greeting { font-size: 18px; color: #1f2937; margin-bottom: 20px; }
    .message { color: #4b5563; line-height: 1.6; margin-bottom: 30px; }
    .button-container { text-align: center; margin: 30px 0; }
    .button { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff !important; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3); }
    .button:hover { box-shadow: 0 6px 8px rgba(16, 185, 129, 0.4); }
    .info-box { background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; border-radius: 4px; }
    .info-box p { margin: 0; color: #065f46; font-size: 14px; }
    .security { background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; margin-top: 30px; }
    .security-title { font-size: 14px; font-weight: 600; color: #1f2937; margin-bottom: 12px; display: flex; align-items: center; }
    .security-icon { margin-right: 8px; }
    .security-list { list-style: none; padding: 0; margin: 0; }
    .security-list li { color: #6b7280; font-size: 13px; margin-bottom: 8px; padding-left: 24px; position: relative; }
    .security-list li:before { content: "✓"; color: #10b981; font-weight: bold; position: absolute; left: 0; }
    .footer { background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; }
    .footer-text { color: #6b7280; font-size: 13px; line-height: 1.6; margin: 5px 0; }
    .footer-link { color: #10b981; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="logo">🌿</div>
      <h1 class="header-title">Holi Labs</h1>
    </div>

    <!-- Content -->
    <div class="content">
      <p class="greeting">Hola${patientName ? ` ${patientName}` : ''},</p>

      <p class="message">
        Has solicitado acceder a tu Portal de Paciente de Holi Labs. Haz clic en el botón de abajo para iniciar sesión de forma segura:
      </p>

      <div class="button-container">
        <a href="${magicLink}" class="button">
          🔐 Iniciar Sesión de Forma Segura
        </a>
      </div>

      <div class="info-box">
        <p><strong>⏰ Este enlace expira en 15 minutos</strong> y solo puede usarse una vez por razones de seguridad.</p>
      </div>

      <p class="message">
        Si no solicitaste este enlace, puedes ignorar este correo. Tu cuenta permanece segura.
      </p>

      <!-- Security Features -->
      <div class="security">
        <div class="security-title">
          <span class="security-icon">🔒</span>
          Tu seguridad es nuestra prioridad:
        </div>
        <ul class="security-list">
          <li>Sin contraseñas vulnerables</li>
          <li>Enlace cifrado de un solo uso</li>
          <li>Cumple con HIPAA y GDPR</li>
          <li>Expira automáticamente</li>
        </ul>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p class="footer-text">
        Este correo fue enviado por <strong>Holi Labs</strong>
      </p>
      <p class="footer-text">
        ¿Necesitas ayuda? <a href="mailto:support@holilabs.com" class="footer-link">support@holilabs.com</a>
      </p>
      <p class="footer-text" style="margin-top: 15px;">
        © ${new Date().getFullYear()} Holi Labs. Todos los derechos reservados.
      </p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Hola${patientName ? ` ${patientName}` : ''},

Has solicitado acceder a tu Portal de Paciente de Holi Labs.

Inicia sesión de forma segura aquí:
${magicLink}

⏰ Este enlace expira en 15 minutos y solo puede usarse una vez.

Si no solicitaste este enlace, puedes ignorar este correo.

---
Holi Labs
support@holilabs.com
  `.trim();

  return sendEmail({
    to: email,
    subject,
    html,
    text,
  });
}

/**
 * Send OTP code via email
 */
export async function sendOTPEmail(
  email: string,
  code: string,
  patientName?: string
): Promise<boolean> {
  const subject = '🔢 Tu código de verificación de Holi Labs';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center; }
    .logo { font-size: 32px; margin-bottom: 10px; }
    .header-title { color: #ffffff; font-size: 24px; font-weight: bold; margin: 0; }
    .content { padding: 40px 30px; text-align: center; }
    .greeting { font-size: 18px; color: #1f2937; margin-bottom: 20px; }
    .message { color: #4b5563; line-height: 1.6; margin-bottom: 30px; }
    .code-container { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px dashed #10b981; border-radius: 12px; padding: 30px; margin: 30px 0; }
    .code { font-size: 48px; font-weight: bold; letter-spacing: 8px; color: #059669; font-family: 'Courier New', monospace; }
    .expiry { color: #dc2626; font-size: 14px; font-weight: 600; margin-top: 20px; }
    .footer { background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; }
    .footer-text { color: #6b7280; font-size: 13px; line-height: 1.6; margin: 5px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🌿</div>
      <h1 class="header-title">Holi Labs</h1>
    </div>

    <div class="content">
      <p class="greeting">Hola${patientName ? ` ${patientName}` : ''},</p>

      <p class="message">
        Tu código de verificación es:
      </p>

      <div class="code-container">
        <div class="code">${code}</div>
        <p class="expiry">⏰ Válido por 10 minutos</p>
      </div>

      <p class="message">
        Ingresa este código en la página de inicio de sesión para acceder a tu portal.
      </p>

      <p class="message" style="font-size: 14px; color: #6b7280;">
        Si no solicitaste este código, puedes ignorar este correo.
      </p>
    </div>

    <div class="footer">
      <p class="footer-text">
        © ${new Date().getFullYear()} Holi Labs. Todos los derechos reservados.
      </p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Hola${patientName ? ` ${patientName}` : ''},

Tu código de verificación de Holi Labs es: ${code}

⏰ Válido por 10 minutos

Si no solicitaste este código, puedes ignorar este correo.

---
Holi Labs
  `.trim();

  return sendEmail({
    to: email,
    subject,
    html,
    text,
  });
}

/**
 * Send appointment reminder email
 */
export async function sendAppointmentReminderEmail(
  email: string,
  appointmentDetails: {
    patientName: string;
    clinicianName: string;
    date: string;
    time: string;
    type: string;
    location?: string;
  }
): Promise<boolean> {
  const { patientName, clinicianName, date, time, type, location } = appointmentDetails;
  const subject = `🗓️ Recordatorio: Cita con ${clinicianName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px 20px; text-align: center; color: white; }
    .content { padding: 40px 30px; }
    .appointment-card { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 12px; padding: 24px; margin: 20px 0; border-left: 4px solid #3b82f6; }
    .detail-row { display: flex; align-items: center; margin: 12px 0; }
    .detail-icon { margin-right: 12px; font-size: 20px; }
    .detail-text { color: #1e40af; font-size: 16px; }
    .button { display: inline-block; background: #3b82f6; color: white !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin-top: 20px; }
    .footer { background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 13px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">🗓️ Recordatorio de Cita</h1>
    </div>

    <div class="content">
      <p>Hola <strong>${patientName}</strong>,</p>

      <p>Te recordamos tu próxima cita:</p>

      <div class="appointment-card">
        <div class="detail-row">
          <span class="detail-icon">👨‍⚕️</span>
          <span class="detail-text"><strong>${clinicianName}</strong></span>
        </div>
        <div class="detail-row">
          <span class="detail-icon">📅</span>
          <span class="detail-text">${date}</span>
        </div>
        <div class="detail-row">
          <span class="detail-icon">🕐</span>
          <span class="detail-text">${time}</span>
        </div>
        <div class="detail-row">
          <span class="detail-icon">📋</span>
          <span class="detail-text">${type}</span>
        </div>
        ${location ? `
        <div class="detail-row">
          <span class="detail-icon">📍</span>
          <span class="detail-text">${location}</span>
        </div>
        ` : ''}
      </div>

      <p>Por favor, llega 10 minutos antes de tu cita.</p>

      <div style="text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/portal/dashboard/appointments" class="button">
          Ver Mis Citas
        </a>
      </div>
    </div>

    <div class="footer">
      <p>© ${new Date().getFullYear()} Holi Labs</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Hola ${patientName},

Recordatorio de tu próxima cita:

👨‍⚕️ Con: ${clinicianName}
📅 Fecha: ${date}
🕐 Hora: ${time}
📋 Tipo: ${type}
${location ? `📍 Ubicación: ${location}` : ''}

Por favor, llega 10 minutos antes.

---
Holi Labs
  `.trim();

  return sendEmail({
    to: email,
    subject,
    html,
    text,
  });
}

/**
 * Check if Resend is configured
 */
export function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}
