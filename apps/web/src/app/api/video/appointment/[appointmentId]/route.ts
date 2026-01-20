/**
 * Video Appointment API
 *
 * GET /api/video/appointment/[appointmentId]
 * Fetches appointment details for video calls.
 * Validates user access and appointment type.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ appointmentId: string }> }
) {
  try {
    const { appointmentId } = await context.params;

    // Verify authentication
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    // Fetch appointment with patient and clinician details
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            patientUser: {
              select: {
                id: true,
              },
            },
          },
        },
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Check user access - must be the clinician or the patient
    const isClinicianAccess = appointment.clinicianId === session.user.id;

    // For patient access, check if the session user matches the patient's patientUser
    const isPatientAccess = appointment.patient.patientUser?.id === session.user.id;

    if (!isClinicianAccess && !isPatientAccess) {
      logger.warn({
        event: 'video_appointment_access_denied',
        appointmentId,
        userId: session.user.id,
        clinicianId: appointment.clinicianId,
        patientUserId: appointment.patient.patientUser?.id,
      });

      return NextResponse.json(
        { error: 'Access denied - You are not part of this appointment' },
        { status: 403 }
      );
    }

    // Check if appointment is telehealth type
    if (appointment.type !== 'TELEHEALTH') {
      return NextResponse.json(
        { error: 'This is not a telehealth appointment' },
        { status: 400 }
      );
    }

    // Check appointment status
    const validStatuses = ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'];
    if (!validStatuses.includes(appointment.status)) {
      return NextResponse.json(
        { error: `Cannot join appointment with status: ${appointment.status}` },
        { status: 400 }
      );
    }

    // Build clinician display name
    const clinicianName = `${appointment.clinician.firstName} ${appointment.clinician.lastName}`.trim() || 'Doctor';
    const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`.trim();

    // Determine user type and name
    const userType = isClinicianAccess ? 'clinician' : 'patient';
    const userName = isClinicianAccess ? clinicianName : patientName;

    // Get the other participant's name
    const otherParticipantName = isClinicianAccess ? patientName : clinicianName;

    logger.info({
      event: 'video_appointment_fetched',
      appointmentId,
      userId: session.user.id,
      userType,
    });

    return NextResponse.json({
      success: true,
      data: {
        appointmentId: appointment.id,
        title: appointment.title,
        startTime: appointment.startTime.toISOString(),
        endTime: appointment.endTime.toISOString(),
        status: appointment.status,
        userType,
        userName,
        otherParticipantName,
        meetingUrl: appointment.meetingUrl,
      },
    });
  } catch (error) {
    logger.error({
      event: 'video_appointment_error',
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Failed to fetch appointment details' },
      { status: 500 }
    );
  }
}
