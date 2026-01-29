/**
 * Notification Schemas - Zod schemas for notification MCP tool inputs
 *
 * These schemas define input validation for notification management tools
 * including sending, deleting, and managing push subscriptions.
 */

import { z } from 'zod';

// =============================================================================
// COMMON SCHEMAS
// =============================================================================

export const UUIDSchema = z.string().uuid('Must be a valid UUID');

export const NotificationTypeEnum = z.enum([
    'APPOINTMENT_REMINDER',
    'APPOINTMENT_CONFIRMED',
    'APPOINTMENT_CANCELLED',
    'APPOINTMENT_RESCHEDULED',
    'NEW_MESSAGE',
    'MESSAGE_REPLY',
    'NEW_DOCUMENT',
    'DOCUMENT_SHARED',
    'NEW_PRESCRIPTION',
    'PRESCRIPTION_READY',
    'LAB_RESULT_AVAILABLE',
    'MEDICATION_REMINDER',
    'CONSULTATION_COMPLETED',
    'SOAP_NOTE_READY',
    'CONSENT_REQUIRED',
    'PAYMENT_DUE',
    'PAYMENT_RECEIVED',
    'SYSTEM_ALERT',
    'SECURITY_ALERT',
]);

export const NotificationPriorityEnum = z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']);

export const RecipientTypeEnum = z.enum(['CLINICIAN', 'PATIENT']);

// =============================================================================
// SEND NOTIFICATION SCHEMA
// =============================================================================

export const SendNotificationSchema = z.object({
    recipientId: UUIDSchema.describe('The recipient ID (clinician or patient)'),
    recipientType: RecipientTypeEnum.describe('Type of recipient'),
    type: NotificationTypeEnum.describe('Notification type'),
    title: z.string().min(1).max(200).describe('Notification title'),
    message: z.string().min(1).max(2000).describe('Notification message'),
    actionUrl: z.string().url().optional().describe('URL for action button (e.g., /portal/appointments/123)'),
    actionLabel: z.string().max(50).optional().describe('Label for action button (e.g., View Appointment)'),
    resourceType: z.string().optional().describe('Related resource type (e.g., Appointment, Message)'),
    resourceId: z.string().optional().describe('Related resource ID'),
    priority: NotificationPriorityEnum.default('NORMAL').describe('Notification priority'),
    expiresAt: z.string().datetime().optional().describe('Expiration date (ISO format) for auto-cleanup'),
    channels: z.object({
        inApp: z.boolean().default(true).describe('Deliver in-app notification'),
        email: z.boolean().default(false).describe('Send email notification'),
        sms: z.boolean().default(false).describe('Send SMS notification'),
        push: z.boolean().default(false).describe('Send push notification'),
    }).optional().describe('Delivery channels to use'),
    metadata: z.record(z.any()).optional().describe('Additional metadata to attach'),
});

// =============================================================================
// DELETE NOTIFICATION SCHEMA
// =============================================================================

export const DeleteNotificationSchema = z.object({
    notificationId: UUIDSchema.describe('The notification ID to delete'),
    hardDelete: z.boolean().default(false).describe('Permanently delete instead of soft delete'),
    reason: z.string().optional().describe('Reason for deletion (for audit trail)'),
});

// =============================================================================
// GET UNREAD COUNT SCHEMA
// =============================================================================

export const GetUnreadCountSchema = z.object({
    recipientId: UUIDSchema.describe('The recipient ID (clinician or patient)'),
    recipientType: RecipientTypeEnum.describe('Type of recipient'),
    groupByType: z.boolean().default(false).describe('Include counts grouped by notification type'),
    groupByPriority: z.boolean().default(false).describe('Include counts grouped by priority'),
});

// =============================================================================
// SUBSCRIBE TO EVENTS SCHEMA
// =============================================================================

export const SubscribeToEventsSchema = z.object({
    userId: UUIDSchema.describe('The user ID subscribing'),
    userType: RecipientTypeEnum.describe('Type of user'),
    endpoint: z.string().url().describe('Push subscription endpoint URL from browser'),
    keys: z.object({
        p256dh: z.string().describe('P-256 Diffie-Hellman public key'),
        auth: z.string().describe('Authentication secret'),
    }).describe('Push subscription keys from browser'),
    userAgent: z.string().optional().describe('Browser user agent string'),
    platform: z.enum(['web', 'android', 'ios', 'other']).default('web').describe('Platform type'),
    deviceName: z.string().optional().describe('Human-readable device name (e.g., Chrome on MacOS)'),
    enabledTypes: z.array(NotificationTypeEnum).optional().describe('Notification types to receive (empty = all)'),
});

// =============================================================================
// UNSUBSCRIBE FROM EVENTS SCHEMA
// =============================================================================

export const UnsubscribeFromEventsSchema = z.object({
    userId: UUIDSchema.describe('The user ID unsubscribing'),
    userType: RecipientTypeEnum.describe('Type of user'),
    subscriptionId: UUIDSchema.optional().describe('Subscription ID to unsubscribe'),
    endpoint: z.string().url().optional().describe('Push endpoint URL to unsubscribe (alternative to ID)'),
    deleteSubscription: z.boolean().default(false).describe('Permanently delete subscription instead of deactivating'),
}).refine(
    (data) => data.subscriptionId || data.endpoint,
    { message: 'Either subscriptionId or endpoint must be provided' }
);

// =============================================================================
// GET NOTIFICATION PREFERENCES SCHEMA
// =============================================================================

export const GetNotificationPreferencesSchema = z.object({
    userId: UUIDSchema.describe('The user/patient ID'),
    userType: RecipientTypeEnum.describe('Type of user'),
    includePushSubscriptions: z.boolean().default(false).describe('Include active push subscriptions'),
});

// =============================================================================
// UPDATE NOTIFICATION PREFERENCES SCHEMA
// =============================================================================

export const UpdateNotificationPreferencesSchema = z.object({
    userId: UUIDSchema.describe('The user/patient ID'),
    userType: RecipientTypeEnum.describe('Type of user'),
    preferences: z.object({
        // SMS Preferences
        smsEnabled: z.boolean().optional().describe('Enable/disable all SMS notifications'),
        smsAppointments: z.boolean().optional().describe('SMS for appointment notifications'),
        smsPrescriptions: z.boolean().optional().describe('SMS for prescription notifications'),
        smsResults: z.boolean().optional().describe('SMS for lab result notifications'),
        smsReminders: z.boolean().optional().describe('SMS for general reminders'),
        smsMarketing: z.boolean().optional().describe('SMS for marketing messages'),
        // Email Preferences
        emailEnabled: z.boolean().optional().describe('Enable/disable all email notifications'),
        emailAppointments: z.boolean().optional().describe('Email for appointment notifications'),
        emailPrescriptions: z.boolean().optional().describe('Email for prescription notifications'),
        emailResults: z.boolean().optional().describe('Email for lab result notifications'),
        emailReminders: z.boolean().optional().describe('Email for general reminders'),
        emailMarketing: z.boolean().optional().describe('Email for marketing messages'),
        // Push Preferences
        pushEnabled: z.boolean().optional().describe('Enable/disable all push notifications'),
        pushAppointments: z.boolean().optional().describe('Push for appointment notifications'),
        pushPrescriptions: z.boolean().optional().describe('Push for prescription notifications'),
        pushResults: z.boolean().optional().describe('Push for lab result notifications'),
        pushMessages: z.boolean().optional().describe('Push for message notifications'),
        // WhatsApp
        whatsappEnabled: z.boolean().optional().describe('Enable/disable WhatsApp notifications'),
        // Global Settings
        allowEmergencyOverride: z.boolean().optional().describe('Allow urgent notifications to bypass quiet hours'),
        quietHoursStart: z.string().optional().describe('Quiet hours start time (HH:MM format)'),
        quietHoursEnd: z.string().optional().describe('Quiet hours end time (HH:MM format)'),
        timezone: z.string().optional().describe('User timezone (e.g., America/Mexico_City)'),
    }).describe('Preferences to update'),
});

// =============================================================================
// GET PUSH SUBSCRIPTIONS SCHEMA
// =============================================================================

export const GetPushSubscriptionsSchema = z.object({
    userId: UUIDSchema.describe('The user ID to get subscriptions for'),
    userType: RecipientTypeEnum.describe('Type of user'),
    activeOnly: z.boolean().default(true).describe('Only return active subscriptions'),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type SendNotificationInput = z.infer<typeof SendNotificationSchema>;
export type DeleteNotificationInput = z.infer<typeof DeleteNotificationSchema>;
export type GetUnreadCountInput = z.infer<typeof GetUnreadCountSchema>;
export type SubscribeToEventsInput = z.infer<typeof SubscribeToEventsSchema>;
export type UnsubscribeFromEventsInput = z.infer<typeof UnsubscribeFromEventsSchema>;
export type GetNotificationPreferencesInput = z.infer<typeof GetNotificationPreferencesSchema>;
export type UpdateNotificationPreferencesInput = z.infer<typeof UpdateNotificationPreferencesSchema>;
export type GetPushSubscriptionsInput = z.infer<typeof GetPushSubscriptionsSchema>;
