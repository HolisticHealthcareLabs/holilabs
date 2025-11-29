/**
 * Cron Endpoint: Auto-Generate Screening Triggers
 *
 * This endpoint should be called daily by a cron service
 * Runs at 2:00 AM daily to generate screening reminders for all active patients
 *
 * Security: Protected with CRON_SECRET token
 */

import { NextRequest, NextResponse } from 'next/server';
import { autoGenerateScreeningReminders } from '@/lib/prevention/screening-triggers';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max execution time

/**
 * GET /api/cron/screening-triggers
 * Auto-generate screening reminders for all active patients
 */
export async function GET(request: NextRequest) {
  try {
    // Security check: Verify cron secret in production
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      logger.warn({
        event: 'cron_unauthorized_access',
        endpoint: '/api/cron/screening-triggers',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });

      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    logger.info({
      event: 'cron_screening_triggers_start',
      timestamp: new Date().toISOString(),
    });

    const result = await autoGenerateScreeningReminders();

    logger.info({
      event: 'cron_screening_triggers_complete',
      result,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
      message: `Processed ${result.patientsProcessed} patients, created ${result.remindersCreated} screening reminders`,
    });
  } catch (error) {
    logger.error({
      event: 'cron_screening_triggers_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate screening triggers',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cron/screening-triggers
 * Alternative method for triggering execution (useful for manual testing)
 */
export async function POST(request: NextRequest) {
  return GET(request);
}
