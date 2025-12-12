/**
 * Review Queue API
 *
 * GET /api/review-queue - Get review queue items for clinician
 * POST /api/review-queue - Add item to review queue
 *
 * Manages AI-generated content that needs clinician verification
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { reviewQueueService } from '@/lib/services/review-queue.service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/review-queue
 *
 * Get review queue items for the authenticated clinician
 *
 * Query params:
 * - status: Filter by status (PENDING, IN_REVIEW, etc.)
 * - contentType: Filter by content type
 * - priority: Minimum priority level
 * - limit: Number of items to return (default: 50)
 * - offset: Pagination offset (default: 0)
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const clinicianId = context.user.id;
      const searchParams = request.nextUrl.searchParams;

      const filters = {
        status: searchParams.get('status') || undefined,
        contentType: searchParams.get('contentType') || undefined,
        priority: searchParams.get('priority') ? parseInt(searchParams.get('priority')!) : undefined,
      };

      const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;
      const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;

      // Get queue items
      const { items, total } = await reviewQueueService.getQueueItems(
        clinicianId,
        filters,
        limit,
        offset
      );

      // Get queue stats
      const stats = await reviewQueueService.getQueueStats(clinicianId);

      return NextResponse.json({
        success: true,
        data: {
          items,
          total,
          stats,
          pagination: {
            limit,
            offset,
            hasMore: offset + limit < total,
          },
        },
      });
    } catch (error: any) {
      console.error('Error fetching review queue:', error);
      return NextResponse.json(
        {
          error: 'Failed to fetch review queue',
          message: error.message,
        },
        { status: 500 }
      );
    }
  }
);

/**
 * POST /api/review-queue
 *
 * Add an item to the review queue
 *
 * Body:
 * - patientId: Patient ID
 * - contentType: Type of content (soap_note, diagnosis, prescription)
 * - contentId: ID of the content
 * - confidence: AI confidence score (0-1)
 * - flagReason: Reason for flagging (low_confidence, high_risk, etc.)
 * - sectionType: (optional) Section type for SOAP notes
 * - priority: (optional) Priority level (1-10)
 * - flagDetails: (optional) Additional details
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const clinicianId = context.user.id;
      const body = await request.json();

      const {
        patientId,
        contentType,
        contentId,
        confidence,
        flagReason,
        sectionType,
        priority,
        flagDetails,
      } = body;

      // Validation
      if (!patientId || !contentType || !contentId || confidence === undefined || !flagReason) {
        return NextResponse.json(
          {
            error: 'Missing required fields',
            required: ['patientId', 'contentType', 'contentId', 'confidence', 'flagReason'],
          },
          { status: 400 }
        );
      }

      // Add to queue
      const item = await reviewQueueService.addToQueue(
        clinicianId,
        patientId,
        contentType,
        contentId,
        confidence,
        flagReason,
        {
          sectionType,
          priority,
          flagDetails,
        }
      );

      return NextResponse.json({
        success: true,
        data: item,
      });
    } catch (error: any) {
      console.error('Error adding to review queue:', error);
      return NextResponse.json(
        {
          error: 'Failed to add to review queue',
          message: error.message,
        },
        { status: 500 }
      );
    }
  }
);
