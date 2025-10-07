/**
 * Health Check Endpoint
 *
 * GET /api/health
 * Returns 200 OK if app is healthy, 503 Service Unavailable if not
 *
 * Used by:
 * - DigitalOcean health checks
 * - Monitoring services
 * - Load balancers
 */

import { NextResponse } from 'next/server';
import { prisma, checkDatabaseHealth } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    database: boolean;
    databaseLatency?: number;
  };
  version?: string;
}

export async function GET() {
  const startTime = Date.now();
  const healthStatus: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: false,
    },
    version: process.env.npm_package_version || '1.0.0',
  };

  try {
    // If Prisma client is not initialized (DATABASE_URL not set), return basic health check
    if (!prisma) {
      logger.warn({ event: 'health_check_no_db' }, 'Health check: No database configured');
      return NextResponse.json(
        {
          ...healthStatus,
          error: 'DATABASE_URL not configured - database not available',
        },
        { status: 200 }
      );
    }

    // Check database connection using health check function
    const dbHealth = await checkDatabaseHealth();

    healthStatus.services.database = dbHealth.healthy;
    healthStatus.services.databaseLatency = dbHealth.latency;

    logger.info({
      event: 'health_check',
      dbLatency: dbHealth.latency,
      dbHealthy: dbHealth.healthy,
      uptime: healthStatus.uptime,
    }, 'Health check completed');

    // If database is unhealthy or slow (>1000ms), mark as unhealthy
    if (!dbHealth.healthy || (dbHealth.latency && dbHealth.latency > 1000)) {
      healthStatus.status = 'unhealthy';
      logger.warn({
        event: 'health_check_slow_db',
        dbLatency: dbHealth.latency,
        error: dbHealth.error,
      }, 'Database is unhealthy or slow');
      return NextResponse.json(healthStatus, { status: 503 });
    }

    // All checks passed
    return NextResponse.json(healthStatus, { status: 200 });
  } catch (error: any) {
    // Database connection failed
    healthStatus.status = 'unhealthy';
    healthStatus.services.database = false;

    logger.error({
      event: 'health_check_failed',
      err: error,
    }, 'Health check failed - database connection error');

    return NextResponse.json(
      {
        ...healthStatus,
        error: error.message || 'Database connection failed',
      },
      { status: 503 }
    );
  }
}
