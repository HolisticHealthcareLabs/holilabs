/**
 * Recurring Appointment Series API - Individual Operations
 * Industry-grade recurring series management
 *
 * GET /api/scheduling/recurring/[id] - Get single recurring series
 * PATCH /api/scheduling/recurring/[id] - Update/pause/resume series
 * DELETE /api/scheduling/recurring/[id] - Cancel recurring series
 *
 * @module api/scheduling/recurring/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { UpdateRecurringAppointmentSchema } from '@/lib/api/schemas/scheduling';
import {
  generateRecurringAppointments,
  validateRecurringPattern,
} from '@/lib/scheduling/recurring-generator';
import { addMonths } from 'date-fns';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// ============================================================================
// GET /api/scheduling/recurring/[id] - Get Single Recurring Series
// ============================================================================

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const { id } = context.params;

    const recurringSeries = await prisma.recurringAppointment.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            tokenId: true,
            dateOfBirth: true,
            email: true,
            phone: true,
          },
        },
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            specialty: true,
          },
        },
      },
    });

    if (!recurringSeries) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Recurring appointment series not found',
        },
        { status: 404 }
      );
    }

    // Authorization check: Only owner or admin
    if (
      context.user?.role !== 'ADMIN' &&
      context.user?.id !== recurringSeries.clinicianId
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'You can only view your own recurring series',
        },
        { status: 403 }
      );
    }

    // Fetch generated appointments for this series
    // Match appointments by time pattern (since we don't have direct relation)
    const generatedAppointments = await prisma.appointment.findMany({
      where: {
        patientId: recurringSeries.patientId,
        clinicianId: recurringSeries.clinicianId,
        title: recurringSeries.title,
        startTime: {
          gte: recurringSeries.seriesStart,
          ...(recurringSeries.seriesEnd && {
            lte: recurringSeries.seriesEnd,
          }),
        },
      },
      orderBy: { startTime: 'asc' },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
        type: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...recurringSeries,
        generatedAppointments,
        stats: {
          totalGenerated: generatedAppointments.length,
          scheduled: generatedAppointments.filter((a) => a.status === 'SCHEDULED')
            .length,
          completed: generatedAppointments.filter((a) => a.status === 'COMPLETED')
            .length,
          cancelled: generatedAppointments.filter((a) => a.status === 'CANCELLED')
            .length,
        },
      },
    });
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    rateLimit: { windowMs: 60000, maxRequests: 60 },
    audit: { action: 'READ', resource: 'RecurringAppointment' },
    skipCsrf: true,
  }
);

// ============================================================================
// PATCH /api/scheduling/recurring/[id] - Update/Pause/Resume Series
// ============================================================================

export const PATCH = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const { id } = context.params;
    const validated = context.validatedBody;

    // Fetch existing series
    const existing = await prisma.recurringAppointment.findUnique({
      where: { id },
      select: {
        id: true,
        clinicianId: true,
        patientId: true,
        frequency: true,
        interval: true,
        daysOfWeek: true,
        dayOfMonth: true,
        startTime: true,
        duration: true,
        seriesStart: true,
        seriesEnd: true,
        maxOccurrences: true,
        isActive: true,
        isPaused: true,
        generatedCount: true,
        lastGeneratedDate: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Recurring appointment series not found',
        },
        { status: 404 }
      );
    }

    // Authorization: Only owner or admin can update
    if (
      context.user?.role !== 'ADMIN' &&
      context.user?.id !== existing.clinicianId
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'You can only update your own recurring series',
        },
        { status: 403 }
      );
    }

    // Validate pattern if time/duration fields are being updated
    if (validated.startTime || validated.duration || validated.seriesEnd) {
      const patternToValidate = {
        frequency: existing.frequency,
        interval: existing.interval,
        daysOfWeek: existing.daysOfWeek,
        dayOfMonth: existing.dayOfMonth,
        startTime: validated.startTime || existing.startTime,
        duration: validated.duration || existing.duration,
        seriesStart: existing.seriesStart,
        seriesEnd: validated.seriesEnd || existing.seriesEnd,
        maxOccurrences: validated.maxOccurrences || existing.maxOccurrences,
      };

      const patternValidation = validateRecurringPattern(patternToValidate);

      if (!patternValidation.valid) {
        return NextResponse.json(
          {
            success: false,
            error: 'INVALID_PATTERN',
            message: 'Invalid recurrence pattern',
            errors: patternValidation.errors,
          },
          { status: 400 }
        );
      }
    }

    // If extending series end date or max occurrences, generate new appointments
    let newAppointmentsGenerated = 0;
    if (
      (validated.seriesEnd && validated.seriesEnd > (existing.seriesEnd || new Date())) ||
      (validated.maxOccurrences && validated.maxOccurrences > (existing.maxOccurrences || 0))
    ) {
      // Generate additional appointments
      const pattern = {
        frequency: existing.frequency,
        interval: existing.interval,
        daysOfWeek: existing.daysOfWeek,
        dayOfMonth: existing.dayOfMonth,
        startTime: validated.startTime || existing.startTime,
        duration: validated.duration || existing.duration,
        seriesStart: existing.lastGeneratedDate || existing.seriesStart,
        seriesEnd: validated.seriesEnd || existing.seriesEnd,
        maxOccurrences: validated.maxOccurrences || existing.maxOccurrences,
      };

      const generateUpTo = validated.seriesEnd || addMonths(new Date(), 3);
      const newSlots = generateRecurringAppointments(
        pattern,
        generateUpTo,
        100 // Max 100 new appointments at once
      );

      // Filter out already generated slots
      const slotsToCreate = newSlots.filter(
        (slot) =>
          !existing.lastGeneratedDate || slot.startTime > existing.lastGeneratedDate
      );

      if (slotsToCreate.length > 0) {
        // Create new appointment instances
        const createdAppointments = await Promise.all(
          slotsToCreate.map((slot) =>
            prisma.appointment.create({
              data: {
                patientId: existing.patientId,
                clinicianId: existing.clinicianId,
                title: validated.title || `Recurring: ${existing.id}`,
                description: validated.description,
                startTime: slot.startTime,
                endTime: slot.endTime,
                timezone: 'America/Mexico_City',
                type: 'IN_PERSON', // TODO: Get from series config
                status: 'SCHEDULED',
              },
            })
          )
        );

        newAppointmentsGenerated = createdAppointments.length;
      }
    }

    // Update the series
    const updated = await prisma.recurringAppointment.update({
      where: { id },
      data: {
        ...validated,
        ...(newAppointmentsGenerated > 0 && {
          generatedCount: existing.generatedCount + newAppointmentsGenerated,
        }),
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            tokenId: true,
          },
        },
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            specialty: true,
          },
        },
      },
    });

    // If series was paused/resumed, update future appointments
    if (validated.isPaused !== undefined && validated.isPaused !== existing.isPaused) {
      const statusUpdate = validated.isPaused ? 'CANCELLED' : 'SCHEDULED';

      await prisma.appointment.updateMany({
        where: {
          patientId: existing.patientId,
          clinicianId: existing.clinicianId,
          startTime: { gte: new Date() },
          status: validated.isPaused ? 'SCHEDULED' : 'CANCELLED',
        },
        data: {
          status: statusUpdate,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: validated.isPaused
        ? 'Recurring series paused'
        : validated.isActive === false
        ? 'Recurring series cancelled'
        : 'Recurring series updated',
      newAppointmentsGenerated,
    });
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
    audit: { action: 'UPDATE', resource: 'RecurringAppointment' },
    bodySchema: UpdateRecurringAppointmentSchema,
  }
);

// ============================================================================
// DELETE /api/scheduling/recurring/[id] - Cancel Recurring Series
// ============================================================================

export const DELETE = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const { id } = context.params;

    // Fetch existing series
    const existing = await prisma.recurringAppointment.findUnique({
      where: { id },
      select: {
        id: true,
        clinicianId: true,
        patientId: true,
        isActive: true,
        generatedCount: true,
        title: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Recurring appointment series not found',
        },
        { status: 404 }
      );
    }

    // Authorization check
    if (
      context.user?.role !== 'ADMIN' &&
      context.user?.id !== existing.clinicianId
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'You can only cancel your own recurring series',
        },
        { status: 403 }
      );
    }

    // Check if already cancelled
    if (!existing.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_STATE',
          message: 'Recurring series is already cancelled',
        },
        { status: 400 }
      );
    }

    // Soft delete by marking as inactive
    await prisma.recurringAppointment.update({
      where: { id },
      data: {
        isActive: false,
        isPaused: true,
      },
    });

    // Cancel all future appointments in this series
    const cancelledResult = await prisma.appointment.updateMany({
      where: {
        patientId: existing.patientId,
        clinicianId: existing.clinicianId,
        title: existing.title,
        startTime: { gte: new Date() },
        status: {
          in: ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN'],
        },
      },
      data: {
        status: 'CANCELLED',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Recurring appointment series cancelled successfully',
      affectedAppointments: cancelledResult.count,
    });
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
    rateLimit: { windowMs: 60000, maxRequests: 20 },
    audit: { action: 'DELETE', resource: 'RecurringAppointment' },
    skipCsrf: false,
  }
);
