/**
 * Prevention Activity Feed API
 *
 * GET /api/prevention/activity - Get recent prevention-related activities
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export interface ActivityItem {
  id: string;
  type: 'plan_created' | 'plan_updated' | 'plan_deleted' | 'template_used' | 'template_created' | 'status_changed' | 'goal_added' | 'recommendation_added';
  title: string;
  description: string;
  userId: string;
  userName?: string;
  resourceType: 'prevention_plan' | 'prevention_template';
  resourceId: string;
  resourceName?: string;
  metadata?: any;
  timestamp: Date;
}

/**
 * GET /api/prevention/activity
 * Get recent prevention-related activities
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
    const resourceType = searchParams.get('resourceType'); // 'plan' or 'template'
    const resourceId = searchParams.get('resourceId');

    // Build activities from multiple sources
    const activities: ActivityItem[] = [];

    // 1. Get recent prevention plans (created)
    const recentPlans = await prisma.preventionPlan.findMany({
      where: resourceId ? { id: resourceId } : {},
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    for (const plan of recentPlans) {
      activities.push({
        id: `plan-created-${plan.id}`,
        type: 'plan_created',
        title: 'Plan de prevención creado',
        description: `Se creó el plan "${plan.planName}" para ${plan.patient?.firstName} ${plan.patient?.lastName}`,
        userId: '', // We don't track creator in PreventionPlan model
        resourceType: 'prevention_plan',
        resourceId: plan.id,
        resourceName: plan.planName,
        metadata: {
          planType: plan.planType,
          status: plan.status,
        },
        timestamp: plan.createdAt,
      });
    }

    // 2. Get template usage activities
    const recentTemplates = await prisma.preventionPlanTemplate.findMany({
      where: {
        ...(resourceId && resourceType === 'template' ? { id: resourceId } : {}),
        lastUsedAt: { not: null },
      },
      orderBy: { lastUsedAt: 'desc' },
      take: limit,
      skip: offset,
    });

    for (const template of recentTemplates) {
      if (template.lastUsedAt) {
        activities.push({
          id: `template-used-${template.id}-${template.lastUsedAt.getTime()}`,
          type: 'template_used',
          title: 'Plantilla utilizada',
          description: `Se utilizó la plantilla "${template.templateName}" (${template.useCount} usos totales)`,
          userId: template.createdBy,
          resourceType: 'prevention_template',
          resourceId: template.id,
          resourceName: template.templateName,
          metadata: {
            planType: template.planType,
            useCount: template.useCount,
          },
          timestamp: template.lastUsedAt,
        });
      }
    }

    // 3. Get newly created templates
    const newTemplates = await prisma.preventionPlanTemplate.findMany({
      where: resourceId && resourceType === 'template' ? { id: resourceId } : {},
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    for (const template of newTemplates) {
      activities.push({
        id: `template-created-${template.id}`,
        type: 'template_created',
        title: 'Plantilla creada',
        description: `Se creó la plantilla "${template.templateName}"`,
        userId: template.createdBy,
        resourceType: 'prevention_template',
        resourceId: template.id,
        resourceName: template.templateName,
        metadata: {
          planType: template.planType,
          isActive: template.isActive,
        },
        timestamp: template.createdAt,
      });
    }

    // 4. Parse status changes from prevention plans
    const plansWithStatusChanges = await prisma.preventionPlan.findMany({
      where: resourceId && resourceType === 'plan' ? { id: resourceId } : {},
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    for (const plan of plansWithStatusChanges) {
      if (Array.isArray(plan.statusChanges)) {
        const statusChanges = plan.statusChanges as any[];
        for (const change of statusChanges) {
          activities.push({
            id: `status-change-${plan.id}-${change.timestamp}`,
            type: 'status_changed',
            title: 'Estado del plan actualizado',
            description: `${plan.planName}: ${change.fromStatus || 'Nuevo'} → ${change.toStatus}`,
            userId: change.userId || '',
            resourceType: 'prevention_plan',
            resourceId: plan.id,
            resourceName: plan.planName,
            metadata: {
              fromStatus: change.fromStatus,
              toStatus: change.toStatus,
              reason: change.reason,
              notes: change.notes,
            },
            timestamp: new Date(change.timestamp),
          });
        }
      }
    }

    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit and offset after combining
    const paginatedActivities = activities.slice(offset, offset + limit);

    // Get user names for activities
    const userIds = [...new Set(paginatedActivities.map((a) => a.userId).filter(Boolean))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true },
    });

    const userMap = new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`]));

    // Add user names to activities
    for (const activity of paginatedActivities) {
      if (activity.userId) {
        activity.userName = userMap.get(activity.userId);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        activities: paginatedActivities,
        total: activities.length,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('Error fetching prevention activities:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch prevention activities',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
