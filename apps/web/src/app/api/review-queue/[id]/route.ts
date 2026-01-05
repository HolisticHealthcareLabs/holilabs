/**
 * Review Queue Item API
 *
 * PATCH /api/review-queue/[id] - Update review status
 *
 * Allows clinicians to review and update the status of queued items
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { reviewQueueService } from '@/lib/services/review-queue.service';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/review-queue/[id]
 *
 * Update the review status of a queue item
 *
 * Body:
 * - status: New status (IN_REVIEW, APPROVED, CORRECTED, ESCALATED, REJECTED)
 * - reviewNotes: (optional) Notes from the reviewer
 * - wasCorrect: (optional) Whether the AI was correct
 * - corrections: (optional) Corrections made
 */
export const PATCH = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const reviewerId = context.user.id;
      const itemId = context.params.id;

      const body = await request.json();
      const { status, reviewNotes, wasCorrect, corrections } = body;

      // Validation
      if (!status) {
        return NextResponse.json(
          {
            error: 'Missing required field: status',
          },
          { status: 400 }
        );
      }

      const validStatuses = ['IN_REVIEW', 'APPROVED', 'CORRECTED', 'ESCALATED', 'REJECTED'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          {
            error: 'Invalid status',
            validStatuses,
          },
          { status: 400 }
        );
      }

      // Update review status
      const item = await reviewQueueService.updateReviewStatus(
        itemId,
        reviewerId,
        status,
        {
          reviewNotes,
          wasCorrect,
          corrections,
        }
      );

      return NextResponse.json({
        success: true,
        data: item,
      });
    } catch (error: any) {
      console.error('Error updating review queue item:', error);
      return NextResponse.json(
        {
          error: 'Failed to update review queue item',
          message: error.message,
        },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    audit: { action: 'UPDATE', resource: 'ReviewQueue' },
  }
);
