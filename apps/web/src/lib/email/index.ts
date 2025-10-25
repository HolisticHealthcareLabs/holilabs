/**
 * Email Service Exports
 *
 * Central export point for all email functionality
 */

export {
  sendEmail,
  sendMagicLinkEmail,
  sendOTPEmail,
  sendAppointmentReminderEmail,
  isResendConfigured,
} from './resend';
