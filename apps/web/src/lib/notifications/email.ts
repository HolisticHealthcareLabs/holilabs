/**
 * Email Notification Service
 * Sends emails via unified email service (supports multiple providers)
 */

import { queueEmail } from '@/lib/email/email-service';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send email using unified email service
 * Queues email for background processing with retry logic
 */
export async function sendEmail({
  to,
  subject,
  html,
}: EmailOptions): Promise<boolean> {
  try {
    // Queue email for background processing
    const emailId = await queueEmail({
      to,
      subject,
      html,
      text: undefined, // HTML-only for now
    });

    console.log('Email queued successfully:', emailId);
    return true;
  } catch (error) {
    console.error('Error queueing email:', error);
    return false;
  }
}

/**
 * Generate HTML for appointment confirmation email
 */
function generateConfirmationEmailHTML(
  patientName: string,
  dateTime: string,
  clinicianName: string,
  type: string,
  confirmationUrl: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 32px;
      font-weight: bold;
    }
    .content {
      padding: 40px 30px;
    }
    .appointment-card {
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      border-radius: 12px;
      padding: 24px;
      margin: 24px 0;
    }
    .detail-row {
      display: flex;
      padding: 12px 0;
      border-bottom: 1px solid rgba(0,0,0,0.1);
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      font-weight: 600;
      color: #667eea;
      width: 120px;
      flex-shrink: 0;
    }
    .detail-value {
      color: #333;
      font-weight: 500;
    }
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    .button {
      display: inline-block;
      padding: 16px 48px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 50px;
      font-weight: bold;
      font-size: 16px;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      transition: transform 0.2s;
    }
    .button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
    }
    .footer {
      text-align: center;
      padding: 30px;
      background: #f9fafb;
      color: #6b7280;
      font-size: 14px;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏥 Holi Labs</h1>
      <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 18px;">Confirmación de Cita Médica</p>
    </div>

    <div class="content">
      <h2 style="color: #333; margin-top: 0;">Hola ${patientName},</h2>
      <p style="font-size: 16px; color: #555;">
        Tienes una cita médica programada. Por favor confirma tu asistencia.
      </p>

      <div class="appointment-card">
        <div class="detail-row">
          <span class="detail-label">👤 Paciente:</span>
          <span class="detail-value">${patientName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">👨‍⚕️ Médico:</span>
          <span class="detail-value">${clinicianName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">📅 Fecha y Hora:</span>
          <span class="detail-value">${dateTime}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">📍 Tipo:</span>
          <span class="detail-value">${type}</span>
        </div>
      </div>

      <div class="button-container">
        <a href="${confirmationUrl}" class="button">
          Confirmar mi Cita
        </a>
      </div>

      <p style="font-size: 14px; color: #6b7280; text-align: center; margin-top: 24px;">
        También puedes reagendar o cancelar tu cita usando el mismo enlace.
      </p>
    </div>

    <div class="footer">
      <p>¿Necesitas ayuda? Contacta al consultorio directamente</p>
      <p style="margin-top: 16px;">
        <a href="${confirmationUrl}">Ver detalles de la cita</a>
      </p>
      <p style="margin-top: 16px; font-size: 12px; color: #9ca3af;">
        Este es un correo automático, por favor no respondas a este mensaje.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Send appointment confirmation email
 */
export async function sendAppointmentConfirmationEmail(
  email: string,
  patientName: string,
  dateTime: string,
  clinicianName: string,
  type: string,
  confirmationUrl: string
): Promise<boolean> {
  const typeLabels: Record<string, string> = {
    IN_PERSON: 'Consulta Presencial',
    TELEHEALTH: 'Consulta Virtual',
    PHONE: 'Consulta Telefónica',
  };

  const html = generateConfirmationEmailHTML(
    patientName,
    dateTime,
    clinicianName,
    typeLabels[type] || type,
    confirmationUrl
  );

  return sendEmail({
    to: email,
    subject: `Confirma tu cita con ${clinicianName} - ${dateTime}`,
    html,
  });
}

/**
 * Send appointment reminder email (day-of)
 */
export async function sendAppointmentReminderEmail(
  email: string,
  patientName: string,
  time: string,
  clinicianName: string
): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 500px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
    .content { padding: 20px; background: #f9fafb; border-radius: 8px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🔔 Recordatorio de Cita</h2>
    </div>
    <div class="content">
      <p><strong>Hola ${patientName},</strong></p>
      <p>Te recordamos que tienes una cita <strong>hoy a las ${time}</strong> con ${clinicianName}.</p>
      <p style="margin-top: 20px; color: #667eea; font-weight: bold;">¡Te esperamos!</p>
      <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">- Equipo de Holi Labs</p>
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: email,
    subject: `Recordatorio: Cita hoy a las ${time} con ${clinicianName}`,
    html,
  });
}
