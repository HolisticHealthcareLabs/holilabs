/**
 * Push Notification Manager
 *
 * Competitive Analysis:
 * - Abridge: ✅ Push notifications for transcription complete
 * - Nuance DAX: ❌ No push notifications
 * - Suki: ❌ No push notifications
 * - Doximity: ✅ Push notifications for messages
 *
 * Impact: Improves user engagement and workflow efficiency
 * Use cases: Appointment reminders, sync complete, transcription ready
 */
export type NotificationType = 'APPOINTMENT_REMINDER' | 'SYNC_COMPLETE' | 'TRANSCRIPTION_READY' | 'NOTE_SIGNED' | 'EXPORT_READY';
export interface NotificationOptions {
    title: string;
    body: string;
    type: NotificationType;
    data?: any;
    actions?: Array<{
        action: string;
        title: string;
    }>;
    icon?: string;
    badge?: string;
    tag?: string;
    requireInteraction?: boolean;
}
declare class PushNotificationManager {
    private registration;
    /**
     * Check if push notifications are supported
     */
    isSupported(): boolean;
    /**
     * Get current permission status
     */
    getPermission(): NotificationPermission;
    /**
     * Request notification permission
     */
    requestPermission(): Promise<NotificationPermission>;
    /**
     * Initialize service worker registration
     */
    init(): Promise<void>;
    /**
     * Subscribe to push notifications
     */
    subscribe(): Promise<PushSubscription | null>;
    /**
     * Unsubscribe from push notifications
     */
    unsubscribe(): Promise<boolean>;
    /**
     * Show a local notification
     */
    showNotification(options: NotificationOptions): Promise<void>;
    /**
     * Send subscription to backend
     */
    private sendSubscriptionToBackend;
    /**
     * Convert VAPID key from base64 to Uint8Array
     */
    private urlBase64ToUint8Array;
}
export declare const pushNotifications: PushNotificationManager;
/**
 * Helper functions for common notifications
 */
export declare function notifyAppointmentReminder(patientName: string, time: string): Promise<void>;
export declare function notifySyncComplete(count: number): Promise<void>;
export declare function notifyTranscriptionReady(patientName: string): Promise<void>;
export declare function notifyNoteSigned(patientName: string): Promise<void>;
export declare function notifyExportReady(format: string): Promise<void>;
export {};
//# sourceMappingURL=push-notifications.d.ts.map