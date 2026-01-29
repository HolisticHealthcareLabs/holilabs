/**
 * Notification MCP Tools - Agent-callable operations for notification management
 *
 * These tools provide comprehensive notification management including:
 * - Sending and deleting notifications
 * - Managing push subscriptions for real-time events
 * - Getting unread counts and notification preferences
 *
 * Uses `any` types for Prisma results due to complex relation typing.
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
    SendNotificationSchema,
    DeleteNotificationSchema,
    GetUnreadCountSchema,
    SubscribeToEventsSchema,
    UnsubscribeFromEventsSchema,
    GetNotificationPreferencesSchema,
    UpdateNotificationPreferencesSchema,
    GetPushSubscriptionsSchema,
    type SendNotificationInput,
    type DeleteNotificationInput,
    type GetUnreadCountInput,
    type SubscribeToEventsInput,
    type UnsubscribeFromEventsInput,
    type GetNotificationPreferencesInput,
    type UpdateNotificationPreferencesInput,
    type GetPushSubscriptionsInput,
} from '../schemas/notification-schemas';
import type { MCPTool, MCPContext, MCPResult } from '../types';

// =============================================================================
// TOOL: send_notification
// =============================================================================

async function sendNotificationHandler(
    input: SendNotificationInput,
    context: MCPContext
): Promise<MCPResult> {
    // Create notification with all channels support
    const notification: any = await prisma.notification.create({
        data: {
            recipientId: input.recipientId,
            recipientType: input.recipientType,
            type: input.type,
            title: input.title,
            message: input.message,
            actionUrl: input.actionUrl,
            actionLabel: input.actionLabel,
            resourceType: input.resourceType,
            resourceId: input.resourceId,
            priority: input.priority || 'NORMAL',
            expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
            deliveredInApp: input.channels?.inApp ?? true,
            metadata: input.metadata,
        },
    });

    // Track delivery channels requested
    const channelsRequested = {
        inApp: input.channels?.inApp ?? true,
        email: input.channels?.email ?? false,
        sms: input.channels?.sms ?? false,
        push: input.channels?.push ?? false,
    };

    // If email or SMS channels requested, create tracking record
    // (actual delivery would be handled by background job)
    if (channelsRequested.email || channelsRequested.sms || channelsRequested.push) {
        await prisma.auditLog.create({
            data: {
                userId: context.clinicianId,
                action: 'CREATE',
                resource: 'NotificationDelivery',
                resourceId: notification.id,
                success: true,
                ipAddress: 'mcp-tool',
                details: {
                    notificationId: notification.id,
                    recipientId: input.recipientId,
                    recipientType: input.recipientType,
                    channelsRequested,
                    priority: input.priority || 'NORMAL',
                },
            },
        });
    }

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'send_notification',
        notificationId: notification.id,
        recipientId: input.recipientId,
        recipientType: input.recipientType,
        type: input.type,
        priority: input.priority || 'NORMAL',
        channels: channelsRequested,
        agentId: context.agentId,
        clinicianId: context.clinicianId,
    });

    return {
        success: true,
        data: {
            notificationId: notification.id,
            recipientId: notification.recipientId,
            recipientType: notification.recipientType,
            type: notification.type,
            title: notification.title,
            priority: notification.priority,
            channels: channelsRequested,
            createdAt: notification.createdAt,
            message: 'Notification sent successfully',
        },
    };
}

// =============================================================================
// TOOL: delete_notification
// =============================================================================

async function deleteNotificationHandler(
    input: DeleteNotificationInput,
    context: MCPContext
): Promise<MCPResult> {
    // Get notification to verify it exists
    const notification = await prisma.notification.findUnique({
        where: { id: input.notificationId },
    });

    if (!notification) {
        return {
            success: false,
            error: 'Notification not found',
            data: null,
        };
    }

    // Soft delete by setting expiration to now (or hard delete based on flag)
    if (input.hardDelete) {
        await prisma.notification.delete({
            where: { id: input.notificationId },
        });
    } else {
        await prisma.notification.update({
            where: { id: input.notificationId },
            data: {
                expiresAt: new Date(),
                isRead: true,
                readAt: notification.readAt || new Date(),
            },
        });
    }

    // Audit log
    await prisma.auditLog.create({
        data: {
            userId: context.clinicianId,
            action: 'DELETE',
            resource: 'Notification',
            resourceId: input.notificationId,
            success: true,
            ipAddress: 'mcp-tool',
            details: {
                notificationId: input.notificationId,
                recipientId: notification.recipientId,
                recipientType: notification.recipientType,
                hardDelete: input.hardDelete || false,
                reason: input.reason,
            },
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'delete_notification',
        notificationId: input.notificationId,
        hardDelete: input.hardDelete || false,
        agentId: context.agentId,
        clinicianId: context.clinicianId,
    });

    return {
        success: true,
        data: {
            notificationId: input.notificationId,
            deleted: true,
            hardDelete: input.hardDelete || false,
            message: input.hardDelete
                ? 'Notification permanently deleted'
                : 'Notification dismissed successfully',
        },
    };
}

// =============================================================================
// TOOL: get_unread_count
// =============================================================================

async function getUnreadCountHandler(
    input: GetUnreadCountInput,
    context: MCPContext
): Promise<MCPResult> {
    // Base query for non-expired, unread notifications
    const baseWhere: any = {
        recipientId: input.recipientId,
        recipientType: input.recipientType,
        isRead: false,
        OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
        ],
    };

    // Get total unread count
    const totalUnread = await prisma.notification.count({ where: baseWhere });

    // Get counts by type if requested
    let countsByType: Record<string, number> | undefined;
    if (input.groupByType) {
        const typeGroups = await prisma.notification.groupBy({
            by: ['type'],
            where: baseWhere,
            _count: { id: true },
        });

        countsByType = {};
        for (const group of typeGroups) {
            countsByType[group.type] = group._count.id;
        }
    }

    // Get counts by priority if requested
    let countsByPriority: Record<string, number> | undefined;
    if (input.groupByPriority) {
        const priorityGroups = await prisma.notification.groupBy({
            by: ['priority'],
            where: baseWhere,
            _count: { id: true },
        });

        countsByPriority = {};
        for (const group of priorityGroups) {
            countsByPriority[group.priority] = group._count.id;
        }
    }

    // Get urgent/high priority count
    const urgentCount = await prisma.notification.count({
        where: {
            ...baseWhere,
            priority: { in: ['URGENT', 'HIGH'] },
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'get_unread_count',
        recipientId: input.recipientId,
        recipientType: input.recipientType,
        totalUnread,
        urgentCount,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            recipientId: input.recipientId,
            recipientType: input.recipientType,
            totalUnread,
            urgentCount,
            countsByType,
            countsByPriority,
        },
    };
}

// =============================================================================
// TOOL: subscribe_to_events
// =============================================================================

async function subscribeToEventsHandler(
    input: SubscribeToEventsInput,
    context: MCPContext
): Promise<MCPResult> {
    // Check if subscription already exists
    const existingSubscription = await prisma.pushSubscription.findUnique({
        where: { endpoint: input.endpoint },
    });

    if (existingSubscription) {
        // Update existing subscription
        const updated = await prisma.pushSubscription.update({
            where: { endpoint: input.endpoint },
            data: {
                keys: input.keys,
                userAgent: input.userAgent,
                platform: input.platform,
                deviceName: input.deviceName,
                enabledTypes: input.enabledTypes || [],
                isActive: true,
                failedDeliveries: 0,
                lastUsedAt: new Date(),
            },
        });

        logger.info({
            event: 'mcp_tool_executed',
            tool: 'subscribe_to_events',
            action: 'update',
            subscriptionId: updated.id,
            userId: input.userId,
            userType: input.userType,
            enabledTypes: input.enabledTypes,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                subscriptionId: updated.id,
                action: 'updated',
                userId: input.userId,
                userType: input.userType,
                enabledTypes: updated.enabledTypes,
                platform: updated.platform,
                deviceName: updated.deviceName,
                message: 'Push subscription updated successfully',
            },
        };
    }

    // Create new subscription
    const subscription = await prisma.pushSubscription.create({
        data: {
            userId: input.userId,
            userType: input.userType,
            endpoint: input.endpoint,
            keys: input.keys,
            userAgent: input.userAgent,
            platform: input.platform,
            deviceName: input.deviceName,
            enabledTypes: input.enabledTypes || [],
            isActive: true,
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'subscribe_to_events',
        action: 'create',
        subscriptionId: subscription.id,
        userId: input.userId,
        userType: input.userType,
        enabledTypes: input.enabledTypes,
        platform: input.platform,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            subscriptionId: subscription.id,
            action: 'created',
            userId: input.userId,
            userType: input.userType,
            enabledTypes: subscription.enabledTypes,
            platform: subscription.platform,
            deviceName: subscription.deviceName,
            createdAt: subscription.createdAt,
            message: 'Push subscription created successfully',
        },
    };
}

// =============================================================================
// TOOL: unsubscribe_from_events
// =============================================================================

async function unsubscribeFromEventsHandler(
    input: UnsubscribeFromEventsInput,
    context: MCPContext
): Promise<MCPResult> {
    // Find subscription by endpoint or ID
    let subscription: any = null;

    if (input.subscriptionId) {
        subscription = await prisma.pushSubscription.findUnique({
            where: { id: input.subscriptionId },
        });
    } else if (input.endpoint) {
        subscription = await prisma.pushSubscription.findUnique({
            where: { endpoint: input.endpoint },
        });
    }

    if (!subscription) {
        return {
            success: false,
            error: 'Push subscription not found',
            data: null,
        };
    }

    // Verify ownership
    if (subscription.userId !== input.userId || subscription.userType !== input.userType) {
        return {
            success: false,
            error: 'Subscription does not belong to this user',
            data: null,
        };
    }

    if (input.deleteSubscription) {
        // Permanently delete subscription
        await prisma.pushSubscription.delete({
            where: { id: subscription.id },
        });

        logger.info({
            event: 'mcp_tool_executed',
            tool: 'unsubscribe_from_events',
            action: 'delete',
            subscriptionId: subscription.id,
            userId: input.userId,
            userType: input.userType,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                subscriptionId: subscription.id,
                action: 'deleted',
                userId: input.userId,
                userType: input.userType,
                message: 'Push subscription deleted successfully',
            },
        };
    }

    // Deactivate subscription
    const updated = await prisma.pushSubscription.update({
        where: { id: subscription.id },
        data: { isActive: false },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'unsubscribe_from_events',
        action: 'deactivate',
        subscriptionId: subscription.id,
        userId: input.userId,
        userType: input.userType,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            subscriptionId: updated.id,
            action: 'deactivated',
            userId: input.userId,
            userType: input.userType,
            isActive: false,
            message: 'Push subscription deactivated successfully',
        },
    };
}

// =============================================================================
// TOOL: get_notification_preferences
// =============================================================================

async function getNotificationPreferencesHandler(
    input: GetNotificationPreferencesInput,
    context: MCPContext
): Promise<MCPResult> {
    let preferences: any = null;
    let pushSubscriptions: any[] = [];

    if (input.userType === 'PATIENT') {
        // Verify patient access
        const patient = await prisma.patient.findFirst({
            where: {
                id: input.userId,
                assignedClinicianId: context.clinicianId,
            },
        });

        if (!patient) {
            return {
                success: false,
                error: 'Patient not found or access denied',
                data: null,
            };
        }

        preferences = await prisma.patientPreferences.findUnique({
            where: { patientId: input.userId },
        });
    } else {
        // CLINICIAN - can only get their own preferences
        if (input.userId !== context.clinicianId) {
            return {
                success: false,
                error: 'Can only view your own preferences',
                data: null,
            };
        }

        preferences = await prisma.clinicianPreferences.findUnique({
            where: { clinicianId: input.userId },
        });
    }

    // Get push subscriptions if requested
    if (input.includePushSubscriptions) {
        pushSubscriptions = await prisma.pushSubscription.findMany({
            where: {
                userId: input.userId,
                userType: input.userType,
                isActive: true,
            },
            select: {
                id: true,
                platform: true,
                deviceName: true,
                enabledTypes: true,
                lastUsedAt: true,
                createdAt: true,
            },
        });
    }

    // Build response with default values if no preferences exist
    const notificationPrefs = preferences ? {
        // Channel enablement
        channels: {
            sms: {
                enabled: preferences.smsEnabled ?? true,
                appointments: preferences.smsAppointments ?? true,
                prescriptions: preferences.smsPrescriptions ?? true,
                results: preferences.smsResults ?? true,
                reminders: preferences.smsReminders ?? true,
                marketing: preferences.smsMarketing ?? false,
            },
            email: {
                enabled: preferences.emailEnabled ?? true,
                appointments: preferences.emailAppointments ?? true,
                prescriptions: preferences.emailPrescriptions ?? true,
                results: preferences.emailResults ?? true,
                reminders: preferences.emailReminders ?? true,
                marketing: preferences.emailMarketing ?? false,
            },
            push: {
                enabled: preferences.pushEnabled ?? true,
                appointments: preferences.pushAppointments ?? true,
                prescriptions: preferences.pushPrescriptions ?? true,
                results: preferences.pushResults ?? true,
                messages: preferences.pushMessages ?? true,
            },
            whatsapp: {
                enabled: preferences.whatsappEnabled ?? false,
            },
        },
        // Global settings
        global: {
            allowEmergencyOverride: preferences.allowEmergencyOverride ?? true,
            quietHoursStart: preferences.quietHoursStart,
            quietHoursEnd: preferences.quietHoursEnd,
            timezone: preferences.timezone ?? 'America/Mexico_City',
        },
        updatedAt: preferences.updatedAt,
    } : {
        channels: {
            sms: { enabled: true, appointments: true, prescriptions: true, results: true, reminders: true, marketing: false },
            email: { enabled: true, appointments: true, prescriptions: true, results: true, reminders: true, marketing: false },
            push: { enabled: true, appointments: true, prescriptions: true, results: true, messages: true },
            whatsapp: { enabled: false },
        },
        global: {
            allowEmergencyOverride: true,
            quietHoursStart: null,
            quietHoursEnd: null,
            timezone: 'America/Mexico_City',
        },
        updatedAt: null,
    };

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'get_notification_preferences',
        userId: input.userId,
        userType: input.userType,
        hasPreferences: !!preferences,
        pushSubscriptionCount: pushSubscriptions.length,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            userId: input.userId,
            userType: input.userType,
            preferences: notificationPrefs,
            pushSubscriptions: input.includePushSubscriptions ? pushSubscriptions : undefined,
        },
    };
}

// =============================================================================
// TOOL: update_notification_preferences
// =============================================================================

async function updateNotificationPreferencesHandler(
    input: UpdateNotificationPreferencesInput,
    context: MCPContext
): Promise<MCPResult> {
    // Build update data from input
    const updateData: any = {};
    const prefs = input.preferences;

    // SMS preferences
    if (prefs.smsEnabled !== undefined) updateData.smsEnabled = prefs.smsEnabled;
    if (prefs.smsAppointments !== undefined) updateData.smsAppointments = prefs.smsAppointments;
    if (prefs.smsPrescriptions !== undefined) updateData.smsPrescriptions = prefs.smsPrescriptions;
    if (prefs.smsResults !== undefined) updateData.smsResults = prefs.smsResults;
    if (prefs.smsReminders !== undefined) updateData.smsReminders = prefs.smsReminders;
    if (prefs.smsMarketing !== undefined) updateData.smsMarketing = prefs.smsMarketing;

    // Email preferences
    if (prefs.emailEnabled !== undefined) updateData.emailEnabled = prefs.emailEnabled;
    if (prefs.emailAppointments !== undefined) updateData.emailAppointments = prefs.emailAppointments;
    if (prefs.emailPrescriptions !== undefined) updateData.emailPrescriptions = prefs.emailPrescriptions;
    if (prefs.emailResults !== undefined) updateData.emailResults = prefs.emailResults;
    if (prefs.emailReminders !== undefined) updateData.emailReminders = prefs.emailReminders;
    if (prefs.emailMarketing !== undefined) updateData.emailMarketing = prefs.emailMarketing;

    // Push preferences
    if (prefs.pushEnabled !== undefined) updateData.pushEnabled = prefs.pushEnabled;
    if (prefs.pushAppointments !== undefined) updateData.pushAppointments = prefs.pushAppointments;
    if (prefs.pushPrescriptions !== undefined) updateData.pushPrescriptions = prefs.pushPrescriptions;
    if (prefs.pushResults !== undefined) updateData.pushResults = prefs.pushResults;
    if (prefs.pushMessages !== undefined) updateData.pushMessages = prefs.pushMessages;

    // WhatsApp
    if (prefs.whatsappEnabled !== undefined) updateData.whatsappEnabled = prefs.whatsappEnabled;

    // Global settings
    if (prefs.allowEmergencyOverride !== undefined) updateData.allowEmergencyOverride = prefs.allowEmergencyOverride;
    if (prefs.quietHoursStart !== undefined) updateData.quietHoursStart = prefs.quietHoursStart;
    if (prefs.quietHoursEnd !== undefined) updateData.quietHoursEnd = prefs.quietHoursEnd;
    if (prefs.timezone !== undefined) updateData.timezone = prefs.timezone;

    if (Object.keys(updateData).length === 0) {
        return {
            success: false,
            error: 'No preferences to update',
            data: null,
        };
    }

    let updatedPreferences: any = null;

    if (input.userType === 'PATIENT') {
        // Verify patient access
        const patient = await prisma.patient.findFirst({
            where: {
                id: input.userId,
                assignedClinicianId: context.clinicianId,
            },
        });

        if (!patient) {
            return {
                success: false,
                error: 'Patient not found or access denied',
                data: null,
            };
        }

        // Upsert patient preferences
        updatedPreferences = await prisma.patientPreferences.upsert({
            where: { patientId: input.userId },
            update: updateData,
            create: {
                patientId: input.userId,
                ...updateData,
            },
        });
    } else {
        // CLINICIAN - can only update their own preferences
        if (input.userId !== context.clinicianId) {
            return {
                success: false,
                error: 'Can only update your own preferences',
                data: null,
            };
        }

        // Upsert clinician preferences
        updatedPreferences = await prisma.clinicianPreferences.upsert({
            where: { clinicianId: input.userId },
            update: updateData,
            create: {
                clinicianId: input.userId,
                ...updateData,
            },
        });
    }

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'update_notification_preferences',
        userId: input.userId,
        userType: input.userType,
        updatedFields: Object.keys(updateData),
        agentId: context.agentId,
        clinicianId: context.clinicianId,
    });

    return {
        success: true,
        data: {
            userId: input.userId,
            userType: input.userType,
            updatedFields: Object.keys(updateData),
            updatedAt: updatedPreferences.updatedAt,
            message: 'Notification preferences updated successfully',
        },
    };
}

// =============================================================================
// TOOL: get_push_subscriptions
// =============================================================================

async function getPushSubscriptionsHandler(
    input: GetPushSubscriptionsInput,
    context: MCPContext
): Promise<MCPResult> {
    // Verify access
    if (input.userType === 'PATIENT') {
        const patient = await prisma.patient.findFirst({
            where: {
                id: input.userId,
                assignedClinicianId: context.clinicianId,
            },
        });

        if (!patient) {
            return {
                success: false,
                error: 'Patient not found or access denied',
                data: null,
            };
        }
    } else if (input.userId !== context.clinicianId) {
        return {
            success: false,
            error: 'Can only view your own subscriptions',
            data: null,
        };
    }

    const where: any = {
        userId: input.userId,
        userType: input.userType,
    };

    if (input.activeOnly) {
        where.isActive = true;
    }

    const subscriptions = await prisma.pushSubscription.findMany({
        where,
        select: {
            id: true,
            platform: true,
            deviceName: true,
            enabledTypes: true,
            isActive: true,
            failedDeliveries: true,
            lastUsedAt: true,
            createdAt: true,
            updatedAt: true,
        },
        orderBy: { lastUsedAt: 'desc' },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'get_push_subscriptions',
        userId: input.userId,
        userType: input.userType,
        subscriptionCount: subscriptions.length,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            userId: input.userId,
            userType: input.userType,
            subscriptions,
            totalCount: subscriptions.length,
            activeCount: subscriptions.filter(s => s.isActive).length,
        },
    };
}

// =============================================================================
// EXPORT: Notification Tools
// =============================================================================

export const notificationTools: MCPTool[] = [
    {
        name: 'send_notification',
        description: 'Send a notification to a user/patient via multiple channels (in-app, email, SMS, push).',
        category: 'notification',
        inputSchema: SendNotificationSchema,
        requiredPermissions: ['notification:write'],
        handler: sendNotificationHandler,
        examples: [
            {
                description: 'Send appointment reminder via all channels',
                input: {
                    recipientId: 'patient-uuid',
                    recipientType: 'PATIENT',
                    type: 'APPOINTMENT_REMINDER',
                    title: 'Appointment Tomorrow',
                    message: 'Reminder: You have an appointment tomorrow at 10:00 AM.',
                    channels: { inApp: true, email: true, sms: true },
                    priority: 'HIGH',
                },
            },
        ],
    },
    {
        name: 'delete_notification',
        description: 'Delete or dismiss a notification. Supports soft delete (dismiss) or hard delete.',
        category: 'notification',
        inputSchema: DeleteNotificationSchema,
        requiredPermissions: ['notification:write'],
        handler: deleteNotificationHandler,
    },
    {
        name: 'get_unread_count',
        description: 'Get the count of unread notifications for a user, optionally grouped by type or priority.',
        category: 'notification',
        inputSchema: GetUnreadCountSchema,
        requiredPermissions: ['notification:read'],
        handler: getUnreadCountHandler,
        examples: [
            {
                description: 'Get unread count with breakdown by type',
                input: {
                    recipientId: 'user-uuid',
                    recipientType: 'CLINICIAN',
                    groupByType: true,
                    groupByPriority: true,
                },
            },
        ],
    },
    {
        name: 'subscribe_to_events',
        description: 'Subscribe to push notifications for real-time event delivery.',
        category: 'notification',
        inputSchema: SubscribeToEventsSchema,
        requiredPermissions: ['notification:write'],
        handler: subscribeToEventsHandler,
    },
    {
        name: 'unsubscribe_from_events',
        description: 'Unsubscribe from push notifications by deactivating or deleting a subscription.',
        category: 'notification',
        inputSchema: UnsubscribeFromEventsSchema,
        requiredPermissions: ['notification:write'],
        handler: unsubscribeFromEventsHandler,
    },
    {
        name: 'get_notification_preferences',
        description: 'Get detailed notification preferences for a user including all channels and push subscriptions.',
        category: 'notification',
        inputSchema: GetNotificationPreferencesSchema,
        requiredPermissions: ['preferences:read'],
        handler: getNotificationPreferencesHandler,
    },
    {
        name: 'update_notification_preferences',
        description: 'Update notification preferences for SMS, email, push, WhatsApp, and global settings.',
        category: 'notification',
        inputSchema: UpdateNotificationPreferencesSchema,
        requiredPermissions: ['preferences:write'],
        handler: updateNotificationPreferencesHandler,
    },
    {
        name: 'get_push_subscriptions',
        description: 'Get all push notification subscriptions for a user across devices.',
        category: 'notification',
        inputSchema: GetPushSubscriptionsSchema,
        requiredPermissions: ['notification:read'],
        handler: getPushSubscriptionsHandler,
    },
];

export const NOTIFICATION_TOOL_COUNT = notificationTools.length;
