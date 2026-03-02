/**
 * Appointment Status Update API Route
 * PATCH /api/appointments/[id]/status - Update appointment status
 *
 * @compliance HIPAA, createProtectedRoute auth
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { emitAppointmentEvent } from '@/lib/socket-server';

export const dynamic = 'force-dynamic';

const VALID_STATUSES = [
  'SCHEDULED',
  'CONFIRMED',
  'CHECKED_IN',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
] as const;

const StatusUpdateSchema = z.object({
  status: z.enum(VALID_STATUSES),
  notes: z.string().max(2000).optional(),
});

/**
 * PATCH /api/appointments/[id]/status
 * Updates the status of an appointment
 */
export const PATCH = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const appointmentId = context.params?.id;

      if (!appointmentId) {
        return NextResponse.json(
          { error: 'Appointment ID is required' },
          { status: 400 }
        );
      }

      const body = await request.json();
      const parsed = StatusUpdateSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: parsed.error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: 400 }
        );
      }

      const { status, notes } = parsed.data;

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
          { error: 'Appointment not found' },
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
          userId: context.user.id,
          userEmail: context.user.email || 'unknown',
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
        userId: context.user.id,
        userName: context.user.email,
      });

      return NextResponse.json({
        success: true,
        data: { appointment: updatedAppointment },
        message: 'Status updated successfully',
      });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to update appointment status' });
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    rateLimit: { windowMs: 60_000, maxRequests: 60 },
    audit: { action: 'UPDATE', resource: 'Appointment' },
  }
);
