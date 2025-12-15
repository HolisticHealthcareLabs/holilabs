/**
 * Liveness Health Check
 *
 * GET /api/health/live
 * Kubernetes liveness probe - checks if the application is running
 * Should return 200 if the process is alive
 * Does NOT check external dependencies
 */

import { NextResponse } from 'next/server';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Simple liveness check - if we can respond, we're alive
    const healthData = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        external: Math.round(process.memoryUsage().external / 1024 / 1024) + 'MB',
      },
    };

    logger.debug({
      event: 'health_check_live',
      uptime: healthData.uptime,
      heapUsed: healthData.memory.heapUsed,
    });

    return NextResponse.json(healthData, { status: 200 });
  } catch (error) {
    logger.error({
      event: 'health_check_live_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Even if there's an error gathering metrics, we want to return that we're alive
    // This is a liveness check, not a readiness check
    return NextResponse.json(
      {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        error: 'Failed to gather complete health metrics',
      },
      { status: 200 } // Still return 200 so k8s doesn't restart the pod
    );
  }
}
