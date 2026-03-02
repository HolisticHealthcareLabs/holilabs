/**
 * Clinical Command Center — Summary API
 *
 * GET /api/clinical-command/summary
 *
 * Single aggregation endpoint returning real-time stats for all four
 * Clinical Command Center panels: CDS Alerts, Review Queue, Prevention Gaps,
 * and Governance Feed.
 *
 * @compliance HIPAA Audit Trail, RBAC
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';

// Type assertion to work around Prisma client not having generated types for newer models
const db = prisma as any;

export const dynamic = 'force-dynamic';

export const GET = createProtectedRoute(
  async (_request: NextRequest, context: any) => {
    try {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const thisWeekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Run all queries in parallel for performance
      const [
        reviewQueueStats,
        reviewQueueHighPriority,
        recentReviewItems,
        overduePlans,
        dueThisWeekPlans,
        plansByType,
        governanceEventsCount,
        governanceOverrides,
        recentAuditEvents,
        overdueReminders,
        upcomingReminders,
      ] = await Promise.all([
        // Review Queue: counts by status
        db.manualReviewQueueItem.groupBy({
          by: ['status'],
          _count: { id: true },
          where: {
            clinicianId: context.user.role === 'ADMIN' ? undefined : context.user.id,
          },
        }),

        // Review Queue: high priority count
        db.manualReviewQueueItem.count({
          where: {
            priority: { gte: 7 },
            status: { in: ['PENDING', 'IN_REVIEW'] },
            clinicianId: context.user.role === 'ADMIN' ? undefined : context.user.id,
          },
        }),

        // Review Queue: recent items (top 5)
        db.manualReviewQueueItem.findMany({
          where: {
            status: { in: ['PENDING', 'IN_REVIEW'] },
            clinicianId: context.user.role === 'ADMIN' ? undefined : context.user.id,
          },
          orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
          take: 5,
          select: {
            id: true,
            contentType: true,
            priority: true,
            confidence: true,
            flagReason: true,
            status: true,
            createdAt: true,
            patient: { select: { firstName: true, lastName: true } },
          },
        }),

        // Prevention: active plans count (proxy for overdue)
        db.preventionPlan.count({
          where: {
            status: 'ACTIVE',
            updatedAt: { lt: last24h },
          },
        }),

        // Prevention: due this week
        db.preventiveCareReminder.count({
          where: {
            status: 'DUE',
            dueDate: { lte: thisWeekEnd },
          },
        }),

        // Prevention: by plan type
        db.preventionPlan.groupBy({
          by: ['planType'],
          _count: { id: true },
          where: { status: 'ACTIVE' },
        }),

        // Governance: CDS events in last 24h
        db.auditLog.count({
          where: {
            timestamp: { gte: last24h },
            resource: 'ClinicalDecisionSupport',
          },
        }),

        // Governance: overrides in last 24h (UPDATE action on CDS resource)
        db.auditLog.count({
          where: {
            timestamp: { gte: last24h },
            resource: 'ClinicalDecisionSupport',
            action: 'UPDATE',
          },
        }),

        // Governance: recent CDS events
        db.auditLog.findMany({
          where: {
            timestamp: { gte: last24h },
            resource: 'ClinicalDecisionSupport',
          },
          orderBy: { timestamp: 'desc' },
          take: 10,
          select: {
            id: true,
            action: true,
            resource: true,
            details: true,
            timestamp: true,
            userEmail: true,
          },
        }),

        // Prevention: overdue reminders
        db.preventiveCareReminder.count({
          where: {
            status: 'DUE',
            dueDate: { lt: now },
          },
        }),

        // Prevention: upcoming reminders (next 7 days)
        db.preventiveCareReminder.count({
          where: {
            status: 'DUE',
            dueDate: { gte: now, lte: thisWeekEnd },
          },
        }),
      ]);

      // Aggregate review queue stats
      const pendingCount = (reviewQueueStats as any[]).find((s: any) => s.status === 'PENDING')?._count.id ?? 0;
      const inReviewCount = (reviewQueueStats as any[]).find((s: any) => s.status === 'IN_REVIEW')?._count.id ?? 0;

      // Build plan type breakdown
      const preventionByType: Record<string, number> = {};
      for (const group of plansByType as any[]) {
        preventionByType[group.planType] = group._count.id;
      }

      return NextResponse.json({
        success: true,
        data: {
          timestamp: new Date().toISOString(),
          cdsAlerts: {
            recentEvaluations: governanceEventsCount,
            recentAlerts: (recentAuditEvents as any[]).map((e: any) => ({
              id: e.id,
              action: e.action,
              resource: e.resource,
              timestamp: e.timestamp,
              user: e.userEmail,
            })),
          },
          reviewQueue: {
            pending: pendingCount,
            inReview: inReviewCount,
            highPriority: reviewQueueHighPriority,
            recentItems: (recentReviewItems as any[]).map((item: any) => ({
              id: item.id,
              contentType: item.contentType,
              priority: item.priority,
              confidence: item.confidence,
              flagReason: item.flagReason,
              status: item.status,
              patientName: item.patient
                ? `${item.patient.firstName} ${item.patient.lastName}`
                : undefined,
              createdAt: item.createdAt,
            })),
          },
          preventionGaps: {
            overdue: overdueReminders,
            dueThisWeek: upcomingReminders,
            activePlans: overduePlans,
            byType: preventionByType,
          },
          governanceFeed: {
            last24h: governanceEventsCount,
            overrides: governanceOverrides,
            blocks: 0, // Governance blocks tracked via GovernanceEvent model
          },
        },
      });
    } catch (error) {
      return safeErrorResponse(error, {
        userMessage: 'Failed to load Clinical Command Center data',
      });
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
    rateLimit: { windowMs: 60_000, maxRequests: 30 },
    skipCsrf: true,
    audit: { action: 'READ', resource: 'ClinicalCommandCenter' },
  },
);
