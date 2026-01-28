/**
 * MCP Settings Tools
 *
 * Tools for AI agents to manage user/clinic settings:
 * - Get/Update user settings (notifications, theme, AI preferences)
 * - Get/Update doctor preferences (scheduling, working hours)
 * - List/Get clinical templates
 *
 * Uses real Prisma CRUD operations on UserSettings and DoctorPreferences models.
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { MCPTool, MCPContext, MCPResult } from '../types';

// =============================================================================
// TOOL DEFINITIONS
// =============================================================================

export const settingsTools: MCPTool[] = [
    // =========================================================================
    // USER SETTINGS - CRUD
    // =========================================================================
    {
        name: 'get_user_settings',
        description: 'Get user settings including UI preferences, notifications, and AI configuration',
        category: 'settings',
        inputSchema: z.object({
            userId: z.string().optional().describe('User ID. If not provided, uses current user.'),
        }),
        requiredPermissions: ['settings:read'],
        handler: async (input: any, context: MCPContext): Promise<MCPResult> => {
            try {
                const userId = input.userId || context.userId;

                const settings = await prisma.userSettings.findUnique({
                    where: { userId },
                    include: {
                        user: {
                            select: { id: true, firstName: true, lastName: true, email: true },
                        },
                    },
                });

                if (!settings) {
                    // Return defaults if no settings exist
                    return {
                        success: true,
                        data: {
                            userId,
                            exists: false,
                            defaults: {
                                theme: 'LIGHT',
                                language: 'en',
                                timezone: 'UTC',
                                dateFormat: 'MM/DD/YYYY',
                                emailNotifications: true,
                                smsNotifications: false,
                                pushNotifications: true,
                                reminderFrequency: 'DAILY',
                                autoSaveInterval: 30,
                                voiceCommandsEnabled: true,
                                aiSuggestionsEnabled: true,
                                preferredAIProvider: 'GEMINI',
                            },
                        },
                    };
                }

                return {
                    success: true,
                    data: {
                        userId: settings.userId,
                        exists: true,
                        user: {
                            id: settings.user.id,
                            name: `${settings.user.firstName} ${settings.user.lastName}`,
                            email: settings.user.email,
                        },
                        ui: {
                            theme: settings.theme,
                            language: settings.language,
                            timezone: settings.timezone,
                            dateFormat: settings.dateFormat,
                            dashboardLayout: settings.dashboardLayout,
                        },
                        notifications: {
                            email: settings.emailNotifications,
                            sms: settings.smsNotifications,
                            push: settings.pushNotifications,
                            reminderFrequency: settings.reminderFrequency,
                        },
                        clinical: {
                            defaultNoteTemplate: settings.defaultNoteTemplate,
                            autoSaveInterval: settings.autoSaveInterval,
                            voiceCommandsEnabled: settings.voiceCommandsEnabled,
                            aiSuggestionsEnabled: settings.aiSuggestionsEnabled,
                        },
                        ai: {
                            preferredProvider: settings.preferredAIProvider,
                            useCustomApiKey: settings.useCustomApiKey,
                            hasGeminiKey: !!settings.geminiApiKey,
                            hasClaudeKey: !!settings.claudeApiKey,
                            hasOpenaiKey: !!settings.openaiApiKey,
                            hasDeepgramKey: !!settings.deepgramApiKey,
                        },
                        timestamps: {
                            createdAt: settings.createdAt.toISOString(),
                            updatedAt: settings.updatedAt.toISOString(),
                        },
                    },
                };
            } catch (error) {
                logger.error({ event: 'get_user_settings_error', error, input });
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to get user settings',
                };
            }
        },
    },

    {
        name: 'update_user_settings',
        description: 'Update user settings for UI, notifications, clinical preferences, or AI configuration',
        category: 'settings',
        inputSchema: z.object({
            // UI Preferences
            theme: z.enum(['LIGHT', 'DARK', 'SYSTEM']).optional().describe('UI theme'),
            language: z.string().optional().describe('Language code (e.g., en, es, pt)'),
            timezone: z.string().optional().describe('Timezone (e.g., UTC, America/New_York)'),
            dateFormat: z.string().optional().describe('Date format (e.g., MM/DD/YYYY, DD/MM/YYYY)'),
            dashboardLayout: z.any().optional().describe('Custom dashboard layout JSON'),

            // Notifications
            emailNotifications: z.boolean().optional().describe('Enable email notifications'),
            smsNotifications: z.boolean().optional().describe('Enable SMS notifications'),
            pushNotifications: z.boolean().optional().describe('Enable push notifications'),
            reminderFrequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional().describe('Reminder frequency'),

            // Clinical
            defaultNoteTemplate: z.string().optional().describe('Default note template ID'),
            autoSaveInterval: z.number().min(10).max(300).optional().describe('Auto-save interval in seconds'),
            voiceCommandsEnabled: z.boolean().optional().describe('Enable voice commands'),
            aiSuggestionsEnabled: z.boolean().optional().describe('Enable AI suggestions'),

            // AI
            preferredAIProvider: z.enum(['GEMINI', 'CLAUDE', 'OPENAI', 'CUSTOM']).optional().describe('Preferred AI provider'),
            useCustomApiKey: z.boolean().optional().describe('Use custom API key (BYOK)'),
        }),
        requiredPermissions: ['settings:write'],
        handler: async (input: any, context: MCPContext): Promise<MCPResult> => {
            try {
                const updateData: any = {};

                // UI fields
                if (input.theme !== undefined) updateData.theme = input.theme;
                if (input.language !== undefined) updateData.language = input.language;
                if (input.timezone !== undefined) updateData.timezone = input.timezone;
                if (input.dateFormat !== undefined) updateData.dateFormat = input.dateFormat;
                if (input.dashboardLayout !== undefined) updateData.dashboardLayout = input.dashboardLayout;

                // Notification fields
                if (input.emailNotifications !== undefined) updateData.emailNotifications = input.emailNotifications;
                if (input.smsNotifications !== undefined) updateData.smsNotifications = input.smsNotifications;
                if (input.pushNotifications !== undefined) updateData.pushNotifications = input.pushNotifications;
                if (input.reminderFrequency !== undefined) updateData.reminderFrequency = input.reminderFrequency;

                // Clinical fields
                if (input.defaultNoteTemplate !== undefined) updateData.defaultNoteTemplate = input.defaultNoteTemplate;
                if (input.autoSaveInterval !== undefined) updateData.autoSaveInterval = input.autoSaveInterval;
                if (input.voiceCommandsEnabled !== undefined) updateData.voiceCommandsEnabled = input.voiceCommandsEnabled;
                if (input.aiSuggestionsEnabled !== undefined) updateData.aiSuggestionsEnabled = input.aiSuggestionsEnabled;

                // AI fields
                if (input.preferredAIProvider !== undefined) updateData.preferredAIProvider = input.preferredAIProvider;
                if (input.useCustomApiKey !== undefined) updateData.useCustomApiKey = input.useCustomApiKey;

                if (Object.keys(updateData).length === 0) {
                    return {
                        success: false,
                        error: 'No settings to update. Provide at least one setting field.',
                    };
                }

                // Upsert - create if doesn't exist, update if exists
                const settings = await prisma.userSettings.upsert({
                    where: { userId: context.userId },
                    update: updateData,
                    create: {
                        userId: context.userId,
                        ...updateData,
                    },
                });

                logger.info({
                    event: 'user_settings_updated',
                    userId: context.userId,
                    updatedFields: Object.keys(updateData),
                });

                return {
                    success: true,
                    data: {
                        userId: settings.userId,
                        updatedFields: Object.keys(updateData),
                        updatedAt: settings.updatedAt.toISOString(),
                    },
                };
            } catch (error) {
                logger.error({ event: 'update_user_settings_error', error, input });
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to update user settings',
                };
            }
        },
    },

    // =========================================================================
    // DOCTOR PREFERENCES - CRUD (Scheduling)
    // =========================================================================
    {
        name: 'get_doctor_preferences',
        description: 'Get doctor scheduling preferences including working hours, appointment rules, and notifications',
        category: 'settings',
        inputSchema: z.object({
            doctorId: z.string().optional().describe('Doctor ID. If not provided, uses current user.'),
        }),
        requiredPermissions: ['settings:read'],
        handler: async (input: any, context: MCPContext): Promise<MCPResult> => {
            try {
                const doctorId = input.doctorId || context.userId;

                const preferences = await prisma.doctorPreferences.findUnique({
                    where: { doctorId },
                    include: {
                        doctor: {
                            select: { id: true, firstName: true, lastName: true, specialty: true },
                        },
                    },
                });

                if (!preferences) {
                    return {
                        success: true,
                        data: {
                            doctorId,
                            exists: false,
                            defaults: {
                                workingDays: [1, 2, 3, 4, 5], // Mon-Fri
                                workingHoursStart: '09:00',
                                workingHoursEnd: '17:00',
                                appointmentDuration: 30,
                                minimumAdvanceNotice: 24,
                                bufferBetweenSlots: 0,
                                allowSameDayBooking: false,
                                allowWeekendBooking: false,
                                requireConfirmation: true,
                            },
                        },
                    };
                }

                return {
                    success: true,
                    data: {
                        doctorId: preferences.doctorId,
                        exists: true,
                        doctor: {
                            id: preferences.doctor.id,
                            name: `${preferences.doctor.firstName} ${preferences.doctor.lastName}`,
                            specialty: preferences.doctor.specialty,
                        },
                        schedule: {
                            workingDays: preferences.workingDays,
                            workingHoursStart: preferences.workingHoursStart,
                            workingHoursEnd: preferences.workingHoursEnd,
                            lunchBreakStart: preferences.lunchBreakStart,
                            lunchBreakEnd: preferences.lunchBreakEnd,
                            customBreaks: preferences.customBreaks,
                            weeklyViewDays: preferences.weeklyViewDays,
                        },
                        appointments: {
                            duration: preferences.appointmentDuration,
                            minimumAdvanceNotice: preferences.minimumAdvanceNotice,
                            bufferBetweenSlots: preferences.bufferBetweenSlots,
                            maxPerDay: preferences.maxAppointmentsPerDay,
                            allowSameDayBooking: preferences.allowSameDayBooking,
                            allowWeekendBooking: preferences.allowWeekendBooking,
                        },
                        reschedule: {
                            autoApprove: preferences.autoApproveReschedule,
                            allowPatientReschedule: preferences.allowPatientReschedule,
                            minimumNotice: preferences.rescheduleMinNotice,
                        },
                        confirmation: {
                            required: preferences.requireConfirmation,
                            deadlineHours: preferences.confirmationDeadline,
                        },
                        notifications: {
                            onNewBooking: preferences.notifyOnNewBooking,
                            onReschedule: preferences.notifyOnReschedule,
                            onCancellation: preferences.notifyOnCancellation,
                        },
                        timestamps: {
                            createdAt: preferences.createdAt.toISOString(),
                            updatedAt: preferences.updatedAt.toISOString(),
                        },
                    },
                };
            } catch (error) {
                logger.error({ event: 'get_doctor_preferences_error', error, input });
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to get doctor preferences',
                };
            }
        },
    },

    {
        name: 'update_doctor_preferences',
        description: 'Update doctor scheduling preferences for appointments, working hours, and notifications',
        category: 'settings',
        inputSchema: z.object({
            // Schedule
            workingDays: z.array(z.number().min(1).max(7)).optional().describe('Working days (1=Mon, 7=Sun)'),
            workingHoursStart: z.string().optional().describe('Start time (HH:MM)'),
            workingHoursEnd: z.string().optional().describe('End time (HH:MM)'),
            lunchBreakStart: z.string().optional().describe('Lunch break start (HH:MM)'),
            lunchBreakEnd: z.string().optional().describe('Lunch break end (HH:MM)'),
            customBreaks: z.any().optional().describe('Custom breaks JSON'),

            // Appointments
            appointmentDuration: z.number().min(5).max(240).optional().describe('Default duration in minutes'),
            minimumAdvanceNotice: z.number().min(0).optional().describe('Minimum advance notice in hours'),
            bufferBetweenSlots: z.number().min(0).optional().describe('Buffer time in minutes'),
            maxAppointmentsPerDay: z.number().min(1).optional().nullable().describe('Max appointments per day'),
            allowSameDayBooking: z.boolean().optional().describe('Allow same-day booking'),
            allowWeekendBooking: z.boolean().optional().describe('Allow weekend booking'),

            // Reschedule
            autoApproveReschedule: z.boolean().optional().describe('Auto-approve reschedule requests'),
            allowPatientReschedule: z.boolean().optional().describe('Allow patient-initiated reschedule'),
            rescheduleMinNotice: z.number().min(0).optional().describe('Minimum notice for reschedule in hours'),

            // Confirmation
            requireConfirmation: z.boolean().optional().describe('Require appointment confirmation'),
            confirmationDeadline: z.number().min(1).optional().describe('Confirmation deadline in hours'),

            // Notifications
            notifyOnNewBooking: z.boolean().optional().describe('Notify on new booking'),
            notifyOnReschedule: z.boolean().optional().describe('Notify on reschedule'),
            notifyOnCancellation: z.boolean().optional().describe('Notify on cancellation'),
        }),
        requiredPermissions: ['settings:write'],
        handler: async (input: any, context: MCPContext): Promise<MCPResult> => {
            try {
                const updateData: any = {};

                // Map all fields
                const fieldMappings = [
                    'workingDays', 'workingHoursStart', 'workingHoursEnd',
                    'lunchBreakStart', 'lunchBreakEnd', 'customBreaks',
                    'appointmentDuration', 'minimumAdvanceNotice', 'bufferBetweenSlots',
                    'maxAppointmentsPerDay', 'allowSameDayBooking', 'allowWeekendBooking',
                    'autoApproveReschedule', 'allowPatientReschedule', 'rescheduleMinNotice',
                    'requireConfirmation', 'confirmationDeadline',
                    'notifyOnNewBooking', 'notifyOnReschedule', 'notifyOnCancellation',
                ];

                for (const field of fieldMappings) {
                    if (input[field] !== undefined) {
                        updateData[field] = input[field];
                    }
                }

                if (Object.keys(updateData).length === 0) {
                    return {
                        success: false,
                        error: 'No preferences to update. Provide at least one field.',
                    };
                }

                // Upsert
                const preferences = await prisma.doctorPreferences.upsert({
                    where: { doctorId: context.userId },
                    update: updateData,
                    create: {
                        doctorId: context.userId,
                        ...updateData,
                    },
                });

                logger.info({
                    event: 'doctor_preferences_updated',
                    doctorId: context.userId,
                    updatedFields: Object.keys(updateData),
                });

                return {
                    success: true,
                    data: {
                        doctorId: preferences.doctorId,
                        updatedFields: Object.keys(updateData),
                        updatedAt: preferences.updatedAt.toISOString(),
                    },
                };
            } catch (error) {
                logger.error({ event: 'update_doctor_preferences_error', error, input });
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to update doctor preferences',
                };
            }
        },
    },

    // =========================================================================
    // CLINICAL TEMPLATES - READ
    // =========================================================================
    {
        name: 'list_clinical_templates',
        description: 'List available clinical templates filtered by category or specialty',
        category: 'settings',
        inputSchema: z.object({
            category: z.enum(['SOAP_NOTE', 'PROGRESS_NOTE', 'CHIEF_COMPLAINT', 'PHYSICAL_EXAM', 'ASSESSMENT', 'PLAN', 'OTHER']).optional().describe('Template category'),
            specialty: z.string().optional().describe('Medical specialty filter'),
            publicOnly: z.boolean().default(true).describe('Only show public templates'),
            limit: z.number().min(1).max(100).default(20).describe('Maximum templates to return'),
            offset: z.number().min(0).default(0).describe('Number of templates to skip'),
        }),
        requiredPermissions: ['template:read'],
        handler: async (input: any, context: MCPContext): Promise<MCPResult> => {
            try {
                const where: any = {};

                if (input.category) where.category = input.category;
                if (input.specialty) where.specialty = input.specialty;
                if (input.publicOnly) {
                    where.OR = [
                        { isPublic: true },
                        { createdById: context.userId },
                    ];
                }

                const [templates, total] = await Promise.all([
                    prisma.clinicalTemplate.findMany({
                        where,
                        select: {
                            id: true,
                            name: true,
                            description: true,
                            category: true,
                            specialty: true,
                            shortcut: true,
                            isPublic: true,
                            isOfficial: true,
                            useCount: true,
                            createdBy: {
                                select: { firstName: true, lastName: true },
                            },
                        },
                        orderBy: [
                            { isOfficial: 'desc' },
                            { useCount: 'desc' },
                        ],
                        take: input.limit,
                        skip: input.offset,
                    }),
                    prisma.clinicalTemplate.count({ where }),
                ]);

                return {
                    success: true,
                    data: {
                        templates: templates.map(t => ({
                            id: t.id,
                            name: t.name,
                            description: t.description,
                            category: t.category,
                            specialty: t.specialty,
                            shortcut: t.shortcut,
                            isPublic: t.isPublic,
                            isOfficial: t.isOfficial,
                            useCount: t.useCount,
                            createdBy: `${t.createdBy.firstName} ${t.createdBy.lastName}`,
                        })),
                        pagination: {
                            total,
                            limit: input.limit,
                            offset: input.offset,
                            hasMore: input.offset + templates.length < total,
                        },
                    },
                };
            } catch (error) {
                logger.error({ event: 'list_clinical_templates_error', error, input });
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to list templates',
                };
            }
        },
    },

    {
        name: 'get_clinical_template',
        description: 'Get a clinical template by ID or shortcut with full content',
        category: 'settings',
        inputSchema: z.object({
            templateId: z.string().optional().describe('Template ID'),
            shortcut: z.string().optional().describe('Template shortcut (e.g., cc:chest-pain)'),
        }),
        requiredPermissions: ['template:read'],
        handler: async (input: any, context: MCPContext): Promise<MCPResult> => {
            try {
                if (!input.templateId && !input.shortcut) {
                    return {
                        success: false,
                        error: 'Provide either templateId or shortcut',
                    };
                }

                const template = await prisma.clinicalTemplate.findFirst({
                    where: input.templateId
                        ? { id: input.templateId }
                        : { shortcut: input.shortcut },
                    include: {
                        createdBy: {
                            select: { id: true, firstName: true, lastName: true },
                        },
                    },
                });

                if (!template) {
                    return {
                        success: false,
                        error: input.templateId
                            ? `Template not found: ${input.templateId}`
                            : `No template with shortcut: ${input.shortcut}`,
                    };
                }

                // Increment use count
                await prisma.clinicalTemplate.update({
                    where: { id: template.id },
                    data: { useCount: { increment: 1 } },
                });

                return {
                    success: true,
                    data: {
                        id: template.id,
                        name: template.name,
                        description: template.description,
                        category: template.category,
                        specialty: template.specialty,
                        shortcut: template.shortcut,
                        content: template.content,
                        variables: template.variables,
                        isPublic: template.isPublic,
                        isOfficial: template.isOfficial,
                        useCount: template.useCount + 1,
                        createdBy: {
                            id: template.createdBy.id,
                            name: `${template.createdBy.firstName} ${template.createdBy.lastName}`,
                        },
                        timestamps: {
                            createdAt: template.createdAt.toISOString(),
                            updatedAt: template.updatedAt.toISOString(),
                        },
                    },
                };
            } catch (error) {
                logger.error({ event: 'get_clinical_template_error', error, input });
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to get template',
                };
            }
        },
    },
];

// =============================================================================
// EXPORTS
// =============================================================================

export const SETTINGS_TOOL_COUNT = settingsTools.length;
