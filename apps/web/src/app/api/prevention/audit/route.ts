/**
 * Prevention Audit Logs API
 *
 * GET /api/prevention/audit - Get audit logs for prevention plans and templates
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AuditAction } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/prevention/audit
 * Get audit logs filtered by various criteria
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const action = searchParams.get('action') as AuditAction | null;
    const resource = searchParams.get('resource'); // e.g., 'prevention_plan', 'prevention_template'
    const resourceId = searchParams.get('resourceId');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build where conditions
    const whereConditions: any = {};

    // Filter by resource type (prevention-related only)
    if (resource) {
      whereConditions.resource = resource;
    } else {
      // Default to prevention-related resources only
      whereConditions.resource = {
        in: ['prevention_plan', 'prevention_template', 'preventive_care_reminder'],
      };
    }

    if (resourceId) {
      whereConditions.resourceId = resourceId;
    }

    if (action) {
      whereConditions.action = action;
    }

    if (userId) {
      whereConditions.userId = userId;
    }

    // Date range filtering
    if (startDate || endDate) {
      whereConditions.timestamp = {};
      if (startDate) {
        whereConditions.timestamp.gte = new Date(startDate);
      }
      if (endDate) {
        whereConditions.timestamp.lte = new Date(endDate);
      }
    }

    // Fetch audit logs
    const [logs, totalCount] = await Promise.all([
      prisma.auditLog.findMany({
        where: whereConditions,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where: whereConditions }),
    ]);

    // Get unique user IDs and fetch user details
    const userIds = [...new Set(logs.map((log) => log.userId).filter(Boolean))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds as string[] } },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    const userMap = new Map(
      users.map((u) => [
        u.id,
        {
          name: `${u.firstName} ${u.lastName}`,
          email: u.email,
        },
      ])
    );

    // Enrich logs with user information
    const enrichedLogs = logs.map((log) => ({
      ...log,
      user: log.userId ? userMap.get(log.userId) : null,
    }));

    // Get resource names for better context
    const resourceIdsMap = new Map<string, Set<string>>();
    for (const log of logs) {
      if (!resourceIdsMap.has(log.resource)) {
        resourceIdsMap.set(log.resource, new Set());
      }
      resourceIdsMap.get(log.resource)?.add(log.resourceId);
    }

    // Fetch resource names
    const resourceNames = new Map<string, string>();

    // Fetch prevention plan names
    if (resourceIdsMap.has('prevention_plan')) {
      const planIds = Array.from(resourceIdsMap.get('prevention_plan') || []);
      const plans = await prisma.preventionPlan.findMany({
        where: { id: { in: planIds } },
        select: { id: true, planName: true },
      });
      for (const plan of plans) {
        resourceNames.set(`prevention_plan:${plan.id}`, plan.planName);
      }
    }

    // Fetch prevention template names
    if (resourceIdsMap.has('prevention_template')) {
      const templateIds = Array.from(resourceIdsMap.get('prevention_template') || []);
      const templates = await prisma.preventionPlanTemplate.findMany({
        where: { id: { in: templateIds } },
        select: { id: true, templateName: true },
      });
      for (const template of templates) {
        resourceNames.set(`prevention_template:${template.id}`, template.templateName);
      }
    }

    // Add resource names to enriched logs
    const finalLogs = enrichedLogs.map((log) => ({
      ...log,
      resourceName: resourceNames.get(`${log.resource}:${log.resourceId}`),
    }));

    // Calculate statistics
    const stats = {
      totalLogs: totalCount,
      actionBreakdown: await prisma.auditLog.groupBy({
        by: ['action'],
        where: whereConditions,
        _count: true,
      }),
      userBreakdown: await prisma.auditLog.groupBy({
        by: ['userId'],
        where: { ...whereConditions, userId: { not: null } },
        _count: true,
        orderBy: { _count: { userId: 'desc' } },
        take: 10,
      }),
      resourceBreakdown: await prisma.auditLog.groupBy({
        by: ['resource'],
        where: whereConditions,
        _count: true,
      }),
    };

    return NextResponse.json({
      success: true,
      data: {
        logs: finalLogs,
        stats,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch audit logs',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
