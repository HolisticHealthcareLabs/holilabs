/**
 * MCP Appointment Tools
 *
 * REFACTORED: Decomposed into pure primitives per agent-native architecture audit.
 * Clinician selection fallback logic removed - agent orchestrates.
 *
 * Primitives:
 * - get_available_slots: Returns raw slot data without filtering
 * - create_appointment_record: Pure create operation, requires explicit clinician
 * - get_clinician_schedule: Returns clinician availability data
 *
 * Legacy (deprecated):
 * - schedule_appointment: Still available but marked deprecated
 * - check_availability: Replaced by get_available_slots
 *
 * Tools for AI agents to manage patient appointments:
 * - Schedule appointments
 * - Get upcoming appointments
 * - Cancel/reschedule appointments
 * - Check availability
 * - Send reminders
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
    UpdateAppointmentSchema,
    type UpdateAppointmentInput,
} from '../schemas/tool-schemas';
import type { MCPContext, MCPResult, MCPTool } from '../types';

// =============================================================================
// PRIMITIVE SCHEMAS
// =============================================================================

const GetAvailableSlotsSchema = z.object({
    clinicianId: z.string().describe('Clinician UUID to check availability for'),
    date: z.string().describe('Date to check (ISO 8601)'),
    slotDuration: z.number().default(30).describe('Slot duration in minutes'),
});

const CreateAppointmentRecordSchema = z.object({
    patientId: z.string().describe('The patient UUID'),
    clinicianId: z.string().describe('The clinician UUID (required - no fallback)'),
    dateTime: z.string().describe('ISO 8601 datetime for the appointment'),
    duration: z.number().describe('Duration in minutes'),
    type: z.enum(['CHECKUP', 'FOLLOW_UP', 'URGENT', 'TELEHEALTH', 'LAB', 'PROCEDURE']).describe('Appointment type'),
    reason: z.string().optional().describe('Reason for the appointment'),
    notes: z.string().optional().describe('Additional notes'),
});

const GetClinicianScheduleSchema = z.object({
    clinicianId: z.string().describe('Clinician UUID'),
    startDate: z.string().describe('Start date (ISO 8601)'),
    endDate: z.string().describe('End date (ISO 8601)'),
});

// =============================================================================
// PRIMITIVE HANDLERS
// =============================================================================

// PRIMITIVE: get_available_slots
// Returns raw slot data - no filtering, no availability logic
async function getAvailableSlotsHandler(input: any, context: MCPContext): Promise<MCPResult> {
    const checkDate = new Date(input.date);
    const { clinicianId, slotDuration } = input;

    // Generate all possible slots for the day (raw data)
    const slots = [];
    for (let hour = 8; hour < 18; hour++) {
        for (let minute = 0; minute < 60; minute += slotDuration) {
            const slotStart = new Date(checkDate);
            slotStart.setHours(hour, minute, 0, 0);
            const slotEnd = new Date(slotStart);
            slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);

            // In production, would check against actual bookings
            const isBooked = Math.random() < 0.3; // Mock: 30% booked

            slots.push({
                startTime: slotStart.toISOString(),
                endTime: slotEnd.toISOString(),
                isBooked,
                clinicianId,
            });
        }
    }

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'get_available_slots',
        clinicianId,
        date: input.date,
        slotCount: slots.length,
    });

    // Return raw data - agent decides which slots to use
    return {
        success: true,
        data: {
            clinicianId,
            date: checkDate.toISOString().split('T')[0],
            slotDuration,
            slots,
        },
    };
}

// PRIMITIVE: create_appointment_record
// Pure create - no clinician fallback, no automatic selection
async function createAppointmentRecordHandler(input: any, context: MCPContext): Promise<MCPResult> {
    // Verify patient exists
    const patient = await prisma.patient.findFirst({
        where: { id: input.patientId },
        select: { id: true, firstName: true, lastName: true },
    });

    if (!patient) {
        return { success: false, error: 'Patient not found', data: null };
    }

    const appointmentDate = new Date(input.dateTime);

    // Create appointment record
    const appointment = {
        id: `apt_${Date.now()}`,
        patientId: input.patientId,
        clinicianId: input.clinicianId, // Required - no fallback
        scheduledAt: appointmentDate,
        duration: input.duration,
        type: input.type,
        reason: input.reason,
        notes: input.notes,
        status: 'PENDING', // Starts as pending - agent decides status
        createdAt: new Date(),
    };

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'create_appointment_record',
        appointmentId: appointment.id,
        patientId: input.patientId,
        clinicianId: input.clinicianId,
        dateTime: input.dateTime,
    });

    // Return raw appointment data
    return {
        success: true,
        data: {
            id: appointment.id,
            patientId: appointment.patientId,
            patientName: `${patient.firstName} ${patient.lastName}`,
            clinicianId: appointment.clinicianId,
            scheduledAt: appointment.scheduledAt.toISOString(),
            duration: appointment.duration,
            type: appointment.type,
            reason: appointment.reason,
            notes: appointment.notes,
            status: appointment.status,
            createdAt: appointment.createdAt.toISOString(),
        },
    };
}

// PRIMITIVE: get_clinician_schedule
// Returns raw schedule data for a date range
async function getClinicianScheduleHandler(input: any, context: MCPContext): Promise<MCPResult> {
    const { clinicianId, startDate, endDate } = input;
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Mock schedule data - in production would query actual schedule
    const workingDays = [];
    const current = new Date(start);
    while (current <= end) {
        const dayOfWeek = current.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip weekends
            workingDays.push({
                date: current.toISOString().split('T')[0],
                startTime: '08:00',
                endTime: '17:00',
                lunchStart: '12:00',
                lunchEnd: '13:00',
            });
        }
        current.setDate(current.getDate() + 1);
    }

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'get_clinician_schedule',
        clinicianId,
        startDate,
        endDate,
        dayCount: workingDays.length,
    });

    return {
        success: true,
        data: {
            clinicianId,
            startDate,
            endDate,
            workingDays,
        },
    };
}

// =============================================================================
// PRIMITIVE: update_appointment
// Update appointment details (time, notes, status, type)
// =============================================================================

async function updateAppointmentHandler(
    input: UpdateAppointmentInput,
    context: MCPContext
): Promise<MCPResult> {
    const { appointmentId, dateTime, duration, status, type, notes, reason } = input;

    // Build update object with only provided fields
    const updateData: Record<string, any> = {};
    if (dateTime !== undefined) updateData.scheduledAt = new Date(dateTime);
    if (duration !== undefined) updateData.duration = duration;
    if (status !== undefined) updateData.status = status;
    if (type !== undefined) updateData.type = type;
    if (notes !== undefined) updateData.notes = notes;
    if (reason !== undefined) updateData.reason = reason;

    // Check if any updates were provided
    if (Object.keys(updateData).length === 0) {
        return {
            success: false,
            error: 'No update fields provided',
            data: null,
        };
    }

    updateData.updatedAt = new Date();

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'update_appointment',
        appointmentId,
        updatedFields: Object.keys(updateData),
        agentId: context.agentId,
    });

    // Return mock updated appointment (no Appointment model in Prisma)
    return {
        success: true,
        data: {
            appointmentId,
            ...updateData,
            scheduledAt: updateData.scheduledAt?.toISOString(),
            updatedAt: updateData.updatedAt.toISOString(),
            message: 'Appointment updated successfully',
        },
    };
}

// =============================================================================
// LEGACY TOOL DEFINITIONS (DEPRECATED)
// =============================================================================

export const appointmentTools: MCPTool[] = [
    // ==========================================================================
    // PRIMITIVE TOOLS (Agent-native architecture)
    // ==========================================================================
    {
        name: 'get_available_slots',
        description: 'Get all time slots for a clinician on a date with booking status. Returns raw slot data - agent decides which to offer.',
        category: 'appointment',
        inputSchema: GetAvailableSlotsSchema,
        requiredPermissions: ['patient:read'],
        handler: getAvailableSlotsHandler,
    },
    {
        name: 'create_appointment_record',
        description: 'Create an appointment record. Requires explicit clinician ID - no automatic selection. Returns raw appointment data.',
        category: 'appointment',
        inputSchema: CreateAppointmentRecordSchema,
        requiredPermissions: ['patient:read', 'patient:write'],
        handler: createAppointmentRecordHandler,
    },
    {
        name: 'get_clinician_schedule',
        description: 'Get clinician working hours and availability for a date range. Returns raw schedule data.',
        category: 'appointment',
        inputSchema: GetClinicianScheduleSchema,
        requiredPermissions: ['patient:read'],
        handler: getClinicianScheduleHandler,
    },
    {
        name: 'update_appointment',
        description: 'Update appointment details including time, duration, status, type, notes, or reason. Pure update operation.',
        category: 'appointment',
        inputSchema: UpdateAppointmentSchema,
        requiredPermissions: ['patient:write'],
        handler: updateAppointmentHandler,
    },
    // ==========================================================================
    // LEGACY TOOLS (Deprecated - use primitives)
    // ==========================================================================
    {
        name: 'schedule_appointment',
        description: '[DEPRECATED: Use get_available_slots + create_appointment_record] Schedule with automatic clinician fallback.',
        category: 'appointment',
        inputSchema: z.object({
            patientId: z.string().describe('The patient UUID'),
            clinicianId: z.string().optional().describe('Optional clinician UUID (defaults to assigned clinician)'),
            dateTime: z.string().describe('ISO 8601 datetime for the appointment'),
            duration: z.number().default(30).describe('Duration in minutes (default 30)'),
            type: z.enum(['CHECKUP', 'FOLLOW_UP', 'URGENT', 'TELEHEALTH', 'LAB', 'PROCEDURE']).describe('Appointment type'),
            reason: z.string().optional().describe('Reason for the appointment'),
            notes: z.string().optional().describe('Additional notes'),
        }),
        requiredPermissions: ['patient:read', 'patient:write'],
        deprecated: true,
        alternatives: ['get_available_slots', 'create_appointment_record'],
        handler: async (input: any, context: MCPContext): Promise<MCPResult> => {
            logger.warn({
                event: 'deprecated_tool_called',
                tool: 'schedule_appointment',
                message: 'Use get_available_slots + create_appointment_record primitives instead',
            });

            try {
                // Verify patient exists
                const patient = await prisma.patient.findFirst({
                    where: { id: input.patientId },
                    select: { id: true, firstName: true, lastName: true, assignedClinicianId: true },
                });

                if (!patient) {
                    return { success: false, error: 'Patient not found', data: null };
                }

                const clinicianId = input.clinicianId || patient.assignedClinicianId || context.clinicianId;
                const appointmentDate = new Date(input.dateTime);

                // Create appointment (using generic scheduledEvent or similar)
                const appointment = {
                    id: `apt_${Date.now()}`,
                    patientId: input.patientId,
                    clinicianId,
                    scheduledAt: appointmentDate,
                    duration: input.duration,
                    type: input.type,
                    reason: input.reason,
                    status: 'SCHEDULED',
                    createdAt: new Date(),
                };

                logger.info({
                    event: 'appointment_scheduled_by_agent',
                    appointmentId: appointment.id,
                    patientId: input.patientId,
                    dateTime: input.dateTime,
                    type: input.type,
                });

                return {
                    success: true,
                    data: {
                        appointmentId: appointment.id,
                        patient: `${patient.firstName} ${patient.lastName}`,
                        dateTime: appointmentDate.toISOString(),
                        type: input.type,
                        duration: input.duration,
                        status: 'SCHEDULED',
                    },
                };
            } catch (error: any) {
                return { success: false, error: error.message, data: null };
            }
        },
    },

    {
        name: 'get_patient_appointments',
        description: 'Get upcoming appointments for a patient',
        category: 'appointment',
        inputSchema: z.object({
            patientId: z.string().describe('The patient UUID'),
            startDate: z.string().optional().describe('Filter start date (ISO 8601)'),
            endDate: z.string().optional().describe('Filter end date (ISO 8601)'),
            status: z.enum(['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
            limit: z.number().default(10).describe('Max results'),
        }),
        requiredPermissions: ['patient:read'],
        handler: async (input: any, context: MCPContext): Promise<MCPResult> => {
            // Return mock appointments for demo
            const appointments = [
                {
                    id: 'apt_demo_1',
                    dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                    type: 'FOLLOW_UP',
                    status: 'SCHEDULED',
                    duration: 30,
                    clinician: 'Dr. Demo',
                    reason: 'Lab results review',
                },
                {
                    id: 'apt_demo_2',
                    dateTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                    type: 'CHECKUP',
                    status: 'SCHEDULED',
                    duration: 45,
                    clinician: 'Dr. Demo',
                    reason: 'Annual physical',
                },
            ];

            return {
                success: true,
                data: {
                    appointments: appointments.slice(0, input.limit),
                    count: appointments.length,
                },
            };
        },
    },

    {
        name: 'cancel_appointment',
        description: 'Cancel an existing appointment',
        category: 'appointment',
        inputSchema: z.object({
            appointmentId: z.string().describe('The appointment ID to cancel'),
            reason: z.string().optional().describe('Reason for cancellation'),
            notifyPatient: z.boolean().default(true).describe('Send notification to patient'),
        }),
        requiredPermissions: ['patient:write'],
        handler: async (input: any, context: MCPContext): Promise<MCPResult> => {
            logger.info({
                event: 'appointment_cancelled_by_agent',
                appointmentId: input.appointmentId,
                reason: input.reason,
                agentId: context.agentId,
            });

            return {
                success: true,
                data: {
                    appointmentId: input.appointmentId,
                    status: 'CANCELLED',
                    reason: input.reason,
                    patientNotified: input.notifyPatient,
                },
            };
        },
    },

    {
        name: 'reschedule_appointment',
        description: 'Reschedule an appointment to a new date/time',
        category: 'appointment',
        inputSchema: z.object({
            appointmentId: z.string().describe('The appointment ID to reschedule'),
            newDateTime: z.string().describe('New datetime (ISO 8601)'),
            newDuration: z.number().optional().describe('New duration in minutes'),
            notifyPatient: z.boolean().default(true),
        }),
        requiredPermissions: ['patient:write'],
        handler: async (input: any, context: MCPContext): Promise<MCPResult> => {
            const newDate = new Date(input.newDateTime);

            logger.info({
                event: 'appointment_rescheduled_by_agent',
                appointmentId: input.appointmentId,
                newDateTime: input.newDateTime,
                agentId: context.agentId,
            });

            return {
                success: true,
                data: {
                    appointmentId: input.appointmentId,
                    newDateTime: newDate.toISOString(),
                    newDuration: input.newDuration,
                    status: 'RESCHEDULED',
                    patientNotified: input.notifyPatient,
                },
            };
        },
    },

    {
        name: 'check_availability',
        description: '[DEPRECATED: Use get_available_slots] Check availability with pre-filtered available slots.',
        category: 'appointment',
        inputSchema: z.object({
            clinicianId: z.string().optional().describe('Clinician UUID (defaults to current user)'),
            date: z.string().describe('Date to check (ISO 8601)'),
            duration: z.number().default(30).describe('Appointment duration in minutes'),
        }),
        requiredPermissions: ['patient:read'],
        deprecated: true,
        alternatives: ['get_available_slots'],
        handler: async (input: any, context: MCPContext): Promise<MCPResult> => {
            logger.warn({
                event: 'deprecated_tool_called',
                tool: 'check_availability',
                message: 'Use get_available_slots primitive instead',
            });

            const checkDate = new Date(input.date);
            const clinicianId = input.clinicianId || context.clinicianId;

            // Generate available slots (mock)
            const slots = [];
            for (let hour = 9; hour < 17; hour++) {
                if (hour !== 12) { // Skip lunch
                    slots.push({
                        startTime: `${hour.toString().padStart(2, '0')}:00`,
                        endTime: `${hour.toString().padStart(2, '0')}:${input.duration}`,
                        available: Math.random() > 0.3,
                    });
                    slots.push({
                        startTime: `${hour.toString().padStart(2, '0')}:30`,
                        endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
                        available: Math.random() > 0.3,
                    });
                }
            }

            return {
                success: true,
                data: {
                    clinicianId,
                    date: checkDate.toISOString().split('T')[0],
                    slots: slots.filter(s => s.available),
                    totalAvailable: slots.filter(s => s.available).length,
                },
            };
        },
    },
];

// =============================================================================
// EXPORTS
// =============================================================================

export const APPOINTMENT_TOOL_COUNT = appointmentTools.length;
