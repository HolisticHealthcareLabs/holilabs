/**
 * RLHF Correction Aggregation Job Endpoint
 *
 * POST /api/jobs/aggregate-corrections - Trigger correction aggregation job
 *
 * This endpoint can be called:
 * 1. Manually for testing
 * 2. By a cron service (Vercel Cron, GitHub Actions, etc.)
 * 3. From internal scheduled tasks
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPublicRoute, verifyInternalToken } from '@/lib/api/middleware';
import { aggregateDailyCorrections, aggregateCorrectionsRange } from '@/lib/jobs/correction-aggregation';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max

/**
 * POST /api/jobs/aggregate-corrections
 *
 * Triggers the RLHF correction aggregation job
 *
 * Query params:
 * - mode: 'daily' | 'custom' (default: 'daily')
 * - startDate: ISO date string (for custom mode)
 * - endDate: ISO date string (for custom mode)
 * - secret: Authorization secret (from env)
 */
export const POST = createPublicRoute(async (request: NextRequest) => {
  try {
    // Authorization check (prevent unauthorized job execution)
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || null;
    
    if (!verifyInternalToken(token)) {
      logger.error('🔒 Unauthorized job execution attempt - invalid internal token');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get job parameters
    const mode = request.nextUrl.searchParams.get('mode') || 'daily';
    const startDateParam = request.nextUrl.searchParams.get('startDate');
    const endDateParam = request.nextUrl.searchParams.get('endDate');

    logger.info(`🚀 [Job] Starting correction aggregation job (mode: ${mode})`);

    let result;

    if (mode === 'custom' && startDateParam && endDateParam) {
      // Custom date range
      const startDate = new Date(startDateParam);
      const endDate = new Date(endDateParam);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format. Use ISO 8601 format.' },
          { status: 400 }
        );
      }

      logger.info(`📅 Running custom range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
      result = await aggregateCorrectionsRange(startDate, endDate);
    } else {
      // Daily aggregation (default)
      logger.info('📆 Running daily aggregation');
      result = await aggregateDailyCorrections();
    }

    if (result.processed) {
      logger.info('✅ [Job] Correction aggregation completed successfully');
      return NextResponse.json({
        success: true,
        message: 'Correction aggregation completed successfully',
        data: result.results,
      });
    } else {
      logger.info('ℹ️ [Job] No corrections to process');
      return NextResponse.json({
        success: true,
        message: 'No corrections to process',
        data: null,
      });
    }
  } catch (error) {
    logger.error('❌ [Job] Error running correction aggregation:', error);
    return safeErrorResponse(error, { userMessage: 'Failed to run correction aggregation job' });
  }
});

/**
 * GET /api/jobs/aggregate-corrections
 *
 * Get status/info about the aggregation job
 */
export const GET = createPublicRoute(async () => {
  return NextResponse.json({
    job: 'correction-aggregation',
    description: 'RLHF correction aggregation background job',
    endpoints: {
      trigger: 'POST /api/jobs/aggregate-corrections',
      modes: {
        daily: 'POST /api/jobs/aggregate-corrections?mode=daily',
        custom: 'POST /api/jobs/aggregate-corrections?mode=custom&startDate=2025-01-01T00:00:00Z&endDate=2025-01-31T23:59:59Z',
      },
      authorization: 'Bearer token in Authorization header or ?secret= query param',
    },
    schedule: {
      recommended: 'Daily at 2:00 AM UTC',
      vercelCron: '0 2 * * *',
    },
    status: 'active',
  });
});
