/**
 * Provider Time Off API
 * Industry-grade vacation and blocked time management
 *
 * POST /api/scheduling/time-off - Request time off
 * GET /api/scheduling/time-off - List time off requests
 *
 * @module api/scheduling/time-off
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import {
  CreateTimeOffSchema,
  QueryTimeOffSchema,
} from '@/lib/api/schemas/scheduling';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// ============================================================================
// POST /api/scheduling/time-off - Request Time Off
// ============================================================================

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const validated = context.validatedBody;

    // Authorization: Only clinician themselves or admin can create their time off
    if (
      context.user?.role !== 'ADMIN' &&
      context.user?.id !== validated.clinicianId
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'You can only request time off for yourself',
        },
        { status: 403 }
      );
    }

    // Verify clinician exists
    const clinician = await prisma.user.findUnique({
      where: { id: validated.clinicianId },
      select: { id: true, role: true, firstName: true, lastName: true },
    });

    if (!clinician) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Clinician not found',
        },
        { status: 404 }
      );
    }

    if (clinician.role !== 'CLINICIAN' && clinician.role !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_ROLE',
          message: 'User is not a clinician',
        },
        { status: 400 }
      );
    }

    // Check for overlapping time off
    const overlapping = await prisma.providerTimeOff.findFirst({
      where: {
        clinicianId: validated.clinicianId,
        status: {
          in: ['PENDING', 'APPROVED'], // Don't check against rejected/cancelled
        },
        OR: [
          // New request starts within existing time off
          {
            AND: [
              { startDate: { lte: validated.startDate } },
              { endDate: { gte: validated.startDate } },
            ],
          },
          // New request ends within existing time off
          {
            AND: [
              { startDate: { lte: validated.endDate } },
              { endDate: { gte: validated.endDate } },
            ],
          },
          // New request completely contains existing time off
          {
            AND: [
              { startDate: { gte: validated.startDate } },
              { endDate: { lte: validated.endDate } },
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
          message: 'Time off request overlaps with existing time off',
          existingId: overlapping.id,
          existingDates: {
            start: overlapping.startDate,
            end: overlapping.endDate,
            status: overlapping.status,
          },
        },
        { status: 409 }
      );
    }

    // Count affected appointments
    const affectedAppointments = await prisma.appointment.count({
      where: {
        clinicianId: validated.clinicianId,
        startTime: {
          gte: validated.startDate,
          lte: validated.endDate,
        },
        status: {
          in: ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN'],
        },
      },
    });

    // Determine initial status
    // BLOCKED type is auto-approved (admin blocking time)
    // Others default to PENDING or APPROVED based on role
    let initialStatus: 'PENDING' | 'APPROVED' = 'PENDING';
    if (validated.type === 'BLOCKED' || context.user?.role === 'ADMIN') {
      initialStatus = 'APPROVED';
    }

    // Create time off request
    const timeOff = await prisma.providerTimeOff.create({
      data: {
        clinicianId: validated.clinicianId,
        startDate: validated.startDate,
        endDate: validated.endDate,
        type: validated.type,
        reason: validated.reason,
        allDay: validated.allDay,
        startTime: validated.startTime,
        endTime: validated.endTime,
        status: initialStatus,
        approvedBy: initialStatus === 'APPROVED' ? context.user?.id : null,
        approvedAt: initialStatus === 'APPROVED' ? new Date() : null,
        affectedAppointments,
      },
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

    return NextResponse.json(
      {
        success: true,
        data: timeOff,
        message:
          initialStatus === 'APPROVED'
            ? 'Time off approved'
            : 'Time off request submitted for approval',
        affectedAppointments,
      },
      { status: 201 }
    );
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
    rateLimit: { windowMs: 60000, maxRequests: 20 },
    audit: { action: 'CREATE', resource: 'ProviderTimeOff' },
  }
);

// ============================================================================
// GET /api/scheduling/time-off - List Time Off Requests
// ============================================================================

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const query = context.validatedQuery || {};

    // Build where clause
    const where: any = {};

    if (query.clinicianId) {
      where.clinicianId = query.clinicianId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.type) {
      where.type = query.type;
    }

    // Date range filter
    if (query.startDate || query.endDate) {
      where.OR = [
        // Time off starts within query range
        {
          startDate: {
            gte: query.startDate,
            lte: query.endDate || new Date('2099-12-31'),
          },
        },
        // Time off ends within query range
        {
          endDate: {
            gte: query.startDate || new Date('1900-01-01'),
            lte: query.endDate || new Date('2099-12-31'),
          },
        },
        // Time off completely contains query range
        {
          AND: [
            { startDate: { lte: query.startDate || new Date() } },
            { endDate: { gte: query.endDate || new Date() } },
          ],
        },
      ];
    }

    // Authorization: Non-admins can only see their own time off
    if (context.user?.role !== 'ADMIN') {
      where.clinicianId = context.user?.id;
    }

    const timeOffRequests = await prisma.providerTimeOff.findMany({
      where,
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
      orderBy: { startDate: 'asc' },
    });

    // Calculate statistics
    const stats = {
      total: timeOffRequests.length,
      pending: timeOffRequests.filter((t) => t.status === 'PENDING').length,
      approved: timeOffRequests.filter((t) => t.status === 'APPROVED').length,
      rejected: timeOffRequests.filter((t) => t.status === 'REJECTED').length,
      cancelled: timeOffRequests.filter((t) => t.status === 'CANCELLED').length,
      totalAffectedAppointments: timeOffRequests.reduce(
        (sum, t) => sum + t.affectedAppointments,
        0
      ),
    };

    return NextResponse.json({
      success: true,
      data: timeOffRequests,
      stats,
      count: timeOffRequests.length,
    });
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    rateLimit: { windowMs: 60000, maxRequests: 60 },
    audit: { action: 'READ', resource: 'ProviderTimeOff' },
    skipCsrf: true,
  }
);
