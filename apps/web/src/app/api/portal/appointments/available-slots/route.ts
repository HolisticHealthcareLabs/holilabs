/**
 * Available Appointment Slots API
 * Returns available time slots for a given clinician and date
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPatientPortalRoute, type PatientPortalContext } from '@/lib/api/patient-portal-middleware';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { addMinutes, format, isBefore, isAfter, parse } from 'date-fns';
import logger from '@/lib/logger';

const querySchema = z.object({
  clinicianId: z.string().cuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(['IN_PERSON', 'TELEHEALTH', 'PHONE']).optional(),
});

const BUSINESS_START_HOUR = 9;
const BUSINESS_END_HOUR = 17;
const SLOT_DURATION_MINUTES = 30;
const BUFFER_MINUTES = 5;

interface TimeSlot {
  time: string;
  available: boolean;
  reason?: string;
}

export const GET = createPatientPortalRoute(
  async (request: NextRequest, context: PatientPortalContext) => {
    const { searchParams } = new URL(request.url);
    const params = {
      clinicianId: searchParams.get('clinicianId'),
      date: searchParams.get('date'),
      type: searchParams.get('type'),
    };

    try {
      var validated = querySchema.parse(params);
    } catch (error) {
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
      throw error;
    }

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

    const targetDate = parse(validated.date, 'yyyy-MM-dd', new Date());
    const now = new Date();

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

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        clinicianId: validated.clinicianId,
        startTime: {
          gte: new Date(validated.date + 'T00:00:00'),
          lt: new Date(validated.date + 'T23:59:59'),
        },
        status: {
          notIn: ['CANCELLED', 'NO_SHOW'],
        },
      },
      select: {
        startTime: true,
        endTime: true,
      },
    });

    const slots: TimeSlot[] = [];

    for (let hour = BUSINESS_START_HOUR; hour < BUSINESS_END_HOUR; hour++) {
      if (hour === 13) continue;

      for (let minute = 0; minute < 60; minute += SLOT_DURATION_MINUTES) {
        const slotTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

        const slotStart = parse(
          `${validated.date} ${slotTime}`,
          'yyyy-MM-dd HH:mm',
          new Date()
        );
        const slotEnd = addMinutes(slotStart, SLOT_DURATION_MINUTES);

        const minimumBookingTime = addMinutes(now, 120);
        if (isBefore(slotStart, minimumBookingTime)) {
          slots.push({
            time: slotTime,
            available: false,
            reason: 'Too soon - minimum 2 hours notice required',
          });
          continue;
        }

        let isConflict = false;
        let conflictReason = '';

        for (const appointment of existingAppointments) {
          const appointmentStart = new Date(appointment.startTime);
          const appointmentEnd = new Date(appointment.endTime);

          const bufferedStart = addMinutes(appointmentStart, -BUFFER_MINUTES);
          const bufferedEnd = addMinutes(appointmentEnd, BUFFER_MINUTES);

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
  },
  { audit: { action: 'READ', resource: 'AvailableSlots' } }
);
