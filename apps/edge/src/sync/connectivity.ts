/**
 * Connectivity Monitor
 *
 * Tracks connection status to the cloud:
 * - online: Full connectivity
 * - degraded: Some requests failing
 * - offline: No connectivity
 *
 * Also monitors staleness and triggers alerts.
 */

import { PrismaClient } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';
import { SyncConfig } from './index.js';

let monitorInterval: NodeJS.Timeout | null = null;
let cloudUrl: string = '';
let currentStatus: ConnectionStatus = 'offline';
let consecutiveFailures: number = 0;
let lastSuccessfulPing: Date | null = null;
let latencyMs: number | null = null;

export type ConnectionStatus = 'online' | 'degraded' | 'offline';

const DEGRADED_THRESHOLD = 3; // failures before degraded
const OFFLINE_THRESHOLD = 5; // failures before offline
const PING_TIMEOUT_MS = 10_000; // 10 seconds

/**
 * Start the connectivity monitor
 */
export async function startConnectivityMonitor(
  prisma: PrismaClient,
  config: SyncConfig
): Promise<void> {
  cloudUrl = config.cloudUrl;

  // Initial connectivity check
  await checkConnectivity(prisma);

  // Set up interval for periodic checks
  monitorInterval = setInterval(
    () => checkConnectivity(prisma),
    config.connectivityCheckIntervalMs
  );

  logger.info('Connectivity monitor started', {
    cloudUrl,
    checkIntervalMs: config.connectivityCheckIntervalMs,
  });
}

/**
 * Stop the connectivity monitor
 */
export function stopConnectivityMonitor(): void {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
  currentStatus = 'offline';
  logger.info('Connectivity monitor stopped');
}

/**
 * Check connectivity to the cloud
 */
export async function checkConnectivity(prisma: PrismaClient): Promise<ConnectionStatus> {
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);

    const response = await fetch(`${cloudUrl}/api/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Edge-Node-ID': process.env.EDGE_NODE_ID || 'unknown',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    latencyMs = Date.now() - startTime;

    if (response.ok) {
      consecutiveFailures = 0;
      lastSuccessfulPing = new Date();
      currentStatus = 'online';

      await updateConnectionStatus(prisma, 'online');

      logger.debug('Connectivity check passed', { latencyMs });
    } else {
      throw new Error(`Health check returned ${response.status}`);
    }
  } catch (error) {
    consecutiveFailures++;
    latencyMs = null;

    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.warn('Connectivity check failed', {
      error: message,
      consecutiveFailures,
    });

    // Determine new status based on failure count
    if (consecutiveFailures >= OFFLINE_THRESHOLD) {
      currentStatus = 'offline';
    } else if (consecutiveFailures >= DEGRADED_THRESHOLD) {
      currentStatus = 'degraded';
    }

    await updateConnectionStatus(prisma, currentStatus);
  }

  return currentStatus;
}

/**
 * Update connection status in database
 */
export async function updateConnectionStatus(
  prisma: PrismaClient,
  status: ConnectionStatus
): Promise<void> {
  currentStatus = status;

  try {
    const syncState = await prisma.syncState.findFirst();

    if (syncState) {
      await prisma.syncState.update({
        where: { id: syncState.id },
        data: {
          connectionStatus: status,
          updatedAt: new Date(),
          ...(status === 'online' ? { lastSyncTime: new Date() } : {}),
        },
      });
    }
  } catch (error) {
    logger.error('Failed to update connection status', { error });
  }
}

/**
 * Get current connection status
 */
export function getConnectionStatus(): ConnectionStatus {
  return currentStatus;
}

/**
 * Get detailed connectivity info
 */
export function getConnectivityInfo(): {
  status: ConnectionStatus;
  lastSuccessfulPing: Date | null;
  consecutiveFailures: number;
  latencyMs: number | null;
} {
  return {
    status: currentStatus,
    lastSuccessfulPing,
    consecutiveFailures,
    latencyMs,
  };
}

/**
 * Check if we should warn about connectivity
 */
export function shouldWarnAboutConnectivity(): {
  shouldWarn: boolean;
  severity: 'warning' | 'critical' | null;
  message: string | null;
} {
  if (currentStatus === 'online') {
    return { shouldWarn: false, severity: null, message: null };
  }

  if (currentStatus === 'offline') {
    const hoursSinceSuccess = lastSuccessfulPing
      ? (Date.now() - lastSuccessfulPing.getTime()) / (1000 * 60 * 60)
      : Infinity;

    if (hoursSinceSuccess > 24) {
      return {
        shouldWarn: true,
        severity: 'critical',
        message: `Offline for ${Math.round(hoursSinceSuccess)} hours - Contact IT immediately`,
      };
    }

    return {
      shouldWarn: true,
      severity: 'warning',
      message: 'Currently offline - Events are queued for sync',
    };
  }

  // Degraded
  return {
    shouldWarn: true,
    severity: 'warning',
    message: 'Connection unstable - Some sync operations may be delayed',
  };
}

/**
 * Force a connectivity check
 */
export async function forceConnectivityCheck(prisma: PrismaClient): Promise<ConnectionStatus> {
  logger.info('Force connectivity check requested');
  return await checkConnectivity(prisma);
}
