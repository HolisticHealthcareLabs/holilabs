/**
 * Available Appointment Slots API
 * Returns available time slots for a given clinician and date
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePatientSession } from '@/lib/auth/patient-session';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { addMinutes, format, isBefore, isAfter, parse } from 'date-fns';

const querySchema = z.object({
  clinicianId: z.string().cuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  type: z.enum(['IN_PERSON', 'TELEHEALTH', 'PHONE']).optional(),
});

// Business hours: 9 AM - 5 PM
const BUSINESS_START_HOUR = 9;
const BUSINESS_END_HOUR = 17;
const SLOT_DURATION_MINUTES = 30;
const BUFFER_MINUTES = 5; // Buffer between appointments

interface TimeSlot {
  time: string; // HH:mm format
  available: boolean;
  reason?: string; // Why unavailable
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate patient
    await requirePatientSession();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const params = {
      clinicianId: searchParams.get('clinicianId'),
      date: searchParams.get('date'),
      type: searchParams.get('type'),
    };

    // Validate parameters
    const validated = querySchema.parse(params);

    // Check if clinician exists
    const clinician = await prisma.user.findUnique({
      where: { id: validated.clinicianId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    if (!clinician || clinician.role !== 'CLINICIAN') {
      return NextResponse.json(
        { success: false, error: 'Clinician not found' },
        { status: 404 }
      );
    }

    // Parse the date
    const targetDate = parse(validated.date, 'yyyy-MM-dd', new Date());
    const now = new Date();

    // Don't allow booking in the past
    if (isBefore(targetDate, now)) {
      return NextResponse.json({
        success: true,
        data: {
          date: validated.date,
          slots: [],
          message: 'Cannot book appointments in the past',
        },
      });
    }

    // Get all existing appointments for this clinician on this date
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        clinicianId: validated.clinicianId,
        startTime: {
          gte: new Date(validated.date + 'T00:00:00'),
          lt: new Date(validated.date + 'T23:59:59'),
        },
        status: {
          notIn: ['CANCELLED', 'NO_SHOW'], // Don't count cancelled appointments
        },
      },
      select: {
        startTime: true,
        endTime: true,
      },
    });

    // Generate all possible time slots for the day
    const slots: TimeSlot[] = [];

    for (let hour = BUSINESS_START_HOUR; hour < BUSINESS_END_HOUR; hour++) {
      // Skip lunch hour (1 PM - 2 PM)
      if (hour === 13) continue;

      // Add slots every 30 minutes
      for (let minute = 0; minute < 60; minute += SLOT_DURATION_MINUTES) {
        const slotTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

        // Create full datetime for this slot
        const slotStart = parse(
          `${validated.date} ${slotTime}`,
          'yyyy-MM-dd HH:mm',
          new Date()
        );
        const slotEnd = addMinutes(slotStart, SLOT_DURATION_MINUTES);

        // Check if slot is in the past (with 2-hour buffer)
        const minimumBookingTime = addMinutes(now, 120); // 2 hours from now
        if (isBefore(slotStart, minimumBookingTime)) {
          slots.push({
            time: slotTime,
            available: false,
            reason: 'Too soon - minimum 2 hours notice required',
          });
          continue;
        }

        // Check if slot conflicts with existing appointments
        let isConflict = false;
        let conflictReason = '';

        for (const appointment of existingAppointments) {
          const appointmentStart = new Date(appointment.startTime);
          const appointmentEnd = new Date(appointment.endTime);

          // Add buffer time
          const bufferedStart = addMinutes(appointmentStart, -BUFFER_MINUTES);
          const bufferedEnd = addMinutes(appointmentEnd, BUFFER_MINUTES);

          // Check for overlap
          if (
            (isAfter(slotStart, bufferedStart) || slotStart.getTime() === bufferedStart.getTime()) &&
            (isBefore(slotStart, bufferedEnd) || slotStart.getTime() === bufferedEnd.getTime())
          ) {
            isConflict = true;
            conflictReason = 'Already booked';
            break;
          }

          if (
            (isAfter(slotEnd, bufferedStart) || slotEnd.getTime() === bufferedStart.getTime()) &&
            (isBefore(slotEnd, bufferedEnd) || slotEnd.getTime() === bufferedEnd.getTime())
          ) {
            isConflict = true;
            conflictReason = 'Already booked';
            break;
          }
        }

        slots.push({
          time: slotTime,
          available: !isConflict,
          ...(isConflict && { reason: conflictReason }),
        });
      }
    }

    // Return available slots
    return NextResponse.json({
      success: true,
      data: {
        clinician: {
          id: clinician.id,
          name: `Dr. ${clinician.firstName} ${clinician.lastName}`,
        },
        date: validated.date,
        slots,
        summary: {
          total: slots.length,
          available: slots.filter((s) => s.available).length,
          booked: slots.filter((s) => !s.available).length,
        },
      },
    });
  } catch (error) {
    console.error('Available slots error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid parameters',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch available slots',
      },
      { status: 500 }
    );
  }
}
