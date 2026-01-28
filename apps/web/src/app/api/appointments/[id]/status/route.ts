/**
 * Appointment Status Update API Route
 * PATCH /api/appointments/[id]/status - Update appointment status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { emitAppointmentEvent } from '@/lib/socket-server';

const VALID_STATUSES = [
  'SCHEDULED',
  'CONFIRMED',
  'CHECKED_IN',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
] as const;

/**
 * PATCH /api/appointments/[id]/status
 * Updates the status of an appointment
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Apply rate limiting - 60 requests per minute for appointments
    const rateLimitResponse = await checkRateLimit(request, 'appointments');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const appointmentId = params.id;
    const body = await request.json();
    const { status, notes } = body;

    // Validation
    if (!status) {
      return NextResponse.json(
        { success: false, error: 'status is required' },
        { status: 400 }
      );
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    // Verify appointment exists
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

    // Update appointment status
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status,
        // Auto-update confirmationStatus based on status
        confirmationStatus: status === 'CONFIRMED' ? 'CONFIRMED' : appointment.confirmationStatus,
        // Set confirmedAt if status is CONFIRMED
        confirmedAt: status === 'CONFIRMED' && !appointment.confirmedAt ? new Date() : appointment.confirmedAt,
      },
      include: {
        patient: true,
        clinician: true,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        action: 'UPDATE',
        resource: 'Appointment',
        resourceId: appointmentId,
        details: {
          field: 'status',
          oldValue: appointment.status,
          newValue: status,
          notes,
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || undefined,
      },
    });

    // Determine action type based on status change
    let action: 'created' | 'updated' | 'cancelled' | 'completed' = 'updated';
    if (status === 'CANCELLED') {
      action = 'cancelled';
    } else if (status === 'COMPLETED') {
      action = 'completed';
    }

    // Real-time Socket.IO broadcast for appointment status change
    emitAppointmentEvent({
      id: updatedAppointment.id,
      action,
      patientId: updatedAppointment.patientId,
      patientName: updatedAppointment.patient
        ? `${updatedAppointment.patient.firstName} ${updatedAppointment.patient.lastName}`
        : undefined,
      clinicianId: updatedAppointment.clinicianId,
      clinicianName: updatedAppointment.clinician
        ? `${updatedAppointment.clinician.firstName} ${updatedAppointment.clinician.lastName}`
        : undefined,
      appointmentType: updatedAppointment.type || undefined,
      startTime: updatedAppointment.startTime,
      userId: (session.user as any).id,
      userName: (session.user as any).name || (session.user as any).email,
    });

    return NextResponse.json({
      success: true,
      data: { appointment: updatedAppointment },
      message: 'Status updated successfully',
    });
  } catch (error: any) {
    logger.error({
      event: 'appointment_status_update_failed',
      appointmentId: params.id,
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { success: false, error: 'Failed to update status' },
      { status: 500 }
    );
  }
}
