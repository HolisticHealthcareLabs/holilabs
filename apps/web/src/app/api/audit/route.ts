/**
 * Audit Log API
 *
 * GET /api/audit - Retrieve audit logs with filtering
 * POST /api/audit - Create audit log entry
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { safeErrorResponse } from '@/lib/api/safe-error-response';

export const dynamic = 'force-dynamic';

/**
 * GET /api/audit
 * Retrieve audit logs with filtering and pagination
 * Admin only.
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const action = searchParams.get('action');
    const resource = searchParams.get('resource');
    const userEmail = searchParams.get('userEmail');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const successParam = searchParams.get('success');

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

    const total = await prisma.auditLog.count({ where });

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
  },
  { roles: ['ADMIN'] }
);

/**
 * POST /api/audit
 * Create audit log entry for compliance
 * Admin only.
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const userId = context.user?.id;
    const userEmail = context.user?.email;

    const body = await request.json();

    const auditLog = await prisma.auditLog.create({
      data: {
        userEmail: userEmail ?? 'unknown',
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        action: body.action,
        resource: body.resource,
        resourceId: body.resourceId || 'N/A',
        details: body.details,
        success: body.success !== false,
      },
    });

    logger.info({
      event: 'manual_audit_log_created',
      userId,
      auditLogId: auditLog.id,
      action: body.action,
      resource: body.resource,
    });

    return NextResponse.json(
      { success: true, data: auditLog },
      { status: 201 }
    );
  },
  { roles: ['ADMIN'] }
);
