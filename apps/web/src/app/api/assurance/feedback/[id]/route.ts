/**
 * Human Feedback API - Single Resource
 *
 * GET /api/assurance/feedback/[id] - Get feedback details
 * PUT /api/assurance/feedback/[id] - Update feedback
 * DELETE /api/assurance/feedback/[id] - Delete feedback
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import logger from '@/lib/logger';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

const ROLES = ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

const updateFeedbackSchema = z.object({
  feedbackType: z.enum(['THUMBS_UP', 'THUMBS_DOWN', 'CORRECTION', 'COMMENT']).optional(),
  feedbackValue: z.record(z.unknown()).optional(),
  feedbackSource: z.enum(['PHYSICIAN', 'NURSE', 'PHARMACIST', 'ADMIN', 'BILLING']).optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET: Get single feedback
// ═══════════════════════════════════════════════════════════════════════════════

export const GET = createProtectedRoute(
  async (req: NextRequest, context: any) => {
    try {
      const params = await Promise.resolve(context.params ?? ({} as any));
      const { id } = params as { id: string };

      const feedback = await prisma.humanFeedback.findUnique({
        where: { id },
        include: {
          assuranceEvent: {
            select: {
              id: true,
              eventType: true,
              clinicId: true,
              createdAt: true,
            },
          },
        },
      });

      if (!feedback) {
        return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, data: feedback });
    } catch (error) {
      logger.error({
        event: 'feedback_api_error',
        method: 'GET',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return NextResponse.json({ error: 'Failed to get feedback' }, { status: 500 });
    }
  },
  { roles: [...ROLES] }
);

// ═══════════════════════════════════════════════════════════════════════════════
// PUT: Update feedback
// ═══════════════════════════════════════════════════════════════════════════════

export const PUT = createProtectedRoute(
  async (req: NextRequest, context: any) => {
    try {
      const params = await Promise.resolve(context.params ?? ({} as any));
      const { id } = params as { id: string };
      const body = await req.json();
      const validation = updateFeedbackSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation error', details: validation.error.errors },
          { status: 400 }
        );
      }

      const feedback = await prisma.humanFeedback.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!feedback) {
        return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
      }

      // Cast feedbackValue to Prisma's JSON type
      const updateData: Prisma.HumanFeedbackUpdateInput = {
        ...(validation.data.feedbackType && { feedbackType: validation.data.feedbackType }),
        ...(validation.data.feedbackSource && { feedbackSource: validation.data.feedbackSource }),
        ...(validation.data.feedbackValue !== undefined && {
          feedbackValue: validation.data.feedbackValue as Prisma.InputJsonValue,
        }),
      };

      const updated = await prisma.humanFeedback.update({
        where: { id },
        data: updateData,
      });

      await createAuditLog(
        {
          action: 'UPDATE',
          resource: 'HumanFeedback',
          resourceId: id,
          details: { changes: Object.keys(validation.data) },
          success: true,
        },
        req
      );

      return NextResponse.json({ success: true, data: updated });
    } catch (error) {
      logger.error({
        event: 'feedback_api_error',
        method: 'PUT',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return NextResponse.json({ error: 'Failed to update feedback' }, { status: 500 });
    }
  },
  { roles: [...ROLES] }
);

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE: Delete feedback
// ═══════════════════════════════════════════════════════════════════════════════

export const DELETE = createProtectedRoute(
  async (req: NextRequest, context: any) => {
    try {
      const params = await Promise.resolve(context.params ?? ({} as any));
      const { id } = params as { id: string };

      const feedback = await prisma.humanFeedback.findUnique({
        where: { id },
        select: { id: true, assuranceEventId: true },
      });

      if (!feedback) {
        return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
      }

      await prisma.humanFeedback.delete({ where: { id } });

      await createAuditLog(
        {
          action: 'DELETE',
          resource: 'HumanFeedback',
          resourceId: id,
          details: { assuranceEventId: feedback.assuranceEventId },
          success: true,
        },
        req
      );

      logger.info({
        event: 'human_feedback_deleted',
        feedbackId: id,
        assuranceEventId: feedback.assuranceEventId,
      });

      return NextResponse.json({
        success: true,
        message: 'Feedback deleted',
      });
    } catch (error) {
      logger.error({
        event: 'feedback_api_error',
        method: 'DELETE',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return NextResponse.json({ error: 'Failed to delete feedback' }, { status: 500 });
    }
  },
  { roles: [...ROLES] }
);
