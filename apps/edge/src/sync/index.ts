/**
 * Edge Node Sync Services
 *
 * Coordinates all sync operations:
 * - Rule updates from cloud (long polling)
 * - Assurance event push to cloud
 * - Patient cache updates
 * - Connection monitoring
 */

import { PrismaClient } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';
import { startRuleUpdater, stopRuleUpdater } from './rule-updater.js';
import { startQueueProcessor, stopQueueProcessor } from './queue.js';
import { startConnectivityMonitor, stopConnectivityMonitor, getConnectionStatus } from './connectivity.js';

let isRunning = false;

export interface SyncConfig {
  cloudUrl: string;
  clinicId?: string;
  pollIntervalMs: number;
  queueProcessIntervalMs: number;
  connectivityCheckIntervalMs: number;
}

const DEFAULT_CONFIG: SyncConfig = {
  cloudUrl: process.env.CLOUD_URL || 'https://api.holilabs.com',
  clinicId: process.env.CLINIC_ID,
  pollIntervalMs: 60_000, // Check for rule updates every minute
  queueProcessIntervalMs: 30_000, // Process queue every 30 seconds
  connectivityCheckIntervalMs: 300_000, // Check connectivity every 5 minutes
};

/**
 * Start all sync services
 */
export async function startSyncServices(
  prisma: PrismaClient,
  cloudUrl?: string
): Promise<void> {
  if (isRunning) {
    logger.warn('Sync services already running');
    return;
  }

  const config: SyncConfig = {
    ...DEFAULT_CONFIG,
    cloudUrl: cloudUrl || DEFAULT_CONFIG.cloudUrl,
  };

  logger.info('Starting sync services', {
    cloudUrl: config.cloudUrl,
    clinicId: config.clinicId || 'not_configured',
  });

  try {
    // Initialize sync state if not exists
    const existingState = await prisma.syncState.findFirst();
    if (!existingState) {
      await prisma.syncState.create({
        data: {
          connectionStatus: 'offline',
          cloudUrl: config.cloudUrl,
          clinicId: config.clinicId,
        },
      });
    }

    // Start connectivity monitor
    await startConnectivityMonitor(prisma, config);
    logger.info('Connectivity monitor started');

    // Start rule updater (long polling)
    await startRuleUpdater(prisma, config);
    logger.info('Rule updater started');

    // Start queue processor
    await startQueueProcessor(prisma, config);
    logger.info('Queue processor started');

    isRunning = true;
    logger.info('All sync services started successfully');

    // Log initial status
    const status = await getSyncStatus(prisma);
    logger.info('Initial sync status', status);
  } catch (error) {
    logger.error('Failed to start sync services', { error });
    throw error;
  }
}

/**
 * Stop all sync services gracefully
 */
export async function stopSyncServices(prisma: PrismaClient): Promise<void> {
  if (!isRunning) {
    logger.warn('Sync services not running');
    return;
  }

  logger.info('Stopping sync services...');

  try {
    stopConnectivityMonitor();
    stopRuleUpdater();
    stopQueueProcessor();

    // Update sync state
    await prisma.syncState.updateMany({
      data: {
        connectionStatus: 'offline',
        updatedAt: new Date(),
      },
    });

    isRunning = false;
    logger.info('All sync services stopped');
  } catch (error) {
    logger.error('Error stopping sync services', { error });
    throw error;
  }
}

/**
 * Get comprehensive sync status
 */
export async function getSyncStatus(prisma: PrismaClient): Promise<{
  isRunning: boolean;
  connectionStatus: string;
  lastSync: Date | null;
  hoursSinceSync: number;
  isStale: boolean;
  isCritical: boolean;
  ruleVersion: string | null;
  pendingQueueItems: number;
}> {
  const syncState = await prisma.syncState.findFirst({
    orderBy: { updatedAt: 'desc' },
  });

  const ruleVersion = await prisma.ruleVersion.findFirst({
    where: { isActive: true },
    orderBy: { timestamp: 'desc' },
  });

  const pendingQueueItems = await prisma.queueItem.count({
    where: { status: 'pending' },
  });

  const lastSync = syncState?.lastSyncTime || null;
  const now = new Date();
  const hoursSinceSync = lastSync
    ? (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60)
    : Infinity;

  return {
    isRunning,
    connectionStatus: getConnectionStatus(),
    lastSync,
    hoursSinceSync: Math.round(hoursSinceSync),
    isStale: hoursSinceSync > 48,
    isCritical: hoursSinceSync > 168, // 7 days
    ruleVersion: ruleVersion?.version || null,
    pendingQueueItems,
  };
}

/**
 * Force an immediate sync attempt
 */
export async function forceSyncNow(prisma: PrismaClient): Promise<{
  success: boolean;
  error?: string;
}> {
  logger.info('Force sync requested');

  try {
    // Trigger immediate rule check
    const { checkForUpdates } = await import('./rule-updater.js');
    await checkForUpdates(prisma);

    // Trigger immediate queue processing
    const { processQueue } = await import('./queue.js');
    await processQueue(prisma);

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Force sync failed', { error: message });
    return { success: false, error: message };
  }
}
