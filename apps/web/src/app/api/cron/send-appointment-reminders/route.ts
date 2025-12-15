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
 *
 * Security:
 * - CRON_SECRET environment variable (REQUIRED)
 * - IP whitelist for Vercel Cron IPs
 * - Bearer token authentication
 *
 * Setup:
 * 1. Set CRON_SECRET in your environment variables
 * 2. Configure cron job with: Authorization: Bearer <CRON_SECRET>
 * 3. For Vercel Cron, add to vercel.json:
 *    {
 *      "crons": [{
 *        "path": "/api/cron/send-appointment-reminders",
 *        "schedule": "0 20 * * *"
 *      }]
 *    }
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendRemindersForTomorrow } from '@/lib/notifications/appointment-reminders';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max execution time

// Vercel Cron IP whitelist
// Source: https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs
const VERCEL_CRON_IPS = [
  '76.76.21.0/24', // Vercel Cron IP range
  '76.76.21.21',   // Specific Vercel Cron IP
  '76.76.21.98',   // Specific Vercel Cron IP
];

/**
 * Validates if the request IP is from Vercel Cron
 */
function isValidCronIP(ip: string | null): boolean {
  if (!ip) return false;

  // Check if IP matches any of the allowed IPs/ranges
  for (const allowedIP of VERCEL_CRON_IPS) {
    if (allowedIP.includes('/')) {
      // CIDR notation - check if IP is in range
      const [range, bits] = allowedIP.split('/');
      const rangeStart = range.split('.').slice(0, 3).join('.');
      const ipStart = ip.split('.').slice(0, 3).join('.');
      if (rangeStart === ipStart) return true;
    } else {
      // Exact IP match
      if (ip === allowedIP) return true;
    }
  }

  return false;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let retryCount = 0;
  const maxRetries = 3;

  try {
    // Security Check 1: Verify CRON_SECRET is configured
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      logger.error({
        event: 'cron_config_error',
        job: 'send_appointment_reminders',
        error: 'CRON_SECRET not configured',
      });

      return NextResponse.json(
        {
          success: false,
          error: 'CRON_SECRET not configured',
        },
        { status: 500 }
      );
    }

    // Security Check 2: Verify Bearer token
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

      logger.warn({
        event: 'unauthorized_cron_access',
        job: 'send_appointment_reminders',
        ip,
        authProvided: !!authHeader,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    // Security Check 3: Verify IP whitelist (optional but recommended)
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
    if (ip && !isValidCronIP(ip)) {
      logger.warn({
        event: 'invalid_cron_ip',
        job: 'send_appointment_reminders',
        ip,
      });
      // Note: We log but don't block to allow for IP changes
    }

    logger.info({
      event: 'cron_job_started',
      job: 'send_appointment_reminders',
      timestamp: new Date().toISOString(),
      ip,
    });

    // Send all reminders with retry logic
    let result = { sent: 0, failed: 0 };
    while (retryCount < maxRetries) {
      try {
        result = await sendRemindersForTomorrow();
        break; // Success, exit retry loop
      } catch (error) {
        retryCount++;
        if (retryCount >= maxRetries) {
          throw error; // Max retries exceeded, throw error
        }

        // Exponential backoff: 1s, 2s, 4s
        const backoffMs = Math.pow(2, retryCount - 1) * 1000;
        logger.warn({
          event: 'cron_job_retry',
          job: 'send_appointment_reminders',
          retryCount,
          backoffMs,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }

    const duration = Date.now() - startTime;

    logger.info({
      event: 'cron_job_completed',
      job: 'send_appointment_reminders',
      result,
      duration,
      retries: retryCount,
    });

    return NextResponse.json(
      {
        success: true,
        data: result,
        message: `Sent ${result.sent} reminders, ${result.failed} failed`,
        duration,
        retries: retryCount,
      },
      { status: 200 }
    );
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error({
      event: 'cron_job_error',
      job: 'send_appointment_reminders',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration,
      retries: retryCount,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        retries: retryCount,
      },
      { status: 500 }
    );
  }
}

// Allow POST as well for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
