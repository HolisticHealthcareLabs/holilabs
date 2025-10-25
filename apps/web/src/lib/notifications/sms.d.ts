/**
 * SMS Notification Service
 * Sends SMS messages via Twilio
 */
interface SMSOptions {
    to: string;
    message: string;
}
export declare function sendSMS({ to, message }: SMSOptions): Promise<boolean>;
/**
 * Send appointment confirmation SMS
 */
export declare function sendAppointmentConfirmationSMS(phone: string, patientName: string, dateTime: string, clinicianName: string, confirmationUrl: string): Promise<boolean>;
/**
 * Send appointment reminder SMS (shorter, for day-of reminders)
 */
export declare function sendAppointmentReminderSMS(phone: string, patientName: string, time: string, clinicianName: string): Promise<boolean>;
export {};
//# sourceMappingURL=sms.d.ts.map