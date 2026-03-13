/**
 * Calendar Export API Route
 * GET /api/appointments/[id]/export-calendar
 * Downloads appointment as .ics file for Apple Calendar, Outlook, etc.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import {
  generateAppointmentICS,
  generateICSFilename,
  type AppointmentData,
} from '@/lib/calendar/ics-generator';
import { logger } from '@/lib/logger';

/**
 * GET /api/appointments/[id]/export-calendar
 * Export appointment as .ics calendar file
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const params = await Promise.resolve(context.params ?? ({} as any));
    const appointmentId = params.id;
    if (!appointmentId) {
      return NextResponse.json(
        { success: false, error: 'Appointment ID required' },
        { status: 400 }
      );
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
        clinician: true,
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { success: false, error: 'Appointment not found' },
        { status: 404 }
      );
    }

    const appointmentData: AppointmentData = {
      id: appointment.id,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
      clinicianName: `${appointment.clinician.firstName} ${appointment.clinician.lastName}`,
      notes: appointment.description || undefined,
      type: appointment.type || undefined,
    };

    const icsContent = generateAppointmentICS(appointmentData);
    const filename = generateICSFilename(appointmentData);

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'],
    skipCsrf: true,
  }
);
