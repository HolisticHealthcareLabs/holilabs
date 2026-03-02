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

// Re-export functions from legacy email module that aren't in resend.ts
export {
  sendFormNotificationEmail,
  sendFormCompletionEmail,
  sendEmailVerificationEmail,
  sendPasswordResetEmail,
  sendNewMessageEmail,
  sendConsultationCompletedEmail,
  sendNewDocumentEmail,
} from '../email-legacy';
