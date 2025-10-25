/**
 * Appointment Reminder Service
 * Orchestrates sending reminders via multiple channels
 * Priority: WhatsApp (98% open rate) → Push → Email → SMS
 */
interface ReminderResult {
    success: boolean;
    channels: {
        whatsapp?: boolean;
        push?: boolean;
        sms?: boolean;
        email?: boolean;
    };
    error?: string;
}
/**
 * Send appointment confirmation reminder via all available channels
 * Priority: Push → SMS → Email
 */
export declare function sendAppointmentReminder(appointmentId: string): Promise<ReminderResult>;
/**
 * Send reminders for all appointments tomorrow
 */
export declare function sendRemindersForTomorrow(): Promise<{
    total: number;
    sent: number;
    failed: number;
}>;
export {};
//# sourceMappingURL=appointment-reminders.d.ts.map