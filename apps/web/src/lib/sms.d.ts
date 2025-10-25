/**
 * SMS Notification Service (Twilio)
 *
 * Simple, reliable SMS delivery for healthcare notifications
 */
export interface SendSMSOptions {
    to: string;
    message: string;
}
/**
 * Send SMS via Twilio
 */
export declare function sendSMS(options: SendSMSOptions): Promise<{
    success: boolean;
    error: string;
    data?: undefined;
} | {
    success: boolean;
    data: import("twilio/lib/rest/api/v2010/account/message").MessageInstance;
    error?: undefined;
}>;
/**
 * Send appointment reminder SMS
 */
export declare function sendAppointmentReminderSMS(phoneNumber: string, patientName: string, appointmentDate: Date, clinicianName: string): Promise<{
    success: boolean;
    error: string;
    data?: undefined;
} | {
    success: boolean;
    data: import("twilio/lib/rest/api/v2010/account/message").MessageInstance;
    error?: undefined;
}>;
/**
 * Send new message notification SMS
 */
export declare function sendNewMessageSMS(phoneNumber: string, recipientName: string, senderName: string): Promise<{
    success: boolean;
    error: string;
    data?: undefined;
} | {
    success: boolean;
    data: import("twilio/lib/rest/api/v2010/account/message").MessageInstance;
    error?: undefined;
}>;
/**
 * Send consultation completed SMS
 */
export declare function sendConsultationCompletedSMS(phoneNumber: string, patientName: string, clinicianName: string): Promise<{
    success: boolean;
    error: string;
    data?: undefined;
} | {
    success: boolean;
    data: import("twilio/lib/rest/api/v2010/account/message").MessageInstance;
    error?: undefined;
}>;
/**
 * Send OTP code SMS
 */
export declare function sendOTPCodeSMS(phoneNumber: string, code: string): Promise<{
    success: boolean;
    error: string;
    data?: undefined;
} | {
    success: boolean;
    data: import("twilio/lib/rest/api/v2010/account/message").MessageInstance;
    error?: undefined;
}>;
/**
 * Send magic link SMS
 */
export declare function sendMagicLinkSMS(phoneNumber: string, link: string): Promise<{
    success: boolean;
    error: string;
    data?: undefined;
} | {
    success: boolean;
    data: import("twilio/lib/rest/api/v2010/account/message").MessageInstance;
    error?: undefined;
}>;
/**
 * Send prescription ready SMS
 */
export declare function sendPrescriptionReadySMS(phoneNumber: string, patientName: string, clinicianName: string): Promise<{
    success: boolean;
    error: string;
    data?: undefined;
} | {
    success: boolean;
    data: import("twilio/lib/rest/api/v2010/account/message").MessageInstance;
    error?: undefined;
}>;
/**
 * Validate phone number format
 */
export declare function isValidPhoneNumber(phone: string): boolean;
/**
 * Format phone number for display
 */
export declare function formatPhoneNumber(phone: string): string;
//# sourceMappingURL=sms.d.ts.map