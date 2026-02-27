/**
 * Email Service Exports
 *
 * Central export point for all email functionality
 */

export {
  sendEmail,
  sendWelcomeEmail,
  sendClinicianMagicLink,
  sendMagicLinkEmail,
  sendOTPEmail,
  sendAppointmentReminderEmail,
  isResendConfigured,
} from './resend';
