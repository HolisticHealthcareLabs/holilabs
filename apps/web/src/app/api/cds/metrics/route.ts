/**
 * CDSS Performance Metrics API
 *
 * Exposes real-time performance metrics for monitoring and alerting
 * GET /api/cds/metrics
 *
 * @returns {object} Current performance metrics
 */

import { NextResponse } from 'next/server';
import { cdsEngine } from '@/lib/cds/engines/cds-engine';

export async function GET() {
  try {
    const metrics = cdsEngine.getMetrics();

    // Calculate health status based on metrics
    const alerts = {
      highErrorRate: metrics.cacheMetrics.errors > 10,
      lowCacheHitRate: metrics.cacheMetrics.hitRate < 70,
      slowEvaluations:
        metrics.totalEvaluations > 0 &&
        metrics.slowEvaluations / metrics.totalEvaluations > 0.05, // >5% slow
      circuitBreakerOpen: metrics.cacheMetrics.circuitBreaker.state === 'OPEN',
    };

    const hasAlerts = Object.values(alerts).some((alert) => alert);
    const status = hasAlerts ? 'degraded' : 'healthy';

    return NextResponse.json(
      {
        status,
        timestamp: new Date().toISOString(),
        metrics: {
          // CDSS Engine Metrics
          engine: {
            totalEvaluations: metrics.totalEvaluations,
            cacheHits: metrics.cacheHits,
            cacheMisses: metrics.cacheMisses,
            cacheHitRate: metrics.totalEvaluations > 0
              ? ((metrics.cacheHits / metrics.totalEvaluations) * 100).toFixed(2)
              : '0.00',
            avgProcessingTime: Math.round(metrics.avgProcessingTime),
            slowEvaluations: metrics.slowEvaluations,
            slowEvaluationRate: metrics.totalEvaluations > 0
              ? ((metrics.slowEvaluations / metrics.totalEvaluations) * 100).toFixed(2)
              : '0.00',
          },
          // Redis Cache Metrics
          cache: {
            hits: metrics.cacheMetrics.hits,
            misses: metrics.cacheMetrics.misses,
            hitRate: metrics.cacheMetrics.hitRate,
            totalRequests: metrics.cacheMetrics.totalRequests,
            sets: metrics.cacheMetrics.sets,
            deletes: metrics.cacheMetrics.deletes,
            errors: metrics.cacheMetrics.errors,
            compressions: metrics.cacheMetrics.compressions,
            circuitBreaker: metrics.cacheMetrics.circuitBreaker,
          },
        },
        alerts,
        thresholds: {
          cacheHitRate: {
            target: 70,
            current: metrics.cacheMetrics.hitRate,
            passed: metrics.cacheMetrics.hitRate >= 70,
          },
          avgProcessingTime: {
            target: 2000,
            current: Math.round(metrics.avgProcessingTime),
            passed: metrics.avgProcessingTime < 2000,
          },
          slowEvaluations: {
            target: 5, // 5% threshold
            current:
              metrics.totalEvaluations > 0
                ? ((metrics.slowEvaluations / metrics.totalEvaluations) * 100).toFixed(2)
                : '0.00',
            passed:
              metrics.totalEvaluations === 0 ||
              metrics.slowEvaluations / metrics.totalEvaluations <= 0.05,
          },
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('[CDSS Metrics API] Error:', error);

    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Failed to retrieve metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Reset metrics (useful for testing)
 * POST /api/cds/metrics with { action: 'reset' }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.action === 'reset') {
      cdsEngine.resetMetrics();

      return NextResponse.json({
        status: 'success',
        message: 'Metrics reset successfully',
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      {
        status: 'error',
        message: 'Invalid action. Use { action: "reset" }',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('[CDSS Metrics API] Error:', error);

    return NextResponse.json(
      {
        status: 'error',
        error: 'Failed to reset metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
