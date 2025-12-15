/**
 * Email Queue Processor Cron Job
 * Processes queued emails in background
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
 *        "path": "/api/cron/process-email-queue",
 *        "schedule": "* /5 * * * *" (remove space)
 *      }]
 *    }
 *
 * Schedule: Every 5 minutes
 * POST /api/cron/process-email-queue
 */

import { NextRequest, NextResponse } from 'next/server';
import { processEmailQueue } from '@/lib/email/email-service';
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

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let retryCount = 0;
  const maxRetries = 3;

  try {
    // Security Check 1: Verify CRON_SECRET is configured
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      logger.error({
        event: 'cron_config_error',
        job: 'process_email_queue',
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
        event: 'cron_unauthorized_access',
        job: 'process_email_queue',
        ip,
        authProvided: !!authHeader,
      });

      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Security Check 3: Verify IP whitelist (optional but recommended)
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
    if (ip && !isValidCronIP(ip)) {
      logger.warn({
        event: 'invalid_cron_ip',
        job: 'process_email_queue',
        ip,
      });
      // Note: We log but don't block to allow for IP changes
    }

    logger.info({
      event: 'cron_job_started',
      job: 'process_email_queue',
      timestamp: new Date().toISOString(),
      ip,
    });

    // Process email queue with retry logic
    let result = { processed: 0, failed: 0 };
    while (retryCount < maxRetries) {
      try {
        result = await processEmailQueue(50); // Process up to 50 emails per run
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
          job: 'process_email_queue',
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
      job: 'process_email_queue',
      processed: result.processed,
      failed: result.failed,
      duration,
      retries: retryCount,
    });

    return NextResponse.json({
      success: true,
      processed: result.processed,
      failed: result.failed,
      duration,
      retries: retryCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error({
      event: 'cron_job_error',
      job: 'process_email_queue',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration,
      retries: retryCount,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process email queue',
        details: error instanceof Error ? error.message : 'Unknown error',
        retries: retryCount,
      },
      { status: 500 }
    );
  }
}

// GET method only allowed for testing in development
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    logger.warn({
      event: 'cron_invalid_method',
      job: 'process_email_queue',
      method: 'GET',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });

    return NextResponse.json(
      { error: 'GET method not allowed in production. Use POST.' },
      { status: 405 }
    );
  }

  return POST(request);
}
