/**
 * MCP Scheduling Tools
 *
 * Comprehensive scheduling infrastructure tools for clinician availability,
 * time-off management, and patient waitlist operations.
 *
 * Availability Operations:
 * - get_clinician_availability: Get availability slots for a clinician
 * - set_clinician_availability: Set available time slots
 *
 * Time-Off Operations:
 * - create_time_off: Create time-off/vacation block
 * - get_time_off: Get time-off records
 * - delete_time_off: Remove time-off block
 *
 * Waitlist Operations:
 * - add_to_waitlist: Add patient to appointment waitlist
 * - get_waitlist: Get waitlist for a clinician/clinic
 * - remove_from_waitlist: Remove patient from waitlist
 *
 * Scheduling Intelligence:
 * - get_scheduling_conflicts: Check for scheduling conflicts
 * - suggest_optimal_slots: AI-suggested optimal appointment times
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { MCPContext, MCPResult, MCPTool } from '../types';

// =============================================================================
// ENUMS MATCHING PRISMA SCHEMA
// =============================================================================

const TimeOffTypeEnum = z.enum([
    'VACATION',
    'SICK_LEAVE',
    'CONFERENCE',
    'TRAINING',
    'PERSONAL',
    'BLOCKED',
]);

const TimeOffStatusEnum = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']);

const WaitingListPriorityEnum = z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']);

const WaitingListStatusEnum = z.enum([
    'WAITING',
    'NOTIFIED',
    'ACCEPTED',
    'DECLINED',
    'EXPIRED',
    'CONVERTED',
]);

const AppointmentTypeEnum = z.enum(['IN_PERSON', 'TELEHEALTH', 'PHONE', 'HOME_VISIT']);

// =============================================================================
// SCHEMAS
// =============================================================================

// Availability Schemas
const GetClinicianAvailabilitySchema = z.object({
    clinicianId: z.string().describe('The clinician UUID'),
    dayOfWeek: z.number().min(0).max(6).optional().describe('Day of week (0=Sunday, 6=Saturday)'),
    effectiveDate: z.string().optional().describe('Check availability effective on this date (ISO 8601)'),
    isActive: z.boolean().default(true).describe('Filter by active status'),
});

const SetClinicianAvailabilitySchema = z.object({
    clinicianId: z.string().describe('The clinician UUID'),
    dayOfWeek: z.number().min(0).max(6).describe('Day of week (0=Sunday, 6=Saturday)'),
    startTime: z.string().describe('Start time (HH:MM format, e.g., "09:00")'),
    endTime: z.string().describe('End time (HH:MM format, e.g., "17:00")'),
    breakStart: z.string().optional().describe('Break start time (HH:MM format)'),
    breakEnd: z.string().optional().describe('Break end time (HH:MM format)'),
    slotDuration: z.number().min(5).max(120).default(30).describe('Slot duration in minutes'),
    maxBookings: z.number().min(1).default(1).describe('Maximum bookings per slot'),
    effectiveFrom: z.string().optional().describe('Effective start date (ISO 8601)'),
    effectiveUntil: z.string().optional().describe('Effective end date (ISO 8601)'),
});

// Time-Off Schemas
const CreateTimeOffSchema = z.object({
    clinicianId: z.string().describe('The clinician UUID'),
    startDate: z.string().describe('Start date (ISO 8601)'),
    endDate: z.string().describe('End date (ISO 8601)'),
    type: TimeOffTypeEnum.describe('Type of time off'),
    reason: z.string().optional().describe('Reason for time off'),
    allDay: z.boolean().default(true).describe('Is this an all-day time off?'),
    startTime: z.string().optional().describe('Start time if not all day (HH:MM)'),
    endTime: z.string().optional().describe('End time if not all day (HH:MM)'),
});

const GetTimeOffSchema = z.object({
    clinicianId: z.string().optional().describe('Filter by clinician UUID'),
    status: TimeOffStatusEnum.optional().describe('Filter by status'),
    type: TimeOffTypeEnum.optional().describe('Filter by type'),
    startDate: z.string().optional().describe('Filter time off starting after this date (ISO 8601)'),
    endDate: z.string().optional().describe('Filter time off ending before this date (ISO 8601)'),
    limit: z.number().min(1).max(100).default(50).describe('Maximum results'),
});

const DeleteTimeOffSchema = z.object({
    timeOffId: z.string().describe('The time-off record ID'),
});

// Waitlist Schemas
const AddToWaitlistSchema = z.object({
    patientId: z.string().describe('The patient UUID'),
    clinicianId: z.string().describe('The clinician UUID'),
    preferredDate: z.string().optional().describe('Preferred appointment date (ISO 8601)'),
    preferredTimeStart: z.string().optional().describe('Earliest acceptable time (HH:MM)'),
    preferredTimeEnd: z.string().optional().describe('Latest acceptable time (HH:MM)'),
    appointmentType: AppointmentTypeEnum.default('IN_PERSON').describe('Type of appointment'),
    priority: WaitingListPriorityEnum.default('NORMAL').describe('Priority level'),
    reason: z.string().optional().describe('Reason for urgency (if HIGH/URGENT)'),
    expiresAt: z.string().optional().describe('Expiration date (ISO 8601). Default: 30 days'),
});

const GetWaitlistSchema = z.object({
    clinicianId: z.string().optional().describe('Filter by clinician UUID'),
    patientId: z.string().optional().describe('Filter by patient UUID'),
    status: WaitingListStatusEnum.optional().describe('Filter by status'),
    priority: WaitingListPriorityEnum.optional().describe('Filter by priority'),
    appointmentType: AppointmentTypeEnum.optional().describe('Filter by appointment type'),
    limit: z.number().min(1).max(100).default(50).describe('Maximum results'),
});

const RemoveFromWaitlistSchema = z.object({
    waitlistId: z.string().describe('The waitlist entry ID'),
});

// Scheduling Intelligence Schemas
const GetSchedulingConflictsSchema = z.object({
    clinicianId: z.string().describe('The clinician UUID'),
    startDate: z.string().describe('Start of date range to check (ISO 8601)'),
    endDate: z.string().describe('End of date range to check (ISO 8601)'),
    includeTimeOff: z.boolean().default(true).describe('Include time-off in conflict check'),
    includeAppointments: z.boolean().default(true).describe('Include appointments in conflict check'),
});

const SuggestOptimalSlotsSchema = z.object({
    clinicianId: z.string().describe('The clinician UUID'),
    patientId: z.string().optional().describe('The patient UUID (for personalized suggestions)'),
    appointmentDuration: z.number().min(5).max(240).default(30).describe('Required duration in minutes'),
    preferredDays: z.array(z.number().min(0).max(6)).optional().describe('Preferred days of week'),
    preferredTimeRange: z.object({
        start: z.string().describe('Earliest time (HH:MM)'),
        end: z.string().describe('Latest time (HH:MM)'),
    }).optional().describe('Preferred time range'),
    daysAhead: z.number().min(1).max(90).default(14).describe('Number of days ahead to search'),
    maxSuggestions: z.number().min(1).max(20).default(5).describe('Maximum number of suggestions'),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// =============================================================================
// HANDLERS
// =============================================================================

// GET CLINICIAN AVAILABILITY
async function getClinicianAvailabilityHandler(
    input: z.infer<typeof GetClinicianAvailabilitySchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        // Verify clinician exists
        const clinician = await prisma.user.findUnique({
            where: { id: input.clinicianId },
            select: { id: true, firstName: true, lastName: true, specialty: true },
        });

        if (!clinician) {
            return { success: false, error: `Clinician not found: ${input.clinicianId}`, data: null };
        }

        // Build where clause
        const where: any = {
            clinicianId: input.clinicianId,
            isActive: input.isActive,
        };

        if (input.dayOfWeek !== undefined) {
            where.dayOfWeek = input.dayOfWeek;
        }

        // Filter by effective date
        if (input.effectiveDate) {
            const effectiveDate = new Date(input.effectiveDate);
            where.AND = [
                { effectiveFrom: { lte: effectiveDate } },
                {
                    OR: [
                        { effectiveUntil: null },
                        { effectiveUntil: { gte: effectiveDate } },
                    ],
                },
            ];
        }

        const availability = await prisma.providerAvailability.findMany({
            where,
            orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        });

        // Group by day of week
        const groupedByDay = availability.reduce((acc, item) => {
            const dayName = DAY_NAMES[item.dayOfWeek];
            if (!acc[dayName]) {
                acc[dayName] = [];
            }
            acc[dayName].push({
                id: item.id,
                dayOfWeek: item.dayOfWeek,
                startTime: item.startTime,
                endTime: item.endTime,
                breakStart: item.breakStart,
                breakEnd: item.breakEnd,
                slotDuration: item.slotDuration,
                maxBookings: item.maxBookings,
                effectiveFrom: item.effectiveFrom.toISOString(),
                effectiveUntil: item.effectiveUntil?.toISOString(),
                isActive: item.isActive,
            });
            return acc;
        }, {} as Record<string, any[]>);

        logger.info({
            event: 'clinician_availability_queried',
            clinicianId: input.clinicianId,
            count: availability.length,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                clinicianId: input.clinicianId,
                clinicianName: `${clinician.firstName} ${clinician.lastName}`,
                specialty: clinician.specialty,
                count: availability.length,
                availability: availability.map(a => ({
                    id: a.id,
                    dayOfWeek: a.dayOfWeek,
                    dayName: DAY_NAMES[a.dayOfWeek],
                    startTime: a.startTime,
                    endTime: a.endTime,
                    breakStart: a.breakStart,
                    breakEnd: a.breakEnd,
                    slotDuration: a.slotDuration,
                    maxBookings: a.maxBookings,
                    effectiveFrom: a.effectiveFrom.toISOString(),
                    effectiveUntil: a.effectiveUntil?.toISOString(),
                    isActive: a.isActive,
                })),
                grouped: groupedByDay,
            },
        };
    } catch (error) {
        logger.error({ event: 'get_clinician_availability_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get clinician availability',
            data: null,
        };
    }
}

// SET CLINICIAN AVAILABILITY
async function setClinicianAvailabilityHandler(
    input: z.infer<typeof SetClinicianAvailabilitySchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        // Verify clinician exists
        const clinician = await prisma.user.findUnique({
            where: { id: input.clinicianId },
            select: { id: true, role: true, firstName: true, lastName: true },
        });

        if (!clinician) {
            return { success: false, error: `Clinician not found: ${input.clinicianId}`, data: null };
        }

        if (!['CLINICIAN', 'ADMIN', 'PHYSICIAN'].includes(clinician.role)) {
            return { success: false, error: 'User is not a clinician', data: null };
        }

        const effectiveFrom = input.effectiveFrom ? new Date(input.effectiveFrom) : new Date();
        const effectiveUntil = input.effectiveUntil ? new Date(input.effectiveUntil) : null;

        // Check for overlapping availability
        const existingAvailability = await prisma.providerAvailability.findFirst({
            where: {
                clinicianId: input.clinicianId,
                dayOfWeek: input.dayOfWeek,
                isActive: true,
                OR: [
                    {
                        effectiveFrom: { lte: effectiveFrom },
                        effectiveUntil: null,
                    },
                    {
                        effectiveFrom: { lte: effectiveUntil || new Date('2099-12-31') },
                        effectiveUntil: { gte: effectiveFrom },
                    },
                ],
            },
        });

        if (existingAvailability) {
            return {
                success: false,
                error: `Availability already exists for ${DAY_NAMES[input.dayOfWeek]} in this date range`,
                data: { existingId: existingAvailability.id },
            };
        }

        // Create availability
        const availability = await prisma.providerAvailability.create({
            data: {
                clinicianId: input.clinicianId,
                dayOfWeek: input.dayOfWeek,
                startTime: input.startTime,
                endTime: input.endTime,
                breakStart: input.breakStart,
                breakEnd: input.breakEnd,
                slotDuration: input.slotDuration,
                maxBookings: input.maxBookings,
                effectiveFrom,
                effectiveUntil,
                isActive: true,
            },
        });

        logger.info({
            event: 'clinician_availability_created',
            availabilityId: availability.id,
            clinicianId: input.clinicianId,
            dayOfWeek: input.dayOfWeek,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                availabilityId: availability.id,
                clinicianId: availability.clinicianId,
                clinicianName: `${clinician.firstName} ${clinician.lastName}`,
                dayOfWeek: availability.dayOfWeek,
                dayName: DAY_NAMES[availability.dayOfWeek],
                startTime: availability.startTime,
                endTime: availability.endTime,
                breakStart: availability.breakStart,
                breakEnd: availability.breakEnd,
                slotDuration: availability.slotDuration,
                maxBookings: availability.maxBookings,
                effectiveFrom: availability.effectiveFrom.toISOString(),
                effectiveUntil: availability.effectiveUntil?.toISOString(),
                createdAt: availability.createdAt.toISOString(),
            },
        };
    } catch (error) {
        logger.error({ event: 'set_clinician_availability_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to set clinician availability',
            data: null,
        };
    }
}

// CREATE TIME OFF
async function createTimeOffHandler(
    input: z.infer<typeof CreateTimeOffSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        // Verify clinician exists
        const clinician = await prisma.user.findUnique({
            where: { id: input.clinicianId },
            select: { id: true, role: true, firstName: true, lastName: true },
        });

        if (!clinician) {
            return { success: false, error: `Clinician not found: ${input.clinicianId}`, data: null };
        }

        if (!['CLINICIAN', 'ADMIN', 'PHYSICIAN'].includes(clinician.role)) {
            return { success: false, error: 'User is not a clinician', data: null };
        }

        const startDate = new Date(input.startDate);
        const endDate = new Date(input.endDate);

        // Check for overlapping time off
        const overlapping = await prisma.providerTimeOff.findFirst({
            where: {
                clinicianId: input.clinicianId,
                status: { in: ['PENDING', 'APPROVED'] },
                OR: [
                    {
                        AND: [
                            { startDate: { lte: startDate } },
                            { endDate: { gte: startDate } },
                        ],
                    },
                    {
                        AND: [
                            { startDate: { lte: endDate } },
                            { endDate: { gte: endDate } },
                        ],
                    },
                    {
                        AND: [
                            { startDate: { gte: startDate } },
                            { endDate: { lte: endDate } },
                        ],
                    },
                ],
            },
        });

        if (overlapping) {
            return {
                success: false,
                error: 'Time off request overlaps with existing time off',
                data: {
                    existingId: overlapping.id,
                    existingDates: {
                        start: overlapping.startDate.toISOString(),
                        end: overlapping.endDate.toISOString(),
                        status: overlapping.status,
                    },
                },
            };
        }

        // Count affected appointments
        const affectedAppointments = await prisma.appointment.count({
            where: {
                clinicianId: input.clinicianId,
                startTime: { gte: startDate, lte: endDate },
                status: { in: ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN'] },
            },
        });

        // Determine initial status (BLOCKED type is auto-approved)
        const initialStatus = input.type === 'BLOCKED' ? 'APPROVED' : 'PENDING';

        const timeOff = await prisma.providerTimeOff.create({
            data: {
                clinicianId: input.clinicianId,
                startDate,
                endDate,
                type: input.type,
                reason: input.reason,
                allDay: input.allDay,
                startTime: input.startTime,
                endTime: input.endTime,
                status: initialStatus,
                approvedBy: initialStatus === 'APPROVED' ? context.clinicianId : null,
                approvedAt: initialStatus === 'APPROVED' ? new Date() : null,
                affectedAppointments,
            },
        });

        logger.info({
            event: 'time_off_created',
            timeOffId: timeOff.id,
            clinicianId: input.clinicianId,
            type: input.type,
            status: initialStatus,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                timeOffId: timeOff.id,
                clinicianId: timeOff.clinicianId,
                clinicianName: `${clinician.firstName} ${clinician.lastName}`,
                startDate: timeOff.startDate.toISOString(),
                endDate: timeOff.endDate.toISOString(),
                type: timeOff.type,
                reason: timeOff.reason,
                allDay: timeOff.allDay,
                startTime: timeOff.startTime,
                endTime: timeOff.endTime,
                status: timeOff.status,
                affectedAppointments,
                createdAt: timeOff.createdAt.toISOString(),
            },
        };
    } catch (error) {
        logger.error({ event: 'create_time_off_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create time off',
            data: null,
        };
    }
}

// GET TIME OFF
async function getTimeOffHandler(
    input: z.infer<typeof GetTimeOffSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        const where: any = {};

        if (input.clinicianId) where.clinicianId = input.clinicianId;
        if (input.status) where.status = input.status;
        if (input.type) where.type = input.type;

        // Date range filter
        if (input.startDate || input.endDate) {
            where.OR = [
                {
                    startDate: {
                        gte: input.startDate ? new Date(input.startDate) : undefined,
                        lte: input.endDate ? new Date(input.endDate) : undefined,
                    },
                },
                {
                    endDate: {
                        gte: input.startDate ? new Date(input.startDate) : undefined,
                        lte: input.endDate ? new Date(input.endDate) : undefined,
                    },
                },
            ];
        }

        const timeOffRequests = await prisma.providerTimeOff.findMany({
            where,
            include: {
                clinician: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        specialty: true,
                    },
                },
            },
            orderBy: { startDate: 'asc' },
            take: input.limit,
        });

        // Calculate statistics
        const stats = {
            total: timeOffRequests.length,
            pending: timeOffRequests.filter(t => t.status === 'PENDING').length,
            approved: timeOffRequests.filter(t => t.status === 'APPROVED').length,
            rejected: timeOffRequests.filter(t => t.status === 'REJECTED').length,
            cancelled: timeOffRequests.filter(t => t.status === 'CANCELLED').length,
            totalAffectedAppointments: timeOffRequests.reduce((sum, t) => sum + t.affectedAppointments, 0),
        };

        logger.info({
            event: 'time_off_queried',
            count: timeOffRequests.length,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                timeOffRequests: timeOffRequests.map(t => ({
                    timeOffId: t.id,
                    clinicianId: t.clinicianId,
                    clinicianName: `${t.clinician.firstName} ${t.clinician.lastName}`,
                    startDate: t.startDate.toISOString(),
                    endDate: t.endDate.toISOString(),
                    type: t.type,
                    reason: t.reason,
                    allDay: t.allDay,
                    startTime: t.startTime,
                    endTime: t.endTime,
                    status: t.status,
                    affectedAppointments: t.affectedAppointments,
                    approvedBy: t.approvedBy,
                    approvedAt: t.approvedAt?.toISOString(),
                    createdAt: t.createdAt.toISOString(),
                })),
                stats,
                count: timeOffRequests.length,
            },
        };
    } catch (error) {
        logger.error({ event: 'get_time_off_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get time off records',
            data: null,
        };
    }
}

// DELETE TIME OFF
async function deleteTimeOffHandler(
    input: z.infer<typeof DeleteTimeOffSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        const existing = await prisma.providerTimeOff.findUnique({
            where: { id: input.timeOffId },
            include: {
                clinician: {
                    select: { firstName: true, lastName: true },
                },
            },
        });

        if (!existing) {
            return { success: false, error: `Time off request not found: ${input.timeOffId}`, data: null };
        }

        if (existing.status === 'REJECTED') {
            return { success: false, error: 'Cannot cancel rejected time off requests', data: null };
        }

        if (existing.status === 'CANCELLED') {
            return { success: false, error: 'Time off request is already cancelled', data: null };
        }

        await prisma.providerTimeOff.update({
            where: { id: input.timeOffId },
            data: { status: 'CANCELLED' },
        });

        logger.info({
            event: 'time_off_deleted',
            timeOffId: input.timeOffId,
            clinicianId: existing.clinicianId,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                timeOffId: input.timeOffId,
                clinicianName: `${existing.clinician.firstName} ${existing.clinician.lastName}`,
                previousStatus: existing.status,
                newStatus: 'CANCELLED',
                affectedAppointments: existing.affectedAppointments,
                cancelledAt: new Date().toISOString(),
            },
        };
    } catch (error) {
        logger.error({ event: 'delete_time_off_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete time off',
            data: null,
        };
    }
}

// ADD TO WAITLIST
async function addToWaitlistHandler(
    input: z.infer<typeof AddToWaitlistSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        // Verify patient exists
        const patient = await prisma.patient.findUnique({
            where: { id: input.patientId },
            select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        });

        if (!patient) {
            return { success: false, error: `Patient not found: ${input.patientId}`, data: null };
        }

        // Verify clinician exists
        const clinician = await prisma.user.findUnique({
            where: { id: input.clinicianId },
            select: { id: true, firstName: true, lastName: true, role: true, specialty: true },
        });

        if (!clinician) {
            return { success: false, error: `Clinician not found: ${input.clinicianId}`, data: null };
        }

        if (!['CLINICIAN', 'ADMIN', 'PHYSICIAN'].includes(clinician.role)) {
            return { success: false, error: 'User is not a clinician', data: null };
        }

        // Check for existing active waitlist entry
        const existingEntry = await prisma.waitingList.findFirst({
            where: {
                patientId: input.patientId,
                clinicianId: input.clinicianId,
                status: { in: ['WAITING', 'NOTIFIED'] },
            },
        });

        if (existingEntry) {
            return {
                success: false,
                error: 'Patient is already on the waiting list for this clinician',
                data: { existingId: existingEntry.id },
            };
        }

        // Set default expiration (30 days from now)
        const expiresAt = input.expiresAt ? new Date(input.expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        const waitlistEntry = await prisma.waitingList.create({
            data: {
                patientId: input.patientId,
                clinicianId: input.clinicianId,
                preferredDate: input.preferredDate ? new Date(input.preferredDate) : null,
                preferredTimeStart: input.preferredTimeStart,
                preferredTimeEnd: input.preferredTimeEnd,
                appointmentType: input.appointmentType,
                priority: input.priority,
                reason: input.reason,
                expiresAt,
            },
        });

        // Get position in queue
        const position = await prisma.waitingList.count({
            where: {
                clinicianId: input.clinicianId,
                status: 'WAITING',
                createdAt: { lte: waitlistEntry.createdAt },
            },
        });

        logger.info({
            event: 'patient_added_to_waitlist',
            waitlistId: waitlistEntry.id,
            patientId: input.patientId,
            clinicianId: input.clinicianId,
            priority: input.priority,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                waitlistId: waitlistEntry.id,
                patientId: waitlistEntry.patientId,
                patientName: `${patient.firstName} ${patient.lastName}`,
                clinicianId: waitlistEntry.clinicianId,
                clinicianName: `${clinician.firstName} ${clinician.lastName}`,
                specialty: clinician.specialty,
                preferredDate: waitlistEntry.preferredDate?.toISOString(),
                preferredTimeStart: waitlistEntry.preferredTimeStart,
                preferredTimeEnd: waitlistEntry.preferredTimeEnd,
                appointmentType: waitlistEntry.appointmentType,
                priority: waitlistEntry.priority,
                reason: waitlistEntry.reason,
                status: waitlistEntry.status,
                queuePosition: position,
                expiresAt: waitlistEntry.expiresAt?.toISOString(),
                createdAt: waitlistEntry.createdAt.toISOString(),
            },
        };
    } catch (error) {
        logger.error({ event: 'add_to_waitlist_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to add to waitlist',
            data: null,
        };
    }
}

// GET WAITLIST
async function getWaitlistHandler(
    input: z.infer<typeof GetWaitlistSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        const where: any = {};

        if (input.clinicianId) where.clinicianId = input.clinicianId;
        if (input.patientId) where.patientId = input.patientId;
        if (input.status) where.status = input.status;
        if (input.priority) where.priority = input.priority;
        if (input.appointmentType) where.appointmentType = input.appointmentType;

        const waitlistEntries = await prisma.waitingList.findMany({
            where,
            include: {
                patient: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                    },
                },
                clinician: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        specialty: true,
                    },
                },
            },
            orderBy: [
                { priority: 'desc' }, // URGENT > HIGH > NORMAL > LOW
                { createdAt: 'asc' }, // FIFO within same priority
            ],
            take: input.limit,
        });

        // Calculate statistics
        const stats = {
            total: waitlistEntries.length,
            waiting: waitlistEntries.filter(e => e.status === 'WAITING').length,
            notified: waitlistEntries.filter(e => e.status === 'NOTIFIED').length,
            accepted: waitlistEntries.filter(e => e.status === 'ACCEPTED').length,
            declined: waitlistEntries.filter(e => e.status === 'DECLINED').length,
            expired: waitlistEntries.filter(e => e.status === 'EXPIRED').length,
            converted: waitlistEntries.filter(e => e.status === 'CONVERTED').length,
            urgent: waitlistEntries.filter(e => e.priority === 'URGENT').length,
            high: waitlistEntries.filter(e => e.priority === 'HIGH').length,
            normal: waitlistEntries.filter(e => e.priority === 'NORMAL').length,
            low: waitlistEntries.filter(e => e.priority === 'LOW').length,
        };

        logger.info({
            event: 'waitlist_queried',
            count: waitlistEntries.length,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                waitlistEntries: waitlistEntries.map((e, index) => ({
                    waitlistId: e.id,
                    patientId: e.patientId,
                    patientName: `${e.patient.firstName} ${e.patient.lastName}`,
                    patientEmail: e.patient.email,
                    patientPhone: e.patient.phone,
                    clinicianId: e.clinicianId,
                    clinicianName: `${e.clinician.firstName} ${e.clinician.lastName}`,
                    specialty: e.clinician.specialty,
                    preferredDate: e.preferredDate?.toISOString(),
                    preferredTimeStart: e.preferredTimeStart,
                    preferredTimeEnd: e.preferredTimeEnd,
                    appointmentType: e.appointmentType,
                    priority: e.priority,
                    reason: e.reason,
                    status: e.status,
                    queuePosition: index + 1,
                    waitTimeDays: Math.floor((Date.now() - e.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
                    expiresAt: e.expiresAt?.toISOString(),
                    isExpired: e.expiresAt ? e.expiresAt < new Date() : false,
                    createdAt: e.createdAt.toISOString(),
                })),
                stats,
                count: waitlistEntries.length,
            },
        };
    } catch (error) {
        logger.error({ event: 'get_waitlist_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get waitlist',
            data: null,
        };
    }
}

// REMOVE FROM WAITLIST
async function removeFromWaitlistHandler(
    input: z.infer<typeof RemoveFromWaitlistSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        const existing = await prisma.waitingList.findUnique({
            where: { id: input.waitlistId },
            include: {
                patient: { select: { firstName: true, lastName: true } },
                clinician: { select: { firstName: true, lastName: true } },
            },
        });

        if (!existing) {
            return { success: false, error: `Waitlist entry not found: ${input.waitlistId}`, data: null };
        }

        if (existing.status === 'CONVERTED') {
            return { success: false, error: 'Cannot remove converted waitlist entries', data: null };
        }

        await prisma.waitingList.update({
            where: { id: input.waitlistId },
            data: { status: 'EXPIRED' },
        });

        logger.info({
            event: 'patient_removed_from_waitlist',
            waitlistId: input.waitlistId,
            patientId: existing.patientId,
            clinicianId: existing.clinicianId,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                waitlistId: input.waitlistId,
                patientName: `${existing.patient.firstName} ${existing.patient.lastName}`,
                clinicianName: `${existing.clinician.firstName} ${existing.clinician.lastName}`,
                previousStatus: existing.status,
                newStatus: 'EXPIRED',
                removedAt: new Date().toISOString(),
            },
        };
    } catch (error) {
        logger.error({ event: 'remove_from_waitlist_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to remove from waitlist',
            data: null,
        };
    }
}

// GET SCHEDULING CONFLICTS
async function getSchedulingConflictsHandler(
    input: z.infer<typeof GetSchedulingConflictsSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        const startDate = new Date(input.startDate);
        const endDate = new Date(input.endDate);
        const conflicts: any[] = [];

        // Verify clinician exists
        const clinician = await prisma.user.findUnique({
            where: { id: input.clinicianId },
            select: { id: true, firstName: true, lastName: true },
        });

        if (!clinician) {
            return { success: false, error: `Clinician not found: ${input.clinicianId}`, data: null };
        }

        // Check for time-off conflicts
        if (input.includeTimeOff) {
            const timeOffRecords = await prisma.providerTimeOff.findMany({
                where: {
                    clinicianId: input.clinicianId,
                    status: 'APPROVED',
                    OR: [
                        { startDate: { gte: startDate, lte: endDate } },
                        { endDate: { gte: startDate, lte: endDate } },
                        {
                            AND: [
                                { startDate: { lte: startDate } },
                                { endDate: { gte: endDate } },
                            ],
                        },
                    ],
                },
            });

            for (const timeOff of timeOffRecords) {
                conflicts.push({
                    type: 'TIME_OFF',
                    id: timeOff.id,
                    startDate: timeOff.startDate.toISOString(),
                    endDate: timeOff.endDate.toISOString(),
                    reason: timeOff.type,
                    description: `${timeOff.type}: ${timeOff.reason || 'No reason provided'}`,
                });
            }
        }

        // Check for appointment conflicts (overlapping appointments)
        if (input.includeAppointments) {
            const appointments = await prisma.appointment.findMany({
                where: {
                    clinicianId: input.clinicianId,
                    startTime: { gte: startDate, lte: endDate },
                    status: { in: ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'] },
                },
                include: {
                    patient: { select: { firstName: true, lastName: true } },
                },
                orderBy: { startTime: 'asc' },
            });

            // Find overlapping appointments
            for (let i = 0; i < appointments.length; i++) {
                for (let j = i + 1; j < appointments.length; j++) {
                    const apt1 = appointments[i];
                    const apt2 = appointments[j];

                    // Check if apt2 starts before apt1 ends
                    if (apt2.startTime < apt1.endTime) {
                        conflicts.push({
                            type: 'OVERLAPPING_APPOINTMENTS',
                            appointments: [
                                {
                                    id: apt1.id,
                                    title: apt1.title,
                                    patientName: `${apt1.patient.firstName} ${apt1.patient.lastName}`,
                                    startTime: apt1.startTime.toISOString(),
                                    endTime: apt1.endTime.toISOString(),
                                },
                                {
                                    id: apt2.id,
                                    title: apt2.title,
                                    patientName: `${apt2.patient.firstName} ${apt2.patient.lastName}`,
                                    startTime: apt2.startTime.toISOString(),
                                    endTime: apt2.endTime.toISOString(),
                                },
                            ],
                            description: `Appointments overlap: ${apt1.title} and ${apt2.title}`,
                        });
                    }
                }
            }
        }

        logger.info({
            event: 'scheduling_conflicts_checked',
            clinicianId: input.clinicianId,
            conflictsFound: conflicts.length,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                clinicianId: input.clinicianId,
                clinicianName: `${clinician.firstName} ${clinician.lastName}`,
                dateRange: {
                    start: startDate.toISOString(),
                    end: endDate.toISOString(),
                },
                hasConflicts: conflicts.length > 0,
                conflictCount: conflicts.length,
                conflicts,
            },
        };
    } catch (error) {
        logger.error({ event: 'get_scheduling_conflicts_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get scheduling conflicts',
            data: null,
        };
    }
}

// SUGGEST OPTIMAL SLOTS
async function suggestOptimalSlotsHandler(
    input: z.infer<typeof SuggestOptimalSlotsSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        // Verify clinician exists
        const clinician = await prisma.user.findUnique({
            where: { id: input.clinicianId },
            select: { id: true, firstName: true, lastName: true, specialty: true },
        });

        if (!clinician) {
            return { success: false, error: `Clinician not found: ${input.clinicianId}`, data: null };
        }

        // Get clinician availability
        const availability = await prisma.providerAvailability.findMany({
            where: {
                clinicianId: input.clinicianId,
                isActive: true,
                effectiveFrom: { lte: new Date() },
                OR: [
                    { effectiveUntil: null },
                    { effectiveUntil: { gte: new Date() } },
                ],
            },
        });

        if (availability.length === 0) {
            return {
                success: false,
                error: 'Clinician has no availability configured',
                data: null,
            };
        }

        // Get time off in the search range
        const searchEndDate = new Date(Date.now() + input.daysAhead * 24 * 60 * 60 * 1000);
        const timeOff = await prisma.providerTimeOff.findMany({
            where: {
                clinicianId: input.clinicianId,
                status: 'APPROVED',
                OR: [
                    { startDate: { gte: new Date(), lte: searchEndDate } },
                    { endDate: { gte: new Date(), lte: searchEndDate } },
                ],
            },
        });

        // Get existing appointments in the search range
        const existingAppointments = await prisma.appointment.findMany({
            where: {
                clinicianId: input.clinicianId,
                startTime: { gte: new Date(), lte: searchEndDate },
                status: { notIn: ['CANCELLED', 'NO_SHOW', 'RESCHEDULED'] },
            },
            select: { startTime: true, endTime: true },
        });

        // Generate available slots
        const suggestions: any[] = [];
        const availabilityByDay = availability.reduce((acc, a) => {
            acc[a.dayOfWeek] = a;
            return acc;
        }, {} as Record<number, typeof availability[0]>);

        // Iterate through days
        for (let dayOffset = 0; dayOffset < input.daysAhead && suggestions.length < input.maxSuggestions; dayOffset++) {
            const date = new Date(Date.now() + dayOffset * 24 * 60 * 60 * 1000);
            const dayOfWeek = date.getDay();

            // Check if clinician works this day
            const dayAvailability = availabilityByDay[dayOfWeek];
            if (!dayAvailability) continue;

            // Check preferred days filter
            if (input.preferredDays && !input.preferredDays.includes(dayOfWeek)) continue;

            // Check if day is blocked by time off
            const dateStr = date.toISOString().split('T')[0];
            const isTimeOff = timeOff.some(t => {
                const startStr = t.startDate.toISOString().split('T')[0];
                const endStr = t.endDate.toISOString().split('T')[0];
                return dateStr >= startStr && dateStr <= endStr;
            });
            if (isTimeOff) continue;

            // Generate slots for this day
            const startMinutes = timeToMinutes(dayAvailability.startTime);
            const endMinutes = timeToMinutes(dayAvailability.endTime);
            const breakStart = dayAvailability.breakStart ? timeToMinutes(dayAvailability.breakStart) : null;
            const breakEnd = dayAvailability.breakEnd ? timeToMinutes(dayAvailability.breakEnd) : null;

            // Apply preferred time range filter
            let effectiveStart = startMinutes;
            let effectiveEnd = endMinutes;
            if (input.preferredTimeRange) {
                effectiveStart = Math.max(effectiveStart, timeToMinutes(input.preferredTimeRange.start));
                effectiveEnd = Math.min(effectiveEnd, timeToMinutes(input.preferredTimeRange.end));
            }

            // Find available slots
            for (let slotStart = effectiveStart; slotStart + input.appointmentDuration <= effectiveEnd; slotStart += dayAvailability.slotDuration) {
                const slotEnd = slotStart + input.appointmentDuration;

                // Skip if in break time
                if (breakStart !== null && breakEnd !== null) {
                    if (slotStart < breakEnd && slotEnd > breakStart) continue;
                }

                // Create datetime for this slot
                const slotDate = new Date(date);
                slotDate.setHours(Math.floor(slotStart / 60), slotStart % 60, 0, 0);
                const slotEndDate = new Date(date);
                slotEndDate.setHours(Math.floor(slotEnd / 60), slotEnd % 60, 0, 0);

                // Check for conflicts with existing appointments
                const hasConflict = existingAppointments.some(apt => {
                    return (slotDate < apt.endTime && slotEndDate > apt.startTime);
                });
                if (hasConflict) continue;

                // Add to suggestions
                suggestions.push({
                    date: dateStr,
                    dayOfWeek,
                    dayName: DAY_NAMES[dayOfWeek],
                    startTime: minutesToTime(slotStart),
                    endTime: minutesToTime(slotEnd),
                    startDateTime: slotDate.toISOString(),
                    endDateTime: slotEndDate.toISOString(),
                    score: calculateSlotScore(dayOffset, slotStart, input.preferredDays, input.preferredTimeRange),
                });

                if (suggestions.length >= input.maxSuggestions) break;
            }
        }

        // Sort by score (higher is better)
        suggestions.sort((a, b) => b.score - a.score);

        logger.info({
            event: 'optimal_slots_suggested',
            clinicianId: input.clinicianId,
            suggestionsCount: suggestions.length,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                clinicianId: input.clinicianId,
                clinicianName: `${clinician.firstName} ${clinician.lastName}`,
                specialty: clinician.specialty,
                appointmentDuration: input.appointmentDuration,
                daysAhead: input.daysAhead,
                suggestionsCount: suggestions.length,
                suggestions: suggestions.slice(0, input.maxSuggestions),
            },
        };
    } catch (error) {
        logger.error({ event: 'suggest_optimal_slots_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to suggest optimal slots',
            data: null,
        };
    }
}

// Helper function to calculate slot score for ranking
function calculateSlotScore(
    dayOffset: number,
    slotStartMinutes: number,
    preferredDays?: number[],
    preferredTimeRange?: { start?: string; end?: string }
): number {
    let score = 100;

    // Prefer sooner dates (subtract points for later days)
    score -= dayOffset * 2;

    // Prefer mid-morning and early afternoon slots
    const hour = Math.floor(slotStartMinutes / 60);
    if (hour >= 9 && hour <= 11) score += 10; // Morning sweet spot
    if (hour >= 14 && hour <= 16) score += 8; // Afternoon sweet spot

    // Bonus if matches preferred time range
    if (preferredTimeRange?.start && preferredTimeRange?.end) {
        const prefStart = timeToMinutes(preferredTimeRange.start);
        const prefEnd = timeToMinutes(preferredTimeRange.end);
        if (slotStartMinutes >= prefStart && slotStartMinutes <= prefEnd) {
            score += 15;
        }
    }

    return Math.max(0, score);
}

// =============================================================================
// TOOL DEFINITIONS
// =============================================================================

export const schedulingTools: MCPTool[] = [
    // Availability Operations
    {
        name: 'get_clinician_availability',
        description: 'Get availability schedule for a clinician. Returns configured working hours by day of week with break times and slot durations.',
        category: 'scheduling',
        inputSchema: GetClinicianAvailabilitySchema,
        requiredPermissions: ['patient:read'],
        handler: getClinicianAvailabilityHandler,
        examples: [
            {
                description: 'Get all availability for a clinician',
                input: { clinicianId: 'clin_123' },
            },
            {
                description: 'Get Monday availability only',
                input: { clinicianId: 'clin_123', dayOfWeek: 1 },
            },
        ],
    },
    {
        name: 'set_clinician_availability',
        description: 'Set or update availability schedule for a clinician on a specific day of week. Validates against conflicts.',
        category: 'scheduling',
        inputSchema: SetClinicianAvailabilitySchema,
        requiredPermissions: ['patient:write'],
        handler: setClinicianAvailabilityHandler,
        examples: [
            {
                description: 'Set Monday availability 9am-5pm with lunch break',
                input: {
                    clinicianId: 'clin_123',
                    dayOfWeek: 1,
                    startTime: '09:00',
                    endTime: '17:00',
                    breakStart: '12:00',
                    breakEnd: '13:00',
                    slotDuration: 30,
                },
            },
        ],
    },

    // Time-Off Operations
    {
        name: 'create_time_off',
        description: 'Create a time-off request for a clinician (vacation, sick leave, conference, etc.). Calculates affected appointments.',
        category: 'scheduling',
        inputSchema: CreateTimeOffSchema,
        requiredPermissions: ['patient:write'],
        handler: createTimeOffHandler,
        examples: [
            {
                description: 'Request vacation time',
                input: {
                    clinicianId: 'clin_123',
                    startDate: '2024-03-15',
                    endDate: '2024-03-22',
                    type: 'VACATION',
                    reason: 'Family vacation',
                },
            },
        ],
    },
    {
        name: 'get_time_off',
        description: 'Get time-off records for clinicians with optional filters by status, type, and date range.',
        category: 'scheduling',
        inputSchema: GetTimeOffSchema,
        requiredPermissions: ['patient:read'],
        handler: getTimeOffHandler,
        examples: [
            {
                description: 'Get all approved time-off for a clinician',
                input: { clinicianId: 'clin_123', status: 'APPROVED' },
            },
        ],
    },
    {
        name: 'delete_time_off',
        description: 'Cancel a time-off request. Cannot cancel already rejected requests.',
        category: 'scheduling',
        inputSchema: DeleteTimeOffSchema,
        requiredPermissions: ['patient:write'],
        handler: deleteTimeOffHandler,
    },

    // Waitlist Operations
    {
        name: 'add_to_waitlist',
        description: 'Add a patient to the appointment waitlist for a clinician. Tracks preferred dates/times and priority level.',
        category: 'scheduling',
        inputSchema: AddToWaitlistSchema,
        requiredPermissions: ['patient:write'],
        handler: addToWaitlistHandler,
        examples: [
            {
                description: 'Add patient to waitlist with high priority',
                input: {
                    patientId: 'pat_123',
                    clinicianId: 'clin_456',
                    priority: 'HIGH',
                    reason: 'Follow-up for concerning lab results',
                    appointmentType: 'IN_PERSON',
                },
            },
        ],
    },
    {
        name: 'get_waitlist',
        description: 'Get waitlist entries with filtering by clinician, patient, status, and priority. Returns queue positions and wait times.',
        category: 'scheduling',
        inputSchema: GetWaitlistSchema,
        requiredPermissions: ['patient:read'],
        handler: getWaitlistHandler,
        examples: [
            {
                description: 'Get urgent waitlist entries for a clinician',
                input: { clinicianId: 'clin_123', priority: 'URGENT', status: 'WAITING' },
            },
        ],
    },
    {
        name: 'remove_from_waitlist',
        description: 'Remove a patient from the waitlist. Cannot remove entries that have been converted to appointments.',
        category: 'scheduling',
        inputSchema: RemoveFromWaitlistSchema,
        requiredPermissions: ['patient:write'],
        handler: removeFromWaitlistHandler,
    },

    // Scheduling Intelligence
    {
        name: 'get_scheduling_conflicts',
        description: 'Check for scheduling conflicts in a date range including overlapping appointments and time-off blocks.',
        category: 'scheduling',
        inputSchema: GetSchedulingConflictsSchema,
        requiredPermissions: ['patient:read'],
        handler: getSchedulingConflictsHandler,
        examples: [
            {
                description: 'Check for conflicts in the next week',
                input: {
                    clinicianId: 'clin_123',
                    startDate: '2024-03-01',
                    endDate: '2024-03-07',
                    includeTimeOff: true,
                    includeAppointments: true,
                },
            },
        ],
    },
    {
        name: 'suggest_optimal_slots',
        description: 'AI-powered tool to suggest optimal appointment slots based on clinician availability, existing bookings, and patient preferences.',
        category: 'scheduling',
        inputSchema: SuggestOptimalSlotsSchema,
        requiredPermissions: ['patient:read'],
        handler: suggestOptimalSlotsHandler,
        examples: [
            {
                description: 'Suggest morning slots for a 30-minute appointment',
                input: {
                    clinicianId: 'clin_123',
                    appointmentDuration: 30,
                    preferredDays: [1, 2, 3, 4, 5], // Weekdays only
                    preferredTimeRange: { start: '09:00', end: '12:00' },
                    daysAhead: 14,
                    maxSuggestions: 5,
                },
            },
        ],
    },
];

// =============================================================================
// EXPORTS
// =============================================================================

export const SCHEDULING_TOOL_COUNT = schedulingTools.length;
