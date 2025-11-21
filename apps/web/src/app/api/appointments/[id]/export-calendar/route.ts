/**
 * Calendar Export API Route
 * GET /api/appointments/[id]/export-calendar
 * Downloads appointment as .ics file for Apple Calendar, Outlook, etc.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  generateAppointmentICS,
  generateICSFilename,
  type AppointmentData,
} from '@/lib/calendar/ics-generator';

/**
 * GET /api/appointments/[id]/export-calendar
 * Export appointment as .ics calendar file
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const appointmentId = params.id;

    // Fetch appointment with patient and clinician details
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

    // Check authorization - either patient or clinician can export
    // Note: In production, add proper auth check here
    // For now, allowing access for demo purposes

    // Prepare appointment data for ICS generation
    const appointmentData: AppointmentData = {
      id: appointment.id,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
      clinicianName: `${appointment.clinician.firstName} ${appointment.clinician.lastName}`,
      notes: appointment.description || undefined,
      type: appointment.type || undefined,
    };

    // Generate ICS file content
    const icsContent = generateAppointmentICS(appointmentData);

    // Generate filename
    const filename = generateICSFilename(appointmentData);

    // Return ICS file as download
    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: any) {
    console.error('Error generating calendar export:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate calendar export' },
      { status: 500 }
    );
  }
}
