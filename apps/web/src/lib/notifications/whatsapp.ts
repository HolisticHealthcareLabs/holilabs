/**
 * WhatsApp Notifications via Twilio
 *
 * Sends WhatsApp messages to patients and doctors for:
 * - SOAP note ready for review
 * - E-prescriptions
 * - Appointment reminders
 * - Test results available
 */

import twilio from 'twilio';

// Lazy-load Twilio client to avoid build-time errors
function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error('Twilio configuration missing. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.');
  }

  return twilio(accountSid, authToken);
}

// Get WhatsApp-enabled phone number from Twilio
function getTwilioWhatsAppNumber() {
  const number = process.env.TWILIO_WHATSAPP_NUMBER;

  if (!number) {
    throw new Error('TWILIO_WHATSAPP_NUMBER not configured. Please set this environment variable (format: whatsapp:+14155238886)');
  }

  return number;
}

/**
 * Format phone number for WhatsApp (E.164 format with whatsapp: prefix)
 */
function formatWhatsAppNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');

  // Add country code if missing (assume Brazil +55 or Mexico +52)
  if (!cleaned.startsWith('55') && !cleaned.startsWith('52') && !cleaned.startsWith('1')) {
    // Default to Brazil if no country code
    cleaned = '55' + cleaned;
  }

  return `whatsapp:+${cleaned}`;
}

/**
 * Send SOAP note ready notification to patient
 */
export async function notifyPatientSOAPReady({
  patientPhone,
  patientName,
  doctorName,
  noteUrl,
  language = 'pt',
}: {
  patientPhone: string;
  patientName: string;
  doctorName: string;
  noteUrl: string;
  language?: 'pt' | 'es';
}) {
  try {
    const client = getTwilioClient();
    const fromNumber = getTwilioWhatsAppNumber();
    const toNumber = formatWhatsAppNumber(patientPhone);

    const messages = {
      pt: `📋 Olá ${patientName}!\n\nSua nota médica da consulta com Dr(a). ${doctorName} está pronta para revisão.\n\n👉 Clique aqui para visualizar:\n${noteUrl}\n\n✅ O link é válido por 24 horas.\n\n*Holi Labs - Saúde Digital*`,
      es: `📋 ¡Hola ${patientName}!\n\nSu nota médica de la consulta con Dr(a). ${doctorName} está lista para revisión.\n\n👉 Haga clic aquí para ver:\n${noteUrl}\n\n✅ El enlace es válido por 24 horas.\n\n*Holi Labs - Salud Digital*`,
    };

    const message = await client.messages.create({
      from: fromNumber,
      to: toNumber,
      body: messages[language],
    });

    console.log('✅ WhatsApp sent to patient:', message.sid);
    return { success: true, messageSid: message.sid };
  } catch (error: any) {
    console.error('❌ WhatsApp send failed:', error);
    throw new Error(`Failed to send WhatsApp message: ${error.message}`);
  }
}

/**
 * Send e-prescription to patient
 */
export async function notifyPatientPrescription({
  patientPhone,
  patientName,
  doctorName,
  prescriptionUrl,
  medications,
  language = 'pt',
}: {
  patientPhone: string;
  patientName: string;
  doctorName: string;
  prescriptionUrl: string;
  medications: Array<{ name: string; dose: string; frequency: string }>;
  language?: 'pt' | 'es';
}) {
  try {
    const client = getTwilioClient();
    const fromNumber = getTwilioWhatsAppNumber();
    const toNumber = formatWhatsAppNumber(patientPhone);

    const medicationList = medications
      .map((med) => `• ${med.name} ${med.dose} - ${med.frequency}`)
      .join('\n');

    const messages = {
      pt: `💊 *Receita Médica Digital*\n\nOlá ${patientName},\n\nDr(a). ${doctorName} prescreveu:\n\n${medicationList}\n\n📄 Receita completa:\n${prescriptionUrl}\n\n⚠️ Siga as instruções do médico.\n\n*Holi Labs*`,
      es: `💊 *Receta Médica Digital*\n\n¡Hola ${patientName}!\n\nDr(a). ${doctorName} prescribió:\n\n${medicationList}\n\n📄 Receta completa:\n${prescriptionUrl}\n\n⚠️ Siga las instrucciones del médico.\n\n*Holi Labs*`,
    };

    const message = await client.messages.create({
      from: fromNumber,
      to: toNumber,
      body: messages[language],
    });

    console.log('✅ WhatsApp prescription sent:', message.sid);
    return { success: true, messageSid: message.sid };
  } catch (error: any) {
    console.error('❌ WhatsApp prescription send failed:', error);
    throw new Error(`Failed to send prescription: ${error.message}`);
  }
}

/**
 * Send signature request to doctor
 */
export async function notifyDoctorSignatureRequest({
  doctorPhone,
  doctorName,
  patientName,
  signatureUrl,
  language = 'pt',
}: {
  doctorPhone: string;
  doctorName: string;
  patientName: string;
  signatureUrl: string;
  language?: 'pt' | 'es';
}) {
  try {
    const client = getTwilioClient();
    const fromNumber = getTwilioWhatsAppNumber();
    const toNumber = formatWhatsAppNumber(doctorPhone);

    const messages = {
      pt: `✍️ *Assinatura Pendente*\n\nDr(a). ${doctorName},\n\nA nota SOAP do paciente *${patientName}* está pronta para assinatura.\n\n👉 Clique para revisar e assinar:\n${signatureUrl}\n\n⏰ Assinatura digital segura via blockchain\n\n*Holi Labs*`,
      es: `✍️ *Firma Pendiente*\n\nDr(a). ${doctorName},\n\nLa nota SOAP del paciente *${patientName}* está lista para firma.\n\n👉 Haga clic para revisar y firmar:\n${signatureUrl}\n\n⏰ Firma digital segura vía blockchain\n\n*Holi Labs*`,
    };

    const message = await client.messages.create({
      from: fromNumber,
      to: toNumber,
      body: messages[language],
    });

    console.log('✅ WhatsApp signature request sent:', message.sid);
    return { success: true, messageSid: message.sid };
  } catch (error: any) {
    console.error('❌ WhatsApp signature request failed:', error);
    throw new Error(`Failed to send signature request: ${error.message}`);
  }
}

/**
 * Send appointment reminder
 */
export async function notifyAppointmentReminder({
  patientPhone,
  patientName,
  doctorName,
  appointmentDate,
  appointmentTime,
  clinicAddress,
  language = 'pt',
}: {
  patientPhone: string;
  patientName: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  clinicAddress?: string;
  language?: 'pt' | 'es';
}) {
  try {
    const client = getTwilioClient();
    const fromNumber = getTwilioWhatsAppNumber();
    const toNumber = formatWhatsAppNumber(patientPhone);

    const messages = {
      pt: `📅 *Lembrete de Consulta*\n\n${patientName}, você tem consulta amanhã:\n\n🩺 Dr(a). ${doctorName}\n📆 ${appointmentDate}\n🕐 ${appointmentTime}\n${clinicAddress ? `📍 ${clinicAddress}\n` : ''}\n⏰ Chegue 15 minutos antes.\n\n*Holi Labs*`,
      es: `📅 *Recordatorio de Cita*\n\n${patientName}, tienes cita mañana:\n\n🩺 Dr(a). ${doctorName}\n📆 ${appointmentDate}\n🕐 ${appointmentTime}\n${clinicAddress ? `📍 ${clinicAddress}\n` : ''}\n⏰ Llega 15 minutos antes.\n\n*Holi Labs*`,
    };

    const message = await client.messages.create({
      from: fromNumber,
      to: toNumber,
      body: messages[language],
    });

    console.log('✅ WhatsApp appointment reminder sent:', message.sid);
    return { success: true, messageSid: message.sid };
  } catch (error: any) {
    console.error('❌ WhatsApp appointment reminder failed:', error);
    throw new Error(`Failed to send appointment reminder: ${error.message}`);
  }
}

/**
 * Send appointment CONFIRMATION with magic link (for automated reminders)
 * This is the main function used by the cron job
 */
export async function sendAppointmentConfirmationWhatsApp(
  patientPhone: string,
  patientName: string,
  dateTime: string,
  clinicianName: string,
  confirmationUrl: string,
  language: 'pt' | 'es' = 'es'
): Promise<boolean> {
  try {
    const client = getTwilioClient();
    const fromNumber = getTwilioWhatsAppNumber();
    const toNumber = formatWhatsAppNumber(patientPhone);

    const messages = {
      pt: `🏥 *Confirme sua Consulta*\n\nOlá ${patientName}!\n\nVocê tem consulta amanhã:\n👨‍⚕️ ${clinicianName}\n📅 ${dateTime}\n\n*Por favor, confirme sua presença:*\n${confirmationUrl}\n\n✅ Confirmar\n📅 Reagendar\n❌ Cancelar\n\n_Link válido por 24 horas_\n\n*Holi Labs - Saúde Digital*`,
      es: `🏥 *Confirma tu Cita Médica*\n\n¡Hola ${patientName}!\n\nTienes una cita mañana:\n👨‍⚕️ ${clinicianName}\n📅 ${dateTime}\n\n*Por favor, confirma tu asistencia:*\n${confirmationUrl}\n\n✅ Confirmar\n📅 Reagendar\n❌ Cancelar\n\n_Enlace válido por 24 horas_\n\n*Holi Labs - Salud Digital*`,
    };

    const message = await client.messages.create({
      from: fromNumber,
      to: toNumber,
      body: messages[language],
    });

    console.log('✅ WhatsApp confirmation sent:', message.sid);
    return true;
  } catch (error: any) {
    console.error('❌ WhatsApp confirmation failed:', error);
    // Don't throw - let other channels try
    return false;
  }
}

/**
 * Send test results notification
 */
export async function notifyTestResults({
  patientPhone,
  patientName,
  doctorName,
  testName,
  resultsUrl,
  language = 'pt',
}: {
  patientPhone: string;
  patientName: string;
  doctorName: string;
  testName: string;
  resultsUrl: string;
  language?: 'pt' | 'es';
}) {
  try {
    const client = getTwilioClient();
    const fromNumber = getTwilioWhatsAppNumber();
    const toNumber = formatWhatsAppNumber(patientPhone);

    const messages = {
      pt: `🔬 *Resultados de Exames*\n\nOlá ${patientName},\n\nSeus resultados de *${testName}* solicitados por Dr(a). ${doctorName} estão disponíveis.\n\n👉 Clique para visualizar:\n${resultsUrl}\n\n📞 Entre em contato com seu médico para discutir os resultados.\n\n*Holi Labs*`,
      es: `🔬 *Resultados de Exámenes*\n\n¡Hola ${patientName}!\n\nSus resultados de *${testName}* solicitados por Dr(a). ${doctorName} están disponibles.\n\n👉 Haga clic para ver:\n${resultsUrl}\n\n📞 Contacte a su médico para discutir los resultados.\n\n*Holi Labs*`,
    };

    const message = await client.messages.create({
      from: fromNumber,
      to: toNumber,
      body: messages[language],
    });

    console.log('✅ WhatsApp test results notification sent:', message.sid);
    return { success: true, messageSid: message.sid };
  } catch (error: any) {
    console.error('❌ WhatsApp test results notification failed:', error);
    throw new Error(`Failed to send test results notification: ${error.message}`);
  }
}
