/**
 * Cron Endpoint: Escalation SLA Breach Detection
 *
 * Finds OPEN escalations past their slaDeadline and marks them BREACHED.
 * Designed to run every 5 minutes via Vercel Cron or external scheduler.
 *
 * Security: Bearer token authentication via CRON_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server';
import { breachOverdueEscalations } from '@/lib/escalations/escalation-service';
import logger from '@/lib/logger';
import { createPublicRoute } from '@/lib/api/middleware';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function getEscalations(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify CRON_SECRET
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      logger.error({ event: 'cron_config_error', job: 'escalation_breach_check', error: 'CRON_SECRET not configured' });
      return NextResponse.json({ success: false, error: 'CRON_SECRET not configured' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.warn({
        event: 'cron_unauthorized_access',
        job: 'escalation_breach_check',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    logger.info({ event: 'cron_escalation_breach_check_start', timestamp: new Date().toISOString() });

    const result = await breachOverdueEscalations();
    const duration = Date.now() - startTime;

    logger.info({
      event: 'cron_escalation_breach_check_complete',
      ...result,
      duration,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, ...result, duration });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error({
      event: 'cron_escalation_breach_check_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    });

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to check escalations' },
      { status: 500 },
    );
  }
}

export const GET = createPublicRoute(getEscalations);
export const POST = createPublicRoute((req) => getEscalations(req));
