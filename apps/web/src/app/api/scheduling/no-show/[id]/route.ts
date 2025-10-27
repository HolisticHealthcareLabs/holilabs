/**
 * No-Show Record API - Individual Operations
 * Industry-grade no-show record tracking and updates
 *
 * GET /api/scheduling/no-show/[id] - Get single no-show record
 * PATCH /api/scheduling/no-show/[id] - Update no-show record (contact, fees)
 * DELETE /api/scheduling/no-show/[id] - Delete no-show record (admin only)
 *
 * @module api/scheduling/no-show/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { UpdateNoShowSchema } from '@/lib/api/schemas/scheduling';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// ============================================================================
// GET /api/scheduling/no-show/[id] - Get Single No-Show Record
// ============================================================================

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const { id } = context.params;

    const noShowRecord = await prisma.noShowHistory.findUnique({
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
            description: true,
            type: true,
            status: true,
          },
        },
      },
    });

    if (!noShowRecord) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'No-show record not found',
        },
        { status: 404 }
      );
    }

    // Authorization check
    if (
      context.user?.role !== 'ADMIN' &&
      context.user?.id !== noShowRecord.clinicianId
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'You can only view your own no-show records',
        },
        { status: 403 }
      );
    }

    // Get patient's no-show history
    const patientNoShows = await prisma.noShowHistory.count({
      where: { patientId: noShowRecord.patientId },
    });

    const patientTotalAppointments = await prisma.appointment.count({
      where: {
        patientId: noShowRecord.patientId,
        status: {
          in: ['COMPLETED', 'NO_SHOW', 'CANCELLED'],
        },
      },
    });

    const patientNoShowRate =
      patientTotalAppointments > 0
        ? Math.round((patientNoShows / patientTotalAppointments) * 100)
        : 0;

    return NextResponse.json({
      success: true,
      data: {
        ...noShowRecord,
        patientAnalytics: {
          totalNoShows: patientNoShows,
          totalAppointments: patientTotalAppointments,
          noShowRate: patientNoShowRate,
        },
      },
    });
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    rateLimit: { windowMs: 60000, maxRequests: 60 },
    audit: { action: 'READ', resource: 'NoShowHistory' },
    skipCsrf: true,
  }
);

// ============================================================================
// PATCH /api/scheduling/no-show/[id] - Update No-Show Record
// ============================================================================

export const PATCH = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const { id } = context.params;
    const validated = context.validatedBody;

    // Fetch existing record
    const existing = await prisma.noShowHistory.findUnique({
      where: { id },
      select: {
        id: true,
        clinicianId: true,
        patientId: true,
        contacted: true,
        feeCharged: true,
        feePaid: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'No-show record not found',
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
          message: 'You can only update your own no-show records',
        },
        { status: 403 }
      );
    }

    // Business logic validations
    if (validated.feePaid && !existing.feeCharged) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_STATE',
          message: 'Cannot mark fee as paid when no fee was charged',
        },
        { status: 400 }
      );
    }

    if (validated.feeAmount && !validated.feeCharged && !existing.feeCharged) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_STATE',
          message: 'Cannot set fee amount without charging a fee',
        },
        { status: 400 }
      );
    }

    // Update the no-show record
    const updated = await prisma.noShowHistory.update({
      where: { id },
      data: {
        ...validated,
        ...(validated.contacted && !existing.contacted && {
          contactedAt: new Date(),
        }),
        ...(validated.feePaid && !existing.feePaid && {
          feePaidAt: new Date(),
        }),
      },
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
          },
        },
      },
    });

    // TODO: If patient accepted to reschedule, send notification or create follow-up task
    // TODO: If fee was paid, update accounting/billing system

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'No-show record updated successfully',
    });
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
    audit: { action: 'UPDATE', resource: 'NoShowHistory' },
    bodySchema: UpdateNoShowSchema,
  }
);

// ============================================================================
// DELETE /api/scheduling/no-show/[id] - Delete No-Show Record (Admin Only)
// ============================================================================

export const DELETE = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const { id } = context.params;

    // Fetch existing record
    const existing = await prisma.noShowHistory.findUnique({
      where: { id },
      select: {
        id: true,
        appointmentId: true,
        patientId: true,
        clinicianId: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'No-show record not found',
        },
        { status: 404 }
      );
    }

    // Delete transaction: Remove no-show record + Revert appointment status
    await prisma.$transaction([
      prisma.noShowHistory.delete({
        where: { id },
      }),
      prisma.appointment.update({
        where: { id: existing.appointmentId },
        data: { status: 'CANCELLED' }, // Revert to cancelled instead of no-show
      }),
    ]);

    // TODO: If fee was charged, notify accounting system to reverse charge

    return NextResponse.json({
      success: true,
      message: 'No-show record deleted and appointment status reverted',
    });
  },
  {
    roles: ['ADMIN'], // Only admins can delete no-show records
    rateLimit: { windowMs: 60000, maxRequests: 10 },
    audit: { action: 'DELETE', resource: 'NoShowHistory' },
    skipCsrf: false,
  }
);
