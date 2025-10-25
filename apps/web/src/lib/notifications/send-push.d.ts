/**
 * Server-side Push Notification Sender
 * Sends web push notifications to subscribed users
 */
export interface PushNotificationPayload {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    image?: string;
    data?: Record<string, any>;
    tag?: string;
    requireInteraction?: boolean;
    actions?: Array<{
        action: string;
        title: string;
        icon?: string;
    }>;
}
export interface SendPushNotificationOptions {
    userId: string;
    payload: PushNotificationPayload;
    urgency?: 'very-low' | 'low' | 'normal' | 'high';
    ttl?: number;
}
/**
 * Send push notification to a specific user
 */
export declare function sendPushNotification({ userId, payload, urgency, ttl, }: SendPushNotificationOptions): Promise<{
    success: boolean;
    sentCount: number;
    failedCount: number;
    errors: string[];
}>;
/**
 * Send push notification to multiple users
 */
export declare function sendPushNotificationToMultiple({ userIds, payload, urgency, ttl, }: {
    userIds: string[];
    payload: PushNotificationPayload;
    urgency?: 'very-low' | 'low' | 'normal' | 'high';
    ttl?: number;
}): Promise<{
    success: boolean;
    totalSent: number;
    totalFailed: number;
    errors: string[];
}>;
/**
 * Helper: Send notification for new appointment
 */
export declare function sendAppointmentNotification(userId: string, appointmentDetails: {
    date: string;
    time: string;
    clinicianName: string;
    type: string;
}): Promise<{
    success: boolean;
    sentCount: number;
    failedCount: number;
    errors: string[];
}>;
/**
 * Helper: Send notification for new document
 */
export declare function sendDocumentNotification(userId: string, documentDetails: {
    fileName: string;
    documentType: string;
}): Promise<{
    success: boolean;
    sentCount: number;
    failedCount: number;
    errors: string[];
}>;
/**
 * Helper: Send notification for new message
 */
export declare function sendMessageNotification(userId: string, messageDetails: {
    senderName: string;
    preview: string;
}): Promise<{
    success: boolean;
    sentCount: number;
    failedCount: number;
    errors: string[];
}>;
/**
 * Helper: Send test notification
 */
export declare function sendTestNotification(userId: string): Promise<{
    success: boolean;
    sentCount: number;
    failedCount: number;
    errors: string[];
}>;
//# sourceMappingURL=send-push.d.ts.map