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
import { prisma } from '@/lib/prisma';

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

  // If Prisma client is not initialized (DATABASE_URL not set), return basic health check
  if (!prisma) {
    return NextResponse.json(
      {
        ...healthStatus,
        error: 'DATABASE_URL not configured',
      },
      { status: 200 }
    );
  }

  try {
    // Check database connection
    const dbStartTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - dbStartTime;

    healthStatus.services.database = true;
    healthStatus.services.databaseLatency = dbLatency;

    // If database is slow (>1000ms), mark as unhealthy
    if (dbLatency > 1000) {
      healthStatus.status = 'unhealthy';
      return NextResponse.json(healthStatus, { status: 503 });
    }

    // All checks passed
    return NextResponse.json(healthStatus, { status: 200 });
  } catch (error: any) {
    // Database connection failed
    healthStatus.status = 'unhealthy';
    healthStatus.services.database = false;

    return NextResponse.json(
      {
        ...healthStatus,
        error: error.message || 'Database connection failed',
      },
      { status: 503 }
    );
  }
}
