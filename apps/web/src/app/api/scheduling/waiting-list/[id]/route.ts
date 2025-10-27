/**
 * Waiting List Entry API - Individual Operations
 * Industry-grade waiting list entry management and conversion
 *
 * GET /api/scheduling/waiting-list/[id] - Get single waiting list entry
 * PATCH /api/scheduling/waiting-list/[id] - Update entry (notify, accept, convert)
 * DELETE /api/scheduling/waiting-list/[id] - Remove from waiting list
 *
 * @module api/scheduling/waiting-list/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { UpdateWaitingListSchema } from '@/lib/api/schemas/scheduling';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// ============================================================================
// GET /api/scheduling/waiting-list/[id] - Get Single Waiting List Entry
// ============================================================================

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const { id } = context.params;

    const entry = await prisma.waitingList.findUnique({
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
        appointment: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            title: true,
            type: true,
            status: true,
          },
        },
      },
    });

    if (!entry) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Waiting list entry not found',
        },
        { status: 404 }
      );
    }

    // Authorization check
    if (
      context.user?.role !== 'ADMIN' &&
      context.user?.id !== entry.clinicianId
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'You can only view your own waiting list entries',
        },
        { status: 403 }
      );
    }

    // Calculate wait time
    const waitTimeDays = Math.floor(
      (new Date().getTime() - entry.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Get queue position
    const position = await prisma.waitingList.count({
      where: {
        clinicianId: entry.clinicianId,
        status: 'WAITING',
        OR: [
          { priority: { gt: entry.priority } },
          {
            AND: [
              { priority: entry.priority },
              { createdAt: { lte: entry.createdAt } },
            ],
          },
        ],
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...entry,
        waitTimeDays,
        queuePosition: position,
        isExpired: entry.expiresAt ? entry.expiresAt < new Date() : false,
      },
    });
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    rateLimit: { windowMs: 60000, maxRequests: 60 },
    audit: { action: 'READ', resource: 'WaitingList' },
    skipCsrf: true,
  }
);

// ============================================================================
// PATCH /api/scheduling/waiting-list/[id] - Update Waiting List Entry
// ============================================================================

export const PATCH = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const { id } = context.params;
    const validated = context.validatedBody;

    // Fetch existing entry
    const existing = await prisma.waitingList.findUnique({
      where: { id },
      select: {
        id: true,
        patientId: true,
        clinicianId: true,
        status: true,
        priority: true,
        appointmentId: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Waiting list entry not found',
        },
        { status: 404 }
      );
    }

    // Authorization: Only assigned clinician or admin can update
    if (
      context.user?.role !== 'ADMIN' &&
      context.user?.id !== existing.clinicianId
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'You can only update your own waiting list entries',
        },
        { status: 403 }
      );
    }

    // Validate state transitions
    if (validated.status) {
      // Can't change status if already converted
      if (existing.status === 'CONVERTED' && validated.status !== 'CONVERTED') {
        return NextResponse.json(
          {
            success: false,
            error: 'INVALID_STATE_TRANSITION',
            message: 'Cannot change status of converted entry',
          },
          { status: 400 }
        );
      }

      // Converting requires appointmentId
      if (validated.status === 'CONVERTED' && !validated.appointmentId) {
        return NextResponse.json(
          {
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Appointment ID required when converting to appointment',
          },
          { status: 400 }
        );
      }

      // If converting, verify appointment exists and is for correct patient/clinician
      if (validated.status === 'CONVERTED' && validated.appointmentId) {
        const appointment = await prisma.appointment.findUnique({
          where: { id: validated.appointmentId },
          select: {
            id: true,
            patientId: true,
            clinicianId: true,
            status: true,
          },
        });

        if (!appointment) {
          return NextResponse.json(
            {
              success: false,
              error: 'NOT_FOUND',
              message: 'Appointment not found',
            },
            { status: 404 }
          );
        }

        if (
          appointment.patientId !== existing.patientId ||
          appointment.clinicianId !== existing.clinicianId
        ) {
          return NextResponse.json(
            {
              success: false,
              error: 'VALIDATION_ERROR',
              message: 'Appointment must be for the same patient and clinician',
            },
            { status: 400 }
          );
        }
      }
    }

    // Prepare update data
    const updateData: any = { ...validated };

    // Set timestamps based on status changes
    if (validated.status === 'NOTIFIED' && existing.status !== 'NOTIFIED') {
      updateData.notifiedAt = new Date();
    }

    if (validated.status === 'ACCEPTED' && existing.status !== 'ACCEPTED') {
      updateData.respondedAt = new Date();
    }

    if (validated.status === 'DECLINED' && existing.status !== 'DECLINED') {
      updateData.respondedAt = new Date();
    }

    if (validated.status === 'CONVERTED' && existing.status !== 'CONVERTED') {
      updateData.convertedAt = new Date();
    }

    // Update the entry
    const updated = await prisma.waitingList.update({
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
            email: true,
            specialty: true,
          },
        },
        appointment: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            title: true,
            type: true,
            status: true,
          },
        },
      },
    });

    // TODO: Send notification based on status change
    // - NOTIFIED: Send slot availability notification to patient
    // - ACCEPTED: Send confirmation and next steps
    // - DECLINED: Update queue and notify next patient
    // - CONVERTED: Send appointment confirmation

    return NextResponse.json({
      success: true,
      data: updated,
      message: getStatusChangeMessage(validated.status, existing.status),
    });
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
    audit: { action: 'UPDATE', resource: 'WaitingList' },
    bodySchema: UpdateWaitingListSchema,
  }
);

// ============================================================================
// DELETE /api/scheduling/waiting-list/[id] - Remove from Waiting List
// ============================================================================

export const DELETE = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const { id } = context.params;

    // Fetch existing entry
    const existing = await prisma.waitingList.findUnique({
      where: { id },
      select: {
        id: true,
        patientId: true,
        clinicianId: true,
        status: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Waiting list entry not found',
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
          message: 'You can only remove your own waiting list entries',
        },
        { status: 403 }
      );
    }

    // Prevent deletion of converted entries (keep for audit trail)
    if (existing.status === 'CONVERTED') {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_STATE',
          message: 'Cannot delete converted waiting list entries',
        },
        { status: 400 }
      );
    }

    // Soft delete by marking as EXPIRED
    await prisma.waitingList.update({
      where: { id },
      data: {
        status: 'EXPIRED',
      },
    });

    // TODO: Notify patient that they've been removed from waiting list

    return NextResponse.json({
      success: true,
      message: 'Patient removed from waiting list',
    });
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    rateLimit: { windowMs: 60000, maxRequests: 20 },
    audit: { action: 'DELETE', resource: 'WaitingList' },
    skipCsrf: false,
  }
);

// ============================================================================
// Helper Functions
// ============================================================================

function getStatusChangeMessage(
  newStatus: string | undefined,
  oldStatus: string
): string {
  if (!newStatus || newStatus === oldStatus) {
    return 'Waiting list entry updated';
  }

  switch (newStatus) {
    case 'NOTIFIED':
      return 'Patient notified of available slot';
    case 'ACCEPTED':
      return 'Patient accepted slot offer';
    case 'DECLINED':
      return 'Patient declined slot offer';
    case 'EXPIRED':
      return 'Waiting list entry expired';
    case 'CONVERTED':
      return 'Successfully converted to appointment';
    default:
      return 'Waiting list entry updated';
  }
}
