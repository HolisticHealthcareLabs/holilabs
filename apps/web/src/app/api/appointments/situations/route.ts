/**
 * Situations API Routes
 * GET /api/appointments/situations - List all active situations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
// FIXME: Old rate limiting API - needs refactor
// import { rateLimit } from '@/lib/rate-limit';

// FIXME: Old rate limiting - commented out for now
// const limiter = rateLimit({
//   interval: 60 * 1000,
//   uniqueTokenPerInterval: 500,
// });

/**
 * GET /api/appointments/situations
 * Retrieves all active situations (color-coded tags)
 */
export async function GET(request: NextRequest) {
  try {
    // FIXME: Rate limiting disabled - needs refactor
    // await limiter.check(request, 60, 'SITUATIONS_GET');

    // Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch all active situations, ordered by priority
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
  } catch (error: any) {
    console.error('Error fetching situations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch situations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/appointments/situations
 * Creates a new situation (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // FIXME: Rate limiting disabled - needs refactor
    // await limiter.check(request, 10, 'SITUATIONS_POST');

    // Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Authorization: Only admins can create situations
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { name, color, priority, icon, requiresAction, actionLabel, description } = body;

    // Validation
    if (!name || !color || priority === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, color, priority' },
        { status: 400 }
      );
    }

    // Create situation
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
  } catch (error: any) {
    console.error('Error creating situation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create situation' },
      { status: 500 }
    );
  }
}
