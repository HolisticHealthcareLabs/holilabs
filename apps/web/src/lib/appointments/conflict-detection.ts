/**
 * Appointment Conflict Detection
 * Prevents double-booking and overlapping appointments
 *
 * CRITICAL: This module prevents patient complaints and scheduling errors
 * that occur when front desk staff accidentally double-book appointments.
 */

import { prisma } from '../prisma';
import type { Appointment } from '@prisma/client';

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
}

export interface ConflictCheckParams {
  clinicianId: string;
  startTime: Date;
  endTime: Date;
  excludeAppointmentId?: string; // For updates - exclude current appointment
}

export interface ConflictResult {
  hasConflict: boolean;
  conflictingAppointments: Appointment[];
  message?: string;
}

/**
 * Check if two time slots overlap
 * Algorithm: A overlaps B if A.start < B.end AND A.end > B.start
 */
export function doTimeSlotsOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
  return slot1.startTime < slot2.endTime && slot1.endTime > slot2.startTime;
}

/**
 * Validate appointment time slot
 * - End time must be after start time
 * - Duration must be at least 5 minutes
 * - Cannot be in the past (with 5-minute grace period)
 */
export function validateTimeSlot(slot: TimeSlot): { valid: boolean; error?: string } {
  // End time must be after start time
  if (slot.endTime <= slot.startTime) {
    return {
      valid: false,
      error: 'End time must be after start time',
    };
  }

  // Duration must be at least 5 minutes
  const durationMinutes = (slot.endTime.getTime() - slot.startTime.getTime()) / (1000 * 60);
  if (durationMinutes < 5) {
    return {
      valid: false,
      error: 'Appointment duration must be at least 5 minutes',
    };
  }

  // Cannot schedule in the past (allow 5-minute grace period for UI lag)
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  if (slot.startTime < fiveMinutesAgo) {
    return {
      valid: false,
      error: 'Cannot schedule appointments in the past',
    };
  }

  return { valid: true };
}

/**
 * Check for appointment conflicts for a specific clinician
 * Returns all conflicting appointments in the time slot
 */
export async function checkAppointmentConflicts(
  params: ConflictCheckParams
): Promise<ConflictResult> {
  const { clinicianId, startTime, endTime, excludeAppointmentId } = params;

  // First, validate the time slot
  const validation = validateTimeSlot({ startTime, endTime });
  if (!validation.valid) {
    return {
      hasConflict: true,
      conflictingAppointments: [],
      message: validation.error,
    };
  }

  // Query for overlapping appointments
  // PostgreSQL date range overlap query: (start1 < end2) AND (end1 > start2)
  const conflictingAppointments = await prisma.appointment.findMany({
    where: {
      clinicianId,
      // Exclude cancelled appointments from conflict detection
      status: {
        not: 'CANCELLED',
      },
      // Exclude the current appointment (for updates)
      ...(excludeAppointmentId && { id: { not: excludeAppointmentId } }),
      // Time overlap condition
      AND: [
        {
          startTime: {
            lt: endTime, // Existing appointment starts before new appointment ends
          },
        },
        {
          endTime: {
            gt: startTime, // Existing appointment ends after new appointment starts
          },
        },
      ],
    },
    include: {
      patient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          tokenId: true,
        },
      },
    },
    orderBy: {
      startTime: 'asc',
    },
  });

  if (conflictingAppointments.length === 0) {
    return {
      hasConflict: false,
      conflictingAppointments: [],
    };
  }

  // Generate human-readable conflict message
  const conflictMessages = conflictingAppointments.map((apt) => {
    const startTimeStr = apt.startTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const endTimeStr = apt.endTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const patientName = `${apt.patient.firstName} ${apt.patient.lastName}`;
    return `${startTimeStr} - ${endTimeStr} with ${patientName}`;
  });

  const message =
    conflictingAppointments.length === 1
      ? `This time slot conflicts with an existing appointment: ${conflictMessages[0]}`
      : `This time slot conflicts with ${conflictingAppointments.length} existing appointments: ${conflictMessages.join('; ')}`;

  return {
    hasConflict: true,
    conflictingAppointments,
    message,
  };
}

/**
 * Find available time slots for a clinician on a specific date
 * Useful for suggesting alternative times when conflicts are detected
 */
export async function findAvailableSlots(params: {
  clinicianId: string;
  date: Date; // Target date
  slotDuration: number; // Duration in minutes
  workingHours?: {
    start: string; // "09:00"
    end: string; // "17:00"
  };
}): Promise<Date[]> {
  const {
    clinicianId,
    date,
    slotDuration,
    workingHours = { start: '09:00', end: '17:00' },
  } = params;

  // Get start and end of working day
  const dayStart = new Date(date);
  const [startHour, startMinute] = workingHours.start.split(':').map(Number);
  dayStart.setHours(startHour, startMinute, 0, 0);

  const dayEnd = new Date(date);
  const [endHour, endMinute] = workingHours.end.split(':').map(Number);
  dayEnd.setHours(endHour, endMinute, 0, 0);

  // Get all appointments for the day
  const appointments = await prisma.appointment.findMany({
    where: {
      clinicianId,
      status: { not: 'CANCELLED' },
      startTime: {
        gte: dayStart,
        lt: dayEnd,
      },
    },
    orderBy: {
      startTime: 'asc',
    },
    select: {
      startTime: true,
      endTime: true,
    },
  });

  // Generate all possible time slots
  const availableSlots: Date[] = [];
  let currentTime = new Date(dayStart);
  const slotDurationMs = slotDuration * 60 * 1000;

  while (currentTime < dayEnd) {
    const slotEnd = new Date(currentTime.getTime() + slotDurationMs);

    // Check if slot is completely free
    const hasConflict = appointments.some((apt) =>
      doTimeSlotsOverlap(
        { startTime: currentTime, endTime: slotEnd },
        { startTime: apt.startTime, endTime: apt.endTime }
      )
    );

    if (!hasConflict && slotEnd <= dayEnd) {
      availableSlots.push(new Date(currentTime));
    }

    // Move to next slot (15-minute increments)
    currentTime = new Date(currentTime.getTime() + 15 * 60 * 1000);
  }

  return availableSlots;
}

/**
 * Get conflict statistics for a clinician over a date range
 * Useful for analytics and identifying scheduling inefficiencies
 */
export async function getConflictStats(params: {
  clinicianId: string;
  startDate: Date;
  endDate: Date;
}): Promise<{
  totalAppointments: number;
  cancelledAppointments: number;
  averageUtilization: number; // % of working hours utilized
}> {
  const { clinicianId, startDate, endDate } = params;

  const appointments = await prisma.appointment.findMany({
    where: {
      clinicianId,
      startTime: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      status: true,
      startTime: true,
      endTime: true,
    },
  });

  const totalAppointments = appointments.length;
  const cancelledAppointments = appointments.filter((a) => a.status === 'CANCELLED').length;

  // Calculate total scheduled time (excluding cancelled)
  const scheduledMinutes = appointments
    .filter((a) => a.status !== 'CANCELLED')
    .reduce((total, apt) => {
      const duration = (apt.endTime.getTime() - apt.startTime.getTime()) / (1000 * 60);
      return total + duration;
    }, 0);

  // Calculate working days (assuming 8 hours/day, 5 days/week)
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const workingDays = Math.floor((daysDiff / 7) * 5);
  const totalWorkingMinutes = workingDays * 8 * 60;

  const averageUtilization =
    totalWorkingMinutes > 0 ? (scheduledMinutes / totalWorkingMinutes) * 100 : 0;

  return {
    totalAppointments,
    cancelledAppointments,
    averageUtilization: Math.round(averageUtilization * 10) / 10, // Round to 1 decimal
  };
}
