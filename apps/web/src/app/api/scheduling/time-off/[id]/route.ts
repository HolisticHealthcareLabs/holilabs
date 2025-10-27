/**
 * Provider Time Off API - Individual Record
 * Industry-grade time off management with approval workflow
 *
 * GET /api/scheduling/time-off/[id] - Get single time off request
 * PATCH /api/scheduling/time-off/[id] - Update/approve/reject time off
 * DELETE /api/scheduling/time-off/[id] - Cancel time off request
 *
 * @module api/scheduling/time-off/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { UpdateTimeOffSchema } from '@/lib/api/schemas/scheduling';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// ============================================================================
// GET /api/scheduling/time-off/[id] - Get Single Time Off Request
// ============================================================================

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const { id } = context.params;

    const timeOff = await prisma.providerTimeOff.findUnique({
      where: { id },
      include: {
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

    if (!timeOff) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Time off request not found',
        },
        { status: 404 }
      );
    }

    // Authorization check
    if (
      context.user?.role !== 'ADMIN' &&
      context.user?.id !== timeOff.clinicianId
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'You can only view your own time off requests',
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: timeOff,
    });
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    rateLimit: { windowMs: 60000, maxRequests: 60 },
    audit: { action: 'READ', resource: 'ProviderTimeOff' },
    skipCsrf: true,
  }
);

// ============================================================================
// PATCH /api/scheduling/time-off/[id] - Update/Approve/Reject Time Off
// ============================================================================

export const PATCH = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const { id } = context.params;
    const validated = context.validatedBody;

    // Fetch existing time off
    const existing = await prisma.providerTimeOff.findUnique({
      where: { id },
      select: {
        id: true,
        clinicianId: true,
        status: true,
        startDate: true,
        endDate: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Time off request not found',
        },
        { status: 404 }
      );
    }

    // Authorization logic
    const isOwner = context.user?.id === existing.clinicianId;
    const isAdmin = context.user?.role === 'ADMIN';

    // Only owner can update details (dates, reason, etc.)
    // Only admin can approve/reject
    if (validated.status && !isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'Only administrators can approve or reject time off requests',
        },
        { status: 403 }
      );
    }

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'You can only update your own time off requests',
        },
        { status: 403 }
      );
    }

    // Validate state transitions
    if (validated.status) {
      // Can't update status of already approved/rejected requests (must cancel first)
      if (
        existing.status === 'APPROVED' &&
        validated.status !== 'CANCELLED'
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'INVALID_STATUS_TRANSITION',
            message: 'Approved time off can only be cancelled',
          },
          { status: 400 }
        );
      }

      if (
        existing.status === 'REJECTED' &&
        validated.status !== 'PENDING'
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'INVALID_STATUS_TRANSITION',
            message: 'Rejected time off can only be resubmitted as pending',
          },
          { status: 400 }
        );
      }
    }

    // If dates are being updated, check for conflicts
    if (validated.startDate || validated.endDate) {
      const newStartDate = validated.startDate || existing.startDate;
      const newEndDate = validated.endDate || existing.endDate;

      const overlapping = await prisma.providerTimeOff.findFirst({
        where: {
          id: { not: id }, // Exclude current request
          clinicianId: existing.clinicianId,
          status: {
            in: ['PENDING', 'APPROVED'],
          },
          OR: [
            {
              AND: [
                { startDate: { lte: newStartDate } },
                { endDate: { gte: newStartDate } },
              ],
            },
            {
              AND: [
                { startDate: { lte: newEndDate } },
                { endDate: { gte: newEndDate } },
              ],
            },
            {
              AND: [
                { startDate: { gte: newStartDate } },
                { endDate: { lte: newEndDate } },
              ],
            },
          ],
        },
      });

      if (overlapping) {
        return NextResponse.json(
          {
            success: false,
            error: 'CONFLICT',
            message: 'Updated dates overlap with existing time off',
            existingId: overlapping.id,
          },
          { status: 409 }
        );
      }
    }

    // Prepare update data
    const updateData: any = { ...validated };

    // If approving, set approval metadata
    if (validated.status === 'APPROVED' && existing.status !== 'APPROVED') {
      updateData.approvedBy = context.user?.id;
      updateData.approvedAt = new Date();
    }

    // If rejecting, ensure rejection reason is provided
    if (validated.status === 'REJECTED' && !validated.rejectionReason) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Rejection reason is required when rejecting time off',
        },
        { status: 400 }
      );
    }

    // Update time off
    const updated = await prisma.providerTimeOff.update({
      where: { id },
      data: updateData,
      include: {
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

    // TODO: Send notification to clinician if status changed
    // TODO: If approved, notify patients with affected appointments

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Time off request ${validated.status ? validated.status.toLowerCase() : 'updated'}`,
    });
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
    audit: { action: 'UPDATE', resource: 'ProviderTimeOff' },
    bodySchema: UpdateTimeOffSchema,
  }
);

// ============================================================================
// DELETE /api/scheduling/time-off/[id] - Cancel Time Off Request
// ============================================================================

export const DELETE = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const { id } = context.params;

    // Fetch existing time off
    const existing = await prisma.providerTimeOff.findUnique({
      where: { id },
      select: {
        id: true,
        clinicianId: true,
        status: true,
        startDate: true,
        endDate: true,
        affectedAppointments: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Time off request not found',
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
          message: 'You can only cancel your own time off requests',
        },
        { status: 403 }
      );
    }

    // Can't delete rejected requests (already rejected)
    if (existing.status === 'REJECTED') {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_STATE',
          message: 'Cannot cancel rejected time off requests',
        },
        { status: 400 }
      );
    }

    // Can't delete cancelled requests
    if (existing.status === 'CANCELLED') {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_STATE',
          message: 'Time off request is already cancelled',
        },
        { status: 400 }
      );
    }

    // Soft delete by marking as cancelled
    await prisma.providerTimeOff.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
    });

    // TODO: Notify patients with affected appointments that provider is back

    return NextResponse.json({
      success: true,
      message: 'Time off request cancelled successfully',
      affectedAppointments: existing.affectedAppointments,
    });
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
    rateLimit: { windowMs: 60000, maxRequests: 20 },
    audit: { action: 'DELETE', resource: 'ProviderTimeOff' },
    skipCsrf: false,
  }
);
