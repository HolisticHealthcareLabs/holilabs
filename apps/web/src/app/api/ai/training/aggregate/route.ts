/**
 * AI Training Aggregation API
 *
 * POST /api/ai/training/aggregate - Trigger correction aggregation job
 *
 * RLHF Loop Phase 2: Manually trigger or schedule the daily aggregation
 * of corrections for ML training pipeline
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import {
  aggregateDailyCorrections,
  aggregateCorrectionsRange,
} from '@/lib/jobs/correction-aggregation';
import { z } from 'zod';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Request validation schema
 */
const AggregateRequestSchema = z.object({
  type: z.enum(['daily', 'range']).default('daily'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * POST /api/ai/training/aggregate
 * Trigger correction aggregation job
 *
 * This endpoint is typically called by:
 * 1. A cron job (daily at 2 AM)
 * 2. Manual admin trigger
 * 3. Backfilling historical data
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      // Only allow admins or clinicians to trigger aggregation
      if (context.user.role !== 'DOCTOR' && context.user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Insufficient permissions. Only doctors and admins can trigger aggregation.' },
          { status: 403 }
        );
      }

      const body = await request.json();

      // Validate request
      const validation = AggregateRequestSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          {
            error: 'Invalid request parameters',
            details: validation.error.format(),
          },
          { status: 400 }
        );
      }

      const { type, startDate, endDate } = validation.data;

      let result;

      if (type === 'daily') {
        // Run daily aggregation (yesterday's corrections)
        logger.info({
          event: 'correction_aggregation_started',
          type: 'daily',
          userId: context.user.id,
        });
        result = await aggregateDailyCorrections();
      } else {
        // Run custom range aggregation
        if (!startDate || !endDate) {
          return NextResponse.json(
            { error: 'startDate and endDate are required for range aggregation' },
            { status: 400 }
          );
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (start >= end) {
          return NextResponse.json(
            { error: 'Start date must be before end date' },
            { status: 400 }
          );
        }

        logger.info({
          event: 'correction_aggregation_started',
          type: 'range',
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          userId: context.user.id,
        });

        result = await aggregateCorrectionsRange(start, end);
      }

      if (!result.processed) {
        return NextResponse.json({
          success: false,
          message: result.error || 'No corrections to process',
          data: null,
        });
      }

      logger.info({
        event: 'correction_aggregation_completed',
        type,
        results: result.results,
        userId: context.user.id,
      });

      return NextResponse.json({
        success: true,
        message: 'Correction aggregation completed successfully',
        data: result.results,
      });
    } catch (error: any) {
      logger.error({
        event: 'correction_aggregation_failed',
        userId: context.user.id,
        error: error.message,
        stack: error.stack,
      });
      return NextResponse.json(
        {
          error: 'Failed to run correction aggregation',
          message: error.message,
        },
        { status: 500 }
      );
    }
  }
);
