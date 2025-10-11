/**
 * Readiness Health Check
 *
 * GET /api/health/ready
 * Kubernetes readiness probe - checks if the application can serve traffic
 * Verifies connectivity to external dependencies:
 * - Database (PostgreSQL)
 * - Redis (Upstash) - optional
 * - Supabase - optional
 *
 * Returns 200 if ready, 503 if not ready
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  error?: string;
  required: boolean;
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    // Simple query to verify database connectivity
    await prisma.$queryRaw`SELECT 1`;

    const responseTime = Date.now() - startTime;

    return {
      service: 'database',
      status: responseTime < 1000 ? 'healthy' : 'degraded',
      responseTime,
      required: true,
    };
  } catch (error) {
    logger.error({
      event: 'health_check_database_failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      service: 'database',
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      required: true,
    };
  }
}

/**
 * Check Redis connectivity (Upstash)
 */
async function checkRedis(): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    // Only check if Redis is configured
    if (!process.env.UPSTASH_REDIS_REST_URL) {
      return {
        service: 'redis',
        status: 'healthy',
        required: false,
      };
    }

    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    // Simple ping command
    await redis.ping();

    const responseTime = Date.now() - startTime;

    return {
      service: 'redis',
      status: responseTime < 500 ? 'healthy' : 'degraded',
      responseTime,
      required: false,
    };
  } catch (error) {
    logger.error({
      event: 'health_check_redis_failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      service: 'redis',
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      required: false,
    };
  }
}

/**
 * Check Supabase connectivity
 */
async function checkSupabase(): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    // Only check if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return {
        service: 'supabase',
        status: 'healthy',
        required: false,
      };
    }

    // Simple HTTP check to Supabase
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`,
      {
        method: 'HEAD',
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      }
    );

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        service: 'supabase',
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        responseTime,
        required: false,
      };
    } else {
      return {
        service: 'supabase',
        status: 'unhealthy',
        error: `HTTP ${response.status}`,
        required: false,
      };
    }
  } catch (error) {
    logger.error({
      event: 'health_check_supabase_failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      service: 'supabase',
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      required: false,
    };
  }
}

/**
 * Main health check handler
 */
export async function GET() {
  const startTime = Date.now();

  try {
    // Run all health checks in parallel
    const checks = await Promise.all([
      checkDatabase(),
      checkRedis(),
      checkSupabase(),
    ]);

    const totalResponseTime = Date.now() - startTime;

    // Determine overall status
    const hasUnhealthyRequired = checks.some(
      (check) => check.required && check.status === 'unhealthy'
    );

    const hasUnhealthyOptional = checks.some(
      (check) => !check.required && check.status === 'unhealthy'
    );

    const hasDegraded = checks.some((check) => check.status === 'degraded');

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    let httpStatus: number;

    if (hasUnhealthyRequired) {
      overallStatus = 'unhealthy';
      httpStatus = 503; // Service Unavailable
    } else if (hasUnhealthyOptional || hasDegraded) {
      overallStatus = 'degraded';
      httpStatus = 200; // Still serving traffic
    } else {
      overallStatus = 'healthy';
      httpStatus = 200;
    }

    const response = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime: totalResponseTime + 'ms',
      checks: checks.reduce((acc, check) => {
        acc[check.service] = {
          status: check.status,
          responseTime: check.responseTime ? check.responseTime + 'ms' : undefined,
          error: check.error,
          required: check.required,
        };
        return acc;
      }, {} as Record<string, any>),
    };

    // Log degraded or unhealthy status
    if (overallStatus !== 'healthy') {
      logger.warn({
        event: 'health_check_not_healthy',
        status: overallStatus,
        checks: response.checks,
      });
    }

    return NextResponse.json(response, { status: httpStatus });
  } catch (error) {
    logger.error({
      event: 'health_check_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
