/**
 * API Monitoring and Health Checks
 *
 * Monitors external API integrations (RxNav, etc.)
 * Provides health status and alerting
 *
 * @module integrations/monitoring
 */

import { rxNavClient } from './rxnav-api';
import { logger } from '../logger';

/**
 * API Health Status
 */
export interface APIHealthStatus {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  successRate: number;
  cacheHitRate: number;
  averageLatency: number;
  lastError?: string;
  lastErrorTime?: string;
  totalCalls: number;
  uptime: number;
}

/**
 * System Health Status
 */
export interface SystemHealthStatus {
  timestamp: string;
  overall: 'healthy' | 'degraded' | 'down';
  services: {
    rxnav: APIHealthStatus;
  };
}

/**
 * Monitoring Configuration
 */
const MONITORING_CONFIG = {
  healthCheckInterval: 5 * 60 * 1000, // 5 minutes
  alertThreshold: {
    successRate: 0.8, // 80%
    latency: 5000, // 5 seconds
  },
  downtimeAlertThreshold: 5 * 60 * 1000, // Alert if down for 5+ minutes
};

/**
 * Downtime tracker
 */
const downtimeTracker = {
  rxnav: null as number | null,
};

/**
 * Get RxNav API health status
 */
export function getRxNavHealth(): APIHealthStatus {
  const metrics = rxNavClient.getMetrics();
  const health = rxNavClient.getHealthStatus();

  let status: 'healthy' | 'degraded' | 'down' = 'healthy';

  if (health.successRate < 0.5) {
    status = 'down';
  } else if (
    health.successRate < MONITORING_CONFIG.alertThreshold.successRate ||
    health.averageLatency > MONITORING_CONFIG.alertThreshold.latency
  ) {
    status = 'degraded';
  }

  // Track downtime
  if (status === 'down') {
    if (!downtimeTracker.rxnav) {
      downtimeTracker.rxnav = Date.now();
      logger.error('[Monitoring] RxNav API is DOWN');
    } else {
      const downtime = Date.now() - downtimeTracker.rxnav;
      if (downtime > MONITORING_CONFIG.downtimeAlertThreshold) {
        logger.error({ downtimeSeconds: Math.round(downtime / 1000) }, '[Monitoring] ALERT: RxNav API down threshold exceeded');
      }
    }
  } else {
    if (downtimeTracker.rxnav) {
      const downtime = Date.now() - downtimeTracker.rxnav;
      logger.info({ event: 'rxnav_recovered', downtimeSeconds: Math.round(downtime / 1000) }, '[Monitoring] RxNav API recovered');
      downtimeTracker.rxnav = null;
    }
  }

  return {
    service: 'RxNav API',
    status,
    successRate: health.successRate,
    cacheHitRate: health.cacheHitRate,
    averageLatency: health.averageLatency,
    lastError: metrics.lastError,
    lastErrorTime: metrics.lastErrorTime,
    totalCalls: metrics.totalCalls,
    uptime: downtimeTracker.rxnav ? Date.now() - downtimeTracker.rxnav : 0,
  };
}

/**
 * Get overall system health status
 */
export function getSystemHealth(): SystemHealthStatus {
  const rxnavHealth = getRxNavHealth();

  let overall: 'healthy' | 'degraded' | 'down' = 'healthy';

  // If any critical service is down, system is down
  if (rxnavHealth.status === 'down') {
    overall = 'down';
  } else if (rxnavHealth.status === 'degraded') {
    overall = 'degraded';
  }

  return {
    timestamp: new Date().toISOString(),
    overall,
    services: {
      rxnav: rxnavHealth,
    },
  };
}

/**
 * Log system health (for periodic checks)
 */
export function logSystemHealth(): void {
  const health = getSystemHealth();

  logger.info({
    event: 'health_check',
    overall: health.overall,
    rxnav: {
      status: health.services.rxnav.status,
      successRate: health.services.rxnav.successRate,
      cacheHitRate: health.services.rxnav.cacheHitRate,
      avgLatencyMs: Math.round(health.services.rxnav.averageLatency),
      totalCalls: health.services.rxnav.totalCalls,
      lastError: health.services.rxnav.lastError,
    },
  }, '[Monitoring] System health status');
}

/**
 * Start periodic health checks
 */
export function startHealthMonitoring(): void {
  logger.info('[Monitoring] starting health monitoring');

  // Initial health check
  logSystemHealth();

  // Periodic health checks
  setInterval(() => {
    logSystemHealth();
  }, MONITORING_CONFIG.healthCheckInterval);
}

/**
 * Get health metrics for API endpoint
 */
export function getHealthMetrics() {
  return {
    system: getSystemHealth(),
    rxnav: {
      metrics: rxNavClient.getMetrics(),
      health: rxNavClient.getHealthStatus(),
    },
  };
}

// Auto-start monitoring in server context
if (typeof window === 'undefined') {
  // Start monitoring after 10 seconds to allow app initialization
  setTimeout(() => {
    startHealthMonitoring();
  }, 10000);
}
