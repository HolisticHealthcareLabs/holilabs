/**
 * Template Variable Replacement System
 * Replaces template variables with actual appointment data
 */

import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TemplateData {
  patient?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
  clinician?: {
    firstName?: string;
    lastName?: string;
    specialty?: string;
  };
  appointment?: {
    startTime?: Date;
    endTime?: Date;
    type?: string;
    branch?: string;
    branchAddress?: string;
    branchMapLink?: string;
  };
  clinic?: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  customVariables?: Record<string, string>;
}

/**
 * Available template variables:
 *
 * Patient variables:
 * - {firstName} - Patient's first name
 * - {lastName} - Patient's last name
 * - {fullName} - Patient's full name (firstName + lastName)
 * - {email} - Patient's email
 * - {phone} - Patient's phone number
 *
 * Clinician variables:
 * - {doctorName} - Doctor's full name
 * - {doctorFirstName} - Doctor's first name
 * - {doctorLastName} - Doctor's last name
 * - {doctorSpecialty} - Doctor's specialty
 *
 * Appointment variables:
 * - {appointmentDate} - Full date (e.g., "lunes, 25 de octubre de 2025")
 * - {appointmentTime} - Time (e.g., "14:30")
 * - {appointmentEndTime} - End time (e.g., "15:00")
 * - {appointmentType} - Type (Presencial, Virtual, Telefónica)
 * - {branch} - Branch/location name
 * - {branchAddress} - Branch full address
 * - {branchMapLink} - Google Maps link
 *
 * Clinic variables:
 * - {clinicName} - Clinic name
 * - {clinicPhone} - Clinic phone
 * - {clinicEmail} - Clinic email
 * - {clinicAddress} - Clinic address
 */

const APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  IN_PERSON: 'Presencial',
  TELEHEALTH: 'Virtual',
  PHONE: 'Telefónica',
};

/**
 * Renders a template string by replacing variables with actual data
 */
export function renderTemplate(template: string, data: TemplateData): string {
  let rendered = template;

  // Patient variables
  if (data.patient) {
    rendered = rendered.replace(/{firstName}/g, data.patient.firstName || '');
    rendered = rendered.replace(/{lastName}/g, data.patient.lastName || '');
    rendered = rendered.replace(
      /{fullName}/g,
      `${data.patient.firstName || ''} ${data.patient.lastName || ''}`.trim()
    );
    rendered = rendered.replace(/{email}/g, data.patient.email || '');
    rendered = rendered.replace(/{phone}/g, data.patient.phone || '');
  }

  // Clinician variables
  if (data.clinician) {
    rendered = rendered.replace(
      /{doctorName}/g,
      `${data.clinician.firstName || ''} ${data.clinician.lastName || ''}`.trim()
    );
    rendered = rendered.replace(/{doctorFirstName}/g, data.clinician.firstName || '');
    rendered = rendered.replace(/{doctorLastName}/g, data.clinician.lastName || '');
    rendered = rendered.replace(/{doctorSpecialty}/g, data.clinician.specialty || '');
  }

  // Appointment variables
  if (data.appointment) {
    if (data.appointment.startTime) {
      rendered = rendered.replace(
        /{appointmentDate}/g,
        format(data.appointment.startTime, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
      );
      rendered = rendered.replace(
        /{appointmentTime}/g,
        format(data.appointment.startTime, 'HH:mm', { locale: es })
      );
    }

    if (data.appointment.endTime) {
      rendered = rendered.replace(
        /{appointmentEndTime}/g,
        format(data.appointment.endTime, 'HH:mm', { locale: es })
      );
    }

    rendered = rendered.replace(
      /{appointmentType}/g,
      APPOINTMENT_TYPE_LABELS[data.appointment.type || ''] || data.appointment.type || ''
    );
    rendered = rendered.replace(/{branch}/g, data.appointment.branch || '');
    rendered = rendered.replace(/{branchAddress}/g, data.appointment.branchAddress || '');
    rendered = rendered.replace(/{branchMapLink}/g, data.appointment.branchMapLink || '');
  }

  // Clinic variables
  if (data.clinic) {
    rendered = rendered.replace(/{clinicName}/g, data.clinic.name || 'Holi Labs');
    rendered = rendered.replace(/{clinicPhone}/g, data.clinic.phone || '');
    rendered = rendered.replace(/{clinicEmail}/g, data.clinic.email || '');
    rendered = rendered.replace(/{clinicAddress}/g, data.clinic.address || '');
  }

  // Custom variables
  if (data.customVariables) {
    Object.entries(data.customVariables).forEach(([key, value]) => {
      const regex = new RegExp(`{${key}}`, 'g');
      rendered = rendered.replace(regex, value);
    });
  }

  return rendered;
}

/**
 * Extracts variables used in a template string
 */
export function extractVariables(template: string): string[] {
  const regex = /{([^}]+)}/g;
  const variables: string[] = [];
  let match;

  while ((match = regex.exec(template)) !== null) {
    variables.push(match[1]);
  }

  return [...new Set(variables)]; // Remove duplicates
}

/**
 * Validates that all required variables have data
 */
export function validateTemplateData(
  template: string,
  data: TemplateData
): { valid: boolean; missingVariables: string[] } {
  const usedVariables = extractVariables(template);
  const missingVariables: string[] = [];

  usedVariables.forEach((variable) => {
    const rendered = renderTemplate(`{${variable}}`, data);
    // If variable is still in brackets, it wasn't replaced (missing data)
    if (rendered === `{${variable}}` || rendered === '') {
      missingVariables.push(variable);
    }
  });

  return {
    valid: missingVariables.length === 0,
    missingVariables,
  };
}

/**
 * Default Spanish templates
 */
export const DEFAULT_TEMPLATES = {
  APPOINTMENT_REMINDER: `Hola {firstName},

Te recordamos tu cita médica:

📅 Fecha: {appointmentDate}
⏰ Hora: {appointmentTime}
👨‍⚕️ Doctor: {doctorName}
📍 Lugar: {branch}

Por favor confirma tu asistencia.

Gracias,
{clinicName}`,

  APPOINTMENT_CONFIRMATION: `¡Hola {firstName}!

Tu cita ha sido confirmada:

📅 {appointmentDate}
⏰ {appointmentTime}
👨‍⚕️ Dr. {doctorName}
📍 {branch}
🗺️ {branchMapLink}

¡Te esperamos!

{clinicName}`,

  APPOINTMENT_CANCELLATION: `Hola {firstName},

Tu cita del {appointmentDate} a las {appointmentTime} con {doctorName} ha sido cancelada.

Si deseas reagendar, por favor contacta con nosotros.

Gracias,
{clinicName}`,

  PAYMENT_REMINDER: `Hola {firstName},

Te recordamos que tienes un pago pendiente para tu cita del {appointmentDate} a las {appointmentTime}.

Por favor ponte en contacto con nosotros para resolver este asunto.

Gracias,
{clinicName}
📞 {clinicPhone}`,

  RESCHEDULE_APPROVED: `¡Buenas noticias {firstName}!

Tu solicitud de reagendamiento ha sido aprobada.

Nueva fecha: {appointmentDate}
Nueva hora: {appointmentTime}
Doctor: {doctorName}

Gracias,
{clinicName}`,

  RESCHEDULE_DENIED: `Hola {firstName},

Lamentamos informarte que tu solicitud de reagendamiento no pudo ser aprobada.

Por favor contacta al consultorio directamente para encontrar una nueva fecha.

Gracias,
{clinicName}
📞 {clinicPhone}`,

  FOLLOW_UP_1: `Hola {firstName},

Este es un recordatorio de seguimiento sobre tu cita:

📅 Fecha: {appointmentDate}
⏰ Hora: {appointmentTime}
👨‍⚕️ Doctor: {doctorName}

Por favor confirma tu asistencia respondiendo a este mensaje.

Gracias,
{clinicName}`,

  FOLLOW_UP_2: `Hola {firstName},

Este es nuestro segundo recordatorio sobre tu cita:

📅 {appointmentDate} a las {appointmentTime}
👨‍⚕️ Dr. {doctorName}

Es importante que confirmes tu asistencia o nos avises si necesitas reagendar.

Gracias,
{clinicName}
📞 {clinicPhone}`,
};

/**
 * Gets a default template by type
 */
export function getDefaultTemplate(type: keyof typeof DEFAULT_TEMPLATES): string {
  return DEFAULT_TEMPLATES[type] || '';
}
