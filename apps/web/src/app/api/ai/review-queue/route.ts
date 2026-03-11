/**
 * Manual Review Queue API
 *
 * POST  /api/ai/review-queue - Add item to review queue
 * GET   /api/ai/review-queue - Get review queue items
 * PATCH /api/ai/review-queue - Update review queue item status
 *
 * @compliance Phase 2.3: AI Quality Control
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { safeErrorResponse } from '@/lib/api/safe-error-response';

/**
 * POST /api/ai/review-queue
 * Add item to manual review queue
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context) => {
    try {
      const body = await request.json();

      const {
        contentType,
        contentId,
        sectionType,
        patientId,
        clinicianId,
        priority = 5,
        confidence,
        flagReason,
        flagDetails,
      } = body;

      // Validation
      if (!contentType || !contentId || !patientId || !clinicianId || !flagReason) {
        return NextResponse.json(
          { error: 'Missing required fields: contentType, contentId, patientId, clinicianId, flagReason' },
          { status: 400 }
        );
      }

      // Check if already in queue
      const existing = await prisma.manualReviewQueueItem.findFirst({
        where: {
          contentType,
          contentId,
          status: {
            in: ['PENDING', 'IN_REVIEW'],
          },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: 'Item already in review queue', queueItemId: existing.id },
          { status: 409 }
        );
      }

      // Create review queue item
      const queueItem = await prisma.manualReviewQueueItem.create({
        data: {
          contentType,
          contentId,
          sectionType,
          patientId,
          clinicianId,
          priority,
          confidence: confidence || 0,
          flagReason,
          flagDetails,
          status: 'PENDING',
        },
      });

      logger.info({
        event: 'review_queue_item_added',
        contentType,
        contentId,
        flagReason,
        priority,
        userId: context.user?.id,
      });

      return NextResponse.json({
        success: true,
        queueItem: {
          id: queueItem.id,
          priority: queueItem.priority,
          status: queueItem.status,
        },
      });

    } catch (error) {
      logger.error({
        event: 'review_queue_add_failed',
        error: (error instanceof Error ? error.message : String(error)),
      });
      return safeErrorResponse(error, { userMessage: 'Internal Server Error' });
    }
  },
  { roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] }
);

/**
 * GET /api/ai/review-queue
 * Get review queue items
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context) => {
    try {
      const { searchParams } = new URL(request.url);
      const status = searchParams.get('status');
      const clinicianId = searchParams.get('clinicianId') || context.user?.id;
      const limit = parseInt(searchParams.get('limit') || '50');

      // Build query filters
      const where: any = {};
      if (status) where.status = status;
      if (clinicianId) where.clinicianId = clinicianId;

      // Fetch queue items with related data
      const queueItems = await prisma.manualReviewQueueItem.findMany({
        where,
        take: limit,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' }, // Older items first within same priority
        ],
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              mrn: true,
            },
          },
          clinician: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Calculate summary stats
      const stats = {
        pending: queueItems.filter(i => i.status === 'PENDING').length,
        inReview: queueItems.filter(i => i.status === 'IN_REVIEW').length,
        approved: queueItems.filter(i => i.status === 'APPROVED').length,
        corrected: queueItems.filter(i => i.status === 'CORRECTED').length,
        escalated: queueItems.filter(i => i.status === 'ESCALATED').length,
      };

      return NextResponse.json({
        success: true,
        stats,
        items: queueItems.map(item => ({
          id: item.id,
          contentType: item.contentType,
          contentId: item.contentId,
          sectionType: item.sectionType,
          priority: item.priority,
          confidence: item.confidence,
          flagReason: item.flagReason,
          flagDetails: item.flagDetails,
          status: item.status,
          patient: item.patient,
          clinician: item.clinician,
          reviewedBy: item.reviewedBy,
          reviewedAt: item.reviewedAt,
          reviewNotes: item.reviewNotes,
          wasCorrect: item.wasCorrect,
          corrections: item.corrections,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
      });

    } catch (error) {
      logger.error({
        event: 'review_queue_fetch_failed',
        error: (error instanceof Error ? error.message : String(error)),
      });
      return safeErrorResponse(error, { userMessage: 'Internal Server Error' });
    }
  },
  { roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] }
);

/**
 * PATCH /api/ai/review-queue
 * Update review queue item status
 */
export const PATCH = createProtectedRoute(
  async (request: NextRequest, context) => {
    try {
      const body = await request.json();

      const {
        queueItemId,
        status,
        reviewNotes,
        wasCorrect,
        corrections,
      } = body;

      // Validation
      if (!queueItemId || !status) {
        return NextResponse.json(
          { error: 'Missing required fields: queueItemId, status' },
          { status: 400 }
        );
      }

      // Update queue item
      const updated = await prisma.manualReviewQueueItem.update({
        where: { id: queueItemId },
        data: {
          status,
          reviewedBy: status !== 'PENDING' ? context.user?.id : undefined,
          reviewedAt: status !== 'PENDING' ? new Date() : undefined,
          reviewNotes,
          wasCorrect: wasCorrect !== undefined ? wasCorrect : undefined,
          corrections,
        },
      });

      logger.info({
        event: 'review_queue_item_updated',
        queueItemId,
        contentType: updated.contentType,
        contentId: updated.contentId,
        status,
        reviewerId: context.user?.id,
        wasCorrect,
      });

      return NextResponse.json({
        success: true,
        queueItem: {
          id: updated.id,
          status: updated.status,
          reviewedBy: updated.reviewedBy,
          reviewedAt: updated.reviewedAt,
        },
      });

    } catch (error) {
      logger.error({
        event: 'review_queue_update_failed',
        error: (error instanceof Error ? error.message : String(error)),
      });
      return safeErrorResponse(error, { userMessage: 'Internal Server Error' });
    }
  },
  { roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] }
);
