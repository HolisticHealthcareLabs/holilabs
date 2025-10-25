/**
 * Notification Utility
 *
 * Simple, flexible notification system for real-time updates
 * Supports in-app, email, and SMS delivery
 */
import type { UserType, NotificationType, NotificationPriority } from '@prisma/client';
export interface CreateNotificationOptions {
    recipientId: string;
    recipientType: UserType;
    type: NotificationType;
    title: string;
    message: string;
    actionUrl?: string;
    actionLabel?: string;
    resourceType?: string;
    resourceId?: string;
    priority?: NotificationPriority;
    sendEmail?: boolean;
    sendSMS?: boolean;
    metadata?: Record<string, any>;
    expiresInDays?: number;
}
/**
 * Create a notification for a user
 */
export declare function createNotification(options: CreateNotificationOptions): Promise<any>;
/**
 * Create multiple notifications at once
 */
export declare function createNotifications(notifications: CreateNotificationOptions[]): Promise<void>;
/**
 * Mark notification as read
 */
export declare function markNotificationAsRead(notificationId: string): Promise<any>;
/**
 * Mark all notifications as read for a user
 */
export declare function markAllNotificationsAsRead(recipientId: string, recipientType: UserType): Promise<any>;
/**
 * Delete notification
 */
export declare function deleteNotification(notificationId: string): Promise<void>;
/**
 * Get unread notification count
 */
export declare function getUnreadCount(recipientId: string, recipientType: UserType): Promise<any>;
/**
 * Get notifications for a user
 */
export declare function getNotifications(recipientId: string, recipientType: UserType, options?: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
}): Promise<any>;
/**
 * Delete expired notifications (run as cron job)
 */
export declare function cleanupExpiredNotifications(): Promise<any>;
/**
 * Create appointment reminder notification
 */
export declare function notifyAppointmentReminder(patientId: string, appointmentId: string, appointmentDate: Date, clinicianName: string): Promise<any>;
/**
 * Create new message notification
 */
export declare function notifyNewMessage(recipientId: string, recipientType: UserType, senderName: string, messageId: string): Promise<any>;
/**
 * Create consultation completed notification
 */
export declare function notifyConsultationCompleted(patientId: string, sessionId: string, clinicianName: string): Promise<any>;
/**
 * Create new document notification
 */
export declare function notifyNewDocument(patientId: string, documentId: string, documentTitle: string): Promise<any>;
/**
 * Create new prescription notification
 */
export declare function notifyNewPrescription(patientId: string, prescriptionId: string, clinicianName: string): Promise<any>;
//# sourceMappingURL=notifications.d.ts.map