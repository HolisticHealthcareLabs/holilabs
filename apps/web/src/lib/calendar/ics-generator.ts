/**
 * ICS Calendar File Generator
 * Generates .ics files for appointment calendar exports
 * Supports Google Calendar, Apple Calendar, Outlook, etc.
 */

import ical, { ICalCalendarMethod } from 'ical-generator';
import { format } from 'date-fns';

export interface AppointmentData {
  id: string;
  startTime: Date;
  endTime: Date;
  patientName: string;
  clinicianName: string;
  notes?: string;
  type?: string;
}

/**
 * Generate ICS calendar file content for an appointment
 */
export function generateAppointmentICS(appointment: AppointmentData): string {
  // Create calendar
  const calendar = ical({
    name: 'Holi Labs Appointment',
    timezone: 'America/Mexico_City',
    method: ICalCalendarMethod.REQUEST,
  });

  // Format title
  const title = `Medical Appointment with Dr. ${appointment.clinicianName}`;

  // Format description
  const description = [
    `Patient: ${appointment.patientName}`,
    `Provider: Dr. ${appointment.clinicianName}`,
    '',
    appointment.type ? `Type: ${appointment.type}` : '',
    appointment.notes ? `Notes: ${appointment.notes}` : '',
    '',
    'Please arrive 15 minutes early.',
    '',
    'Powered by Holi Labs',
  ]
    .filter(Boolean)
    .join('\n');

  // Create event
  calendar.createEvent({
    start: appointment.startTime,
    end: appointment.endTime,
    summary: title,
    description,
    location: 'Holi Labs Clinic',
    url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://aipathfinder.ai'}/portal/appointments/${appointment.id}`,
    organizer: {
      name: 'Holi Labs',
      email: process.env.EMAIL_FROM || 'noreply@aipathfinder.ai',
    },
    // Add reminder: 24 hours before
    alarms: [
      {
        type: 'display' as any,
        trigger: 24 * 60 * 60, // 24 hours in seconds
        description: 'Appointment Reminder - Tomorrow',
      },
      {
        type: 'display' as any,
        trigger: 60 * 60, // 1 hour in seconds
        description: 'Appointment Reminder - 1 Hour',
      },
    ],
    status: 'CONFIRMED' as any,
    busystatus: 'BUSY' as any,
    sequence: 0,
    uid: `appointment-${appointment.id}@aipathfinder.ai` as any,
  });

  return calendar.toString();
}

/**
 * Generate Google Calendar URL
 * Opens Google Calendar with pre-filled appointment details
 */
export function generateGoogleCalendarURL(appointment: AppointmentData): string {
  const baseURL = 'https://calendar.google.com/calendar/render';

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Medical Appointment with Dr. ${appointment.clinicianName}`,
    dates: `${formatDateForGoogle(appointment.startTime)}/${formatDateForGoogle(appointment.endTime)}`,
    details: [
      `Patient: ${appointment.patientName}`,
      `Provider: Dr. ${appointment.clinicianName}`,
      '',
      '',
      'Please arrive 15 minutes early.',
    ]
      .filter(Boolean)
      .join('\n'),
    location: 'Holi Labs Clinic',
    ctz: 'America/Mexico_City',
  });

  return `${baseURL}?${params.toString()}`;
}

/**
 * Generate Outlook Calendar URL
 * Opens Outlook.com calendar with pre-filled details
 */
export function generateOutlookCalendarURL(appointment: AppointmentData): string {
  const baseURL = 'https://outlook.office.com/calendar/0/action/compose';

  const params = new URLSearchParams({
    subject: `Medical Appointment with Dr. ${appointment.clinicianName}`,
    startdt: appointment.startTime.toISOString(),
    enddt: appointment.endTime.toISOString(),
    body: [
      `Patient: ${appointment.patientName}`,
      `Provider: Dr. ${appointment.clinicianName}`,
      '',
      '',
      'Please arrive 15 minutes early.',
    ]
      .filter(Boolean)
      .join('\n'),
    location: 'Holi Labs Clinic',
    path: '/calendar/action/compose',
    rru: 'addevent',
  });

  return `${baseURL}?${params.toString()}`;
}

/**
 * Format date for Google Calendar URL
 * Format: YYYYMMDDTHHmmssZ
 */
function formatDateForGoogle(date: Date): string {
  return format(date, "yyyyMMdd'T'HHmmss'Z'");
}

/**
 * Generate filename for ICS download
 */
export function generateICSFilename(appointment: AppointmentData): string {
  const dateStr = format(appointment.startTime, 'yyyy-MM-dd');
  const safePatientName = appointment.patientName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  return `holilabs-appointment-${dateStr}-${safePatientName}.ics`;
}
