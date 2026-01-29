/**
 * MCP Calendar Tools - Provider availability and day view management
 *
 * Tools for calendar and scheduling operations:
 * - get_provider_availability: Get detailed availability for a provider
 * - block_slot: Block a time slot (e.g., for meetings, breaks, vacation)
 * - swap_appointments: Swap time slots between two appointments
 * - get_day_view: Get comprehensive day view for a provider
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { MCPContext, MCPResult, MCPTool } from '../types';

// =============================================================================
// SCHEMAS
// =============================================================================

const GetProviderAvailabilitySchema = z.object({
    clinicianId: z.string().describe('The clinician/provider ID'),
    startDate: z.string().describe('Start date for availability window (ISO 8601)'),
    endDate: z.string().describe('End date for availability window (ISO 8601)'),
    slotDuration: z.number().min(5).max(120).default(30).describe('Slot duration in minutes'),
    excludeWeekends: z.boolean().default(true).describe('Exclude Saturday and Sunday'),
    workingHoursStart: z.number().min(0).max(23).default(8).describe('Working hours start (24h format)'),
    workingHoursEnd: z.number().min(0).max(23).default(18).describe('Working hours end (24h format)'),
    appointmentType: z.string().optional().describe('Filter by appointment type capability'),
});

const BlockSlotSchema = z.object({
    clinicianId: z.string().describe('The clinician/provider ID'),
    startTime: z.string().describe('Block start time (ISO 8601)'),
    endTime: z.string().describe('Block end time (ISO 8601)'),
    reason: z.enum(['MEETING', 'BREAK', 'LUNCH', 'VACATION', 'SICK', 'ADMINISTRATIVE', 'OTHER']).describe('Reason for blocking'),
    notes: z.string().optional().describe('Additional notes about the block'),
    recurring: z.boolean().default(false).describe('Is this a recurring block?'),
    recurringPattern: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional().describe('Recurrence pattern if recurring'),
    recurringEndDate: z.string().optional().describe('End date for recurring blocks (ISO 8601)'),
});

const SwapAppointmentsSchema = z.object({
    appointmentIdA: z.string().describe('First appointment ID'),
    appointmentIdB: z.string().describe('Second appointment ID'),
    reason: z.string().optional().describe('Reason for swap'),
    notifyPatients: z.boolean().default(true).describe('Send notifications to affected patients'),
});

const GetDayViewSchema = z.object({
    clinicianId: z.string().describe('The clinician/provider ID'),
    date: z.string().describe('The date to view (ISO 8601 date)'),
    includePatientDetails: z.boolean().default(true).describe('Include patient details in appointments'),
    includeBlocks: z.boolean().default(true).describe('Include blocked time slots'),
    includeStats: z.boolean().default(true).describe('Include day statistics'),
});

// =============================================================================
// HANDLERS
// =============================================================================

async function getProviderAvailabilityHandler(input: z.infer<typeof GetProviderAvailabilitySchema>, context: MCPContext): Promise<MCPResult> {
    try {
        const startDate = new Date(input.startDate);
        const endDate = new Date(input.endDate);

        // Get all appointments in the date range
        const appointments = await prisma.appointment.findMany({
            where: {
                clinicianId: input.clinicianId,
                startTime: { gte: startDate, lte: endDate },
                status: { notIn: ['CANCELLED', 'NO_SHOW'] },
            },
            select: {
                id: true,
                startTime: true,
                endTime: true,
                type: true,
                status: true,
            },
            orderBy: { startTime: 'asc' },
        });

        // Get blocked time slots (using a virtual approach - check for appointments marked as blocks)
        // In a full implementation, this would query a separate TimeBlock model
        const blockedSlots = await prisma.appointment.findMany({
            where: {
                clinicianId: input.clinicianId,
                startTime: { gte: startDate, lte: endDate },
                type: 'IN_PERSON', // Placeholder - in production, would have a BLOCK type
                notes: { contains: '[BLOCKED]' },
            },
            select: {
                id: true,
                startTime: true,
                endTime: true,
                notes: true,
            },
        });

        // Generate availability grid
        const availabilityByDate: Record<string, {
            date: string;
            dayOfWeek: number;
            isWeekend: boolean;
            slots: Array<{
                startTime: string;
                endTime: string;
                isAvailable: boolean;
                isBlocked: boolean;
                appointmentId?: string;
                blockReason?: string;
            }>;
            totalSlots: number;
            availableSlots: number;
            bookedSlots: number;
            blockedSlots: number;
        }> = {};

        const slotMs = input.slotDuration * 60 * 1000;
        const current = new Date(startDate);

        while (current <= endDate) {
            const dateKey = current.toISOString().split('T')[0];
            const dayOfWeek = current.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            // Skip weekends if requested
            if (input.excludeWeekends && isWeekend) {
                current.setDate(current.getDate() + 1);
                continue;
            }

            const dayStart = new Date(current);
            dayStart.setHours(input.workingHoursStart, 0, 0, 0);
            const dayEnd = new Date(current);
            dayEnd.setHours(input.workingHoursEnd, 0, 0, 0);

            const slots: typeof availabilityByDate[string]['slots'] = [];

            for (let time = dayStart.getTime(); time < dayEnd.getTime(); time += slotMs) {
                const slotStart = new Date(time);
                const slotEnd = new Date(time + slotMs);

                // Check if slot overlaps with any appointment
                const overlappingAppointment = appointments.find(apt => {
                    const aptStart = apt.startTime.getTime();
                    const aptEnd = apt.endTime.getTime();
                    return (
                        (slotStart.getTime() >= aptStart && slotStart.getTime() < aptEnd) ||
                        (slotEnd.getTime() > aptStart && slotEnd.getTime() <= aptEnd) ||
                        (slotStart.getTime() <= aptStart && slotEnd.getTime() >= aptEnd)
                    );
                });

                // Check if slot is blocked
                const overlappingBlock = blockedSlots.find(block => {
                    const blockStart = block.startTime.getTime();
                    const blockEnd = block.endTime.getTime();
                    return (
                        (slotStart.getTime() >= blockStart && slotStart.getTime() < blockEnd) ||
                        (slotEnd.getTime() > blockStart && slotEnd.getTime() <= blockEnd)
                    );
                });

                slots.push({
                    startTime: slotStart.toISOString(),
                    endTime: slotEnd.toISOString(),
                    isAvailable: !overlappingAppointment && !overlappingBlock,
                    isBlocked: !!overlappingBlock,
                    appointmentId: overlappingAppointment?.id,
                    blockReason: overlappingBlock?.notes?.replace('[BLOCKED]', '').trim(),
                });
            }

            availabilityByDate[dateKey] = {
                date: dateKey,
                dayOfWeek,
                isWeekend,
                slots,
                totalSlots: slots.length,
                availableSlots: slots.filter(s => s.isAvailable).length,
                bookedSlots: slots.filter(s => s.appointmentId).length,
                blockedSlots: slots.filter(s => s.isBlocked).length,
            };

            current.setDate(current.getDate() + 1);
        }

        const days = Object.values(availabilityByDate);
        const totalAvailable = days.reduce((sum, d) => sum + d.availableSlots, 0);
        const totalBooked = days.reduce((sum, d) => sum + d.bookedSlots, 0);

        logger.info({
            event: 'provider_availability_retrieved',
            clinicianId: input.clinicianId,
            dateRange: { start: input.startDate, end: input.endDate },
            totalDays: days.length,
            totalAvailable,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                clinicianId: input.clinicianId,
                dateRange: {
                    start: input.startDate,
                    end: input.endDate,
                },
                workingHours: {
                    start: input.workingHoursStart,
                    end: input.workingHoursEnd,
                },
                slotDuration: input.slotDuration,
                summary: {
                    totalDays: days.length,
                    totalSlots: days.reduce((sum, d) => sum + d.totalSlots, 0),
                    availableSlots: totalAvailable,
                    bookedSlots: totalBooked,
                    blockedSlots: days.reduce((sum, d) => sum + d.blockedSlots, 0),
                    utilizationRate: totalBooked / (totalAvailable + totalBooked) || 0,
                },
                availability: days,
            },
        };
    } catch (error) {
        logger.error({ event: 'get_provider_availability_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get provider availability',
            data: null,
        };
    }
}

async function blockSlotHandler(input: z.infer<typeof BlockSlotSchema>, context: MCPContext): Promise<MCPResult> {
    try {
        const startTime = new Date(input.startTime);
        const endTime = new Date(input.endTime);

        // Verify no existing appointments in this time slot
        const conflicting = await prisma.appointment.findFirst({
            where: {
                clinicianId: input.clinicianId,
                status: { notIn: ['CANCELLED', 'NO_SHOW', 'RESCHEDULED'] },
                OR: [
                    { startTime: { lte: startTime }, endTime: { gt: startTime } },
                    { startTime: { lt: endTime }, endTime: { gte: endTime } },
                    { startTime: { gte: startTime }, endTime: { lte: endTime } },
                ],
            },
        });

        if (conflicting) {
            return {
                success: false,
                error: `Time slot conflicts with existing appointment ${conflicting.id} (${conflicting.startTime.toISOString()} - ${conflicting.endTime.toISOString()})`,
                data: null,
            };
        }

        // Create a block appointment (in production, this would be a separate TimeBlock model)
        const block = await prisma.appointment.create({
            data: {
                clinicianId: input.clinicianId,
                patientId: context.clinicianId, // Self-reference for blocks
                title: `Blocked: ${input.reason}`,
                description: input.notes || `Time blocked for ${input.reason.toLowerCase()}`,
                notes: `[BLOCKED] ${input.reason}${input.notes ? ` - ${input.notes}` : ''}`,
                startTime,
                endTime,
                type: 'IN_PERSON',
                status: 'CONFIRMED',
                confirmationStatus: 'CONFIRMED',
            },
        });

        // Handle recurring blocks
        const createdBlocks = [block];
        if (input.recurring && input.recurringPattern && input.recurringEndDate) {
            const recurringEndDate = new Date(input.recurringEndDate);
            const currentStart = new Date(startTime);
            const currentEnd = new Date(endTime);

            const increment = input.recurringPattern === 'DAILY' ? 1 :
                             input.recurringPattern === 'WEEKLY' ? 7 : 30;

            while (currentStart < recurringEndDate) {
                currentStart.setDate(currentStart.getDate() + increment);
                currentEnd.setDate(currentEnd.getDate() + increment);

                if (currentStart >= recurringEndDate) break;

                const recurringBlock = await prisma.appointment.create({
                    data: {
                        clinicianId: input.clinicianId,
                        patientId: context.clinicianId,
                        title: `Blocked: ${input.reason}`,
                        description: input.notes || `Time blocked for ${input.reason.toLowerCase()}`,
                        notes: `[BLOCKED] ${input.reason}${input.notes ? ` - ${input.notes}` : ''} (recurring)`,
                        startTime: new Date(currentStart),
                        endTime: new Date(currentEnd),
                        type: 'IN_PERSON',
                        status: 'CONFIRMED',
                        confirmationStatus: 'CONFIRMED',
                    },
                });
                createdBlocks.push(recurringBlock);
            }
        }

        logger.info({
            event: 'time_slot_blocked',
            clinicianId: input.clinicianId,
            blockId: block.id,
            reason: input.reason,
            recurring: input.recurring,
            totalBlocks: createdBlocks.length,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                blockId: block.id,
                clinicianId: input.clinicianId,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                reason: input.reason,
                notes: input.notes,
                recurring: input.recurring,
                recurringPattern: input.recurringPattern,
                totalBlocksCreated: createdBlocks.length,
                blocks: createdBlocks.map(b => ({
                    id: b.id,
                    startTime: b.startTime.toISOString(),
                    endTime: b.endTime.toISOString(),
                })),
                message: `Time slot blocked successfully${input.recurring ? ` (${createdBlocks.length} recurring blocks created)` : ''}`,
            },
        };
    } catch (error) {
        logger.error({ event: 'block_slot_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to block time slot',
            data: null,
        };
    }
}

async function swapAppointmentsHandler(input: z.infer<typeof SwapAppointmentsSchema>, context: MCPContext): Promise<MCPResult> {
    try {
        // Get both appointments
        const [appointmentA, appointmentB] = await Promise.all([
            prisma.appointment.findUnique({
                where: { id: input.appointmentIdA },
                include: { patient: { select: { id: true, firstName: true, lastName: true } } },
            }),
            prisma.appointment.findUnique({
                where: { id: input.appointmentIdB },
                include: { patient: { select: { id: true, firstName: true, lastName: true } } },
            }),
        ]);

        if (!appointmentA) {
            return { success: false, error: `Appointment A not found: ${input.appointmentIdA}`, data: null };
        }
        if (!appointmentB) {
            return { success: false, error: `Appointment B not found: ${input.appointmentIdB}`, data: null };
        }

        // Verify both appointments are for the same clinician
        if (appointmentA.clinicianId !== appointmentB.clinicianId) {
            return {
                success: false,
                error: 'Cannot swap appointments between different clinicians',
                data: null,
            };
        }

        // Swap the times using a transaction
        const [updatedA, updatedB] = await prisma.$transaction([
            prisma.appointment.update({
                where: { id: input.appointmentIdA },
                data: {
                    startTime: appointmentB.startTime,
                    endTime: appointmentB.endTime,
                    notes: `${appointmentA.notes || ''}\n[SWAPPED with ${input.appointmentIdB} on ${new Date().toISOString()}${input.reason ? `: ${input.reason}` : ''}]`.trim(),
                },
            }),
            prisma.appointment.update({
                where: { id: input.appointmentIdB },
                data: {
                    startTime: appointmentA.startTime,
                    endTime: appointmentA.endTime,
                    notes: `${appointmentB.notes || ''}\n[SWAPPED with ${input.appointmentIdA} on ${new Date().toISOString()}${input.reason ? `: ${input.reason}` : ''}]`.trim(),
                },
            }),
        ]);

        // Create notifications if requested
        if (input.notifyPatients) {
            await Promise.all([
                prisma.notification.create({
                    data: {
                        recipientId: appointmentA.patientId,
                        recipientType: 'PATIENT',
                        type: 'APPOINTMENT_RESCHEDULED',
                        title: 'Appointment Time Changed',
                        message: `Your appointment has been moved to ${updatedA.startTime.toLocaleString()}.`,
                        priority: 'NORMAL',
                        resourceType: 'Appointment',
                        resourceId: updatedA.id,
                    },
                }),
                prisma.notification.create({
                    data: {
                        recipientId: appointmentB.patientId,
                        recipientType: 'PATIENT',
                        type: 'APPOINTMENT_RESCHEDULED',
                        title: 'Appointment Time Changed',
                        message: `Your appointment has been moved to ${updatedB.startTime.toLocaleString()}.`,
                        priority: 'NORMAL',
                        resourceType: 'Appointment',
                        resourceId: updatedB.id,
                    },
                }),
            ]);
        }

        logger.info({
            event: 'appointments_swapped',
            appointmentIdA: input.appointmentIdA,
            appointmentIdB: input.appointmentIdB,
            reason: input.reason,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                appointmentA: {
                    id: updatedA.id,
                    patientName: `${appointmentA.patient.firstName} ${appointmentA.patient.lastName}`,
                    previousTime: appointmentA.startTime.toISOString(),
                    newTime: updatedA.startTime.toISOString(),
                },
                appointmentB: {
                    id: updatedB.id,
                    patientName: `${appointmentB.patient.firstName} ${appointmentB.patient.lastName}`,
                    previousTime: appointmentB.startTime.toISOString(),
                    newTime: updatedB.startTime.toISOString(),
                },
                reason: input.reason,
                patientsNotified: input.notifyPatients,
                swappedAt: new Date().toISOString(),
                message: 'Appointments swapped successfully',
            },
        };
    } catch (error) {
        logger.error({ event: 'swap_appointments_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to swap appointments',
            data: null,
        };
    }
}

async function getDayViewHandler(input: z.infer<typeof GetDayViewSchema>, context: MCPContext): Promise<MCPResult> {
    try {
        const targetDate = new Date(input.date);
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        // Get clinician info
        const clinician = await prisma.user.findUnique({
            where: { id: input.clinicianId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                specialty: true,
            },
        });

        if (!clinician) {
            return { success: false, error: `Clinician not found: ${input.clinicianId}`, data: null };
        }

        // Get all appointments for the day
        const appointments = await prisma.appointment.findMany({
            where: {
                clinicianId: input.clinicianId,
                startTime: { gte: startOfDay, lte: endOfDay },
            },
            include: input.includePatientDetails ? {
                patient: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        dateOfBirth: true,
                    },
                },
            } : undefined,
            orderBy: { startTime: 'asc' },
        });

        // Separate blocks from regular appointments
        const regularAppointments = appointments.filter(a => !a.notes?.includes('[BLOCKED]'));
        const blockedSlots = input.includeBlocks
            ? appointments.filter(a => a.notes?.includes('[BLOCKED]'))
            : [];

        // Calculate statistics
        const stats = input.includeStats ? {
            totalAppointments: regularAppointments.length,
            byStatus: {
                scheduled: regularAppointments.filter(a => a.status === 'SCHEDULED').length,
                confirmed: regularAppointments.filter(a => a.status === 'CONFIRMED').length,
                checkedIn: regularAppointments.filter(a => a.status === 'CHECKED_IN').length,
                inProgress: regularAppointments.filter(a => a.status === 'IN_PROGRESS').length,
                completed: regularAppointments.filter(a => a.status === 'COMPLETED').length,
                cancelled: regularAppointments.filter(a => a.status === 'CANCELLED').length,
                noShow: regularAppointments.filter(a => a.status === 'NO_SHOW').length,
            },
            byType: {
                inPerson: regularAppointments.filter(a => a.type === 'IN_PERSON').length,
                telehealth: regularAppointments.filter(a => a.type === 'TELEHEALTH').length,
                phone: regularAppointments.filter(a => a.type === 'PHONE').length,
                homeVisit: regularAppointments.filter(a => a.type === 'HOME_VISIT').length,
            },
            blockedSlots: blockedSlots.length,
            firstAppointment: regularAppointments[0]?.startTime.toISOString(),
            lastAppointment: regularAppointments[regularAppointments.length - 1]?.endTime.toISOString(),
        } : null;

        logger.info({
            event: 'day_view_retrieved',
            clinicianId: input.clinicianId,
            date: input.date,
            appointmentCount: regularAppointments.length,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                clinician: {
                    id: clinician.id,
                    name: `${clinician.firstName} ${clinician.lastName}`,
                    specialty: clinician.specialty,
                },
                date: input.date,
                dayOfWeek: targetDate.toLocaleDateString('en-US', { weekday: 'long' }),
                appointments: regularAppointments.map(apt => {
                    const patient = (apt as any).patient;
                    return {
                        appointmentId: apt.id,
                        title: apt.title,
                        startTime: apt.startTime.toISOString(),
                        endTime: apt.endTime.toISOString(),
                        durationMinutes: Math.round((apt.endTime.getTime() - apt.startTime.getTime()) / 60000),
                        type: apt.type,
                        status: apt.status,
                        confirmationStatus: apt.confirmationStatus,
                        meetingUrl: apt.meetingUrl,
                        branch: apt.branch,
                        patient: input.includePatientDetails && patient ? {
                            id: patient.id,
                            name: `${patient.firstName} ${patient.lastName}`,
                            phone: patient.phone,
                            age: patient.dateOfBirth
                                ? Math.floor((Date.now() - patient.dateOfBirth.getTime()) / 31557600000)
                                : null,
                        } : undefined,
                        patientNotes: apt.patientNotes,
                        waitingRoomCheckedInAt: apt.waitingRoomCheckedInAt?.toISOString(),
                    };
                }),
                blockedSlots: blockedSlots.map(block => ({
                    id: block.id,
                    startTime: block.startTime.toISOString(),
                    endTime: block.endTime.toISOString(),
                    reason: block.notes?.replace('[BLOCKED]', '').trim(),
                })),
                stats,
            },
        };
    } catch (error) {
        logger.error({ event: 'get_day_view_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get day view',
            data: null,
        };
    }
}

// =============================================================================
// TOOL DEFINITIONS
// =============================================================================

export const calendarTools: MCPTool[] = [
    {
        name: 'get_provider_availability',
        description: 'Get detailed availability for a provider over a date range. Returns all time slots with booking status, blocks, and utilization metrics.',
        category: 'scheduling',
        inputSchema: GetProviderAvailabilitySchema,
        requiredPermissions: ['patient:read'],
        handler: getProviderAvailabilityHandler,
    },
    {
        name: 'block_slot',
        description: 'Block a time slot on a provider\'s calendar (for meetings, breaks, vacation, etc). Supports recurring blocks.',
        category: 'scheduling',
        inputSchema: BlockSlotSchema,
        requiredPermissions: ['patient:write'],
        handler: blockSlotHandler,
    },
    {
        name: 'swap_appointments',
        description: 'Swap time slots between two appointments for the same clinician. Optionally notifies affected patients.',
        category: 'scheduling',
        inputSchema: SwapAppointmentsSchema,
        requiredPermissions: ['patient:write'],
        handler: swapAppointmentsHandler,
    },
    {
        name: 'get_day_view',
        description: 'Get comprehensive day view for a provider including all appointments, blocked slots, and statistics.',
        category: 'scheduling',
        inputSchema: GetDayViewSchema,
        requiredPermissions: ['patient:read'],
        handler: getDayViewHandler,
    },
];

export const CALENDAR_TOOL_COUNT = calendarTools.length;
