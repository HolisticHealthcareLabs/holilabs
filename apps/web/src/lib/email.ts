/**
 * Email Notification Service (Resend)
 *
 * Simple, reliable email delivery for healthcare notifications
 */

import { Resend } from 'resend';
import logger from './logger';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Holi Labs <notificaciones@holilabs.com>';
const REPLY_TO = process.env.RESEND_REPLY_TO || 'soporte@holilabs.com';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
}

/**
 * Send email via Resend
 */
export async function sendEmail(options: SendEmailOptions) {
  try {
    const { to, subject, html, text, replyTo = REPLY_TO, tags } = options;

    // Validate required fields
    if (!to || (!html && !text)) {
      throw new Error('Email requires recipient and content (html or text)');
    }

    // Check if Resend is configured
    if (!process.env.RESEND_API_KEY) {
      logger.warn({
        event: 'email_send_skipped',
        reason: 'RESEND_API_KEY not configured',
        to: Array.isArray(to) ? to.join(', ') : to,
      });
      return { success: false, error: 'Email service not configured' };
    }

    // Build email options conditionally to satisfy Resend's strict types
    const emailOptions: any = {
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      replyTo,
    };

    // Add html/text only if defined
    if (html) emailOptions.html = html;
    if (text) emailOptions.text = text;
    if (tags) emailOptions.tags = tags;

    // Send email
    const response = await resend.emails.send(emailOptions);

    logger.info({
      event: 'email_sent',
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      emailId: response.data?.id,
    });

    return { success: true, data: response.data };
  } catch (error) {
    logger.error({
      event: 'email_send_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
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
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px; padding: 30px; margin-bottom: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🗓️ Recordatorio de Cita</h1>
        </div>

        <p style="font-size: 16px; color: #374151; line-height: 1.6;">Hola <strong>${patientName}</strong>,</p>

        <p style="font-size: 16px; color: #374151; line-height: 1.6;">
          Este es un recordatorio de tu próxima cita médica:
        </p>

        <div style="background: #f3f4f6; border-left: 4px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="margin: 8px 0; color: #1f2937;"><strong>📅 Fecha:</strong> ${dateStr}</p>
          <p style="margin: 8px 0; color: #1f2937;"><strong>👨‍⚕️ Médico:</strong> ${clinicianName}</p>
          <p style="margin: 8px 0; color: #1f2937;"><strong>🏥 Tipo:</strong> ${appointmentType}</p>
        </div>

        <p style="font-size: 16px; color: #374151; line-height: 1.6;">
          Por favor, llega 10 minutos antes de tu cita.
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.holilabs.com'}/portal/appointments"
             style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Ver Mis Citas
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />

        <p style="font-size: 14px; color: #6b7280; text-align: center;">
          Este es un correo automático. Por favor no responder.<br/>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.holilabs.com'}" style="color: #10b981; text-decoration: none;">Holi Labs</a> - Atención médica digital
        </p>
      </div>
    `,
    text: `Hola ${patientName},

Este es un recordatorio de tu próxima cita médica:

📅 Fecha: ${dateStr}
👨‍⚕️ Médico: ${clinicianName}
🏥 Tipo: ${appointmentType}

Por favor, llega 10 minutos antes de tu cita.

Ver mis citas: ${process.env.NEXT_PUBLIC_APP_URL || 'https://app.holilabs.com'}/portal/appointments

--
Holi Labs - Atención médica digital`,
    tags: [
      { name: 'type', value: 'appointment_reminder' },
      { name: 'category', value: 'transactional' },
    ],
  });
}

/**
 * Send new message notification email
 */
export async function sendNewMessageEmail(
  recipientEmail: string,
  recipientName: string,
  senderName: string,
  messagePreview: string,
  messageUrl: string
) {
  return sendEmail({
    to: recipientEmail,
    subject: `Nuevo mensaje de ${senderName}`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 16px; padding: 30px; margin-bottom: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">💬 Nuevo Mensaje</h1>
        </div>

        <p style="font-size: 16px; color: #374151; line-height: 1.6;">Hola <strong>${recipientName}</strong>,</p>

        <p style="font-size: 16px; color: #374151; line-height: 1.6;">
          <strong>${senderName}</strong> te ha enviado un mensaje:
        </p>

        <div style="background: #f3f4f6; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="margin: 0; color: #1f2937; font-style: italic;">"${messagePreview}..."</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${messageUrl}"
             style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Leer Mensaje
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />

        <p style="font-size: 14px; color: #6b7280; text-align: center;">
          Este es un correo automático. Por favor no responder.<br/>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.holilabs.com'}" style="color: #3b82f6; text-decoration: none;">Holi Labs</a> - Atención médica digital
        </p>
      </div>
    `,
    text: `Hola ${recipientName},

${senderName} te ha enviado un mensaje:

"${messagePreview}..."

Leer mensaje: ${messageUrl}

--
Holi Labs - Atención médica digital`,
    tags: [
      { name: 'type', value: 'new_message' },
      { name: 'category', value: 'transactional' },
    ],
  });
}

/**
 * Send consultation completed email
 */
export async function sendConsultationCompletedEmail(
  patientEmail: string,
  patientName: string,
  clinicianName: string,
  consultationUrl: string
) {
  return sendEmail({
    to: patientEmail,
    subject: 'Consulta completada - Notas disponibles',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px; padding: 30px; margin-bottom: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">✅ Consulta Completada</h1>
        </div>

        <p style="font-size: 16px; color: #374151; line-height: 1.6;">Hola <strong>${patientName}</strong>,</p>

        <p style="font-size: 16px; color: #374151; line-height: 1.6;">
          Tu consulta con <strong>${clinicianName}</strong> ha sido completada.
        </p>

        <p style="font-size: 16px; color: #374151; line-height: 1.6;">
          Las notas médicas y el plan de tratamiento ya están disponibles en tu portal de paciente.
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${consultationUrl}"
             style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Ver Notas Médicas
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />

        <p style="font-size: 14px; color: #6b7280; text-align: center;">
          Este es un correo automático. Por favor no responder.<br/>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.holilabs.com'}" style="color: #10b981; text-decoration: none;">Holi Labs</a> - Atención médica digital
        </p>
      </div>
    `,
    text: `Hola ${patientName},

Tu consulta con ${clinicianName} ha sido completada.

Las notas médicas y el plan de tratamiento ya están disponibles en tu portal de paciente.

Ver notas: ${consultationUrl}

--
Holi Labs - Atención médica digital`,
    tags: [
      { name: 'type', value: 'consultation_completed' },
      { name: 'category', value: 'transactional' },
    ],
  });
}

/**
 * Send new document notification email
 */
export async function sendNewDocumentEmail(
  patientEmail: string,
  patientName: string,
  documentTitle: string,
  documentUrl: string
) {
  return sendEmail({
    to: patientEmail,
    subject: `Nuevo documento: ${documentTitle}`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); border-radius: 16px; padding: 30px; margin-bottom: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">📄 Nuevo Documento</h1>
        </div>

        <p style="font-size: 16px; color: #374151; line-height: 1.6;">Hola <strong>${patientName}</strong>,</p>

        <p style="font-size: 16px; color: #374151; line-height: 1.6;">
          Se ha subido un nuevo documento a tu historial médico:
        </p>

        <div style="background: #f3f4f6; border-left: 4px solid #8b5cf6; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="margin: 0; color: #1f2937; font-weight: 600;">${documentTitle}</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${documentUrl}"
             style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Ver Documento
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />

        <p style="font-size: 14px; color: #6b7280; text-align: center;">
          Este es un correo automático. Por favor no responder.<br/>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.holilabs.com'}" style="color: #8b5cf6; text-decoration: none;">Holi Labs</a> - Atención médica digital
        </p>
      </div>
    `,
    text: `Hola ${patientName},

Se ha subido un nuevo documento a tu historial médico:

${documentTitle}

Ver documento: ${documentUrl}

--
Holi Labs - Atención médica digital`,
    tags: [
      { name: 'type', value: 'new_document' },
      { name: 'category', value: 'transactional' },
    ],
  });
}

/**
 * Send form notification email to patient
 */
export async function sendFormNotificationEmail(
  patientEmail: string,
  patientName: string,
  formTitle: string,
  formUrl: string,
  expiresAt: Date,
  customMessage?: string,
  clinicianName?: string
) {
  const expirationDate = expiresAt.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return sendEmail({
    to: patientEmail,
    subject: `📋 Nuevo formulario: ${formTitle}`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px; padding: 30px; margin-bottom: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">📋 Nuevo Formulario</h1>
        </div>

        <p style="font-size: 16px; color: #374151; line-height: 1.6;">Hola <strong>${patientName}</strong>,</p>

        <p style="font-size: 16px; color: #374151; line-height: 1.6;">
          ${clinicianName ? `El Dr./Dra. ${clinicianName}` : 'Su proveedor de salud'} le ha enviado un formulario para completar.
        </p>

        ${
          customMessage
            ? `
        <div style="background: #f0f4ff; border-left: 4px solid #667eea; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; color: #4a5568;"><strong>Mensaje de su médico:</strong></p>
          <p style="margin: 8px 0 0 0; color: #4a5568;">${customMessage}</p>
        </div>
        `
            : ''
        }

        <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="margin: 8px 0; color: #1f2937;"><strong>📄 Formulario:</strong> ${formTitle}</p>
          <p style="margin: 8px 0; color: #1f2937;"><strong>⏰ Vence:</strong> ${expirationDate}</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${formUrl}"
             style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Completar Formulario →
          </a>
        </div>

        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 12px 16px; margin: 20px 0;">
          <p style="margin: 0; color: #92400e; font-size: 14px;">
            ⚠️ <strong>Importante:</strong> Este formulario expira el <strong>${expirationDate}</strong>.
          </p>
        </div>

        <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
          <p style="margin: 0; color: #166534; font-size: 14px;">
            🔒 Sus datos están protegidos con cifrado de grado empresarial y cumplimiento HIPAA
          </p>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />

        <p style="font-size: 14px; color: #6b7280; text-align: center;">
          Este es un correo automático. Por favor no responder.<br/>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.holilabs.com'}" style="color: #667eea; text-decoration: none;">Holi Labs</a> - Atención médica digital
        </p>
      </div>
    `,
    text: `Hola ${patientName},

${clinicianName ? `El Dr./Dra. ${clinicianName}` : 'Su proveedor de salud'} le ha enviado un formulario para completar.

${customMessage ? `Mensaje: ${customMessage}\n\n` : ''}📄 Formulario: ${formTitle}
⏰ Vence: ${expirationDate}

Completar formulario: ${formUrl}

⚠️ Importante: Este formulario expira el ${expirationDate}.

--
Holi Labs - Atención médica digital`,
    tags: [
      { name: 'type', value: 'form_notification' },
      { name: 'category', value: 'transactional' },
    ],
  });
}

/**
 * Send form completion notification email to clinician
 */
export async function sendFormCompletionEmail(
  clinicianEmail: string,
  patientName: string,
  formTitle: string,
  completedAt: Date,
  formResponseUrl: string
) {
  const completionDate = completedAt.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return sendEmail({
    to: clinicianEmail,
    subject: `✅ Formulario completado: ${patientName} - ${formTitle}`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px; padding: 30px; margin-bottom: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">✅ Formulario Completado</h1>
        </div>

        <p style="font-size: 16px; color: #374151; line-height: 1.6;">Hola Doctor/a,</p>

        <p style="font-size: 16px; color: #374151; line-height: 1.6;">
          El paciente <strong>${patientName}</strong> ha completado el formulario <strong>${formTitle}</strong>.
        </p>

        <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="margin: 8px 0; color: #166534;"><strong>👤 Paciente:</strong> ${patientName}</p>
          <p style="margin: 8px 0; color: #166534;"><strong>📋 Formulario:</strong> ${formTitle}</p>
          <p style="margin: 8px 0; color: #166534;"><strong>🕐 Completado:</strong> ${completionDate}</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${formResponseUrl}"
             style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Ver Respuestas →
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />

        <p style="font-size: 14px; color: #6b7280; text-align: center;">
          Este es un correo automático. Por favor no responder.<br/>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.holilabs.com'}" style="color: #10b981; text-decoration: none;">Holi Labs</a> - Atención médica digital
        </p>
      </div>
    `,
    text: `Hola Doctor/a,

El paciente ${patientName} ha completado el formulario ${formTitle}.

👤 Paciente: ${patientName}
📋 Formulario: ${formTitle}
🕐 Completado: ${completionDate}

Ver respuestas: ${formResponseUrl}

--
Holi Labs - Atención médica digital`,
    tags: [
      { name: 'type', value: 'form_completion' },
      { name: 'category', value: 'transactional' },
    ],
  });
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

        <p style="font-size: 16px; color: #374151; line-height: 1.6;">
          Haz clic en el botón de abajo para acceder de forma segura a tu portal de paciente:
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${magicLinkUrl}"
             style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            🔓 Acceder a mi Portal →
          </a>
        </div>

        <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; color: #92400e; font-size: 14px;">
            ⏰ <strong>Este enlace expira a las ${expiryTime}</strong> (15 minutos). Si no lo solicitaste, puedes ignorar este correo.
          </p>
        </div>

        <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
          Por seguridad, este enlace solo puede usarse una vez y expira en 15 minutos.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />

        <p style="font-size: 14px; color: #6b7280; text-align: center;">
          Este es un correo automático. Por favor no responder.<br/>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.holilabs.com'}" style="color: #3b82f6; text-decoration: none;">Holi Labs</a> - Atención médica digital
        </p>
      </div>
    `,
    text: `Hola ${patientName},

Haz clic en el siguiente enlace para acceder de forma segura a tu portal de paciente:

${magicLinkUrl}

⏰ Este enlace expira a las ${expiryTime} (15 minutos).

Por seguridad, este enlace solo puede usarse una vez y expira en 15 minutos.

Si no solicitaste este acceso, puedes ignorar este correo.

--
Holi Labs - Atención médica digital`,
    tags: [
      { name: 'type', value: 'magic_link' },
      { name: 'category', value: 'authentication' },
    ],
  });
}

/**
 * Send email verification email for new patient accounts
 */
export async function sendEmailVerificationEmail(
  email: string,
  userName: string,
  verificationUrl: string
) {
  return sendEmail({
    to: email,
    subject: '✅ Verifica tu correo - Holi Labs',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .logo { height: 40px; }
            .content { background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; }
            .button { display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="color: white; margin: 0;">Bienvenido a Holi Labs</h1>
            </div>
            <div class="content">
              <h2>Hola ${userName},</h2>
              <p>Gracias por registrarte en Holi Labs. Para activar tu cuenta, por favor verifica tu correo electrónico.</p>
              <p style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verificar Correo</a>
              </p>
              <p>O copia este enlace en tu navegador:</p>
              <p style="word-break: break-all; color: #0ea5e9;">${verificationUrl}</p>
              <p style="color: #ef4444; font-size: 14px; margin-top: 30px;">
                ⚠️ Este enlace expira en 24 horas.
              </p>
              <p style="font-size: 14px; color: #6b7280;">
                Si no creaste esta cuenta, puedes ignorar este correo de manera segura.
              </p>
            </div>
            <div class="footer">
              <p>🔒 Tu seguridad es nuestra prioridad</p>
              <p>© 2025 Holi Labs. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Hola ${userName},

Gracias por registrarte en Holi Labs. Para activar tu cuenta, por favor verifica tu correo electrónico.

Verificar correo: ${verificationUrl}

⚠️ Este enlace expira en 24 horas.

Si no creaste esta cuenta, puedes ignorar este correo de manera segura.

--
Holi Labs - Atención médica digital`,
    tags: [
      { name: 'type', value: 'email_verification' },
      { name: 'category', value: 'authentication' },
    ],
  });
}

/**
 * Send password reset email (for both patients and providers)
 */
export async function sendPasswordResetEmail(
  email: string,
  userName: string,
  resetUrl: string,
  isPatient: boolean = true
) {
  const subject = isPatient
    ? '🔑 Recupera tu contraseña - Holi Labs'
    : '🔑 Reset Your Password - Holi Labs';

  const title = isPatient ? 'Recupera tu contraseña' : 'Reset Your Password';
  const greeting = isPatient ? `Hola ${userName}` : `Hello ${userName}`;
  const message = isPatient
    ? 'Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón de abajo para crear una nueva contraseña.'
    : 'We received a request to reset your password. Click the button below to create a new password.';
  const buttonText = isPatient ? 'Restablecer Contraseña' : 'Reset Password';
  const expireNote = isPatient
    ? '⚠️ Este enlace expira en 1 hora.'
    : '⚠️ This link expires in 1 hour.';
  const ignoreNote = isPatient
    ? 'Si no solicitaste este cambio, puedes ignorar este correo de manera segura.'
    : 'If you did not request this change, you can safely ignore this email.';

  return sendEmail({
    to: email,
    subject,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; }
            .button { display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="color: white; margin: 0;">${title}</h1>
            </div>
            <div class="content">
              <h2>${greeting},</h2>
              <p>${message}</p>
              <p style="text-align: center;">
                <a href="${resetUrl}" class="button">${buttonText}</a>
              </p>
              <p>O copia este enlace en tu navegador:</p>
              <p style="word-break: break-all; color: #0ea5e9;">${resetUrl}</p>
              <p style="color: #ef4444; font-size: 14px; margin-top: 30px;">
                ${expireNote}
              </p>
              <p style="font-size: 14px; color: #6b7280;">
                ${ignoreNote}
              </p>
            </div>
            <div class="footer">
              <p>🔒 Tu seguridad es nuestra prioridad</p>
              <p>© 2025 Holi Labs. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `${greeting},

${message}

${isPatient ? 'Restablecer contraseña' : 'Reset password'}: ${resetUrl}

${expireNote}

${ignoreNote}

--
Holi Labs - Atención médica digital`,
    tags: [
      { name: 'type', value: 'password_reset' },
      { name: 'category', value: 'authentication' },
    ],
  });
}
