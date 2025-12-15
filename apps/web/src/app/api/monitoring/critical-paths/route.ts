/**
 * Critical Paths Monitoring API
 *
 * GET /api/monitoring/critical-paths
 * Returns health status and metrics for all critical paths
 *
 * This endpoint can be used by:
 * - Monitoring dashboards
 * - External monitoring services
 * - Health check aggregators
 */

import { NextResponse } from 'next/server';
import {
  getCriticalPathHealth,
  getAllCriticalPathMetrics,
} from '@/lib/monitoring/critical-paths';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get overall health status
    const health = getCriticalPathHealth();

    // Get detailed metrics for each path
    const metrics = getAllCriticalPathMetrics();

    const response = {
      status: health.status,
      timestamp: new Date().toISOString(),
      summary: {
        totalPaths: health.totalPaths,
        healthyPaths: health.healthyPaths,
        degradedPaths: health.degradedPaths,
        unhealthyPaths: health.unhealthyPaths,
      },
      paths: health.details,
      metrics: metrics.map((m) => ({
        path: m.path,
        totalExecutions: m.totalExecutions,
        successRate: `${m.successRate.toFixed(2)}%`,
        performance: {
          average: `${Math.round(m.averageDuration)}ms`,
          p50: `${m.p50Duration}ms`,
          p95: `${m.p95Duration}ms`,
          p99: `${m.p99Duration}ms`,
        },
        distribution: {
          targetMet: m.targetMet,
          warning: m.warningLevel,
          critical: m.criticalLevel,
          exceeded: m.exceeded,
        },
      })),
    };

    // Log when unhealthy
    if (health.status === 'unhealthy') {
      logger.warn({
        event: 'critical_paths_unhealthy',
        unhealthyPaths: health.unhealthyPaths,
        details: health.details.filter((d) => d.status === 'unhealthy'),
      });
    }

    return NextResponse.json(response, {
      status: health.status === 'unhealthy' ? 503 : 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    logger.error({
      event: 'critical_paths_api_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Failed to retrieve critical path metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Clear metrics (for testing only)
 * POST /api/monitoring/critical-paths with { action: 'clear' }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.action === 'clear') {
      const { clearCriticalPathMetrics } = await import(
        '@/lib/monitoring/critical-paths'
      );

      clearCriticalPathMetrics();

      logger.info({
        event: 'critical_paths_metrics_cleared',
      });

      return NextResponse.json({
        status: 'success',
        message: 'Critical path metrics cleared successfully',
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      {
        status: 'error',
        message: 'Invalid action. Use { action: "clear" }',
      },
      { status: 400 }
    );
  } catch (error) {
    logger.error({
      event: 'critical_paths_api_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        status: 'error',
        error: 'Failed to process request',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
