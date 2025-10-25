/**
 * Appointment Status Update API Route
 * PATCH /api/appointments/[id]/status - Update appointment status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
// FIXME: Old rate limiting API - needs refactor to use checkRateLimit
// import { rateLimit } from '@/lib/rate-limit';

// FIXME: Old rate limiting - commented out for now
// const limiter = rateLimit({
//   interval: 60 * 1000,
//   uniqueTokenPerInterval: 500,
// });

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
    // FIXME: Rate limiting disabled - needs refactor
    // await limiter.check(request, 30, 'APPOINTMENT_STATUS_UPDATE');

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

    return NextResponse.json({
      success: true,
      data: { appointment: updatedAppointment },
      message: 'Status updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating appointment status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update status' },
      { status: 500 }
    );
  }
}
