/**
 * Available Slots Calculation API
 * Industry-grade slot generation with conflict detection
 *
 * GET /api/scheduling/available-slots - Calculate bookable time slots
 *
 * @module api/scheduling/available-slots
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { GetAvailableSlotsSchema } from '@/lib/api/schemas/scheduling';
import { addDays, format, parse, isWithinInterval, addMinutes } from 'date-fns';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to time string (HH:MM)
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Generate time slots for a given day
 */
function generateDaySlots(
  availability: {
    startTime: string;
    endTime: string;
    breakStart: string | null;
    breakEnd: string | null;
    slotDuration: number;
  },
  date: Date
): { start: Date; end: Date }[] {
  const slots: { start: Date; end: Date }[] = [];

  const startMinutes = timeToMinutes(availability.startTime);
  const endMinutes = timeToMinutes(availability.endTime);
  const breakStartMinutes = availability.breakStart
    ? timeToMinutes(availability.breakStart)
    : null;
  const breakEndMinutes = availability.breakEnd
    ? timeToMinutes(availability.breakEnd)
    : null;

  let currentMinutes = startMinutes;

  while (currentMinutes + availability.slotDuration <= endMinutes) {
    const slotEnd = currentMinutes + availability.slotDuration;

    // Skip if slot overlaps with break
    const overlapsBreak =
      breakStartMinutes !== null &&
      breakEndMinutes !== null &&
      !(slotEnd <= breakStartMinutes || currentMinutes >= breakEndMinutes);

    if (!overlapsBreak) {
      const slotStart = new Date(date);
      slotStart.setHours(Math.floor(currentMinutes / 60));
      slotStart.setMinutes(currentMinutes % 60);
      slotStart.setSeconds(0);
      slotStart.setMilliseconds(0);

      const slotEndDate = new Date(slotStart);
      slotEndDate.setMinutes(slotEndDate.getMinutes() + availability.slotDuration);

      slots.push({ start: slotStart, end: slotEndDate });
    }

    currentMinutes += availability.slotDuration;

    // Jump past break if we're at the start of it
    if (
      breakStartMinutes !== null &&
      breakEndMinutes !== null &&
      currentMinutes >= breakStartMinutes &&
      currentMinutes < breakEndMinutes
    ) {
      currentMinutes = breakEndMinutes;
    }
  }

  return slots;
}

// ============================================================================
// GET /api/scheduling/available-slots - Calculate Available Slots
// ============================================================================

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const query = context.validatedQuery;

    // Validate date range (max 90 days)
    const daysDiff = Math.ceil(
      (query.endDate.getTime() - query.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff > 90) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_RANGE',
          message: 'Date range cannot exceed 90 days',
        },
        { status: 400 }
      );
    }

    if (daysDiff < 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_RANGE',
          message: 'End date must be after start date',
        },
        { status: 400 }
      );
    }

    // Verify clinician exists
    const clinician = await prisma.user.findUnique({
      where: { id: query.clinicianId },
      select: { id: true, firstName: true, lastName: true, role: true },
    });

    if (!clinician) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Clinician not found',
        },
        { status: 404 }
      );
    }

    if (clinician.role !== 'CLINICIAN' && clinician.role !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_ROLE',
          message: 'User is not a clinician',
        },
        { status: 400 }
      );
    }

    // Fetch provider availability for the date range
    const availability = await prisma.providerAvailability.findMany({
      where: {
        clinicianId: query.clinicianId,
        isActive: true,
        effectiveFrom: { lte: query.endDate },
        OR: [
          { effectiveUntil: null },
          { effectiveUntil: { gte: query.startDate } },
        ],
      },
      orderBy: { dayOfWeek: 'asc' },
    });

    if (availability.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'No availability configured for this provider',
        clinician,
      });
    }

    // Fetch time off for the date range
    const timeOff = await prisma.providerTimeOff.findMany({
      where: {
        clinicianId: query.clinicianId,
        status: 'APPROVED',
        startDate: { lte: query.endDate },
        endDate: { gte: query.startDate },
      },
    });

    // Fetch existing appointments for the date range
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        clinicianId: query.clinicianId,
        startTime: {
          gte: query.startDate,
          lte: query.endDate,
        },
        status: {
          notIn: ['CANCELLED', 'NO_SHOW'], // Don't count cancelled/no-show appointments
        },
      },
      select: {
        startTime: true,
        endTime: true,
      },
    });

    // Generate all potential slots
    const allSlots: Array<{
      start: Date;
      end: Date;
      available: boolean;
      reason?: string;
    }> = [];

    let currentDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();

      // Find availability for this day of week
      const dayAvailability = availability.find(
        (a) =>
          a.dayOfWeek === dayOfWeek &&
          currentDate >= a.effectiveFrom &&
          (!a.effectiveUntil || currentDate <= a.effectiveUntil)
      );

      if (dayAvailability) {
        // Generate slots for this day
        const daySlots = generateDaySlots(dayAvailability, currentDate);

        // Check each slot for conflicts
        for (const slot of daySlots) {
          let available = true;
          let reason: string | undefined;

          // Check if slot is in the past
          if (slot.start < new Date()) {
            available = false;
            reason = 'Past date/time';
          }

          // Check against time off
          if (available) {
            const conflictingTimeOff = timeOff.find((to) => {
              if (to.allDay) {
                return (
                  slot.start >= to.startDate &&
                  slot.start < addDays(to.endDate, 1)
                );
              } else {
                // Parse time off times
                const toStart = new Date(to.startDate);
                if (to.startTime) {
                  const [hours, minutes] = to.startTime.split(':').map(Number);
                  toStart.setHours(hours, minutes, 0, 0);
                }

                const toEnd = new Date(to.endDate);
                if (to.endTime) {
                  const [hours, minutes] = to.endTime.split(':').map(Number);
                  toEnd.setHours(hours, minutes, 0, 0);
                }

                return (
                  isWithinInterval(slot.start, {
                    start: toStart,
                    end: toEnd,
                  }) ||
                  isWithinInterval(slot.end, {
                    start: toStart,
                    end: toEnd,
                  })
                );
              }
            });

            if (conflictingTimeOff) {
              available = false;
              reason = `Provider unavailable: ${conflictingTimeOff.type}`;
            }
          }

          // Check against existing appointments
          if (available) {
            const conflictingAppointment = existingAppointments.find((appt) => {
              // Check if slot overlaps with appointment
              return (
                (slot.start >= appt.startTime && slot.start < appt.endTime) ||
                (slot.end > appt.startTime && slot.end <= appt.endTime) ||
                (slot.start <= appt.startTime && slot.end >= appt.endTime)
              );
            });

            if (conflictingAppointment) {
              available = false;
              reason = 'Slot already booked';
            }
          }

          allSlots.push({
            start: slot.start,
            end: slot.end,
            available,
            reason,
          });
        }
      }

      currentDate = addDays(currentDate, 1);
    }

    // Filter to only available slots if requested
    const availableSlots = allSlots.filter((s) => s.available);

    // Group by date for easier consumption
    const slotsByDate = availableSlots.reduce((acc, slot) => {
      const dateKey = format(slot.start, 'yyyy-MM-dd');
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push({
        start: slot.start.toISOString(),
        end: slot.end.toISOString(),
        startTime: format(slot.start, 'HH:mm'),
        endTime: format(slot.end, 'HH:mm'),
      });
      return acc;
    }, {} as Record<string, any[]>);

    return NextResponse.json({
      success: true,
      data: {
        clinician,
        startDate: query.startDate.toISOString(),
        endDate: query.endDate.toISOString(),
        duration: query.duration,
        totalSlots: allSlots.length,
        availableSlots: availableSlots.length,
        bookedSlots: allSlots.length - availableSlots.length,
        slots: availableSlots.map((s) => ({
          start: s.start.toISOString(),
          end: s.end.toISOString(),
          startTime: format(s.start, 'HH:mm'),
          endTime: format(s.end, 'HH:mm'),
          date: format(s.start, 'yyyy-MM-dd'),
          dayOfWeek: format(s.start, 'EEEE'),
        })),
        slotsByDate,
      },
    });
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
    audit: { action: 'READ', resource: 'AvailableSlots' },
    skipCsrf: true,
  }
);
