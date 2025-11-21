/**
 * Single Appointment API
 *
 * GET /api/appointments/[id] - Get single appointment
 * PATCH /api/appointments/[id] - Update appointment (with conflict detection)
 * DELETE /api/appointments/[id] - Cancel appointment
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { checkAppointmentConflicts } from '@/lib/appointments/conflict-detection';
import { z } from 'zod';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// ============================================================================
// GET /api/appointments/[id]
// ============================================================================

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const { id } = context.params;

      const appointment = await prisma.appointment.findUnique({
        where: { id },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              tokenId: true,
              email: true,
              phone: true,
              dateOfBirth: true,
            },
          },
          clinician: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              specialty: true,
              licenseNumber: true,
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

      // SECURITY: Verify access
      // Only the assigned clinician, patient, or ADMIN can view
      if (
        appointment.clinicianId !== context.user.id &&
        appointment.patientId !== context.user.id &&
        context.user.role !== 'ADMIN'
      ) {
        return NextResponse.json(
          { error: 'Forbidden: You cannot access this appointment' },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        data: appointment,
      });
    } catch (error: any) {
      console.error('Error fetching appointment:', error);
      return NextResponse.json(
        { error: 'Failed to fetch appointment', details: error.message },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    rateLimit: { windowMs: 60000, maxRequests: 100 },
    audit: { action: 'READ', resource: 'Appointment' },

  }
);

// ============================================================================
// PATCH /api/appointments/[id] - Update Appointment
// ============================================================================

const UpdateAppointmentSchema = z.object({
  patientId: z.string().optional(),
  clinicianId: z.string().optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  startTime: z.string().datetime().optional(), // ISO 8601 string
  endTime: z.string().datetime().optional(), // ISO 8601 string
  timezone: z.string().optional(),
  type: z.enum(['IN_PERSON', 'TELEHEALTH', 'PHONE']).optional(),
  meetingUrl: z.string().url().optional(),
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
});

export const PATCH = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const { id } = context.params;
      const body = await request.json();

      // Validate input
      const validated = UpdateAppointmentSchema.parse(body);

      // Get current appointment
      const currentAppointment = await prisma.appointment.findUnique({
        where: { id },
        select: {
          id: true,
          patientId: true,
          clinicianId: true,
          startTime: true,
          endTime: true,
          status: true,
        },
      });

      if (!currentAppointment) {
        return NextResponse.json(
          { error: 'Appointment not found' },
          { status: 404 }
        );
      }

      // SECURITY: Verify access
      // Only the assigned clinician or ADMIN can update
      if (
        currentAppointment.clinicianId !== context.user.id &&
        context.user.role !== 'ADMIN'
      ) {
        return NextResponse.json(
          { error: 'Forbidden: You cannot update this appointment' },
          { status: 403 }
        );
      }

      // SECURITY: Prevent updating completed appointments (unless admin)
      if (currentAppointment.status === 'COMPLETED' && context.user.role !== 'ADMIN') {
        return NextResponse.json(
          {
            error: 'Cannot update completed appointment',
            details: 'Completed appointments can only be updated by administrators',
          },
          { status: 403 }
        );
      }

      // CRITICAL: Check for conflicts if time or clinician is changing
      const isTimeChanging =
        (validated.startTime && validated.startTime !== currentAppointment.startTime.toISOString()) ||
        (validated.endTime && validated.endTime !== currentAppointment.endTime.toISOString());
      const isClinicianChanging =
        validated.clinicianId && validated.clinicianId !== currentAppointment.clinicianId;

      if (isTimeChanging || isClinicianChanging) {
        const conflictCheck = await checkAppointmentConflicts({
          clinicianId: validated.clinicianId || currentAppointment.clinicianId,
          startTime: validated.startTime ? new Date(validated.startTime) : currentAppointment.startTime,
          endTime: validated.endTime ? new Date(validated.endTime) : currentAppointment.endTime,
          excludeAppointmentId: id, // Exclude current appointment from conflict check
        });

        if (conflictCheck.hasConflict) {
          return NextResponse.json(
            {
              success: false,
              error: 'Appointment conflict detected',
              message: conflictCheck.message,
              conflictingAppointments: conflictCheck.conflictingAppointments.map((apt) => ({
                id: apt.id,
                startTime: apt.startTime,
                endTime: apt.endTime,
              })),
            },
            { status: 409 } // 409 Conflict
          );
        }
      }

      // Prepare update data
      const updateData: any = {};
      if (validated.patientId !== undefined) updateData.patientId = validated.patientId;
      if (validated.clinicianId !== undefined) updateData.clinicianId = validated.clinicianId;
      if (validated.title !== undefined) updateData.title = validated.title;
      if (validated.description !== undefined) updateData.description = validated.description;
      if (validated.startTime !== undefined) updateData.startTime = new Date(validated.startTime);
      if (validated.endTime !== undefined) updateData.endTime = new Date(validated.endTime);
      if (validated.timezone !== undefined) updateData.timezone = validated.timezone;
      if (validated.type !== undefined) updateData.type = validated.type;
      if (validated.meetingUrl !== undefined) updateData.meetingUrl = validated.meetingUrl;
      if (validated.status !== undefined) updateData.status = validated.status;

      // Update appointment
      const updatedAppointment = await prisma.appointment.update({
        where: { id },
        data: updateData,
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              tokenId: true,
              email: true,
              phone: true,
            },
          },
          clinician: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              specialty: true,
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        data: updatedAppointment,
        message: 'Appointment updated successfully',
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: error.errors.map((err) => ({
              field: err.path.join('.'),
              message: err.message,
            })),
          },
          { status: 400 }
        );
      }

      console.error('Error updating appointment:', error);
      return NextResponse.json(
        { error: 'Failed to update appointment', details: error.message },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
    audit: { action: 'UPDATE', resource: 'Appointment' },
  }
);

// ============================================================================
// DELETE /api/appointments/[id] - Cancel Appointment
// ============================================================================

export const DELETE = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const { id } = context.params;

      // Get current appointment
      const appointment = await prisma.appointment.findUnique({
        where: { id },
        select: {
          id: true,
          clinicianId: true,
          status: true,
        },
      });

      if (!appointment) {
        return NextResponse.json(
          { error: 'Appointment not found' },
          { status: 404 }
        );
      }

      // SECURITY: Verify access
      if (
        appointment.clinicianId !== context.user.id &&
        context.user.role !== 'ADMIN'
      ) {
        return NextResponse.json(
          { error: 'Forbidden: You cannot cancel this appointment' },
          { status: 403 }
        );
      }

      // SOFT DELETE: Set status to CANCELLED instead of hard delete
      // This preserves appointment history and audit trail
      const cancelledAppointment = await prisma.appointment.update({
        where: { id },
        data: {
          status: 'CANCELLED',
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Appointment cancelled successfully',
        data: cancelledAppointment,
      });
    } catch (error: any) {
      console.error('Error cancelling appointment:', error);
      return NextResponse.json(
        { error: 'Failed to cancel appointment', details: error.message },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
    rateLimit: { windowMs: 60000, maxRequests: 20 },
    audit: { action: 'DELETE', resource: 'Appointment' },
  }
);
