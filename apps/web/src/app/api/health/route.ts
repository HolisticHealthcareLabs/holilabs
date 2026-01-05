/**
 * Health Check Endpoint
 *
 * Industry-grade health check for monitoring, load balancers, and orchestration.
 * Returns detailed status of all critical dependencies.
 *
 * GET /api/health - Full health check (all dependencies)
 * GET /api/health/live - Liveness probe (app is running)
 * GET /api/health/ready - Readiness probe (app can serve traffic)
 *
 * Status Codes:
 * - 200: Healthy (all critical checks passed)
 * - 503: Unhealthy or Degraded (one or more checks failed)
 *
 * Used by:
 * - DigitalOcean health checks
 * - Kubernetes liveness/readiness probes
 * - Load balancers
 * - Monitoring services (Datadog, New Relic, etc.)
 *
 * @see https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma, checkDatabaseHealth } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface CheckDetail {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  message?: string;
  error?: string;
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    database: CheckDetail;
    encryption: CheckDetail;
    fhir?: CheckDetail;
  };
  version?: string;
  environment?: string;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Perform all health checks in parallel
    const [databaseCheck, encryptionCheck, fhirCheck] = await Promise.allSettled([
      checkDatabase(),
      checkEncryption(),
      checkFHIR(),
    ]);

    const checks: HealthStatus['checks'] = {
      database: databaseCheck.status === 'fulfilled'
        ? databaseCheck.value
        : { status: 'down', error: databaseCheck.reason?.message },
      encryption: encryptionCheck.status === 'fulfilled'
        ? encryptionCheck.value
        : { status: 'down', error: encryptionCheck.reason?.message },
      fhir: fhirCheck.status === 'fulfilled' ? fhirCheck.value : undefined,
    };

    // Determine overall status
    const overallStatus = determineOverallStatus(checks);

    const response: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
      version: process.env.npm_package_version || 'unknown',
      environment: process.env.NODE_ENV || 'unknown',
    };

    const responseTime = Date.now() - startTime;

    // Log health check results
    logger.info({
      event: 'health_check_completed',
      status: overallStatus,
      responseTime,
      database: checks.database.status,
      encryption: checks.encryption.status,
      fhir: checks.fhir?.status,
    }, `Health check completed: ${overallStatus}`);

    if (overallStatus !== 'healthy') {
      logger.warn({
        event: 'health_check_degraded',
        status: overallStatus,
        checks,
        responseTime,
      }, 'Health check returned degraded or unhealthy status');
    }

    // Return appropriate status code
    const statusCode = overallStatus === 'healthy' ? 200 : 503;

    return NextResponse.json(response, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Response-Time': `${responseTime}ms`,
      },
    });
  } catch (error) {
    logger.error({
      event: 'health_check_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      },
      { status: 500 }
    );
  }
}

/**
 * Check database connectivity and performance
 */
async function checkDatabase(): Promise<CheckDetail> {
  const startTime = Date.now();

  try {
    if (!prisma) {
      return {
        status: 'down',
        error: 'DATABASE_URL not configured',
      };
    }

    const dbHealth = await checkDatabaseHealth();
    const responseTime = Date.now() - startTime;

    if (!dbHealth.healthy) {
      return {
        status: 'down',
        responseTime,
        error: dbHealth.error || 'Database check failed',
      };
    }

    // Warn if database is slow (>500ms for health check)
    if (dbHealth.latency && dbHealth.latency > 500) {
      return {
        status: 'degraded',
        responseTime: dbHealth.latency,
        message: `Database responding slowly (${dbHealth.latency}ms)`,
      };
    }

    return {
      status: 'up',
      responseTime: dbHealth.latency,
    };
  } catch (error) {
    return {
      status: 'down',
      error: error instanceof Error ? error.message : 'Database check failed',
    };
  }
}

/**
 * Check encryption service is working
 */
async function checkEncryption(): Promise<CheckDetail> {
  const startTime = Date.now();

  try {
    // Verify encryption key is configured
    if (!process.env.ENCRYPTION_KEY) {
      return {
        status: 'down',
        error: 'ENCRYPTION_KEY not configured',
      };
    }

    // Test encryption/decryption round-trip
    const { encryptPHIWithVersion, decryptPHIWithVersion } = await import('@/lib/security/encryption');
    const testData = 'health-check-test';
    const encrypted = await encryptPHIWithVersion(testData);
    const decrypted = await decryptPHIWithVersion(encrypted);

    if (decrypted !== testData) {
      return {
        status: 'down',
        error: 'Encryption round-trip failed',
      };
    }

    const responseTime = Date.now() - startTime;

    return {
      status: 'up',
      responseTime,
    };
  } catch (error) {
    return {
      status: 'down',
      error: error instanceof Error ? error.message : 'Encryption check failed',
    };
  }
}

/**
 * Check FHIR server connectivity (Medplum)
 * Optional - returns undefined if not configured
 */
async function checkFHIR(): Promise<CheckDetail | undefined> {
  // Only check if FHIR is configured
  if (!process.env.NEXT_PUBLIC_MEDPLUM_BASE_URL) {
    return undefined;
  }

  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(`${process.env.NEXT_PUBLIC_MEDPLUM_BASE_URL}/healthcheck`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      return {
        status: 'degraded',
        responseTime,
        message: `FHIR server returned ${response.status}`,
      };
    }

    // Warn if FHIR is slow (>1000ms)
    if (responseTime > 1000) {
      return {
        status: 'degraded',
        responseTime,
        message: 'FHIR server responding slowly',
      };
    }

    return {
      status: 'up',
      responseTime,
    };
  } catch (error) {
    return {
      status: 'down',
      error: error instanceof Error ? error.message : 'FHIR check failed',
    };
  }
}

/**
 * Determine overall health status from individual checks
 */
function determineOverallStatus(checks: HealthStatus['checks']): HealthStatus['status'] {
  // Critical checks (must be healthy)
  if (checks.database.status === 'down' || checks.encryption.status === 'down') {
    return 'unhealthy';
  }

  // Degraded if any check is degraded or optional service is down
  if (
    checks.database.status === 'degraded' ||
    checks.encryption.status === 'degraded' ||
    checks.fhir?.status === 'down' ||
    checks.fhir?.status === 'degraded'
  ) {
    return 'degraded';
  }

  return 'healthy';
}
