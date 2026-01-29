/**
 * MCP Appointment Tools
 *
 * Full CRUD operations with real Prisma queries for appointment management.
 *
 * CRUD Operations:
 * - create_appointment: Create new appointment in database
 * - get_appointment: Get single appointment by ID
 * - list_appointments: List appointments with filters
 * - update_appointment: Update appointment fields
 * - delete_appointment: Soft delete (cancel) or hard delete appointment
 *
 * Scheduling Operations:
 * - get_available_slots: Query real booked appointments to find openings
 * - reschedule_appointment: Change appointment time with audit trail
 * - cancel_appointment: Cancel with reason (soft delete)
 *
 * Query Operations:
 * - get_patient_appointments: Upcoming appointments for a patient
 * - get_clinician_appointments: Today's appointments for a clinician
 * - get_clinician_schedule: Clinician availability for a date range
 *
 * Communication:
 * - send_appointment_reminder: Create notification for patient
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { MCPContext, MCPResult, MCPTool } from '../types';

// =============================================================================
// ENUMS MATCHING PRISMA SCHEMA
// =============================================================================

const AppointmentTypeEnum = z.enum(['IN_PERSON', 'TELEHEALTH', 'PHONE', 'HOME_VISIT']);
const AppointmentStatusEnum = z.enum([
    'SCHEDULED',
    'CONFIRMED',
    'CHECKED_IN',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'NO_SHOW',
    'RESCHEDULED',
]);
const ConfirmationStatusEnum = z.enum([
    'PENDING',
    'SENT',
    'CONFIRMED',
    'RESCHEDULE_REQUESTED',
    'CANCELLED_BY_PATIENT',
    'NO_RESPONSE',
]);

// =============================================================================
// SCHEMAS
// =============================================================================

const CreateAppointmentSchema = z.object({
    patientId: z.string().describe('The patient UUID'),
    clinicianId: z.string().describe('The clinician UUID'),
    title: z.string().describe('Appointment title (e.g., "Follow-up consultation")'),
    description: z.string().optional().describe('Detailed description'),
    notes: z.string().optional().describe('Internal notes'),
    startTime: z.string().describe('Start time (ISO 8601)'),
    endTime: z.string().describe('End time (ISO 8601)'),
    timezone: z.string().default('America/Mexico_City').describe('Timezone'),
    type: AppointmentTypeEnum.default('IN_PERSON').describe('Appointment type'),
    meetingUrl: z.string().optional().describe('Meeting URL for telehealth'),
    branch: z.string().optional().describe('Branch/location name'),
    branchAddress: z.string().optional().describe('Branch address'),
    patientNotes: z.string().optional().describe('Notes from patient'),
});

const GetAppointmentSchema = z.object({
    appointmentId: z.string().describe('The appointment ID'),
});

const ListAppointmentsSchema = z.object({
    patientId: z.string().optional().describe('Filter by patient ID'),
    clinicianId: z.string().optional().describe('Filter by clinician ID'),
    status: AppointmentStatusEnum.optional().describe('Filter by status'),
    type: AppointmentTypeEnum.optional().describe('Filter by type'),
    startDate: z.string().optional().describe('Filter appointments starting after this date (ISO 8601)'),
    endDate: z.string().optional().describe('Filter appointments starting before this date (ISO 8601)'),
    limit: z.number().min(1).max(100).default(20).describe('Maximum results'),
    offset: z.number().min(0).default(0).describe('Offset for pagination'),
});

const UpdateAppointmentSchema = z.object({
    appointmentId: z.string().describe('The appointment ID to update'),
    title: z.string().optional().describe('Updated title'),
    description: z.string().optional().describe('Updated description'),
    notes: z.string().optional().describe('Updated notes'),
    startTime: z.string().optional().describe('New start time (ISO 8601)'),
    endTime: z.string().optional().describe('New end time (ISO 8601)'),
    status: AppointmentStatusEnum.optional().describe('Updated status'),
    type: AppointmentTypeEnum.optional().describe('Updated type'),
    meetingUrl: z.string().optional().describe('Updated meeting URL'),
    branch: z.string().optional().describe('Updated branch'),
    branchAddress: z.string().optional().describe('Updated branch address'),
    patientNotes: z.string().optional().describe('Updated patient notes'),
    confirmationStatus: ConfirmationStatusEnum.optional().describe('Updated confirmation status'),
});

const DeleteAppointmentSchema = z.object({
    appointmentId: z.string().describe('The appointment ID to delete'),
    reason: z.string().describe('Reason for deletion'),
    hardDelete: z.boolean().default(false).describe('If true, permanently delete. If false, cancel.'),
});

const GetAvailableSlotsSchema = z.object({
    clinicianId: z.string().describe('Clinician UUID to check availability for'),
    date: z.string().describe('Date to check (ISO 8601 date, e.g., 2024-01-15)'),
    slotDuration: z.number().default(30).describe('Slot duration in minutes'),
    startHour: z.number().default(8).describe('Working day start hour (0-23)'),
    endHour: z.number().default(18).describe('Working day end hour (0-23)'),
});

const RescheduleAppointmentSchema = z.object({
    appointmentId: z.string().describe('The appointment ID to reschedule'),
    newStartTime: z.string().describe('New start time (ISO 8601)'),
    newEndTime: z.string().describe('New end time (ISO 8601)'),
    reason: z.string().optional().describe('Reason for rescheduling'),
    notifyPatient: z.boolean().default(true).describe('Send notification to patient'),
});

const CancelAppointmentSchema = z.object({
    appointmentId: z.string().describe('The appointment ID to cancel'),
    reason: z.string().describe('Reason for cancellation'),
    cancelledBy: z.enum(['CLINICIAN', 'PATIENT', 'SYSTEM']).default('CLINICIAN').describe('Who cancelled'),
    notifyPatient: z.boolean().default(true).describe('Send notification to patient'),
});

const GetPatientAppointmentsSchema = z.object({
    patientId: z.string().describe('The patient UUID'),
    upcoming: z.boolean().default(true).describe('Only future appointments'),
    status: AppointmentStatusEnum.optional().describe('Filter by status'),
    limit: z.number().min(1).max(50).default(10).describe('Maximum results'),
});

const GetClinicianAppointmentsSchema = z.object({
    clinicianId: z.string().describe('The clinician UUID'),
    date: z.string().optional().describe('Specific date (ISO 8601). Defaults to today.'),
    status: AppointmentStatusEnum.optional().describe('Filter by status'),
    limit: z.number().min(1).max(100).default(50).describe('Maximum results'),
});

const GetClinicianScheduleSchema = z.object({
    clinicianId: z.string().describe('Clinician UUID'),
    startDate: z.string().describe('Start date (ISO 8601)'),
    endDate: z.string().describe('End date (ISO 8601)'),
});

const SendAppointmentReminderSchema = z.object({
    appointmentId: z.string().describe('The appointment ID'),
    patientId: z.string().describe('The patient UUID'),
    channel: z.enum(['email', 'sms', 'push', 'whatsapp', 'all']).default('all').describe('Notification channel(s)'),
    customMessage: z.string().optional().describe('Optional custom message to include'),
});

// =============================================================================
// HANDLERS
// =============================================================================

// CREATE
async function createAppointmentHandler(input: z.infer<typeof CreateAppointmentSchema>, context: MCPContext): Promise<MCPResult> {
    try {
        // Verify patient exists
        const patient = await prisma.patient.findUnique({
            where: { id: input.patientId },
            select: { id: true, firstName: true, lastName: true },
        });

        if (!patient) {
            return { success: false, error: `Patient not found: ${input.patientId}`, data: null };
        }

        // Verify clinician exists
        const clinician = await prisma.user.findUnique({
            where: { id: input.clinicianId },
            select: { id: true, firstName: true, lastName: true },
        });

        if (!clinician) {
            return { success: false, error: `Clinician not found: ${input.clinicianId}`, data: null };
        }

        const startTime = new Date(input.startTime);
        const endTime = new Date(input.endTime);

        // Check for overlapping appointments
        const overlapping = await prisma.appointment.findFirst({
            where: {
                clinicianId: input.clinicianId,
                status: { notIn: ['CANCELLED', 'NO_SHOW', 'RESCHEDULED'] },
                OR: [
                    {
                        startTime: { lte: startTime },
                        endTime: { gt: startTime },
                    },
                    {
                        startTime: { lt: endTime },
                        endTime: { gte: endTime },
                    },
                    {
                        startTime: { gte: startTime },
                        endTime: { lte: endTime },
                    },
                ],
            },
        });

        if (overlapping) {
            return {
                success: false,
                error: `Time slot conflicts with existing appointment ${overlapping.id} (${overlapping.startTime.toISOString()} - ${overlapping.endTime.toISOString()})`,
                data: null,
            };
        }

        // Create appointment
        const appointment = await prisma.appointment.create({
            data: {
                patientId: input.patientId,
                clinicianId: input.clinicianId,
                title: input.title,
                description: input.description,
                notes: input.notes,
                startTime,
                endTime,
                timezone: input.timezone,
                type: input.type,
                meetingUrl: input.meetingUrl,
                branch: input.branch,
                branchAddress: input.branchAddress,
                patientNotes: input.patientNotes,
                status: 'SCHEDULED',
                confirmationStatus: 'PENDING',
            },
            include: {
                patient: { select: { id: true, firstName: true, lastName: true } },
                clinician: { select: { id: true, firstName: true, lastName: true } },
            },
        });

        logger.info({
            event: 'appointment_created',
            appointmentId: appointment.id,
            patientId: input.patientId,
            clinicianId: input.clinicianId,
            startTime: appointment.startTime.toISOString(),
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                appointmentId: appointment.id,
                patientId: appointment.patientId,
                patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
                clinicianId: appointment.clinicianId,
                clinicianName: `${appointment.clinician.firstName} ${appointment.clinician.lastName}`,
                title: appointment.title,
                startTime: appointment.startTime.toISOString(),
                endTime: appointment.endTime.toISOString(),
                type: appointment.type,
                status: appointment.status,
                confirmationStatus: appointment.confirmationStatus,
                createdAt: appointment.createdAt.toISOString(),
            },
        };
    } catch (error) {
        logger.error({ event: 'create_appointment_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create appointment',
            data: null,
        };
    }
}

// READ (single)
async function getAppointmentHandler(input: z.infer<typeof GetAppointmentSchema>, context: MCPContext): Promise<MCPResult> {
    try {
        const appointment = await prisma.appointment.findUnique({
            where: { id: input.appointmentId },
            include: {
                patient: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
                clinician: { select: { id: true, firstName: true, lastName: true, specialty: true } },
            },
        });

        if (!appointment) {
            return { success: false, error: `Appointment not found: ${input.appointmentId}`, data: null };
        }

        return {
            success: true,
            data: {
                appointmentId: appointment.id,
                patient: {
                    id: appointment.patient.id,
                    name: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
                    email: appointment.patient.email,
                    phone: appointment.patient.phone,
                },
                clinician: {
                    id: appointment.clinician.id,
                    name: `${appointment.clinician.firstName} ${appointment.clinician.lastName}`,
                    specialty: appointment.clinician.specialty,
                },
                title: appointment.title,
                description: appointment.description,
                notes: appointment.notes,
                startTime: appointment.startTime.toISOString(),
                endTime: appointment.endTime.toISOString(),
                timezone: appointment.timezone,
                type: appointment.type,
                meetingUrl: appointment.meetingUrl,
                status: appointment.status,
                confirmationStatus: appointment.confirmationStatus,
                branch: appointment.branch,
                branchAddress: appointment.branchAddress,
                patientNotes: appointment.patientNotes,
                reminderSent: appointment.reminderSent,
                reminderSentAt: appointment.reminderSentAt?.toISOString(),
                confirmedAt: appointment.confirmedAt?.toISOString(),
                reschedule: {
                    requested: appointment.rescheduleRequested,
                    requestedAt: appointment.rescheduleRequestedAt?.toISOString(),
                    reason: appointment.rescheduleReason,
                    newTime: appointment.rescheduleNewTime?.toISOString(),
                    approved: appointment.rescheduleApproved,
                },
                createdAt: appointment.createdAt.toISOString(),
                updatedAt: appointment.updatedAt.toISOString(),
            },
        };
    } catch (error) {
        logger.error({ event: 'get_appointment_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get appointment',
            data: null,
        };
    }
}

// LIST
async function listAppointmentsHandler(input: z.infer<typeof ListAppointmentsSchema>, context: MCPContext): Promise<MCPResult> {
    try {
        const where: any = {};

        if (input.patientId) where.patientId = input.patientId;
        if (input.clinicianId) where.clinicianId = input.clinicianId;
        if (input.status) where.status = input.status;
        if (input.type) where.type = input.type;

        if (input.startDate || input.endDate) {
            where.startTime = {};
            if (input.startDate) where.startTime.gte = new Date(input.startDate);
            if (input.endDate) where.startTime.lte = new Date(input.endDate);
        }

        const [appointments, total] = await Promise.all([
            prisma.appointment.findMany({
                where,
                include: {
                    patient: { select: { id: true, firstName: true, lastName: true } },
                    clinician: { select: { id: true, firstName: true, lastName: true } },
                },
                orderBy: { startTime: 'asc' },
                take: input.limit,
                skip: input.offset,
            }),
            prisma.appointment.count({ where }),
        ]);

        return {
            success: true,
            data: {
                appointments: appointments.map(apt => ({
                    appointmentId: apt.id,
                    patientId: apt.patientId,
                    patientName: `${apt.patient.firstName} ${apt.patient.lastName}`,
                    clinicianId: apt.clinicianId,
                    clinicianName: `${apt.clinician.firstName} ${apt.clinician.lastName}`,
                    title: apt.title,
                    startTime: apt.startTime.toISOString(),
                    endTime: apt.endTime.toISOString(),
                    type: apt.type,
                    status: apt.status,
                    confirmationStatus: apt.confirmationStatus,
                })),
                pagination: {
                    total,
                    limit: input.limit,
                    offset: input.offset,
                    hasMore: input.offset + appointments.length < total,
                },
            },
        };
    } catch (error) {
        logger.error({ event: 'list_appointments_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to list appointments',
            data: null,
        };
    }
}

// UPDATE
async function updateAppointmentHandler(input: z.infer<typeof UpdateAppointmentSchema>, context: MCPContext): Promise<MCPResult> {
    try {
        // Verify appointment exists
        const existing = await prisma.appointment.findUnique({
            where: { id: input.appointmentId },
        });

        if (!existing) {
            return { success: false, error: `Appointment not found: ${input.appointmentId}`, data: null };
        }

        // Build update data
        const updateData: any = {};

        if (input.title !== undefined) updateData.title = input.title;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.notes !== undefined) updateData.notes = input.notes;
        if (input.startTime !== undefined) updateData.startTime = new Date(input.startTime);
        if (input.endTime !== undefined) updateData.endTime = new Date(input.endTime);
        if (input.status !== undefined) updateData.status = input.status;
        if (input.type !== undefined) updateData.type = input.type;
        if (input.meetingUrl !== undefined) updateData.meetingUrl = input.meetingUrl;
        if (input.branch !== undefined) updateData.branch = input.branch;
        if (input.branchAddress !== undefined) updateData.branchAddress = input.branchAddress;
        if (input.patientNotes !== undefined) updateData.patientNotes = input.patientNotes;
        if (input.confirmationStatus !== undefined) {
            updateData.confirmationStatus = input.confirmationStatus;
            if (input.confirmationStatus === 'CONFIRMED') {
                updateData.confirmedAt = new Date();
            }
        }

        if (Object.keys(updateData).length === 0) {
            return { success: false, error: 'No update fields provided', data: null };
        }

        // Check for time conflicts if time is being changed
        if (updateData.startTime || updateData.endTime) {
            const startTime = updateData.startTime || existing.startTime;
            const endTime = updateData.endTime || existing.endTime;

            const overlapping = await prisma.appointment.findFirst({
                where: {
                    id: { not: input.appointmentId },
                    clinicianId: existing.clinicianId,
                    status: { notIn: ['CANCELLED', 'NO_SHOW', 'RESCHEDULED'] },
                    OR: [
                        { startTime: { lte: startTime }, endTime: { gt: startTime } },
                        { startTime: { lt: endTime }, endTime: { gte: endTime } },
                        { startTime: { gte: startTime }, endTime: { lte: endTime } },
                    ],
                },
            });

            if (overlapping) {
                return {
                    success: false,
                    error: `New time conflicts with existing appointment ${overlapping.id}`,
                    data: null,
                };
            }
        }

        const appointment = await prisma.appointment.update({
            where: { id: input.appointmentId },
            data: updateData,
            include: {
                patient: { select: { id: true, firstName: true, lastName: true } },
                clinician: { select: { id: true, firstName: true, lastName: true } },
            },
        });

        logger.info({
            event: 'appointment_updated',
            appointmentId: appointment.id,
            updatedFields: Object.keys(updateData),
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                appointmentId: appointment.id,
                patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
                clinicianName: `${appointment.clinician.firstName} ${appointment.clinician.lastName}`,
                title: appointment.title,
                startTime: appointment.startTime.toISOString(),
                endTime: appointment.endTime.toISOString(),
                status: appointment.status,
                confirmationStatus: appointment.confirmationStatus,
                updatedAt: appointment.updatedAt.toISOString(),
            },
        };
    } catch (error) {
        logger.error({ event: 'update_appointment_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update appointment',
            data: null,
        };
    }
}

// DELETE
async function deleteAppointmentHandler(input: z.infer<typeof DeleteAppointmentSchema>, context: MCPContext): Promise<MCPResult> {
    try {
        const appointment = await prisma.appointment.findUnique({
            where: { id: input.appointmentId },
        });

        if (!appointment) {
            return { success: false, error: `Appointment not found: ${input.appointmentId}`, data: null };
        }

        if (input.hardDelete) {
            // Hard delete - only for specific cases (e.g., test data, errors)
            await prisma.appointment.delete({
                where: { id: input.appointmentId },
            });

            logger.info({
                event: 'appointment_hard_deleted',
                appointmentId: input.appointmentId,
                reason: input.reason,
                agentId: context.agentId,
            });

            return {
                success: true,
                data: {
                    appointmentId: input.appointmentId,
                    deleted: true,
                    hardDelete: true,
                    reason: input.reason,
                    deletedAt: new Date().toISOString(),
                },
            };
        } else {
            // Soft delete - set status to CANCELLED
            const updated = await prisma.appointment.update({
                where: { id: input.appointmentId },
                data: {
                    status: 'CANCELLED',
                    notes: appointment.notes
                        ? `${appointment.notes}\n\n[CANCELLED: ${input.reason}]`
                        : `[CANCELLED: ${input.reason}]`,
                },
            });

            logger.info({
                event: 'appointment_soft_deleted',
                appointmentId: input.appointmentId,
                reason: input.reason,
                agentId: context.agentId,
            });

            return {
                success: true,
                data: {
                    appointmentId: updated.id,
                    deleted: false,
                    cancelled: true,
                    status: updated.status,
                    reason: input.reason,
                    cancelledAt: updated.updatedAt.toISOString(),
                },
            };
        }
    } catch (error) {
        logger.error({ event: 'delete_appointment_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete appointment',
            data: null,
        };
    }
}

// GET AVAILABLE SLOTS
async function getAvailableSlotsHandler(input: z.infer<typeof GetAvailableSlotsSchema>, context: MCPContext): Promise<MCPResult> {
    try {
        const checkDate = new Date(input.date);
        const startOfDay = new Date(checkDate);
        startOfDay.setHours(input.startHour, 0, 0, 0);
        const endOfDay = new Date(checkDate);
        endOfDay.setHours(input.endHour, 0, 0, 0);

        // Get existing appointments for this clinician on this date
        const bookedAppointments = await prisma.appointment.findMany({
            where: {
                clinicianId: input.clinicianId,
                status: { notIn: ['CANCELLED', 'NO_SHOW', 'RESCHEDULED'] },
                startTime: { gte: startOfDay, lt: endOfDay },
            },
            select: {
                id: true,
                startTime: true,
                endTime: true,
                title: true,
                patientId: true,
            },
            orderBy: { startTime: 'asc' },
        });

        // Generate all possible slots
        const slots: Array<{
            startTime: string;
            endTime: string;
            isBooked: boolean;
            appointmentId?: string;
        }> = [];

        const slotMs = input.slotDuration * 60 * 1000;

        for (let time = startOfDay.getTime(); time < endOfDay.getTime(); time += slotMs) {
            const slotStart = new Date(time);
            const slotEnd = new Date(time + slotMs);

            // Check if this slot overlaps with any booked appointment
            const bookedAppointment = bookedAppointments.find(apt => {
                const aptStart = apt.startTime.getTime();
                const aptEnd = apt.endTime.getTime();
                const slotStartMs = slotStart.getTime();
                const slotEndMs = slotEnd.getTime();

                return (
                    (slotStartMs >= aptStart && slotStartMs < aptEnd) ||
                    (slotEndMs > aptStart && slotEndMs <= aptEnd) ||
                    (slotStartMs <= aptStart && slotEndMs >= aptEnd)
                );
            });

            slots.push({
                startTime: slotStart.toISOString(),
                endTime: slotEnd.toISOString(),
                isBooked: !!bookedAppointment,
                appointmentId: bookedAppointment?.id,
            });
        }

        const availableSlots = slots.filter(s => !s.isBooked);

        logger.info({
            event: 'available_slots_queried',
            clinicianId: input.clinicianId,
            date: input.date,
            totalSlots: slots.length,
            availableSlots: availableSlots.length,
            bookedSlots: bookedAppointments.length,
        });

        return {
            success: true,
            data: {
                clinicianId: input.clinicianId,
                date: checkDate.toISOString().split('T')[0],
                slotDuration: input.slotDuration,
                workingHours: { start: input.startHour, end: input.endHour },
                totalSlots: slots.length,
                availableCount: availableSlots.length,
                bookedCount: slots.length - availableSlots.length,
                slots,
                availableSlots,
            },
        };
    } catch (error) {
        logger.error({ event: 'get_available_slots_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get available slots',
            data: null,
        };
    }
}

// RESCHEDULE
async function rescheduleAppointmentHandler(input: z.infer<typeof RescheduleAppointmentSchema>, context: MCPContext): Promise<MCPResult> {
    try {
        const appointment = await prisma.appointment.findUnique({
            where: { id: input.appointmentId },
            include: {
                patient: { select: { id: true, firstName: true, lastName: true } },
            },
        });

        if (!appointment) {
            return { success: false, error: `Appointment not found: ${input.appointmentId}`, data: null };
        }

        const newStartTime = new Date(input.newStartTime);
        const newEndTime = new Date(input.newEndTime);

        // Check for conflicts
        const overlapping = await prisma.appointment.findFirst({
            where: {
                id: { not: input.appointmentId },
                clinicianId: appointment.clinicianId,
                status: { notIn: ['CANCELLED', 'NO_SHOW', 'RESCHEDULED'] },
                OR: [
                    { startTime: { lte: newStartTime }, endTime: { gt: newStartTime } },
                    { startTime: { lt: newEndTime }, endTime: { gte: newEndTime } },
                    { startTime: { gte: newStartTime }, endTime: { lte: newEndTime } },
                ],
            },
        });

        if (overlapping) {
            return {
                success: false,
                error: `New time conflicts with existing appointment ${overlapping.id}`,
                data: null,
            };
        }

        const updated = await prisma.appointment.update({
            where: { id: input.appointmentId },
            data: {
                startTime: newStartTime,
                endTime: newEndTime,
                status: 'SCHEDULED',
                confirmationStatus: 'PENDING',
                rescheduleRequested: false,
                rescheduleReason: input.reason,
                notes: appointment.notes
                    ? `${appointment.notes}\n\n[RESCHEDULED from ${appointment.startTime.toISOString()} to ${newStartTime.toISOString()}${input.reason ? `: ${input.reason}` : ''}]`
                    : `[RESCHEDULED from ${appointment.startTime.toISOString()} to ${newStartTime.toISOString()}${input.reason ? `: ${input.reason}` : ''}]`,
            },
            include: {
                patient: { select: { id: true, firstName: true, lastName: true } },
                clinician: { select: { id: true, firstName: true, lastName: true } },
            },
        });

        // Create notification if requested
        if (input.notifyPatient) {
            await prisma.notification.create({
                data: {
                    recipientId: appointment.patientId,
                    recipientType: 'PATIENT',
                    type: 'APPOINTMENT_RESCHEDULED',
                    title: 'Appointment Rescheduled',
                    message: `Your appointment "${appointment.title}" has been rescheduled to ${newStartTime.toLocaleString()}.${input.reason ? ` Reason: ${input.reason}` : ''}`,
                    priority: 'NORMAL',
                    resourceType: 'Appointment',
                    resourceId: appointment.id,
                    metadata: {
                        oldStartTime: appointment.startTime.toISOString(),
                        newStartTime: newStartTime.toISOString(),
                        reason: input.reason,
                    },
                },
            });
        }

        logger.info({
            event: 'appointment_rescheduled',
            appointmentId: input.appointmentId,
            oldStartTime: appointment.startTime.toISOString(),
            newStartTime: newStartTime.toISOString(),
            reason: input.reason,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                appointmentId: updated.id,
                patientName: `${updated.patient.firstName} ${updated.patient.lastName}`,
                clinicianName: `${updated.clinician.firstName} ${updated.clinician.lastName}`,
                previousTime: {
                    start: appointment.startTime.toISOString(),
                    end: appointment.endTime.toISOString(),
                },
                newTime: {
                    start: updated.startTime.toISOString(),
                    end: updated.endTime.toISOString(),
                },
                reason: input.reason,
                status: updated.status,
                patientNotified: input.notifyPatient,
                rescheduledAt: updated.updatedAt.toISOString(),
            },
        };
    } catch (error) {
        logger.error({ event: 'reschedule_appointment_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to reschedule appointment',
            data: null,
        };
    }
}

// CANCEL
async function cancelAppointmentHandler(input: z.infer<typeof CancelAppointmentSchema>, context: MCPContext): Promise<MCPResult> {
    try {
        const appointment = await prisma.appointment.findUnique({
            where: { id: input.appointmentId },
            include: {
                patient: { select: { id: true, firstName: true, lastName: true } },
            },
        });

        if (!appointment) {
            return { success: false, error: `Appointment not found: ${input.appointmentId}`, data: null };
        }

        if (appointment.status === 'CANCELLED') {
            return { success: false, error: 'Appointment is already cancelled', data: null };
        }

        const confirmationStatus = input.cancelledBy === 'PATIENT' ? 'CANCELLED_BY_PATIENT' : appointment.confirmationStatus;

        const updated = await prisma.appointment.update({
            where: { id: input.appointmentId },
            data: {
                status: 'CANCELLED',
                confirmationStatus,
                notes: appointment.notes
                    ? `${appointment.notes}\n\n[CANCELLED by ${input.cancelledBy}: ${input.reason}]`
                    : `[CANCELLED by ${input.cancelledBy}: ${input.reason}]`,
            },
        });

        // Create notification if requested
        if (input.notifyPatient && input.cancelledBy !== 'PATIENT') {
            await prisma.notification.create({
                data: {
                    recipientId: appointment.patientId,
                    recipientType: 'PATIENT',
                    type: 'APPOINTMENT_CANCELLED',
                    title: 'Appointment Cancelled',
                    message: `Your appointment "${appointment.title}" scheduled for ${appointment.startTime.toLocaleString()} has been cancelled. Reason: ${input.reason}`,
                    priority: 'HIGH',
                    resourceType: 'Appointment',
                    resourceId: appointment.id,
                    metadata: {
                        cancelledBy: input.cancelledBy,
                        reason: input.reason,
                        originalTime: appointment.startTime.toISOString(),
                    },
                },
            });
        }

        logger.info({
            event: 'appointment_cancelled',
            appointmentId: input.appointmentId,
            cancelledBy: input.cancelledBy,
            reason: input.reason,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                appointmentId: updated.id,
                patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
                originalTime: appointment.startTime.toISOString(),
                status: updated.status,
                cancelledBy: input.cancelledBy,
                reason: input.reason,
                patientNotified: input.notifyPatient && input.cancelledBy !== 'PATIENT',
                cancelledAt: updated.updatedAt.toISOString(),
            },
        };
    } catch (error) {
        logger.error({ event: 'cancel_appointment_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to cancel appointment',
            data: null,
        };
    }
}

// GET PATIENT APPOINTMENTS
async function getPatientAppointmentsHandler(input: z.infer<typeof GetPatientAppointmentsSchema>, context: MCPContext): Promise<MCPResult> {
    try {
        const where: any = {
            patientId: input.patientId,
        };

        if (input.upcoming) {
            where.startTime = { gte: new Date() };
        }

        if (input.status) {
            where.status = input.status;
        } else if (input.upcoming) {
            // For upcoming, exclude cancelled/no-show
            where.status = { notIn: ['CANCELLED', 'NO_SHOW'] };
        }

        const appointments = await prisma.appointment.findMany({
            where,
            include: {
                clinician: { select: { id: true, firstName: true, lastName: true, specialty: true } },
            },
            orderBy: { startTime: 'asc' },
            take: input.limit,
        });

        return {
            success: true,
            data: {
                patientId: input.patientId,
                upcoming: input.upcoming,
                count: appointments.length,
                appointments: appointments.map(apt => ({
                    appointmentId: apt.id,
                    title: apt.title,
                    description: apt.description,
                    startTime: apt.startTime.toISOString(),
                    endTime: apt.endTime.toISOString(),
                    type: apt.type,
                    status: apt.status,
                    confirmationStatus: apt.confirmationStatus,
                    meetingUrl: apt.meetingUrl,
                    branch: apt.branch,
                    clinician: {
                        id: apt.clinician.id,
                        name: `${apt.clinician.firstName} ${apt.clinician.lastName}`,
                        specialty: apt.clinician.specialty,
                    },
                })),
            },
        };
    } catch (error) {
        logger.error({ event: 'get_patient_appointments_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get patient appointments',
            data: null,
        };
    }
}

// GET CLINICIAN APPOINTMENTS (Today's schedule)
async function getClinicianAppointmentsHandler(input: z.infer<typeof GetClinicianAppointmentsSchema>, context: MCPContext): Promise<MCPResult> {
    try {
        const targetDate = input.date ? new Date(input.date) : new Date();
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        const where: any = {
            clinicianId: input.clinicianId,
            startTime: { gte: startOfDay, lte: endOfDay },
        };

        if (input.status) {
            where.status = input.status;
        }

        const appointments = await prisma.appointment.findMany({
            where,
            include: {
                patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
            },
            orderBy: { startTime: 'asc' },
            take: input.limit,
        });

        // Calculate summary stats
        const stats = {
            total: appointments.length,
            scheduled: appointments.filter(a => a.status === 'SCHEDULED').length,
            confirmed: appointments.filter(a => a.status === 'CONFIRMED').length,
            checkedIn: appointments.filter(a => a.status === 'CHECKED_IN').length,
            inProgress: appointments.filter(a => a.status === 'IN_PROGRESS').length,
            completed: appointments.filter(a => a.status === 'COMPLETED').length,
            cancelled: appointments.filter(a => a.status === 'CANCELLED').length,
            noShow: appointments.filter(a => a.status === 'NO_SHOW').length,
        };

        return {
            success: true,
            data: {
                clinicianId: input.clinicianId,
                date: targetDate.toISOString().split('T')[0],
                stats,
                appointments: appointments.map(apt => ({
                    appointmentId: apt.id,
                    title: apt.title,
                    startTime: apt.startTime.toISOString(),
                    endTime: apt.endTime.toISOString(),
                    type: apt.type,
                    status: apt.status,
                    confirmationStatus: apt.confirmationStatus,
                    meetingUrl: apt.meetingUrl,
                    patient: {
                        id: apt.patient.id,
                        name: `${apt.patient.firstName} ${apt.patient.lastName}`,
                        phone: apt.patient.phone,
                    },
                    patientNotes: apt.patientNotes,
                    waitingRoomCheckedInAt: apt.waitingRoomCheckedInAt?.toISOString(),
                })),
            },
        };
    } catch (error) {
        logger.error({ event: 'get_clinician_appointments_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get clinician appointments',
            data: null,
        };
    }
}

// GET CLINICIAN SCHEDULE
async function getClinicianScheduleHandler(input: z.infer<typeof GetClinicianScheduleSchema>, context: MCPContext): Promise<MCPResult> {
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
                status: true,
                type: true,
            },
            orderBy: { startTime: 'asc' },
        });

        // Group appointments by date
        const scheduleByDate: Record<string, any[]> = {};
        appointments.forEach(apt => {
            const dateKey = apt.startTime.toISOString().split('T')[0];
            if (!scheduleByDate[dateKey]) {
                scheduleByDate[dateKey] = [];
            }
            scheduleByDate[dateKey].push({
                appointmentId: apt.id,
                startTime: apt.startTime.toISOString(),
                endTime: apt.endTime.toISOString(),
                status: apt.status,
                type: apt.type,
            });
        });

        // Generate all dates in range with appointment counts
        const workingDays: Array<{
            date: string;
            dayOfWeek: number;
            isWeekend: boolean;
            appointmentCount: number;
            appointments: any[];
        }> = [];

        const current = new Date(startDate);
        while (current <= endDate) {
            const dateKey = current.toISOString().split('T')[0];
            const dayOfWeek = current.getDay();
            workingDays.push({
                date: dateKey,
                dayOfWeek,
                isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
                appointmentCount: scheduleByDate[dateKey]?.length || 0,
                appointments: scheduleByDate[dateKey] || [],
            });
            current.setDate(current.getDate() + 1);
        }

        return {
            success: true,
            data: {
                clinicianId: input.clinicianId,
                startDate: input.startDate,
                endDate: input.endDate,
                totalAppointments: appointments.length,
                totalDays: workingDays.length,
                workingDays: workingDays.filter(d => !d.isWeekend).length,
                schedule: workingDays,
            },
        };
    } catch (error) {
        logger.error({ event: 'get_clinician_schedule_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get clinician schedule',
            data: null,
        };
    }
}

// SEND APPOINTMENT REMINDER
async function sendAppointmentReminderHandler(input: z.infer<typeof SendAppointmentReminderSchema>, context: MCPContext): Promise<MCPResult> {
    try {
        // Verify appointment exists
        const appointment = await prisma.appointment.findUnique({
            where: { id: input.appointmentId },
            include: {
                patient: { select: { firstName: true, lastName: true } },
                clinician: { select: { firstName: true, lastName: true } },
            },
        });

        if (!appointment) {
            return { success: false, error: `Appointment not found: ${input.appointmentId}`, data: null };
        }

        // Create notification
        const notification = await prisma.notification.create({
            data: {
                recipientId: input.patientId,
                recipientType: 'PATIENT',
                type: 'APPOINTMENT_REMINDER',
                title: 'Appointment Reminder',
                message: input.customMessage ||
                    `Reminder: You have an appointment "${appointment.title}" scheduled for ${appointment.startTime.toLocaleString()} with Dr. ${appointment.clinician.lastName}. Please confirm your attendance.`,
                priority: 'NORMAL',
                resourceType: 'Appointment',
                resourceId: input.appointmentId,
                metadata: {
                    appointmentId: input.appointmentId,
                    channel: input.channel,
                    appointmentTime: appointment.startTime.toISOString(),
                    clinicianName: `${appointment.clinician.firstName} ${appointment.clinician.lastName}`,
                },
            },
        });

        // Update appointment reminder status
        await prisma.appointment.update({
            where: { id: input.appointmentId },
            data: {
                reminderSent: true,
                reminderSentAt: new Date(),
                confirmationStatus: 'SENT',
                confirmationSentAt: new Date(),
                followUpCount: { increment: 1 },
            },
        });

        logger.info({
            event: 'appointment_reminder_sent',
            appointmentId: input.appointmentId,
            patientId: input.patientId,
            notificationId: notification.id,
            channel: input.channel,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                notificationId: notification.id,
                appointmentId: input.appointmentId,
                patientId: input.patientId,
                patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
                appointmentTime: appointment.startTime.toISOString(),
                channel: input.channel,
                sentAt: notification.createdAt.toISOString(),
            },
        };
    } catch (error) {
        logger.error({ event: 'send_appointment_reminder_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to send appointment reminder',
            data: null,
        };
    }
}

// =============================================================================
// TOOL DEFINITIONS
// =============================================================================

export const appointmentTools: MCPTool[] = [
    // CRUD Operations
    {
        name: 'create_appointment',
        description: 'Create a new appointment in the database. Validates patient/clinician existence and checks for time conflicts.',
        category: 'appointment',
        inputSchema: CreateAppointmentSchema,
        requiredPermissions: ['patient:read', 'patient:write'],
        handler: createAppointmentHandler,
    },
    {
        name: 'get_appointment',
        description: 'Get detailed information about a specific appointment by ID.',
        category: 'appointment',
        inputSchema: GetAppointmentSchema,
        requiredPermissions: ['patient:read'],
        handler: getAppointmentHandler,
    },
    {
        name: 'list_appointments',
        description: 'List appointments with optional filters by patient, clinician, status, type, and date range.',
        category: 'appointment',
        inputSchema: ListAppointmentsSchema,
        requiredPermissions: ['patient:read'],
        handler: listAppointmentsHandler,
    },
    {
        name: 'update_appointment',
        description: 'Update appointment details including time, status, type, notes, and confirmation status.',
        category: 'appointment',
        inputSchema: UpdateAppointmentSchema,
        requiredPermissions: ['patient:write'],
        handler: updateAppointmentHandler,
    },
    {
        name: 'delete_appointment',
        description: 'Delete an appointment. By default performs soft delete (cancellation). Set hardDelete=true for permanent removal.',
        category: 'appointment',
        inputSchema: DeleteAppointmentSchema,
        requiredPermissions: ['patient:write'],
        handler: deleteAppointmentHandler,
    },

    // Scheduling Operations
    {
        name: 'get_available_slots',
        description: 'Get available time slots for a clinician on a specific date by querying actual booked appointments.',
        category: 'appointment',
        inputSchema: GetAvailableSlotsSchema,
        requiredPermissions: ['patient:read'],
        handler: getAvailableSlotsHandler,
    },
    {
        name: 'reschedule_appointment',
        description: 'Reschedule an appointment to a new time. Validates against conflicts and optionally notifies patient.',
        category: 'appointment',
        inputSchema: RescheduleAppointmentSchema,
        requiredPermissions: ['patient:write'],
        handler: rescheduleAppointmentHandler,
    },
    {
        name: 'cancel_appointment',
        description: 'Cancel an appointment with a reason. Records who cancelled and optionally notifies patient.',
        category: 'appointment',
        inputSchema: CancelAppointmentSchema,
        requiredPermissions: ['patient:write'],
        handler: cancelAppointmentHandler,
    },

    // Query Operations
    {
        name: 'get_patient_appointments',
        description: 'Get upcoming (or all) appointments for a specific patient.',
        category: 'appointment',
        inputSchema: GetPatientAppointmentsSchema,
        requiredPermissions: ['patient:read'],
        handler: getPatientAppointmentsHandler,
    },
    {
        name: 'get_clinician_appointments',
        description: "Get a clinician's appointments for a specific date (defaults to today). Includes summary statistics.",
        category: 'appointment',
        inputSchema: GetClinicianAppointmentsSchema,
        requiredPermissions: ['patient:read'],
        handler: getClinicianAppointmentsHandler,
    },
    {
        name: 'get_clinician_schedule',
        description: 'Get clinician schedule overview for a date range, showing appointment counts per day.',
        category: 'appointment',
        inputSchema: GetClinicianScheduleSchema,
        requiredPermissions: ['patient:read'],
        handler: getClinicianScheduleHandler,
    },

    // Communication
    {
        name: 'send_appointment_reminder',
        description: 'Send a reminder notification to a patient about their upcoming appointment.',
        category: 'appointment',
        inputSchema: SendAppointmentReminderSchema,
        requiredPermissions: ['patient:read', 'notification:write'],
        handler: sendAppointmentReminderHandler,
    },
];

// =============================================================================
// EXPORTS
// =============================================================================

export const APPOINTMENT_TOOL_COUNT = appointmentTools.length;
