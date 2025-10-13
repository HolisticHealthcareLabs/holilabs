/**
 * Individual Appointment API
 *
 * GET /api/portal/appointments/[id] - Get appointment details
 * PATCH /api/portal/appointments/[id] - Cancel appointment
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePatientSession } from '@/lib/auth/patient-session';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate patient
    const session = await requirePatientSession();

    const { id } = params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Appointment ID is required',
        },
        { status: 400 }
      );
    }

    // Fetch appointment with full details
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

    // Verify the appointment belongs to the authenticated patient
    if (appointment.patientId !== session.patientId) {
      logger.warn({
        event: 'unauthorized_appointment_access_attempt',
        patientId: session.patientId,
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

    // Log access for HIPAA compliance
    logger.info({
      event: 'patient_appointment_accessed',
      patientId: session.patientId,
      appointmentId: appointment.id,
    });

    return NextResponse.json(
      {
        success: true,
        data: appointment,
      },
      { status: 200 }
    );
  } catch (error) {
    // Check if it's an auth error
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado. Por favor, inicia sesión.',
        },
        { status: 401 }
      );
    }

    logger.error({
      event: 'patient_appointment_fetch_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Error al cargar la cita.',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate patient
    const session = await requirePatientSession();

    const { id } = params;
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

    // Fetch appointment
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

    // Verify the appointment belongs to the authenticated patient
    if (appointment.patientId !== session.patientId) {
      logger.warn({
        event: 'unauthorized_appointment_cancel_attempt',
        patientId: session.patientId,
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

    // Check if appointment can be cancelled
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

    // Check if appointment is in the past
    if (new Date(appointment.startTime) < new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: 'No puedes cancelar una cita que ya pasó.',
        },
        { status: 400 }
      );
    }

    // Cancel appointment
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

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        userEmail: session.email,
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
      patientId: session.patientId,
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
  } catch (error) {
    // Check if it's an auth error
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado. Por favor, inicia sesión.',
        },
        { status: 401 }
      );
    }

    logger.error({
      event: 'appointment_cancel_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Error al cancelar la cita.',
      },
      { status: 500 }
    );
  }
}
