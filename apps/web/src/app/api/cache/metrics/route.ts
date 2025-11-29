/**
 * Cache Metrics API
 *
 * GET /api/cache/metrics - Get cache performance metrics
 * POST /api/cache/metrics/reset - Reset cache metrics
 *
 * Observability endpoint for monitoring cache performance:
 * - Cache hit rate (target: >80%)
 * - Request volume
 * - Compression usage
 * - Circuit breaker status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCacheClient } from '@/lib/cache/redis-client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cache/metrics
 * Get cache performance metrics for observability
 */
export async function GET(request: NextRequest) {
  try {
    const cache = getCacheClient();

    // Get metrics from Redis client
    const metrics = cache.getMetrics();

    // Check Redis connectivity
    let redisHealthy = false;
    try {
      redisHealthy = await cache.ping();
    } catch (error) {
      console.error('[Cache Metrics] Redis ping failed:', error);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...metrics,
        redis: {
          healthy: redisHealthy,
          circuitBreaker: metrics.circuitBreaker,
        },
        performance: {
          hitRatePercentage: `${metrics.hitRate}%`,
          hitRateStatus:
            metrics.hitRate >= 80
              ? 'EXCELLENT'
              : metrics.hitRate >= 60
              ? 'GOOD'
              : metrics.hitRate >= 40
              ? 'FAIR'
              : 'POOR',
          totalOperations: metrics.sets + metrics.deletes + metrics.totalRequests,
        },
        compression: {
          compressed: metrics.compressions,
          compressionRate:
            metrics.sets > 0
              ? `${Math.round((metrics.compressions / metrics.sets) * 100)}%`
              : '0%',
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching cache metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cache metrics', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cache/metrics/reset
 * Reset cache metrics (useful for testing)
 */
export async function POST(request: NextRequest) {
  try {
    const cache = getCacheClient();
    cache.resetMetrics();

    return NextResponse.json({
      success: true,
      message: 'Cache metrics reset successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error resetting cache metrics:', error);
    return NextResponse.json(
      { error: 'Failed to reset cache metrics', details: error.message },
      { status: 500 }
    );
  }
}
