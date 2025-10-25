/**
 * Email Notification Service
 * Sends emails via Resend API
 */
interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}
export declare function sendEmail({ to, subject, html, }: EmailOptions): Promise<boolean>;
/**
 * Send appointment confirmation email
 */
export declare function sendAppointmentConfirmationEmail(email: string, patientName: string, dateTime: string, clinicianName: string, type: string, confirmationUrl: string): Promise<boolean>;
/**
 * Send appointment reminder email (day-of)
 */
export declare function sendAppointmentReminderEmail(email: string, patientName: string, time: string, clinicianName: string): Promise<boolean>;
export {};
//# sourceMappingURL=email.d.ts.map