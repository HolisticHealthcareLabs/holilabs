/**
 * Cron Job: Send Appointment Reminders
 * GET /api/cron/send-appointment-reminders
 *
 * Called daily at 8 PM to send reminders for tomorrow's appointments
 * Can be triggered by:
 * 1. Vercel Cron (vercel.json configuration)
 * 2. GitHub Actions (scheduled workflow)
 * 3. External cron service (cron-job.org, EasyCron)
 * 4. Manual trigger for testing
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendRemindersForTomorrow } from '@/lib/notifications/appointment-reminders';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max execution time

export async function GET(request: NextRequest) {
  try {
    // Security: Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      logger.warn({
        event: 'unauthorized_cron_access',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    logger.info({
      event: 'cron_job_started',
      job: 'send_appointment_reminders',
      timestamp: new Date().toISOString(),
    });

    // Send all reminders
    const result = await sendRemindersForTomorrow();

    logger.info({
      event: 'cron_job_completed',
      job: 'send_appointment_reminders',
      result,
    });

    return NextResponse.json(
      {
        success: true,
        data: result,
        message: `Sent ${result.sent} reminders, ${result.failed} failed`,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error({
      event: 'cron_job_error',
      job: 'send_appointment_reminders',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// Allow POST as well for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
