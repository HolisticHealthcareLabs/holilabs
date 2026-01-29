/**
 * Portal MCP Tools - Notifications, preferences, and patient portal actions
 *
 * These tools manage user notifications, communication preferences,
 * and patient portal functionality including appointments, medications,
 * lab results, documents, messages, and access requests.
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
    GetPortalAppointmentsSchema,
    RequestAppointmentChangeSchema,
    GetPortalMedicationsSchema,
    RequestMedicationRefillSchema,
    GetPortalLabResultsSchema,
    GetPortalDocumentsSchema,
    ShareDocumentWithPatientSchema,
    GetPortalMessagesSchema,
    SendPortalMessageSchema,
    GetAccessRequestsSchema,
    ApproveAccessRequestSchema,
    DenyAccessRequestSchema,
    GetPortalHealthSummarySchema,
    UpdatePortalContactInfoSchema,
    RequestFamilyAccessSchema,
    GetFamilyMembersSchema,
    UpdateInsuranceSchema,
    type GetNotificationsInput,
    type MarkNotificationReadInput,
    type MarkAllNotificationsReadInput,
    type CreateNotificationInput,
    type GetPreferencesInput,
    type UpdatePreferencesInput,
    type GetPortalAppointmentsInput,
    type RequestAppointmentChangeInput,
    type GetPortalMedicationsInput,
    type RequestMedicationRefillInput,
    type GetPortalLabResultsInput,
    type GetPortalDocumentsInput,
    type ShareDocumentWithPatientInput,
    type GetPortalMessagesInput,
    type SendPortalMessageInput,
    type GetAccessRequestsInput,
    type ApproveAccessRequestInput,
    type DenyAccessRequestInput,
    type GetPortalHealthSummaryInput,
    type UpdatePortalContactInfoInput,
    type RequestFamilyAccessInput,
    type GetFamilyMembersInput,
    type UpdateInsuranceInput,
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
// TOOL: get_portal_appointments
// =============================================================================

async function getPortalAppointmentsHandler(
    input: GetPortalAppointmentsInput,
    context: MCPContext
): Promise<MCPResult> {
    const { page = 1, limit = 20 } = input;
    const skip = (page - 1) * limit;

    // Verify patient access
    const patient = await prisma.patient.findFirst({
        where: {
            id: input.patientId,
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

    // Build query conditions
    const where: any = {
        patientId: input.patientId,
    };

    if (input.upcoming) {
        where.startTime = { gte: new Date() };
    }

    if (input.status) {
        where.status = input.status;
    }

    const [appointments, total] = await Promise.all([
        prisma.appointment.findMany({
            where,
            skip,
            take: limit,
            orderBy: { startTime: input.upcoming ? 'asc' : 'desc' },
            select: {
                id: true,
                title: true,
                description: true,
                startTime: true,
                endTime: true,
                type: true,
                status: true,
                confirmationStatus: true,
                rescheduleRequested: true,
                rescheduleReason: true,
                rescheduleNewTime: true,
                rescheduleApproved: true,
                branch: true,
                branchAddress: true,
                clinician: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        specialty: true,
                    },
                },
            },
        }),
        prisma.appointment.count({ where }),
    ]);

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'get_portal_appointments',
        patientId: input.patientId,
        resultCount: appointments.length,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            appointments,
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
// TOOL: request_appointment_change
// =============================================================================

async function requestAppointmentChangeHandler(
    input: RequestAppointmentChangeInput,
    context: MCPContext
): Promise<MCPResult> {
    // Verify patient access
    const patient = await prisma.patient.findFirst({
        where: {
            id: input.patientId,
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

    // Get appointment
    const appointment: any = await prisma.appointment.findUnique({
        where: { id: input.appointmentId },
        include: {
            clinician: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                },
            },
        },
    });

    if (!appointment) {
        return {
            success: false,
            error: 'Appointment not found',
            data: null,
        };
    }

    // Verify appointment belongs to patient
    if (appointment.patientId !== input.patientId) {
        return {
            success: false,
            error: 'Appointment does not belong to this patient',
            data: null,
        };
    }

    // Check if appointment is in the past
    if (new Date(appointment.startTime) < new Date()) {
        return {
            success: false,
            error: 'Cannot modify past appointments',
            data: null,
        };
    }

    // Check if appointment is already cancelled
    if (appointment.status === 'CANCELLED') {
        return {
            success: false,
            error: 'Appointment is already cancelled',
            data: null,
        };
    }

    let updatedAppointment: any;

    if (input.requestType === 'CANCEL') {
        // Cancel the appointment
        updatedAppointment = await prisma.appointment.update({
            where: { id: input.appointmentId },
            data: {
                status: 'CANCELLED',
                confirmationStatus: 'CANCELLED_BY_PATIENT',
                description: `${appointment.description || ''}\n\nCancelled by patient: ${input.reason}`.trim(),
            },
        });

        // Create notification for clinician
        await prisma.notification.create({
            data: {
                recipientId: appointment.clinicianId,
                recipientType: 'CLINICIAN',
                type: 'APPOINTMENT_CANCELLED',
                title: 'Appointment Cancelled',
                message: `Patient ${patient.firstName} ${patient.lastName} cancelled their appointment scheduled for ${appointment.startTime}. Reason: ${input.reason}`,
                priority: 'NORMAL',
                resourceType: 'Appointment',
                resourceId: appointment.id,
            },
        });
    } else {
        // Request reschedule
        updatedAppointment = await prisma.appointment.update({
            where: { id: input.appointmentId },
            data: {
                rescheduleRequested: true,
                rescheduleRequestedAt: new Date(),
                rescheduleReason: input.reason,
                rescheduleNewTime: input.preferredNewTime ? new Date(input.preferredNewTime) : null,
                confirmationStatus: 'RESCHEDULE_REQUESTED',
            },
        });

        // Create notification for clinician
        await prisma.notification.create({
            data: {
                recipientId: appointment.clinicianId,
                recipientType: 'CLINICIAN',
                type: 'APPOINTMENT_RESCHEDULED',
                title: 'Reschedule Request',
                message: `Patient ${patient.firstName} ${patient.lastName} requested to reschedule their appointment. Reason: ${input.reason}${input.preferredNewTime ? `. Preferred time: ${input.preferredNewTime}` : ''}`,
                priority: 'HIGH',
                resourceType: 'Appointment',
                resourceId: appointment.id,
            },
        });
    }

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'request_appointment_change',
        appointmentId: input.appointmentId,
        requestType: input.requestType,
        patientId: input.patientId,
        agentId: context.agentId,
        clinicianId: context.clinicianId,
    });

    return {
        success: true,
        data: {
            appointmentId: updatedAppointment.id,
            requestType: input.requestType,
            status: updatedAppointment.status,
            confirmationStatus: updatedAppointment.confirmationStatus,
            message: input.requestType === 'CANCEL'
                ? 'Appointment cancelled successfully'
                : 'Reschedule request submitted successfully',
        },
    };
}

// =============================================================================
// TOOL: get_portal_medications
// =============================================================================

async function getPortalMedicationsHandler(
    input: GetPortalMedicationsInput,
    context: MCPContext
): Promise<MCPResult> {
    const { page = 1, limit = 20 } = input;
    const skip = (page - 1) * limit;

    // Verify patient access
    const patient = await prisma.patient.findFirst({
        where: {
            id: input.patientId,
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

    const where: any = {
        patientId: input.patientId,
    };

    if (input.activeOnly) {
        where.isActive = true;
    }

    const [medications, total] = await Promise.all([
        prisma.medication.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                genericName: true,
                dose: true,
                frequency: true,
                route: true,
                instructions: true,
                isActive: true,
                startDate: true,
                endDate: true,
                prescribedBy: true,
                prescriber: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        }),
        prisma.medication.count({ where }),
    ]);

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'get_portal_medications',
        patientId: input.patientId,
        resultCount: medications.length,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            medications,
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
// TOOL: request_medication_refill
// =============================================================================

async function requestMedicationRefillHandler(
    input: RequestMedicationRefillInput,
    context: MCPContext
): Promise<MCPResult> {
    // Verify patient access
    const patient = await prisma.patient.findFirst({
        where: {
            id: input.patientId,
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

    // Get medication
    const medication: any = await prisma.medication.findUnique({
        where: { id: input.medicationId },
        include: {
            prescriber: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                },
            },
        },
    });

    if (!medication) {
        return {
            success: false,
            error: 'Medication not found',
            data: null,
        };
    }

    // Verify medication belongs to patient
    if (medication.patientId !== input.patientId) {
        return {
            success: false,
            error: 'Medication does not belong to this patient',
            data: null,
        };
    }

    // Check if medication is active
    if (!medication.isActive) {
        return {
            success: false,
            error: 'Cannot request refill for inactive medication',
            data: null,
        };
    }

    // Create refill request (using audit log as tracking mechanism)
    const refillRequestId = `refill_${Date.now()}`;

    await prisma.auditLog.create({
        data: {
            userId: context.clinicianId,
            action: 'CREATE',
            resource: 'RefillRequest',
            resourceId: refillRequestId,
            success: true,
            ipAddress: 'mcp-tool',
            details: {
                medicationId: medication.id,
                medicationName: medication.name,
                patientId: input.patientId,
                notes: input.notes,
                pharmacy: input.pharmacy,
                status: 'PENDING',
            },
        },
    });

    // Create notification for prescribing clinician
    if (medication.prescribedBy) {
        await prisma.notification.create({
            data: {
                recipientId: medication.prescribedBy,
                recipientType: 'CLINICIAN',
                type: 'MEDICATION_REMINDER',
                title: 'Medication Refill Request',
                message: `Patient ${patient.firstName} ${patient.lastName} requested a refill for ${medication.name}.${input.notes ? ` Notes: ${input.notes}` : ''}`,
                priority: 'NORMAL',
                resourceType: 'Medication',
                resourceId: medication.id,
            },
        });
    }

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'request_medication_refill',
        medicationId: input.medicationId,
        patientId: input.patientId,
        refillRequestId,
        agentId: context.agentId,
        clinicianId: context.clinicianId,
    });

    return {
        success: true,
        data: {
            refillRequestId,
            medicationId: medication.id,
            medicationName: medication.name,
            status: 'PENDING',
            message: 'Refill request submitted successfully',
        },
    };
}

// =============================================================================
// TOOL: get_portal_lab_results
// =============================================================================

async function getPortalLabResultsHandler(
    input: GetPortalLabResultsInput,
    context: MCPContext
): Promise<MCPResult> {
    const { page = 1, limit = 20 } = input;
    const skip = (page - 1) * limit;

    // Verify patient access
    const patient = await prisma.patient.findFirst({
        where: {
            id: input.patientId,
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

    const where: any = {
        patientId: input.patientId,
    };

    if (input.status) {
        where.status = input.status;
    }

    if (input.startDate || input.endDate) {
        where.resultDate = {};
        if (input.startDate) {
            where.resultDate.gte = new Date(input.startDate);
        }
        if (input.endDate) {
            where.resultDate.lte = new Date(input.endDate);
        }
    }

    const [labResults, total] = await Promise.all([
        prisma.labResult.findMany({
            where,
            skip,
            take: limit,
            orderBy: { resultDate: 'desc' },
            select: {
                id: true,
                testName: true,
                testCode: true,
                category: true,
                value: true,
                unit: true,
                referenceRange: true,
                status: true,
                interpretation: true,
                isAbnormal: true,
                isCritical: true,
                resultDate: true,
                orderedDate: true,
                orderingDoctor: true,
                performingLab: true,
                notes: true,
            },
        }),
        prisma.labResult.count({ where }),
    ]);

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'get_portal_lab_results',
        patientId: input.patientId,
        resultCount: labResults.length,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            labResults,
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
// TOOL: get_portal_documents
// =============================================================================

async function getPortalDocumentsHandler(
    input: GetPortalDocumentsInput,
    context: MCPContext
): Promise<MCPResult> {
    const { page = 1, limit = 20 } = input;
    const skip = (page - 1) * limit;

    // Verify patient access
    const patient = await prisma.patient.findFirst({
        where: {
            id: input.patientId,
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

    const where: any = {
        patientId: input.patientId,
    };

    if (input.documentType) {
        where.documentType = input.documentType;
    }

    const [documents, total] = await Promise.all([
        prisma.document.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                fileName: true,
                fileType: true,
                fileSize: true,
                documentType: true,
                processingStatus: true,
                isDeidentified: true,
                createdAt: true,
                updatedAt: true,
            },
        }),
        prisma.document.count({ where }),
    ]);

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'get_portal_documents',
        patientId: input.patientId,
        resultCount: documents.length,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            documents,
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
// TOOL: share_document_with_patient
// =============================================================================

async function shareDocumentWithPatientHandler(
    input: ShareDocumentWithPatientInput,
    context: MCPContext
): Promise<MCPResult> {
    // Verify patient access
    const patient = await prisma.patient.findFirst({
        where: {
            id: input.patientId,
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

    // Get document
    const document = await prisma.document.findUnique({
        where: { id: input.documentId },
    });

    if (!document) {
        return {
            success: false,
            error: 'Document not found',
            data: null,
        };
    }

    // Verify document belongs to patient or is being shared TO patient
    if (document.patientId !== input.patientId) {
        return {
            success: false,
            error: 'Document does not belong to this patient',
            data: null,
        };
    }

    // Create notification for patient if requested
    if (input.notifyPatient) {
        await prisma.notification.create({
            data: {
                recipientId: input.patientId,
                recipientType: 'PATIENT',
                type: 'DOCUMENT_SHARED',
                title: 'New Document Available',
                message: input.message || `A new document (${document.fileName}) has been shared with you.`,
                priority: 'NORMAL',
                resourceType: 'Document',
                resourceId: document.id,
                actionUrl: `/portal/documents/${document.id}`,
                actionLabel: 'View Document',
            },
        });
    }

    // Create audit log
    await prisma.auditLog.create({
        data: {
            userId: context.clinicianId,
            action: 'SHARE',
            resource: 'Document',
            resourceId: document.id,
            success: true,
            ipAddress: 'mcp-tool',
            details: {
                patientId: input.patientId,
                documentId: document.id,
                fileName: document.fileName,
                notifiedPatient: input.notifyPatient,
            },
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'share_document_with_patient',
        documentId: input.documentId,
        patientId: input.patientId,
        agentId: context.agentId,
        clinicianId: context.clinicianId,
    });

    return {
        success: true,
        data: {
            documentId: document.id,
            patientId: input.patientId,
            notified: input.notifyPatient,
            message: 'Document shared successfully',
        },
    };
}

// =============================================================================
// TOOL: get_portal_messages
// =============================================================================

async function getPortalMessagesHandler(
    input: GetPortalMessagesInput,
    context: MCPContext
): Promise<MCPResult> {
    const { page = 1, limit = 20 } = input;
    const skip = (page - 1) * limit;

    // Verify patient access
    const patient = await prisma.patient.findFirst({
        where: {
            id: input.patientId,
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

    const where: any = {
        patientId: input.patientId,
    };

    if (input.unreadOnly) {
        where.readAt = null;
    }

    const [messages, total] = await Promise.all([
        prisma.message.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                fromUserId: true,
                fromUserType: true,
                toUserId: true,
                toUserType: true,
                subject: true,
                body: true,
                attachments: true,
                readAt: true,
                archivedAt: true,
                createdAt: true,
            },
        }),
        prisma.message.count({ where }),
    ]);

    // Count unread
    const unreadCount = await prisma.message.count({
        where: {
            patientId: input.patientId,
            readAt: null,
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'get_portal_messages',
        patientId: input.patientId,
        resultCount: messages.length,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            messages,
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
// TOOL: send_portal_message
// =============================================================================

async function sendPortalMessageHandler(
    input: SendPortalMessageInput,
    context: MCPContext
): Promise<MCPResult> {
    // Verify patient access
    const patient = await prisma.patient.findFirst({
        where: {
            id: input.patientId,
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

    // Create message
    const message = await prisma.message.create({
        data: {
            fromUserId: context.clinicianId,
            fromUserType: 'CLINICIAN',
            toUserId: input.patientId,
            toUserType: 'PATIENT',
            patientId: input.patientId,
            subject: input.subject,
            body: input.body,
        },
    });

    // Create notification for patient
    await prisma.notification.create({
        data: {
            recipientId: input.patientId,
            recipientType: 'PATIENT',
            type: 'NEW_MESSAGE',
            title: input.subject || 'New Message',
            message: input.body.substring(0, 100) + (input.body.length > 100 ? '...' : ''),
            priority: input.priority,
            resourceType: 'Message',
            resourceId: message.id,
            actionUrl: `/portal/messages/${message.id}`,
            actionLabel: 'Read Message',
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'send_portal_message',
        messageId: message.id,
        patientId: input.patientId,
        agentId: context.agentId,
        clinicianId: context.clinicianId,
    });

    return {
        success: true,
        data: {
            messageId: message.id,
            patientId: input.patientId,
            createdAt: message.createdAt,
            message: 'Message sent successfully',
        },
    };
}

// =============================================================================
// TOOL: get_access_requests
// =============================================================================

async function getAccessRequestsHandler(
    input: GetAccessRequestsInput,
    context: MCPContext
): Promise<MCPResult> {
    const { page = 1, limit = 20 } = input;
    const skip = (page - 1) * limit;

    // Build query for data access grants that are pending/need review
    const where: any = {};

    if (input.patientId) {
        // Verify patient access
        const patient = await prisma.patient.findFirst({
            where: {
                id: input.patientId,
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
        where.patientId = input.patientId;
    }

    // Filter by status (map to grant states)
    if (input.status === 'PENDING') {
        where.revokedAt = null;
        where.expiresAt = { gt: new Date() };
    } else if (input.status === 'DENIED') {
        where.revokedAt = { not: null };
    } else if (input.status === 'EXPIRED') {
        where.expiresAt = { lt: new Date() };
    }

    const [accessGrants, total] = await Promise.all([
        prisma.dataAccessGrant.findMany({
            where,
            skip,
            take: limit,
            orderBy: { grantedAt: 'desc' },
            select: {
                id: true,
                patientId: true,
                grantedToType: true,
                grantedToId: true,
                grantedToEmail: true,
                grantedToName: true,
                resourceType: true,
                resourceId: true,
                canView: true,
                canDownload: true,
                canShare: true,
                grantedAt: true,
                expiresAt: true,
                revokedAt: true,
                revokedReason: true,
                accessCount: true,
                lastAccessedAt: true,
                purpose: true,
                patient: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        }),
        prisma.dataAccessGrant.count({ where }),
    ]);

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'get_access_requests',
        patientId: input.patientId,
        resultCount: accessGrants.length,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            accessRequests: accessGrants,
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
// TOOL: approve_access_request
// =============================================================================

async function approveAccessRequestHandler(
    input: ApproveAccessRequestInput,
    context: MCPContext
): Promise<MCPResult> {
    // Get the access grant
    const accessGrant: any = await prisma.dataAccessGrant.findUnique({
        where: { id: input.requestId },
        include: {
            patient: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    assignedClinicianId: true,
                },
            },
        },
    });

    if (!accessGrant) {
        return {
            success: false,
            error: 'Access request not found',
            data: null,
        };
    }

    // Verify clinician has access to this patient
    if (accessGrant.patient.assignedClinicianId !== context.clinicianId) {
        return {
            success: false,
            error: 'Not authorized to approve this access request',
            data: null,
        };
    }

    // Check if already revoked
    if (accessGrant.revokedAt) {
        return {
            success: false,
            error: 'Access request has already been denied',
            data: null,
        };
    }

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);

    // Update the access grant with approval
    const updatedGrant = await prisma.dataAccessGrant.update({
        where: { id: input.requestId },
        data: {
            expiresAt,
            purpose: input.notes ? `${accessGrant.purpose || ''}\nApproval notes: ${input.notes}`.trim() : accessGrant.purpose,
        },
    });

    // Create audit log
    await prisma.auditLog.create({
        data: {
            userId: context.clinicianId,
            action: 'CREATE_GRANULAR_ACCESS_GRANT',
            resource: 'DataAccessGrant',
            resourceId: accessGrant.id,
            success: true,
            ipAddress: 'mcp-tool',
            details: {
                patientId: accessGrant.patientId,
                grantedTo: accessGrant.grantedToEmail || accessGrant.grantedToId,
                expiresInDays: input.expiresInDays,
                notes: input.notes,
            },
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'approve_access_request',
        requestId: input.requestId,
        patientId: accessGrant.patientId,
        agentId: context.agentId,
        clinicianId: context.clinicianId,
    });

    return {
        success: true,
        data: {
            requestId: updatedGrant.id,
            patientId: accessGrant.patientId,
            expiresAt: updatedGrant.expiresAt,
            message: 'Access request approved successfully',
        },
    };
}

// =============================================================================
// TOOL: deny_access_request
// =============================================================================

async function denyAccessRequestHandler(
    input: DenyAccessRequestInput,
    context: MCPContext
): Promise<MCPResult> {
    // Get the access grant
    const accessGrant: any = await prisma.dataAccessGrant.findUnique({
        where: { id: input.requestId },
        include: {
            patient: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    assignedClinicianId: true,
                },
            },
        },
    });

    if (!accessGrant) {
        return {
            success: false,
            error: 'Access request not found',
            data: null,
        };
    }

    // Verify clinician has access to this patient
    if (accessGrant.patient.assignedClinicianId !== context.clinicianId) {
        return {
            success: false,
            error: 'Not authorized to deny this access request',
            data: null,
        };
    }

    // Check if already revoked
    if (accessGrant.revokedAt) {
        return {
            success: false,
            error: 'Access request has already been denied',
            data: null,
        };
    }

    // Revoke the access grant
    const updatedGrant = await prisma.dataAccessGrant.update({
        where: { id: input.requestId },
        data: {
            revokedAt: new Date(),
            revokedBy: context.clinicianId,
            revokedReason: input.reason,
        },
    });

    // Create audit log
    await prisma.auditLog.create({
        data: {
            userId: context.clinicianId,
            action: 'REVOKE_GRANULAR_ACCESS_GRANT',
            resource: 'DataAccessGrant',
            resourceId: accessGrant.id,
            success: true,
            ipAddress: 'mcp-tool',
            details: {
                patientId: accessGrant.patientId,
                grantedTo: accessGrant.grantedToEmail || accessGrant.grantedToId,
                reason: input.reason,
            },
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'deny_access_request',
        requestId: input.requestId,
        patientId: accessGrant.patientId,
        reason: input.reason,
        agentId: context.agentId,
        clinicianId: context.clinicianId,
    });

    return {
        success: true,
        data: {
            requestId: updatedGrant.id,
            patientId: accessGrant.patientId,
            revokedAt: updatedGrant.revokedAt,
            message: 'Access request denied successfully',
        },
    };
}

// =============================================================================
// TOOL: get_portal_health_summary
// =============================================================================

async function getPortalHealthSummaryHandler(
    input: GetPortalHealthSummaryInput,
    context: MCPContext
): Promise<MCPResult> {
    // Verify patient access
    const patient = await prisma.patient.findFirst({
        where: {
            id: input.patientId,
            assignedClinicianId: context.clinicianId,
        },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true,
            heightCm: true,
            weightKg: true,
            bmi: true,
            bmiCategory: true,
        },
    });

    if (!patient) {
        return {
            success: false,
            error: 'Patient not found or access denied',
            data: null,
        };
    }

    const summary: any = {
        patient: {
            id: patient.id,
            name: `${patient.firstName} ${patient.lastName}`,
            dateOfBirth: patient.dateOfBirth,
            gender: patient.gender,
            heightCm: patient.heightCm,
            weightKg: patient.weightKg,
            bmi: patient.bmi,
            bmiCategory: patient.bmiCategory,
        },
    };

    // Fetch additional data based on flags
    const queries: Promise<any>[] = [];

    if (input.includeVitals) {
        queries.push(
            prisma.vitalSign.findMany({
                where: { patientId: input.patientId },
                orderBy: { recordedAt: 'desc' },
                take: 5,
                select: {
                    id: true,
                    temperature: true,
                    heartRate: true,
                    systolicBP: true,
                    diastolicBP: true,
                    respiratoryRate: true,
                    oxygenSaturation: true,
                    recordedAt: true,
                },
            }).then(vitals => { summary.vitals = vitals; })
        );
    }

    if (input.includeConditions) {
        queries.push(
            prisma.diagnosis.findMany({
                where: {
                    patientId: input.patientId,
                    status: 'ACTIVE',
                },
                orderBy: { diagnosedAt: 'desc' },
                select: {
                    id: true,
                    icd10Code: true,
                    description: true,
                    severity: true,
                    isPrimary: true,
                    diagnosedAt: true,
                },
            }).then(conditions => { summary.conditions = conditions; })
        );
    }

    if (input.includeMedications) {
        queries.push(
            prisma.medication.findMany({
                where: {
                    patientId: input.patientId,
                    isActive: true,
                },
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    name: true,
                    dose: true,
                    frequency: true,
                    route: true,
                    instructions: true,
                },
            }).then(medications => { summary.medications = medications; })
        );
    }

    if (input.includeAllergies) {
        queries.push(
            prisma.allergy.findMany({
                where: {
                    patientId: input.patientId,
                    isActive: true,
                },
                select: {
                    id: true,
                    allergen: true,
                    allergyType: true,
                    severity: true,
                    reactions: true,
                    verificationStatus: true,
                },
            }).then(allergies => { summary.allergies = allergies; })
        );
    }

    await Promise.all(queries);

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'get_portal_health_summary',
        patientId: input.patientId,
        includedSections: {
            vitals: input.includeVitals,
            conditions: input.includeConditions,
            medications: input.includeMedications,
            allergies: input.includeAllergies,
        },
        agentId: context.agentId,
    });

    return {
        success: true,
        data: summary,
    };
}

// =============================================================================
// TOOL: update_portal_contact_info
// =============================================================================

async function updatePortalContactInfoHandler(
    input: UpdatePortalContactInfoInput,
    context: MCPContext
): Promise<MCPResult> {
    // Verify patient access
    const patient = await prisma.patient.findFirst({
        where: {
            id: input.patientId,
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

    // Build update data
    const updateData: any = {};

    if (input.email !== undefined) updateData.email = input.email;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.address !== undefined) updateData.address = input.address;
    if (input.city !== undefined) updateData.city = input.city;
    if (input.state !== undefined) updateData.state = input.state;
    if (input.postalCode !== undefined) updateData.postalCode = input.postalCode;

    if (Object.keys(updateData).length === 0) {
        return {
            success: false,
            error: 'No contact information to update',
            data: null,
        };
    }

    // Update patient
    const updatedPatient = await prisma.patient.update({
        where: { id: input.patientId },
        data: updateData,
        select: {
            id: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            state: true,
            postalCode: true,
            updatedAt: true,
        },
    });

    // Create audit log
    await prisma.auditLog.create({
        data: {
            userId: context.clinicianId,
            action: 'UPDATE',
            resource: 'Patient',
            resourceId: input.patientId,
            success: true,
            ipAddress: 'mcp-tool',
            details: {
                updatedFields: Object.keys(updateData),
                source: 'portal_contact_update',
            },
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'update_portal_contact_info',
        patientId: input.patientId,
        updatedFields: Object.keys(updateData),
        agentId: context.agentId,
        clinicianId: context.clinicianId,
    });

    return {
        success: true,
        data: {
            patientId: updatedPatient.id,
            updatedFields: Object.keys(updateData),
            contactInfo: {
                email: updatedPatient.email,
                phone: updatedPatient.phone,
                address: updatedPatient.address,
                city: updatedPatient.city,
                state: updatedPatient.state,
                postalCode: updatedPatient.postalCode,
            },
            updatedAt: updatedPatient.updatedAt,
            message: 'Contact information updated successfully',
        },
    };
}

// =============================================================================
// TOOL: request_family_access
// =============================================================================

async function requestFamilyAccessHandler(
    input: RequestFamilyAccessInput,
    context: MCPContext
): Promise<MCPResult> {
    try {
        // Verify patient exists
        const patient = await prisma.patient.findUnique({
            where: { id: input.patientId },
            select: { id: true, firstName: true, lastName: true },
        });

        if (!patient) {
            return {
                success: false,
                error: `Patient not found: ${input.patientId}`,
                data: null,
            };
        }

        // Check if family member already has access
        const existingAccess = await prisma.familyPortalAccess.findFirst({
            where: {
                patientId: input.patientId,
                email: input.email,
                revokedAt: null,
            },
        });

        if (existingAccess) {
            return {
                success: false,
                error: 'Family member already has portal access',
                data: { existingAccessId: existingAccess.id },
            };
        }

        // Generate a unique access token
        const accessToken = `fam_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

        // Create family portal access
        const accessGrant = await prisma.familyPortalAccess.create({
            data: {
                patientId: input.patientId,
                familyMemberName: input.familyMemberName,
                relationship: input.relationship,
                email: input.email,
                phone: input.phone,
                accessToken,
                accessLevel: input.accessLevel,
                canViewClinicalNotes: input.canViewClinicalNotes,
                canViewMedications: input.canViewMedications,
                canViewCarePlan: input.canViewCarePlan,
                canViewPainAssessments: input.canViewPainAssessments,
                canReceiveDailyUpdates: input.canReceiveDailyUpdates,
                canViewPhotos: input.canViewPhotos,
                expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
                createdBy: context.clinicianId,
            },
        });

        // Create audit log
        await prisma.auditLog.create({
            data: {
                userId: context.clinicianId,
                action: 'CREATE',
                resource: 'FamilyPortalAccess',
                resourceId: accessGrant.id,
                success: true,
                ipAddress: 'mcp-tool',
                details: {
                    patientId: input.patientId,
                    familyMemberEmail: input.email,
                    relationship: input.relationship,
                    accessLevel: input.accessLevel,
                },
            },
        });

        logger.info({
            event: 'family_portal_access_granted',
            accessId: accessGrant.id,
            patientId: input.patientId,
            familyMemberEmail: input.email,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                accessId: accessGrant.id,
                patientId: input.patientId,
                patientName: `${patient.firstName} ${patient.lastName}`,
                familyMember: {
                    name: input.familyMemberName,
                    email: input.email,
                    relationship: input.relationship,
                },
                accessLevel: input.accessLevel,
                permissions: {
                    canViewClinicalNotes: input.canViewClinicalNotes,
                    canViewMedications: input.canViewMedications,
                    canViewCarePlan: input.canViewCarePlan,
                    canViewPainAssessments: input.canViewPainAssessments,
                    canReceiveDailyUpdates: input.canReceiveDailyUpdates,
                    canViewPhotos: input.canViewPhotos,
                },
                expiresAt: accessGrant.expiresAt?.toISOString(),
                createdAt: accessGrant.createdAt.toISOString(),
                message: 'Family portal access granted successfully',
            },
        };
    } catch (error) {
        logger.error({ event: 'request_family_access_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to grant family access',
            data: null,
        };
    }
}

// =============================================================================
// TOOL: get_family_members
// =============================================================================

async function getFamilyMembersHandler(
    input: GetFamilyMembersInput,
    context: MCPContext
): Promise<MCPResult> {
    try {
        // Build where clause
        const where: any = {
            patientId: input.patientId,
        };

        if (!input.includeExpired) {
            where.OR = [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } },
            ];
        }

        if (!input.includeRevoked) {
            where.revokedAt = null;
        }

        const familyMembers = await prisma.familyPortalAccess.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                familyMemberName: true,
                relationship: true,
                email: true,
                phone: true,
                accessLevel: true,
                canViewClinicalNotes: true,
                canViewMedications: true,
                canViewCarePlan: true,
                canViewPainAssessments: true,
                canReceiveDailyUpdates: true,
                canViewPhotos: true,
                expiresAt: true,
                revokedAt: true,
                createdAt: true,
                lastAccessAt: true,
            },
        });

        logger.info({
            event: 'family_members_retrieved',
            patientId: input.patientId,
            count: familyMembers.length,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                patientId: input.patientId,
                familyMembers: familyMembers.map(fm => ({
                    accessId: fm.id,
                    name: fm.familyMemberName,
                    relationship: fm.relationship,
                    email: fm.email,
                    phone: fm.phone,
                    accessLevel: fm.accessLevel,
                    permissions: {
                        canViewClinicalNotes: fm.canViewClinicalNotes,
                        canViewMedications: fm.canViewMedications,
                        canViewCarePlan: fm.canViewCarePlan,
                        canViewPainAssessments: fm.canViewPainAssessments,
                        canReceiveDailyUpdates: fm.canReceiveDailyUpdates,
                        canViewPhotos: fm.canViewPhotos,
                    },
                    status: fm.revokedAt
                        ? 'REVOKED'
                        : fm.expiresAt && fm.expiresAt < new Date()
                        ? 'EXPIRED'
                        : 'ACTIVE',
                    expiresAt: fm.expiresAt?.toISOString(),
                    revokedAt: fm.revokedAt?.toISOString(),
                    createdAt: fm.createdAt.toISOString(),
                    lastAccessAt: fm.lastAccessAt?.toISOString(),
                })),
                total: familyMembers.length,
            },
        };
    } catch (error) {
        logger.error({ event: 'get_family_members_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get family members',
            data: null,
        };
    }
}

// =============================================================================
// TOOL: update_insurance
// =============================================================================

async function updateInsuranceHandler(
    input: UpdateInsuranceInput,
    context: MCPContext
): Promise<MCPResult> {
    try {
        // Verify patient exists
        const patient = await prisma.patient.findUnique({
            where: { id: input.patientId },
            select: { id: true, firstName: true, lastName: true },
        });

        if (!patient) {
            return {
                success: false,
                error: `Patient not found: ${input.patientId}`,
                data: null,
            };
        }

        let insurance;
        const isUpdate = !!input.insuranceId;

        if (isUpdate) {
            // Update existing insurance
            const existing = await prisma.patientInsurance.findUnique({
                where: { id: input.insuranceId },
            });

            if (!existing) {
                return {
                    success: false,
                    error: `Insurance record not found: ${input.insuranceId}`,
                    data: null,
                };
            }

            if (existing.patientId !== input.patientId) {
                return {
                    success: false,
                    error: 'Insurance record does not belong to specified patient',
                    data: null,
                };
            }

            // Build update data
            const updateData: any = {};
            if (input.insuranceType !== undefined) updateData.insuranceType = input.insuranceType;
            if (input.payerId !== undefined) updateData.payerId = input.payerId;
            if (input.payerName !== undefined) updateData.payerName = input.payerName;
            if (input.payerType !== undefined) updateData.payerType = input.payerType;
            if (input.planId !== undefined) updateData.planId = input.planId;
            if (input.planName !== undefined) updateData.planName = input.planName;
            if (input.planType !== undefined) updateData.planType = input.planType;
            if (input.memberId !== undefined) updateData.memberId = input.memberId;
            if (input.groupNumber !== undefined) updateData.groupNumber = input.groupNumber;
            if (input.subscriberName !== undefined) updateData.subscriberName = input.subscriberName;
            if (input.relationshipToPatient !== undefined) {
                updateData.relationshipToPatient = input.relationshipToPatient;
            }
            if (input.effectiveDate !== undefined) {
                updateData.effectiveDate = new Date(input.effectiveDate);
            }
            if (input.terminationDate !== undefined) {
                updateData.terminationDate = new Date(input.terminationDate);
            }

            insurance = await prisma.patientInsurance.update({
                where: { id: input.insuranceId },
                data: updateData,
            });
        } else {
            // Create new insurance record - require essential fields
            if (!input.payerId || !input.payerName || !input.planId || !input.planName || !input.memberId) {
                return {
                    success: false,
                    error: 'Creating new insurance requires: payerId, payerName, planId, planName, memberId',
                    data: null,
                };
            }

            insurance = await prisma.patientInsurance.create({
                data: {
                    patientId: input.patientId,
                    insuranceType: input.insuranceType || 'PRIMARY',
                    payerId: input.payerId,
                    payerName: input.payerName,
                    payerType: input.payerType || 'COMMERCIAL',
                    planId: input.planId,
                    planName: input.planName,
                    planType: input.planType || 'PPO',
                    memberId: input.memberId,
                    groupNumber: input.groupNumber,
                    subscriberName: input.subscriberName,
                    relationshipToPatient: input.relationshipToPatient || 'SELF',
                    effectiveDate: input.effectiveDate
                        ? new Date(input.effectiveDate)
                        : new Date(),
                    terminationDate: input.terminationDate
                        ? new Date(input.terminationDate)
                        : undefined,
                },
            });
        }

        // Create audit log
        await prisma.auditLog.create({
            data: {
                userId: context.clinicianId,
                action: isUpdate ? 'UPDATE' : 'CREATE',
                resource: 'PatientInsurance',
                resourceId: insurance.id,
                success: true,
                ipAddress: 'mcp-tool',
                details: {
                    patientId: input.patientId,
                    payerName: insurance.payerName,
                    memberId: insurance.memberId,
                    insuranceType: insurance.insuranceType,
                },
            },
        });

        logger.info({
            event: isUpdate ? 'insurance_updated' : 'insurance_created',
            insuranceId: insurance.id,
            patientId: input.patientId,
            payerName: insurance.payerName,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                insuranceId: insurance.id,
                patientId: input.patientId,
                patientName: `${patient.firstName} ${patient.lastName}`,
                insurance: {
                    insuranceType: insurance.insuranceType,
                    payerId: insurance.payerId,
                    payerName: insurance.payerName,
                    payerType: insurance.payerType,
                    planId: insurance.planId,
                    planName: insurance.planName,
                    planType: insurance.planType,
                    memberId: insurance.memberId,
                    groupNumber: insurance.groupNumber,
                    subscriberName: insurance.subscriberName,
                    relationshipToPatient: insurance.relationshipToPatient,
                    effectiveDate: insurance.effectiveDate?.toISOString(),
                    terminationDate: insurance.terminationDate?.toISOString(),
                },
                action: isUpdate ? 'updated' : 'created',
                updatedAt: insurance.updatedAt.toISOString(),
                message: `Insurance ${isUpdate ? 'updated' : 'created'} successfully`,
            },
        };
    } catch (error) {
        logger.error({ event: 'update_insurance_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update insurance',
            data: null,
        };
    }
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
    // ==========================================================================
    // NEW PORTAL TOOLS: Patient Portal Actions
    // ==========================================================================
    {
        name: 'get_portal_appointments',
        description: 'Get patient portal-visible appointments with filtering by status and time range.',
        category: 'portal',
        inputSchema: GetPortalAppointmentsSchema,
        requiredPermissions: ['appointment:read'],
        handler: getPortalAppointmentsHandler,
    },
    {
        name: 'request_appointment_change',
        description: 'Submit a patient request to reschedule or cancel an appointment.',
        category: 'portal',
        inputSchema: RequestAppointmentChangeSchema,
        requiredPermissions: ['appointment:write'],
        handler: requestAppointmentChangeHandler,
    },
    {
        name: 'get_portal_medications',
        description: 'Get patient medication list for portal display with active/inactive filtering.',
        category: 'portal',
        inputSchema: GetPortalMedicationsSchema,
        requiredPermissions: ['medication:read'],
        handler: getPortalMedicationsHandler,
    },
    {
        name: 'request_medication_refill',
        description: 'Submit a patient request for medication refill with optional pharmacy preference.',
        category: 'portal',
        inputSchema: RequestMedicationRefillSchema,
        requiredPermissions: ['medication:write'],
        handler: requestMedicationRefillHandler,
    },
    {
        name: 'get_portal_lab_results',
        description: 'Get patient lab results for portal display with date range and status filtering.',
        category: 'portal',
        inputSchema: GetPortalLabResultsSchema,
        requiredPermissions: ['lab:read'],
        handler: getPortalLabResultsHandler,
    },
    {
        name: 'get_portal_documents',
        description: 'Get patient documents for portal display with document type filtering.',
        category: 'portal',
        inputSchema: GetPortalDocumentsSchema,
        requiredPermissions: ['document:read'],
        handler: getPortalDocumentsHandler,
    },
    {
        name: 'share_document_with_patient',
        description: 'Share a document to patient portal with optional notification.',
        category: 'portal',
        inputSchema: ShareDocumentWithPatientSchema,
        requiredPermissions: ['document:write'],
        handler: shareDocumentWithPatientHandler,
    },
    {
        name: 'get_portal_messages',
        description: 'Get patient messages from portal with unread filtering.',
        category: 'portal',
        inputSchema: GetPortalMessagesSchema,
        requiredPermissions: ['message:read'],
        handler: getPortalMessagesHandler,
    },
    {
        name: 'send_portal_message',
        description: 'Send a message to patient via portal with priority settings.',
        category: 'portal',
        inputSchema: SendPortalMessageSchema,
        requiredPermissions: ['message:write'],
        handler: sendPortalMessageHandler,
    },
    {
        name: 'get_access_requests',
        description: 'Get pending data access requests for review.',
        category: 'portal',
        inputSchema: GetAccessRequestsSchema,
        requiredPermissions: ['access:read'],
        handler: getAccessRequestsHandler,
    },
    {
        name: 'approve_access_request',
        description: 'Approve a portal data access request with expiration settings.',
        category: 'portal',
        inputSchema: ApproveAccessRequestSchema,
        requiredPermissions: ['access:write'],
        handler: approveAccessRequestHandler,
    },
    {
        name: 'deny_access_request',
        description: 'Deny a portal data access request with reason.',
        category: 'portal',
        inputSchema: DenyAccessRequestSchema,
        requiredPermissions: ['access:write'],
        handler: denyAccessRequestHandler,
    },
    {
        name: 'get_portal_health_summary',
        description: 'Get comprehensive patient health summary including vitals, conditions, medications, and allergies.',
        category: 'portal',
        inputSchema: GetPortalHealthSummarySchema,
        requiredPermissions: ['patient:read'],
        handler: getPortalHealthSummaryHandler,
    },
    {
        name: 'update_portal_contact_info',
        description: 'Update patient contact information from portal (email, phone, address).',
        category: 'portal',
        inputSchema: UpdatePortalContactInfoSchema,
        requiredPermissions: ['patient:write'],
        handler: updatePortalContactInfoHandler,
    },
    // ==========================================================================
    // NEW: Family Access & Insurance Tools
    // ==========================================================================
    {
        name: 'request_family_access',
        description: 'Grant portal access to a family member or caregiver with configurable permissions.',
        category: 'portal',
        inputSchema: RequestFamilyAccessSchema,
        requiredPermissions: ['access:write'],
        handler: requestFamilyAccessHandler,
    },
    {
        name: 'get_family_members',
        description: 'List family members with portal access for a patient.',
        category: 'portal',
        inputSchema: GetFamilyMembersSchema,
        requiredPermissions: ['access:read'],
        handler: getFamilyMembersHandler,
    },
    {
        name: 'update_insurance',
        description: 'Create or update patient insurance information including payer, plan, and coverage details.',
        category: 'portal',
        inputSchema: UpdateInsuranceSchema,
        requiredPermissions: ['insurance:write'],
        handler: updateInsuranceHandler,
    },
];

export const PORTAL_TOOL_COUNT = portalTools.length;
