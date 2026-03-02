/**
 * Assurance Feedback API
 *
 * POST /api/assurance/feedback — Record clinician feedback on an AI recommendation
 * GET  /api/assurance/feedback — Fetch feedback aggregation (for dashboard panel)
 *
 * This is the primary data ingestion endpoint for the Clinical Ground Truth flywheel.
 * Every thumbs-up/down, correction, and comment feeds the data moat.
 *
 * @compliance HIPAA Audit Trail, LGPD Article 20
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import logger from '@/lib/logger';

// Type assertion for newer Prisma models
const db = prisma as any;

export const dynamic = 'force-dynamic';

// ═══════════════════════════════════════════════════════════════
// SCHEMAS
// ═══════════════════════════════════════════════════════════════

const feedbackSchema = z.object({
  assuranceEventId: z.string().min(1, 'assuranceEventId is required'),
  feedbackType: z.enum(['THUMBS_UP', 'THUMBS_DOWN', 'CORRECTION', 'COMMENT']),
  feedbackValue: z.record(z.unknown()).optional().default({}),
  freeText: z.string().max(2000).optional(),
});

const ROLE_TO_SOURCE: Record<string, string> = {
  PHYSICIAN: 'PHYSICIAN',
  CLINICIAN: 'PHYSICIAN',
  NURSE: 'NURSE',
  ADMIN: 'ADMIN',
};

// ═══════════════════════════════════════════════════════════════
// POST: Record clinician feedback
// ═══════════════════════════════════════════════════════════════

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const body = await request.json();
      const parsed = feedbackSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: parsed.error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: 400 }
        );
      }

      const { assuranceEventId, feedbackType, feedbackValue, freeText } = parsed.data;

      // Verify the assurance event exists
      const event = await db.assuranceEvent.findUnique({
        where: { id: assuranceEventId },
        select: { id: true },
      });

      if (!event) {
        return NextResponse.json(
          { error: 'Assurance event not found' },
          { status: 404 }
        );
      }

      // Map user role to feedback source
      const feedbackSource = ROLE_TO_SOURCE[context.user.role] || 'ADMIN';

      // Build feedback value with optional free text
      const fullFeedbackValue = {
        ...feedbackValue,
        ...(freeText ? { freeText } : {}),
        userId: context.user.id,
      };

      const feedback = await db.humanFeedback.create({
        data: {
          assuranceEventId,
          feedbackType,
          feedbackValue: fullFeedbackValue,
          feedbackSource,
        },
      });

      logger.info({
        event: 'ground_truth_feedback_recorded',
        feedbackId: feedback.id,
        assuranceEventId,
        feedbackType,
        feedbackSource,
        userId: context.user.id,
      });

      return NextResponse.json(
        {
          success: true,
          feedbackId: feedback.id,
          feedbackType,
          feedbackSource,
        },
        { status: 201 }
      );
    } catch (error) {
      return safeErrorResponse(error, {
        userMessage: 'Failed to record feedback',
      });
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'PHYSICIAN', 'NURSE'],
    rateLimit: { windowMs: 60_000, maxRequests: 60 },
    skipCsrf: true,
    audit: { action: 'CREATE', resource: 'HumanFeedback' },
  }
);

// ═══════════════════════════════════════════════════════════════
// GET: Feedback aggregation for dashboard
// ═══════════════════════════════════════════════════════════════

export const GET = createProtectedRoute(
  async (request: NextRequest) => {
    try {
      const { searchParams } = request.nextUrl;
      const period = searchParams.get('period') || '7d';

      // Calculate date range
      const periodMs: Record<string, number> = {
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
      };
      const sinceMs = periodMs[period] || periodMs['7d'];
      const since = new Date(Date.now() - sinceMs);

      // Run aggregation queries in parallel
      const [
        feedbackByType,
        feedbackBySource,
        totalFeedback,
        overrideCount,
        acceptCount,
      ] = await Promise.all([
        // Feedback grouped by type
        db.humanFeedback.groupBy({
          by: ['feedbackType'],
          _count: { id: true },
          where: { createdAt: { gte: since } },
        }),

        // Feedback grouped by source
        db.humanFeedback.groupBy({
          by: ['feedbackSource'],
          _count: { id: true },
          where: { createdAt: { gte: since } },
        }),

        // Total feedback count
        db.humanFeedback.count({
          where: { createdAt: { gte: since } },
        }),

        // Override count (human disagreed with AI)
        db.assuranceEvent.count({
          where: {
            humanOverride: true,
            decidedAt: { gte: since },
          },
        }),

        // Accept count (human agreed with AI)
        db.assuranceEvent.count({
          where: {
            humanOverride: false,
            decidedAt: { gte: since, not: null },
          },
        }),
      ]);

      // Build type breakdown
      const byType: Record<string, number> = {
        THUMBS_UP: 0,
        THUMBS_DOWN: 0,
        CORRECTION: 0,
        COMMENT: 0,
      };
      for (const group of feedbackByType as any[]) {
        byType[group.feedbackType] = group._count.id;
      }

      // Build source breakdown
      const bySource: Record<string, number> = {};
      for (const group of feedbackBySource as any[]) {
        bySource[group.feedbackSource] = group._count.id;
      }

      // Calculate accept rate
      const totalDecisions = overrideCount + acceptCount;
      const acceptRate = totalDecisions > 0
        ? Math.round((acceptCount / totalDecisions) * 100)
        : 0;

      return NextResponse.json({
        success: true,
        data: {
          period,
          total: totalFeedback,
          byType,
          bySource,
          acceptRate,
          totalDecisions,
          overrides: overrideCount,
          accepts: acceptCount,
        },
      });
    } catch (error) {
      return safeErrorResponse(error, {
        userMessage: 'Failed to fetch feedback aggregation',
      });
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
    rateLimit: { windowMs: 60_000, maxRequests: 30 },
    skipCsrf: true,
    audit: { action: 'READ', resource: 'HumanFeedback' },
  }
);
