/**
 * Audit Log API
 *
 * GET /api/audit - Retrieve audit logs with filtering
 * POST /api/audit - Create audit log entry
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Force dynamic rendering - prevents build-time evaluation
export const dynamic = 'force-dynamic';

/**
 * GET /api/audit
 * Retrieve audit logs with filtering and pagination
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 50, max: 100)
 * - action: string (filter by action)
 * - resource: string (filter by resource)
 * - userEmail: string (filter by user email)
 * - startDate: ISO date string
 * - endDate: ISO date string
 * - success: boolean
 */
export async function GET(request: Request) {
  try {
    // Check authentication - only admins can view audit logs
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify admin role
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const action = searchParams.get('action');
    const resource = searchParams.get('resource');
    const userEmail = searchParams.get('userEmail');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const successParam = searchParams.get('success');

    // Build filter
    const where: any = {};

    if (action) {
      where.action = action;
    }

    if (resource) {
      where.resource = {
        contains: resource,
        mode: 'insensitive',
      };
    }

    if (userEmail) {
      where.userEmail = {
        contains: userEmail,
        mode: 'insensitive',
      };
    }

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = new Date(startDate);
      }
      if (endDate) {
        where.timestamp.lte = new Date(endDate);
      }
    }

    if (successParam !== null) {
      where.success = successParam === 'true';
    }

    // Get total count
    const total = await prisma.auditLog.count({ where });

    // Get paginated results
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
      skip: (page - 1) * limit,
    });

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch audit logs',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/audit
 * Create audit log entry for compliance
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const auditLog = await prisma.auditLog.create({
      data: {
        userEmail: body.userEmail || 'system',
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        action: body.action,
        resource: body.resource,
        resourceId: body.resourceId || 'N/A',
        details: body.details,
        success: body.success !== false,
      },
    });

    return NextResponse.json(
      { success: true, data: auditLog },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating audit log:', error);
    return NextResponse.json(
      {
        error: 'Failed to create audit log',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
      { status: 500 }
    );
  }
}
