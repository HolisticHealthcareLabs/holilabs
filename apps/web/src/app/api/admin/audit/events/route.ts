/**
 * Admin Audit Events API
 *
 * GET /api/admin/audit/events — paginated, filterable audit log viewer
 *
 * Query params:
 *   - page: number (default 1)
 *   - limit: number (default 50, max 200)
 *   - action: AuditAction filter
 *   - resource: string filter
 *   - userId: string filter
 *   - startDate: ISO date
 *   - endDate: ISO date
 *   - search: free-text search on resourceId/details
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const skip = (page - 1) * limit;

    const action = searchParams.get('action') || undefined;
    const resource = searchParams.get('resource') || undefined;
    const userId = searchParams.get('userId') || undefined;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search') || undefined;

    // Scope to user's organization (CYRUS CVI-002)
    const orgId = context.user?.organizationId;

    const where: Record<string, unknown> = {};

    if (orgId) {
      where.organizationId = orgId;
    }

    if (action) {
      where.action = action;
    }

    if (resource) {
      where.resource = { contains: resource, mode: 'insensitive' };
    }

    if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      const timestamp: Record<string, Date> = {};
      if (startDate) timestamp.gte = new Date(startDate);
      if (endDate) timestamp.lte = new Date(endDate);
      where.timestamp = timestamp;
    }

    if (search) {
      where.resourceId = { contains: search, mode: 'insensitive' };
    }

    const [events, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        select: {
          id: true,
          userId: true,
          userEmail: true,
          ipAddress: true,
          action: true,
          resource: true,
          resourceId: true,
          details: true,
          accessReason: true,
          actorType: true,
          agentId: true,
          success: true,
          errorMessage: true,
          timestamp: true,
          organizationId: true,
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    logger.info({
      event: 'admin_audit_events_query',
      filters: { action, resource, userId, startDate, endDate, search },
      resultCount: events.length,
      total,
    });

    return NextResponse.json({
      events,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + events.length < total,
      },
    });
  },
  { roles: ['ADMIN', 'LICENSE_OWNER'], skipCsrf: true }
);
