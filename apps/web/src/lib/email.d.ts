/**
 * Email Notification Service (Resend)
 *
 * Simple, reliable email delivery for healthcare notifications
 */
export interface SendEmailOptions {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    replyTo?: string;
    tags?: {
        name: string;
        value: string;
    }[];
}
/**
 * Send email via Resend
 */
export declare function sendEmail(options: SendEmailOptions): Promise<{
    success: boolean;
    error: string;
    data?: undefined;
} | {
    success: boolean;
    data: import("resend").CreateEmailResponseSuccess | null;
    error?: undefined;
}>;
/**
 * Send appointment reminder email
 */
export declare function sendAppointmentReminderEmail(patientEmail: string, patientName: string, appointmentDate: Date, clinicianName: string, appointmentType: string): Promise<{
    success: boolean;
    error: string;
    data?: undefined;
} | {
    success: boolean;
    data: import("resend").CreateEmailResponseSuccess | null;
    error?: undefined;
}>;
/**
 * Send new message notification email
 */
export declare function sendNewMessageEmail(recipientEmail: string, recipientName: string, senderName: string, messagePreview: string, messageUrl: string): Promise<{
    success: boolean;
    error: string;
    data?: undefined;
} | {
    success: boolean;
    data: import("resend").CreateEmailResponseSuccess | null;
    error?: undefined;
}>;
/**
 * Send consultation completed email
 */
export declare function sendConsultationCompletedEmail(patientEmail: string, patientName: string, clinicianName: string, consultationUrl: string): Promise<{
    success: boolean;
    error: string;
    data?: undefined;
} | {
    success: boolean;
    data: import("resend").CreateEmailResponseSuccess | null;
    error?: undefined;
}>;
/**
 * Send new document notification email
 */
export declare function sendNewDocumentEmail(patientEmail: string, patientName: string, documentTitle: string, documentUrl: string): Promise<{
    success: boolean;
    error: string;
    data?: undefined;
} | {
    success: boolean;
    data: import("resend").CreateEmailResponseSuccess | null;
    error?: undefined;
}>;
/**
 * Send form notification email to patient
 */
export declare function sendFormNotificationEmail(patientEmail: string, patientName: string, formTitle: string, formUrl: string, expiresAt: Date, customMessage?: string, clinicianName?: string): Promise<{
    success: boolean;
    error: string;
    data?: undefined;
} | {
    success: boolean;
    data: import("resend").CreateEmailResponseSuccess | null;
    error?: undefined;
}>;
/**
 * Send form completion notification email to clinician
 */
export declare function sendFormCompletionEmail(clinicianEmail: string, patientName: string, formTitle: string, completedAt: Date, formResponseUrl: string): Promise<{
    success: boolean;
    error: string;
    data?: undefined;
} | {
    success: boolean;
    data: import("resend").CreateEmailResponseSuccess | null;
    error?: undefined;
}>;
/**
 * Send magic link email for patient authentication
 */
export declare function sendMagicLinkEmail(email: string, patientName: string, magicLinkUrl: string, expiresAt: Date): Promise<{
    success: boolean;
    error: string;
    data?: undefined;
} | {
    success: boolean;
    data: import("resend").CreateEmailResponseSuccess | null;
    error?: undefined;
}>;
//# sourceMappingURL=email.d.ts.map