/**
 * Situations API Routes
 * GET /api/appointments/situations - List all active situations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * GET /api/appointments/situations
 * Retrieves all active situations (color-coded tags)
 */
export const GET = createProtectedRoute(
  async (request: NextRequest) => {
    const situations = await prisma.situation.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        priority: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      data: { situations },
    });
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'],
    skipCsrf: true,
  }
);

/**
 * POST /api/appointments/situations
 * Creates a new situation (admin only)
 */
export const POST = createProtectedRoute(
  async (request: NextRequest) => {
    const body = await request.json();
    const { name, color, priority, icon, requiresAction, actionLabel, description } = body;

    if (!name || !color || priority === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, color, priority' },
        { status: 400 }
      );
    }

    const situation = await prisma.situation.create({
      data: {
        name,
        color,
        priority,
        icon,
        requiresAction: requiresAction || false,
        actionLabel,
        description,
      },
    });

    return NextResponse.json({
      success: true,
      data: { situation },
      message: 'Situation created successfully',
    });
  },
  {
    roles: ['ADMIN'],
  }
);
