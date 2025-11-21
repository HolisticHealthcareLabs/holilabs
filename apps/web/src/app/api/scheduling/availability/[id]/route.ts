/**
 * Provider Availability API - Individual Record
 * Industry-grade CRUD operations
 *
 * GET /api/scheduling/availability/[id] - Get single availability
 * PATCH /api/scheduling/availability/[id] - Update availability
 * DELETE /api/scheduling/availability/[id] - Delete availability
 *
 * @module api/scheduling/availability/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { UpdateProviderAvailabilitySchema } from '@/lib/api/schemas/scheduling';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// ============================================================================
// GET /api/scheduling/availability/[id] - Get Single Availability
// ============================================================================

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const { id } = context.params;

    const availability = await prisma.providerAvailability.findUnique({
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

    if (!availability) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Availability schedule not found',
        },
        { status: 404 }
      );
    }

    // Authorization check
    if (
      context.user?.role !== 'ADMIN' &&
      context.user?.id !== availability.clinicianId
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'You can only view your own availability',
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: availability,
    });
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    rateLimit: { windowMs: 60000, maxRequests: 60 },
    audit: { action: 'READ', resource: 'ProviderAvailability' },
    skipCsrf: true,
  }
);

// ============================================================================
// PATCH /api/scheduling/availability/[id] - Update Availability
// ============================================================================

export const PATCH = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const { id } = context.params;
    const validated = context.validatedBody;

    // Fetch existing availability
    const existing = await prisma.providerAvailability.findUnique({
      where: { id },
      select: { id: true, clinicianId: true, dayOfWeek: true },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Availability schedule not found',
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
          message: 'You can only update your own availability',
        },
        { status: 403 }
      );
    }

    // Update availability
    const updated = await prisma.providerAvailability.update({
      where: { id },
      data: validated,
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

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Availability schedule updated successfully',
    });
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
    audit: { action: 'UPDATE', resource: 'ProviderAvailability' },
  }
);

// ============================================================================
// DELETE /api/scheduling/availability/[id] - Delete Availability
// ============================================================================

export const DELETE = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const { id } = context.params;

    // Fetch existing availability
    const existing = await prisma.providerAvailability.findUnique({
      where: { id },
      select: { id: true, clinicianId: true, dayOfWeek: true },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Availability schedule not found',
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
          message: 'You can only delete your own availability',
        },
        { status: 403 }
      );
    }

    // Soft delete by marking as inactive (better for audit trail)
    await prisma.providerAvailability.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: 'Availability schedule deleted successfully',
    });
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
    rateLimit: { windowMs: 60000, maxRequests: 20 },
    audit: { action: 'DELETE', resource: 'ProviderAvailability' },
    skipCsrf: false,
  }
);
