/**
 * Cron Endpoint: Execute Scheduled Reminders
 *
 * This endpoint should be called by a cron service (e.g., Vercel Cron, node-cron, or external service)
 * Runs every minute to check for and execute due reminders
 *
 * Security: In production, protect this endpoint with a secret token
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeScheduledReminders } from '@/lib/jobs/reminder-executor';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max execution time

/**
 * GET /api/cron/execute-reminders
 * Execute all due scheduled reminders
 */
export async function GET(request: NextRequest) {
  try {
    // Security check: Verify cron secret in production
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      logger.warn({
        event: 'cron_unauthorized_access',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });

      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    logger.info({
      event: 'cron_execute_reminders_start',
      timestamp: new Date().toISOString(),
    });

    const stats = await executeScheduledReminders();

    logger.info({
      event: 'cron_execute_reminders_complete',
      stats,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({
      event: 'cron_execute_reminders_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute reminders',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cron/execute-reminders
 * Alternative method for triggering execution (useful for manual testing)
 */
export async function POST(request: NextRequest) {
  return GET(request);
}
