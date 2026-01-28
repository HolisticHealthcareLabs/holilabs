/**
 * Portal MCP Tools - Notifications and preferences management
 *
 * These tools manage user notifications and communication preferences
 * for both clinicians and patients.
 * Uses `any` types for Prisma results due to complex relation typing.
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
    GetNotificationsSchema,
    MarkNotificationReadSchema,
    MarkAllNotificationsReadSchema,
    CreateNotificationSchema,
    GetPreferencesSchema,
    UpdatePreferencesSchema,
    type GetNotificationsInput,
    type MarkNotificationReadInput,
    type MarkAllNotificationsReadInput,
    type CreateNotificationInput,
    type GetPreferencesInput,
    type UpdatePreferencesInput,
} from '../schemas/tool-schemas';
import type { MCPTool, MCPContext, MCPResult } from '../types';

// =============================================================================
// TOOL: get_notifications
// =============================================================================

async function getNotificationsHandler(
    input: GetNotificationsInput,
    context: MCPContext
): Promise<MCPResult> {
    const { page = 1, limit = 20 } = input;
    const skip = (page - 1) * limit;

    // Build query conditions
    const where: any = {
        recipientId: input.recipientId,
        recipientType: input.recipientType,
    };

    if (input.isRead !== undefined) {
        where.isRead = input.isRead;
    }

    if (input.type) {
        where.type = input.type;
    }

    if (input.priority) {
        where.priority = input.priority;
    }

    // Exclude expired notifications
    where.OR = [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
    ];

    const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
            where,
            skip,
            take: limit,
            orderBy: [
                { priority: 'desc' },
                { createdAt: 'desc' },
            ],
            select: {
                id: true,
                type: true,
                title: true,
                message: true,
                actionUrl: true,
                actionLabel: true,
                resourceType: true,
                resourceId: true,
                isRead: true,
                readAt: true,
                priority: true,
                deliveredInApp: true,
                deliveredEmail: true,
                deliveredSMS: true,
                createdAt: true,
            },
        }),
        prisma.notification.count({ where }),
    ]);

    // Count unread for summary
    const unreadCount = await prisma.notification.count({
        where: {
            ...where,
            isRead: false,
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'get_notifications',
        recipientId: input.recipientId,
        recipientType: input.recipientType,
        resultCount: notifications.length,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            notifications,
            unreadCount,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        },
    };
}

// =============================================================================
// TOOL: mark_notification_read
// =============================================================================

async function markNotificationReadHandler(
    input: MarkNotificationReadInput,
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

    // Already read
    if (notification.isRead) {
        return {
            success: true,
            data: {
                notificationId: notification.id,
                isRead: true,
                readAt: notification.readAt,
                message: 'Notification was already marked as read',
            },
        };
    }

    // Mark as read
    const updatedNotification: any = await prisma.notification.update({
        where: { id: input.notificationId },
        data: {
            isRead: true,
            readAt: new Date(),
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'mark_notification_read',
        notificationId: input.notificationId,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            notificationId: updatedNotification.id,
            isRead: updatedNotification.isRead,
            readAt: updatedNotification.readAt,
            message: 'Notification marked as read',
        },
    };
}

// =============================================================================
// TOOL: mark_all_notifications_read
// =============================================================================

async function markAllNotificationsReadHandler(
    input: MarkAllNotificationsReadInput,
    context: MCPContext
): Promise<MCPResult> {
    // Update all unread notifications for the recipient
    const result = await prisma.notification.updateMany({
        where: {
            recipientId: input.recipientId,
            recipientType: input.recipientType,
            isRead: false,
        },
        data: {
            isRead: true,
            readAt: new Date(),
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'mark_all_notifications_read',
        recipientId: input.recipientId,
        recipientType: input.recipientType,
        updatedCount: result.count,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            recipientId: input.recipientId,
            recipientType: input.recipientType,
            updatedCount: result.count,
            message: `${result.count} notifications marked as read`,
        },
    };
}

// =============================================================================
// TOOL: create_notification
// =============================================================================

async function createNotificationHandler(
    input: CreateNotificationInput,
    context: MCPContext
): Promise<MCPResult> {
    // Create notification
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
            priority: input.priority,
            expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
            deliveredInApp: true,
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'create_notification',
        notificationId: notification.id,
        recipientId: input.recipientId,
        recipientType: input.recipientType,
        type: input.type,
        priority: input.priority,
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
            createdAt: notification.createdAt,
            message: 'Notification created successfully',
        },
    };
}

// =============================================================================
// TOOL: get_preferences
// =============================================================================

async function getPreferencesHandler(
    input: GetPreferencesInput,
    context: MCPContext
): Promise<MCPResult> {
    let preferences: any = null;

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

        // Create default preferences if they don't exist
        if (!preferences) {
            preferences = await prisma.patientPreferences.create({
                data: {
                    patientId: input.userId,
                },
            });
        }
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

        // Create default preferences if they don't exist
        if (!preferences) {
            preferences = await prisma.clinicianPreferences.create({
                data: {
                    clinicianId: input.userId,
                },
            });
        }
    }

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'get_preferences',
        userId: input.userId,
        userType: input.userType,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            userId: input.userId,
            userType: input.userType,
            preferences: {
                // SMS
                smsEnabled: preferences.smsEnabled,
                smsAppointments: preferences.smsAppointments,
                smsPrescriptions: preferences.smsPrescriptions,
                smsResults: preferences.smsResults,
                smsReminders: preferences.smsReminders,
                smsMarketing: preferences.smsMarketing,
                // Email
                emailEnabled: preferences.emailEnabled,
                emailAppointments: preferences.emailAppointments,
                emailPrescriptions: preferences.emailPrescriptions,
                emailResults: preferences.emailResults,
                emailReminders: preferences.emailReminders,
                emailMarketing: preferences.emailMarketing,
                // Push
                pushEnabled: preferences.pushEnabled,
                pushAppointments: preferences.pushAppointments,
                pushPrescriptions: preferences.pushPrescriptions,
                pushResults: preferences.pushResults,
                pushMessages: preferences.pushMessages,
                // WhatsApp
                whatsappEnabled: preferences.whatsappEnabled,
                // Global
                allowEmergencyOverride: preferences.allowEmergencyOverride,
                quietHoursStart: preferences.quietHoursStart,
                quietHoursEnd: preferences.quietHoursEnd,
                timezone: preferences.timezone,
            },
            updatedAt: preferences.updatedAt,
        },
    };
}

// =============================================================================
// TOOL: update_preferences
// =============================================================================

async function updatePreferencesHandler(
    input: UpdatePreferencesInput,
    context: MCPContext
): Promise<MCPResult> {
    let updatedPreferences: any = null;

    // Build update data from input preferences (only non-undefined values)
    const updateData: any = {};
    const prefs = input.preferences;

    if (prefs.smsEnabled !== undefined) updateData.smsEnabled = prefs.smsEnabled;
    if (prefs.smsAppointments !== undefined) updateData.smsAppointments = prefs.smsAppointments;
    if (prefs.smsPrescriptions !== undefined) updateData.smsPrescriptions = prefs.smsPrescriptions;
    if (prefs.smsResults !== undefined) updateData.smsResults = prefs.smsResults;
    if (prefs.smsReminders !== undefined) updateData.smsReminders = prefs.smsReminders;
    if (prefs.smsMarketing !== undefined) updateData.smsMarketing = prefs.smsMarketing;
    if (prefs.emailEnabled !== undefined) updateData.emailEnabled = prefs.emailEnabled;
    if (prefs.emailAppointments !== undefined) updateData.emailAppointments = prefs.emailAppointments;
    if (prefs.emailPrescriptions !== undefined) updateData.emailPrescriptions = prefs.emailPrescriptions;
    if (prefs.emailResults !== undefined) updateData.emailResults = prefs.emailResults;
    if (prefs.emailReminders !== undefined) updateData.emailReminders = prefs.emailReminders;
    if (prefs.emailMarketing !== undefined) updateData.emailMarketing = prefs.emailMarketing;
    if (prefs.pushEnabled !== undefined) updateData.pushEnabled = prefs.pushEnabled;
    if (prefs.pushAppointments !== undefined) updateData.pushAppointments = prefs.pushAppointments;
    if (prefs.pushPrescriptions !== undefined) updateData.pushPrescriptions = prefs.pushPrescriptions;
    if (prefs.pushResults !== undefined) updateData.pushResults = prefs.pushResults;
    if (prefs.pushMessages !== undefined) updateData.pushMessages = prefs.pushMessages;
    if (prefs.whatsappEnabled !== undefined) updateData.whatsappEnabled = prefs.whatsappEnabled;
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
        tool: 'update_preferences',
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
            message: 'Preferences updated successfully',
        },
    };
}

// =============================================================================
// EXPORT: Portal Tools
// =============================================================================

export const portalTools: MCPTool[] = [
    {
        name: 'get_notifications',
        description: 'Get notifications for a user (clinician or patient) with optional filters.',
        category: 'portal',
        inputSchema: GetNotificationsSchema,
        requiredPermissions: ['notification:read'],
        handler: getNotificationsHandler,
    },
    {
        name: 'mark_notification_read',
        description: 'Mark a single notification as read.',
        category: 'portal',
        inputSchema: MarkNotificationReadSchema,
        requiredPermissions: ['notification:write'],
        handler: markNotificationReadHandler,
    },
    {
        name: 'mark_all_notifications_read',
        description: 'Mark all notifications as read for a user.',
        category: 'portal',
        inputSchema: MarkAllNotificationsReadSchema,
        requiredPermissions: ['notification:write'],
        handler: markAllNotificationsReadHandler,
    },
    {
        name: 'create_notification',
        description: 'Create a new notification for a user.',
        category: 'portal',
        inputSchema: CreateNotificationSchema,
        requiredPermissions: ['notification:write'],
        handler: createNotificationHandler,
    },
    {
        name: 'get_preferences',
        description: 'Get communication preferences for a patient or clinician.',
        category: 'portal',
        inputSchema: GetPreferencesSchema,
        requiredPermissions: ['preferences:read'],
        handler: getPreferencesHandler,
    },
    {
        name: 'update_preferences',
        description: 'Update communication preferences for SMS, email, push notifications.',
        category: 'portal',
        inputSchema: UpdatePreferencesSchema,
        requiredPermissions: ['preferences:write'],
        handler: updatePreferencesHandler,
    },
];

export const PORTAL_TOOL_COUNT = portalTools.length;
