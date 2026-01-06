/**
 * Appointment Confirmation API
 * GET /api/appointments/confirm/[token] - Get appointment details
 * POST /api/appointments/confirm/[token] - Confirm/Cancel/Reschedule appointment
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAppointmentByToken,
  confirmAppointment,
  cancelAppointment,
  requestReschedule,
  formatAppointmentDetails,
} from '@/lib/appointments/confirmation';
import logger from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: 'Token is required',
        },
        { status: 400 }
      );
    }

    const appointment = await getAppointmentByToken(token);

    if (!appointment) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cita no encontrada o enlace inv válido.',
        },
        { status: 404 }
      );
    }

    // Format appointment details
    const details = formatAppointmentDetails(appointment);

    // HIPAA Audit Log: Patient accessed appointment via confirmation token
    await createAuditLog({
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      action: 'READ',
      resource: 'Appointment',
      resourceId: appointment.id,
      details: {
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        accessMethod: 'confirmation_token',
        accessType: 'APPOINTMENT_CONFIRMATION_VIEW',
      },
      success: true,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          appointment: {
            id: appointment.id,
            ...details,
            status: appointment.status,
            confirmationStatus: appointment.confirmationStatus,
            type: appointment.type,
            description: appointment.description,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error({
      event: 'appointment_confirmation_get_error',
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

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const body = await request.json();
    const { action, newTime, reason } = body;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: 'Token is required',
        },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        {
          success: false,
          error: 'Action is required',
        },
        { status: 400 }
      );
    }

    let result;
    let message: string;

    switch (action) {
      case 'confirm':
        result = await confirmAppointment(token);
        message = '✅ Cita confirmada exitosamente';
        break;

      case 'cancel':
        result = await cancelAppointment(token, reason);
        message = '❌ Cita cancelada exitosamente';
        break;

      case 'reschedule':
        if (!newTime) {
          return NextResponse.json(
            {
              success: false,
              error: 'Nueva fecha y hora requerida para reagendar',
            },
            { status: 400 }
          );
        }
        result = await requestReschedule(token, new Date(newTime), reason);
        message = '🔄 Solicitud de reagendamiento enviada al médico';
        break;

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid action',
          },
          { status: 400 }
        );
    }

    logger.info({
      event: 'appointment_confirmation_action',
      action,
      appointmentId: result.id,
      patientId: result.patientId,
    });

    // HIPAA Audit Log: Patient performed action on appointment via confirmation token
    await createAuditLog({
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      action: 'UPDATE',
      resource: 'Appointment',
      resourceId: result.id,
      details: {
        appointmentId: result.id,
        patientId: result.patientId,
        confirmationAction: action,
        accessMethod: 'confirmation_token',
        accessType: 'APPOINTMENT_CONFIRMATION_ACTION',
        ...(action === 'reschedule' && { requestedNewTime: newTime }),
        ...(reason && { reason }),
      },
      success: true,
    });

    return NextResponse.json(
      {
        success: true,
        message,
        data: {
          appointment: {
            id: result.id,
            status: result.status,
            confirmationStatus: result.confirmationStatus,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error({
      event: 'appointment_confirmation_action_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Return user-friendly error messages
    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Error al procesar la solicitud.',
      },
      { status: 500 }
    );
  }
}
