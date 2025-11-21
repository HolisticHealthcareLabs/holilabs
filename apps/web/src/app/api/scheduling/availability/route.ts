/**
 * Provider Availability API
 * Industry-grade endpoint with full middleware stack
 *
 * POST /api/scheduling/availability - Create availability schedule
 * GET /api/scheduling/availability - List availability schedules
 *
 * @module api/scheduling/availability
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import {
  CreateProviderAvailabilitySchema,
  QueryProviderAvailabilitySchema,
} from '@/lib/api/schemas/scheduling';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// ============================================================================
// POST /api/scheduling/availability - Create Provider Availability
// ============================================================================

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const validated = context.validatedBody;

    // Authorization: Only clinician themselves or admin can set their availability
    if (
      context.user?.role !== 'ADMIN' &&
      context.user?.id !== validated.clinicianId
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'You can only set your own availability',
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

    // Check for overlapping availability for the same day
    const existingAvailability = await prisma.providerAvailability.findFirst({
      where: {
        clinicianId: validated.clinicianId,
        dayOfWeek: validated.dayOfWeek,
        isActive: true,
        OR: [
          // No effective dates set (permanent schedule)
          {
            effectiveFrom: { lte: validated.effectiveFrom || new Date() },
            effectiveUntil: null,
          },
          // Has effective dates that overlap
          {
            effectiveFrom: { lte: validated.effectiveUntil || new Date('2099-12-31') },
            effectiveUntil: { gte: validated.effectiveFrom || new Date() },
          },
        ],
      },
    });

    if (existingAvailability) {
      return NextResponse.json(
        {
          success: false,
          error: 'CONFLICT',
          message: `Availability already exists for ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][validated.dayOfWeek]} in this date range`,
          existingId: existingAvailability.id,
        },
        { status: 409 }
      );
    }

    // Create availability
    const availability = await prisma.providerAvailability.create({
      data: {
        clinicianId: validated.clinicianId,
        dayOfWeek: validated.dayOfWeek,
        startTime: validated.startTime,
        endTime: validated.endTime,
        breakStart: validated.breakStart,
        breakEnd: validated.breakEnd,
        slotDuration: validated.slotDuration,
        maxBookings: validated.maxBookings,
        effectiveFrom: validated.effectiveFrom || new Date(),
        effectiveUntil: validated.effectiveUntil,
        isActive: true,
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
        data: availability,
        message: 'Availability schedule created successfully',
      },
      { status: 201 }
    );
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
    rateLimit: { windowMs: 60000, maxRequests: 20 }, // 20 requests per minute
    audit: { action: 'CREATE', resource: 'ProviderAvailability' },
  }
);

// ============================================================================
// GET /api/scheduling/availability - List Provider Availability
// ============================================================================

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const query = context.validatedQuery || {};

    // Build where clause
    const where: any = {
      isActive: query.isActive ?? true,
    };

    if (query.clinicianId) {
      where.clinicianId = query.clinicianId;
    }

    if (query.dayOfWeek !== undefined) {
      where.dayOfWeek = query.dayOfWeek;
    }

    // Filter by effective date
    if (query.effectiveDate) {
      where.AND = [
        { effectiveFrom: { lte: query.effectiveDate } },
        {
          OR: [
            { effectiveUntil: null },
            { effectiveUntil: { gte: query.effectiveDate } },
          ],
        },
      ];
    }

    // Authorization: Non-admins can only see their own availability
    if (context.user?.role !== 'ADMIN') {
      where.clinicianId = context.user?.id;
    }

    const availability = await prisma.providerAvailability.findMany({
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
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    // Group by day of week for easier consumption
    const groupedByDay = availability.reduce((acc, item) => {
      const dayName = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ][item.dayOfWeek];

      if (!acc[dayName]) {
        acc[dayName] = [];
      }
      acc[dayName].push(item);
      return acc;
    }, {} as Record<string, typeof availability>);

    return NextResponse.json({
      success: true,
      data: availability,
      grouped: groupedByDay,
      count: availability.length,
    });
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    rateLimit: { windowMs: 60000, maxRequests: 60 },
    audit: { action: 'READ', resource: 'ProviderAvailability' },
    skipCsrf: true,
  }
);
