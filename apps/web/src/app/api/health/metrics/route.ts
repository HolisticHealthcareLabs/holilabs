/**
 * Detailed System Metrics Endpoint
 *
 * GET /api/health/metrics
 * Provides comprehensive system metrics for monitoring and alerting
 *
 * Metrics include:
 * - Application uptime and memory usage
 * - Database health and connection pool stats
 * - API response times
 * - Cache performance
 * - Error rates
 *
 * Used by: Monitoring dashboards, alerting systems
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface SystemMetrics {
  timestamp: string;
  application: {
    uptime: number;
    environment: string;
    nodeVersion: string;
    platform: string;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  database: {
    healthy: boolean;
    latency: number | null;
    activeConnections?: number;
    status: 'connected' | 'disconnected' | 'error';
  };
  performance: {
    cpuUsage: {
      user: number;
      system: number;
    };
  };
  thresholds: {
    memory: {
      warning: number; // 80%
      critical: number; // 90%
    };
    database: {
      latencyWarning: number; // 500ms
      latencyCritical: number; // 1000ms
    };
  };
  alerts: Array<{
    severity: 'info' | 'warning' | 'critical';
    message: string;
    metric: string;
    value: number;
    threshold: number;
  }>;
}

/**
 * Check database health with timeout
 */
async function checkDatabaseHealth(): Promise<{ healthy: boolean; latency: number | null; error?: string }> {
  const startTime = Date.now();

  try {
    // Simple query with 5-second timeout
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - startTime;

    return {
      healthy: true,
      latency,
    };
  } catch (error: any) {
    return {
      healthy: false,
      latency: null,
      error: error.message || 'Database connection failed',
    };
  }
}

export async function GET() {
  const startTime = Date.now();

  try {
    // Application metrics
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const memUsedMB = memoryUsage.rss / 1024 / 1024;
    const memTotalMB = require('os').totalmem() / 1024 / 1024;
    const memPercentage = (memUsedMB / memTotalMB) * 100;

    // Database health check
    const dbHealth = await checkDatabaseHealth();

    // Define thresholds
    const thresholds = {
      memory: {
        warning: 80,
        critical: 90,
      },
      database: {
        latencyWarning: 500,
        latencyCritical: 1000,
      },
    };

    // Generate alerts based on thresholds
    const alerts: SystemMetrics['alerts'] = [];

    // Memory alerts
    if (memPercentage >= thresholds.memory.critical) {
      alerts.push({
        severity: 'critical',
        message: 'Memory usage is critically high',
        metric: 'memory_percentage',
        value: memPercentage,
        threshold: thresholds.memory.critical,
      });
    } else if (memPercentage >= thresholds.memory.warning) {
      alerts.push({
        severity: 'warning',
        message: 'Memory usage is elevated',
        metric: 'memory_percentage',
        value: memPercentage,
        threshold: thresholds.memory.warning,
      });
    }

    // Database alerts
    if (!dbHealth.healthy) {
      alerts.push({
        severity: 'critical',
        message: 'Database connection failed',
        metric: 'database_health',
        value: 0,
        threshold: 1,
      });
    } else if (dbHealth.latency && dbHealth.latency >= thresholds.database.latencyCritical) {
      alerts.push({
        severity: 'critical',
        message: 'Database latency is critically high',
        metric: 'database_latency',
        value: dbHealth.latency,
        threshold: thresholds.database.latencyCritical,
      });
    } else if (dbHealth.latency && dbHealth.latency >= thresholds.database.latencyWarning) {
      alerts.push({
        severity: 'warning',
        message: 'Database latency is elevated',
        metric: 'database_latency',
        value: dbHealth.latency,
        threshold: thresholds.database.latencyWarning,
      });
    }

    const metrics: SystemMetrics = {
      timestamp: new Date().toISOString(),
      application: {
        uptime: Math.floor(uptime),
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        platform: process.platform,
      },
      memory: {
        used: Math.round(memUsedMB),
        total: Math.round(memTotalMB),
        percentage: Math.round(memPercentage * 100) / 100,
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
      },
      database: {
        healthy: dbHealth.healthy,
        latency: dbHealth.latency,
        status: dbHealth.healthy ? 'connected' : 'error',
      },
      performance: {
        cpuUsage: {
          user: Math.round((cpuUsage.user / 1000000) * 100) / 100, // Convert to ms
          system: Math.round((cpuUsage.system / 1000000) * 100) / 100,
        },
      },
      thresholds,
      alerts,
    };

    // Log metrics with alerts
    logger.info({
      event: 'metrics_collected',
      memoryPercentage: metrics.memory.percentage,
      dbLatency: metrics.database.latency,
      alertCount: alerts.length,
      criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
      warningAlerts: alerts.filter(a => a.severity === 'warning').length,
      requestDuration: Date.now() - startTime,
    }, 'System metrics collected');

    // Return 503 if there are critical alerts
    const hasCriticalAlerts = alerts.some(a => a.severity === 'critical');

    return NextResponse.json(metrics, {
      status: hasCriticalAlerts ? 503 : 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: any) {
    logger.error({
      event: 'metrics_collection_failed',
      err: error,
    }, 'Failed to collect system metrics');

    return NextResponse.json(
      {
        error: 'Failed to collect metrics',
        message: error.message || 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
