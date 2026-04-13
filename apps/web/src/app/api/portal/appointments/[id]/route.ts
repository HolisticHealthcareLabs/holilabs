export const dynamic = "force-dynamic";
/**
 * Individual Appointment API
 *
 * GET /api/portal/appointments/[id] - Get appointment details
 * PATCH /api/portal/appointments/[id] - Cancel appointment
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPatientPortalRoute, type PatientPortalContext } from '@/lib/api/patient-portal-middleware';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const GET = createPatientPortalRoute(
  async (request: NextRequest, context: PatientPortalContext) => {
    const id = request.nextUrl.pathname.split('/').at(-1);

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Appointment ID is required',
        },
        { status: 400 }
      );
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialty: true,
            licenseNumber: true,
            email: true,
          },
        },
        patient: {
          select: {
            id: true,
            mrn: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cita no encontrada.',
        },
        { status: 404 }
      );
    }

    if (appointment.patientId !== context.session.patientId) {
      logger.warn({
        event: 'unauthorized_appointment_access_attempt',
        patientId: context.session.patientId,
        requestedAppointmentId: id,
        actualAppointmentPatientId: appointment.patientId,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'No tienes permiso para acceder a esta cita.',
        },
        { status: 403 }
      );
    }

    logger.info({
      event: 'patient_appointment_accessed',
      patientId: context.session.patientId,
      appointmentId: appointment.id,
    });

    return NextResponse.json(
      {
        success: true,
        data: appointment,
      },
      { status: 200 }
    );
  },
  { audit: { action: 'READ', resource: 'Appointment' } }
);

export const PATCH = createPatientPortalRoute(
  async (request: NextRequest, context: PatientPortalContext) => {
    const id = request.nextUrl.pathname.split('/').at(-1);
    const body = await request.json();
    const { action } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Appointment ID is required',
        },
        { status: 400 }
      );
    }

    if (action !== 'cancel') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid action',
        },
        { status: 400 }
      );
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      select: {
        id: true,
        patientId: true,
        status: true,
        startTime: true,
      },
    });

    if (!appointment) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cita no encontrada.',
        },
        { status: 404 }
      );
    }

    if (appointment.patientId !== context.session.patientId) {
      logger.warn({
        event: 'unauthorized_appointment_cancel_attempt',
        patientId: context.session.patientId,
        requestedAppointmentId: id,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'No tienes permiso para cancelar esta cita.',
        },
        { status: 403 }
      );
    }

    if (appointment.status === 'CANCELLED') {
      return NextResponse.json(
        {
          success: false,
          error: 'Esta cita ya está cancelada.',
        },
        { status: 400 }
      );
    }

    if (appointment.status === 'COMPLETED') {
      return NextResponse.json(
        {
          success: false,
          error: 'No puedes cancelar una cita completada.',
        },
        { status: 400 }
      );
    }

    if (new Date(appointment.startTime) < new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: 'No puedes cancelar una cita que ya pasó.',
        },
        { status: 400 }
      );
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        description: `Cancelada por el paciente el ${new Date().toISOString()}`,
      },
      include: {
        clinician: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: context.session.userId,
        userEmail: context.session.email,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        action: 'UPDATE',
        resource: 'Appointment',
        resourceId: appointment.id,
        success: true,
        details: {
          action: 'cancel',
          previousStatus: appointment.status,
          newStatus: 'CANCELLED',
        },
      },
    });

    logger.info({
      event: 'appointment_cancelled_by_patient',
      patientId: context.session.patientId,
      appointmentId: appointment.id,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Cita cancelada exitosamente.',
        data: updatedAppointment,
      },
      { status: 200 }
    );
  },
  { audit: { action: 'UPDATE', resource: 'Appointment' } }
);
