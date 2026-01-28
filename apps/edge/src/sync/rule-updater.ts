/**
 * Rule Updater Service
 *
 * FIREWALL-SAFE: Uses long polling over HTTPS (port 443)
 * WebSockets are often blocked by hospital firewalls.
 *
 * Responsible for:
 * - Polling cloud for rule updates
 * - Atomic rule application with checksum verification
 * - Staleness detection and alerting
 */

import { PrismaClient } from '../lib/prisma.js';
import { createHash } from 'crypto';
import { logger } from '../utils/logger.js';
import { SyncConfig } from './index.js';
import { updateConnectionStatus } from './connectivity.js';

let pollInterval: NodeJS.Timeout | null = null;
let cloudUrl: string = '';
let isPolling: boolean = false;

const LONG_POLL_TIMEOUT_MS = 30_000; // 30 seconds

export interface RuleUpdate {
  version: string;
  timestamp: string;
  checksum: string;
  rules: Array<{
    ruleId: string;
    category: string;
    ruleType: string;
    name: string;
    description?: string;
    priority: number;
    isActive: boolean;
    ruleLogic: Record<string, unknown>;
  }>;
  changelog?: string;
}

export interface RuleVersion {
  version: string;
  timestamp: Date;
  checksum: string;
}

/**
 * Start the rule updater service
 */
export async function startRuleUpdater(
  prisma: PrismaClient,
  config: SyncConfig
): Promise<void> {
  cloudUrl = config.cloudUrl;

  // Initial check
  await checkForUpdates(prisma);

  // Set up interval for periodic checks
  pollInterval = setInterval(
    () => checkForUpdates(prisma),
    config.pollIntervalMs
  );

  logger.info('Rule updater started', {
    cloudUrl,
    pollIntervalMs: config.pollIntervalMs,
  });
}

/**
 * Stop the rule updater service
 */
export function stopRuleUpdater(): void {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  isPolling = false;
  logger.info('Rule updater stopped');
}

/**
 * Check for rule updates using long polling
 */
export async function checkForUpdates(prisma: PrismaClient): Promise<boolean> {
  if (isPolling) {
    logger.debug('Already polling for updates, skipping');
    return false;
  }

  isPolling = true;

  try {
    // Get current rule version
    const currentVersion = await getCurrentVersion(prisma);

    logger.debug('Checking for rule updates', {
      currentVersion: currentVersion?.version || 'none',
    });

    // Long poll for updates
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), LONG_POLL_TIMEOUT_MS);

    try {
      const response = await fetch(
        `${cloudUrl}/api/rules/poll?` +
          new URLSearchParams({
            currentVersion: currentVersion?.version || 'none',
            clinicId: process.env.CLINIC_ID || '',
          }),
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'X-Edge-Node-ID': process.env.EDGE_NODE_ID || 'unknown',
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      // Update connection status on successful request
      await updateConnectionStatus(prisma, 'online');

      if (response.status === 204) {
        // No updates available
        logger.debug('No rule updates available');
        return false;
      }

      if (response.status === 200) {
        const update = (await response.json()) as RuleUpdate;

        // Verify checksum before applying
        if (!verifyChecksum(update)) {
          logger.error('Rule update checksum verification failed', {
            version: update.version,
          });
          return false;
        }

        // Apply the update atomically
        await applyUpdate(prisma, update);
        return true;
      }

      logger.warn('Unexpected response from rule poll', {
        status: response.status,
      });
      return false;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        // Long poll timeout - this is normal
        logger.debug('Long poll timeout - no updates');
        return false;
      }

      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to check for rule updates', { error: message });

    // Update connection status
    await updateConnectionStatus(prisma, 'degraded');

    return false;
  } finally {
    isPolling = false;
  }
}

/**
 * Get the current active rule version
 */
export async function getCurrentVersion(prisma: PrismaClient): Promise<RuleVersion | null> {
  const version = await prisma.ruleVersion.findFirst({
    where: { isActive: true },
    orderBy: { timestamp: 'desc' },
  });

  if (!version) {
    return null;
  }

  return {
    version: version.version,
    timestamp: version.timestamp,
    checksum: version.checksum,
  };
}

/**
 * Verify the checksum of a rule update
 */
function verifyChecksum(update: RuleUpdate): boolean {
  // Calculate checksum of rules
  const rulesJson = JSON.stringify(update.rules, Object.keys(update.rules[0] || {}).sort());
  const calculatedChecksum = createHash('sha256').update(rulesJson).digest('hex');

  if (calculatedChecksum !== update.checksum) {
    logger.error('Checksum mismatch', {
      expected: update.checksum,
      calculated: calculatedChecksum,
    });
    return false;
  }

  return true;
}

/**
 * Apply a rule update atomically
 */
export async function applyUpdate(
  prisma: PrismaClient,
  update: RuleUpdate
): Promise<void> {
  logger.info('Applying rule update', {
    version: update.version,
    ruleCount: update.rules.length,
  });

  await prisma.$transaction(async (tx) => {
    // Deactivate old rules
    await tx.ruleCache.updateMany({
      data: { isActive: false },
    });

    // Deactivate old versions
    await tx.ruleVersion.updateMany({
      data: { isActive: false },
    });

    // Insert new rules
    for (const rule of update.rules) {
      await tx.ruleCache.upsert({
        where: { ruleId: rule.ruleId },
        create: {
          ruleId: rule.ruleId,
          category: rule.category,
          ruleType: rule.ruleType,
          name: rule.name,
          description: rule.description,
          priority: rule.priority,
          isActive: rule.isActive,
          ruleLogic: JSON.stringify(rule.ruleLogic),
          version: update.version,
          checksum: createHash('sha256')
            .update(JSON.stringify(rule.ruleLogic))
            .digest('hex'),
          syncedAt: new Date(),
        },
        update: {
          category: rule.category,
          ruleType: rule.ruleType,
          name: rule.name,
          description: rule.description,
          priority: rule.priority,
          isActive: rule.isActive,
          ruleLogic: JSON.stringify(rule.ruleLogic),
          version: update.version,
          checksum: createHash('sha256')
            .update(JSON.stringify(rule.ruleLogic))
            .digest('hex'),
          syncedAt: new Date(),
        },
      });
    }

    // Create new version record
    await tx.ruleVersion.create({
      data: {
        version: update.version,
        timestamp: new Date(update.timestamp),
        checksum: update.checksum,
        isActive: true,
        changelog: update.changelog,
        appliedAt: new Date(),
      },
    });

    // Update sync state
    await tx.syncState.updateMany({
      data: {
        lastRuleVersion: update.version,
        lastSyncTime: new Date(),
        updatedAt: new Date(),
      },
    });
  });

  logger.info('Rule update applied successfully', {
    version: update.version,
    ruleCount: update.rules.length,
  });
}

/**
 * Check if rules are stale
 */
export async function checkStaleness(prisma: PrismaClient): Promise<{
  isStale: boolean;
  isCritical: boolean;
  hoursSinceUpdate: number;
  message?: string;
}> {
  const version = await prisma.ruleVersion.findFirst({
    where: { isActive: true },
    orderBy: { timestamp: 'desc' },
  });

  if (!version) {
    return {
      isStale: true,
      isCritical: true,
      hoursSinceUpdate: Infinity,
      message: 'No rules loaded - Contact IT',
    };
  }

  const now = new Date();
  const hoursSinceUpdate = (now.getTime() - version.timestamp.getTime()) / (1000 * 60 * 60);

  if (hoursSinceUpdate > 168) {
    // 7 days
    return {
      isStale: true,
      isCritical: true,
      hoursSinceUpdate: Math.round(hoursSinceUpdate),
      message: `Rules: ${version.version} (CRITICAL - ${Math.round(hoursSinceUpdate / 24)} days old - Contact IT immediately)`,
    };
  }

  if (hoursSinceUpdate > 48) {
    return {
      isStale: true,
      isCritical: false,
      hoursSinceUpdate: Math.round(hoursSinceUpdate),
      message: `Rules: ${version.version} (Stale - ${Math.round(hoursSinceUpdate / 24)} days old - Contact IT)`,
    };
  }

  return {
    isStale: false,
    isCritical: false,
    hoursSinceUpdate: Math.round(hoursSinceUpdate),
  };
}

/**
 * Force reload rules from cloud
 */
export async function forceReloadRules(prisma: PrismaClient): Promise<boolean> {
  logger.info('Force rule reload requested');

  // Reset current version to force full reload
  await prisma.ruleVersion.updateMany({
    data: { isActive: false },
  });

  return await checkForUpdates(prisma);
}
