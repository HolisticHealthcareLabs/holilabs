/**
 * Video Appointment API
 *
 * GET /api/video/appointment/[appointmentId]
 * Fetches appointment details for video calls.
 * Validates user access and appointment type.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const params = await Promise.resolve(context.params ?? {});
    const { appointmentId } = params;
    const userId = context.user!.id;

    if (!appointmentId) {
      return NextResponse.json(
        { error: 'Appointment ID required' },
        { status: 400 }
      );
    }

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

    const isClinicianAccess = appointment.clinicianId === userId;
    const isPatientAccess = appointment.patient.patientUser?.id === userId;

    if (!isClinicianAccess && !isPatientAccess) {
      logger.warn({
        event: 'video_appointment_access_denied',
        appointmentId,
        userId,
        clinicianId: appointment.clinicianId,
        patientUserId: appointment.patient.patientUser?.id,
      });

      return NextResponse.json(
        { error: 'Access denied - You are not part of this appointment' },
        { status: 403 }
      );
    }

    if (appointment.type !== 'TELEHEALTH') {
      return NextResponse.json(
        { error: 'This is not a telehealth appointment' },
        { status: 400 }
      );
    }

    const validStatuses = ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'];
    if (!validStatuses.includes(appointment.status)) {
      return NextResponse.json(
        { error: `Cannot join appointment with status: ${appointment.status}` },
        { status: 400 }
      );
    }

    const clinicianName = `${appointment.clinician.firstName} ${appointment.clinician.lastName}`.trim() || 'Doctor';
    const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`.trim();

    const userType = isClinicianAccess ? 'clinician' : 'patient';
    const userName = isClinicianAccess ? clinicianName : patientName;
    const otherParticipantName = isClinicianAccess ? patientName : clinicianName;

    logger.info({
      event: 'video_appointment_fetched',
      appointmentId,
      userId,
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
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'],
    allowPatientAuth: true,
    skipCsrf: true,
  }
);
