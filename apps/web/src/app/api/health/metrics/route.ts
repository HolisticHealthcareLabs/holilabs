/**
 * Metrics Endpoint
 *
 * GET /api/health/metrics
 * Returns application metrics for monitoring and alerting.
 *
 * Includes:
 * - System metrics (uptime, memory, CPU)
 * - Business metrics (patients, appointments, auth failures)
 * - Security metrics (audit logs, rate limiting)
 * - Infrastructure metrics (circuit breakers, database connections)
 *
 * Used by Prometheus, Grafana, and CloudWatch.
 */

import { NextResponse } from 'next/server';
import { getAllCircuitBreakerStats } from '@/lib/resilience/circuit-breaker';
import { prisma } from '@/lib/db';
import { createLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const logger = createLogger({ route: '/api/health/metrics' });

/**
 * Get business metrics (active patients, appointments, etc.)
 */
async function getBusinessMetrics() {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    // Run queries in parallel for performance
    const [
      activePatientsCount,
      totalPatientsCount,
      dailyAppointmentsCount,
      pendingAppointmentsCount,
    ] = await Promise.all([
      // Active patients (isActive = true)
      prisma.patient.count({
        where: {
          isActive: true,
        },
      }),

      // Total patients (including inactive)
      prisma.patient.count(),

      // Daily appointments (today)
      prisma.appointment.count({
        where: {
          start: {
            gte: todayStart,
            lt: todayEnd,
          },
        },
      }),

      // Pending appointments (status = SCHEDULED or CONFIRMED)
      prisma.appointment.count({
        where: {
          status: {
            in: ['SCHEDULED', 'CONFIRMED'],
          },
        },
      }),
    ]);

    return {
      patients: {
        active: activePatientsCount,
        total: totalPatientsCount,
        inactive: totalPatientsCount - activePatientsCount,
      },
      appointments: {
        today: dailyAppointmentsCount,
        pending: pendingAppointmentsCount,
      },
    };
  } catch (error) {
    logger.error({
      event: 'metrics_business_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Failed to fetch business metrics');

    return {
      patients: { active: 0, total: 0, inactive: 0 },
      appointments: { today: 0, pending: 0 },
      error: 'Failed to fetch business metrics',
    };
  }
}

/**
 * Get security metrics (failed auth, audit logs)
 */
async function getSecurityMetrics() {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Run queries in parallel
    const [
      failedAuthLastHour,
      failedAuthLast24Hours,
      totalAuditLogs,
      recentAuditLogs,
    ] = await Promise.all([
      // Failed authentication attempts in last hour
      prisma.auditLog.count({
        where: {
          action: 'LOGIN_FAILED',
          timestamp: {
            gte: oneHourAgo,
          },
        },
      }),

      // Failed authentication attempts in last 24 hours
      prisma.auditLog.count({
        where: {
          action: 'LOGIN_FAILED',
          timestamp: {
            gte: oneDayAgo,
          },
        },
      }),

      // Total audit logs
      prisma.auditLog.count(),

      // Recent audit logs (last hour)
      prisma.auditLog.count({
        where: {
          timestamp: {
            gte: oneHourAgo,
          },
        },
      }),
    ]);

    // Check for audit log write failures
    // If recent audit logs is 0 but we've had API activity, that's suspicious
    const auditLogHealthy = recentAuditLogs > 0;

    return {
      failedAuth: {
        lastHour: failedAuthLastHour,
        last24Hours: failedAuthLast24Hours,
      },
      auditLogs: {
        total: totalAuditLogs,
        lastHour: recentAuditLogs,
        healthy: auditLogHealthy,
      },
    };
  } catch (error) {
    logger.error({
      event: 'metrics_security_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Failed to fetch security metrics');

    return {
      failedAuth: { lastHour: 0, last24Hours: 0 },
      auditLogs: { total: 0, lastHour: 0, healthy: false },
      error: 'Failed to fetch security metrics',
    };
  }
}

/**
 * Get database metrics (connection pool, query performance)
 */
async function getDatabaseMetrics() {
  try {
    // Get database metrics from Prisma
    const startTime = Date.now();

    // Simple query to test database connection and measure latency
    await prisma.$queryRaw`SELECT 1`;

    const queryLatency = Date.now() - startTime;

    return {
      connected: true,
      latency: queryLatency,
      // Note: Prisma doesn't expose connection pool metrics directly
      // For production, consider using pgBouncer metrics via admin console
    };
  } catch (error) {
    logger.error({
      event: 'metrics_database_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Failed to fetch database metrics');

    return {
      connected: false,
      latency: 0,
      error: 'Database connection failed',
    };
  }
}

export async function GET() {
  try {
    // Fetch all metrics in parallel
    const [businessMetrics, securityMetrics, databaseMetrics] = await Promise.all([
      getBusinessMetrics(),
      getSecurityMetrics(),
      getDatabaseMetrics(),
    ]);

    const metrics = {
      timestamp: new Date().toISOString(),

      // System metrics
      system: {
        uptime: process.uptime(),
        memory: {
          rss: process.memoryUsage().rss,
          heapTotal: process.memoryUsage().heapTotal,
          heapUsed: process.memoryUsage().heapUsed,
          external: process.memoryUsage().external,
        },
      },

      // Business metrics
      business: businessMetrics,

      // Security metrics
      security: securityMetrics,

      // Database metrics
      database: databaseMetrics,

      // Infrastructure metrics
      infrastructure: {
        circuitBreakers: getAllCircuitBreakerStats(),
      },
    };

    // Log metrics for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      logger.debug({
        event: 'metrics_fetched',
        metrics,
      });
    }

    // Alert if critical metrics are unhealthy
    if (!databaseMetrics.connected) {
      logger.error({
        event: 'metrics_alert',
        alert: 'DATABASE_DISCONNECTED',
      }, 'Database connection failed');
    }

    if (!securityMetrics.auditLogs.healthy) {
      logger.warn({
        event: 'metrics_alert',
        alert: 'AUDIT_LOGS_NOT_WRITING',
        lastHourCount: securityMetrics.auditLogs.lastHour,
      }, 'Audit logs may not be writing correctly');
    }

    if (securityMetrics.failedAuth.lastHour > 10) {
      logger.warn({
        event: 'metrics_alert',
        alert: 'HIGH_FAILED_AUTH_RATE',
        count: securityMetrics.failedAuth.lastHour,
      }, 'High rate of failed authentication attempts');
    }

    return NextResponse.json(metrics, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    logger.error({
      event: 'metrics_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Failed to fetch metrics');

    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        error: 'Failed to fetch metrics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  }
}
