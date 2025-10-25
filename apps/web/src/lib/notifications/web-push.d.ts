/**
 * Web Push Notification Utilities
 * Handles push notification subscriptions and sending
 */
export declare const VAPID_PUBLIC_KEY: string;
export declare const VAPID_PRIVATE_KEY: string;
export declare const VAPID_EMAIL: string;
/**
 * Check if Web Push is supported in the browser
 */
export declare function isPushNotificationSupported(): boolean;
/**
 * Request notification permission from user
 */
export declare function requestNotificationPermission(): Promise<NotificationPermission>;
/**
 * Subscribe user to push notifications
 */
export declare function subscribeToPushNotifications(patientId: string): Promise<PushSubscription | null>;
/**
 * Unsubscribe from push notifications
 */
export declare function unsubscribeFromPushNotifications(): Promise<boolean>;
/**
 * Check if user is subscribed to push notifications
 */
export declare function isPushSubscribed(): Promise<boolean>;
/**
 * Send push notification (server-side)
 */
export declare function sendPushNotification(subscriptionId: string, payload: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    data?: any;
}): Promise<boolean>;
/**
 * Test push notification
 */
export declare function sendTestNotification(): Promise<void>;
//# sourceMappingURL=web-push.d.ts.map