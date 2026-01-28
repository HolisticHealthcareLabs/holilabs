/**
 * Rule Updater
 *
 * Firewall-safe rule update mechanism using long polling over HTTPS/443.
 * Does NOT use WebSockets (often blocked by hospital firewalls).
 *
 * Features:
 * - Long polling (30s timeout, 60s interval)
 * - Atomic rule updates (checksum verification)
 * - Fallback to cached rules on failure
 * - Integration with connectivity heartbeat
 *
 * @module lib/sync/rule-updater
 */

import logger from '@/lib/logger';
import type {
  RuleVersion,
  RuleUpdate,
  SyncConfig,
  SyncEvent,
  SyncEventListener,
} from './types';
import { DEFAULT_SYNC_CONFIG } from './types';
import { connectivityHeartbeat } from './connectivity';

// ═══════════════════════════════════════════════════════════════════════════════
// RULE UPDATER IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

export class RuleUpdater {
  private config: SyncConfig;
  private currentVersion: RuleVersion | null = null;
  private listeners: SyncEventListener[] = [];
  private pollInterval: NodeJS.Timeout | null = null;
  private isPolling = false;
  private localRulesCache: RuleUpdate | null = null;

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = { ...DEFAULT_SYNC_CONFIG, ...config };
  }

  /**
   * Start automatic rule polling
   */
  start(): void {
    if (this.pollInterval) return;

    // Initial poll
    this.pollForUpdates();

    // Schedule periodic polls
    this.pollInterval = setInterval(() => {
      this.pollForUpdates();
    }, this.config.pollIntervalMs);

    logger.info({
      event: 'rule_updater_started',
      pollIntervalMs: this.config.pollIntervalMs,
    });
  }

  /**
   * Stop automatic polling
   */
  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;

      logger.info({ event: 'rule_updater_stopped' });
    }
  }

  /**
   * Poll for rule updates using long polling (FIREWALL-SAFE)
   *
   * Uses standard HTTPS GET on port 443 with long timeout.
   * Hospital firewalls typically allow this.
   */
  async pollForUpdates(): Promise<RuleUpdate | null> {
    if (this.isPolling) return null;

    this.isPolling = true;

    try {
      const currentVersionParam = this.currentVersion?.version || 'none';
      const url = `${this.config.cloudBaseUrl}/api/rules/poll?currentVersion=${encodeURIComponent(currentVersionParam)}`;

      logger.debug({
        event: 'rule_poll_started',
        currentVersion: currentVersionParam,
      });

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Client-Type': 'edge-node',
        },
        // Long poll timeout - server holds connection until update or timeout
        signal: AbortSignal.timeout(this.config.longPollTimeoutMs),
      });

      if (!response.ok) {
        if (response.status === 304) {
          // No updates available
          logger.debug({ event: 'rule_poll_no_updates' });
          return null;
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const update = await response.json() as RuleUpdate;

      // Verify checksum before applying
      const isValid = await this.verifyChecksum(update);
      if (!isValid) {
        throw new Error('Rule update checksum verification failed');
      }

      // Apply update
      await this.applyUpdate(update);

      return update;
    } catch (error) {
      // Don't log timeout errors (expected for long polling)
      if (error instanceof Error && error.name === 'TimeoutError') {
        logger.debug({ event: 'rule_poll_timeout' });
        return null;
      }

      logger.warn({
        event: 'rule_poll_failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return null;
    } finally {
      this.isPolling = false;
    }
  }

  /**
   * Force an immediate update check (bypass interval)
   */
  async forceUpdate(): Promise<RuleUpdate | null> {
    // Cancel any existing poll
    this.isPolling = false;
    return this.pollForUpdates();
  }

  /**
   * Get current rule version
   */
  getCurrentVersion(): RuleVersion | null {
    return this.currentVersion ? { ...this.currentVersion } : null;
  }

  /**
   * Check if rules are stale (>48 hours old)
   */
  isStale(): boolean {
    if (!this.currentVersion) return true;

    const hoursSinceUpdate =
      (Date.now() - this.currentVersion.timestamp.getTime()) / (1000 * 60 * 60);

    return hoursSinceUpdate >= this.config.staleWarningHours;
  }

  /**
   * Get cached rules (for offline operation)
   */
  getCachedRules(): RuleUpdate | null {
    return this.localRulesCache;
  }

  /**
   * Apply rule update atomically
   */
  async applyUpdate(update: RuleUpdate): Promise<void> {
    const previousVersion = this.currentVersion;

    try {
      // Update current version
      this.currentVersion = update.version;
      this.localRulesCache = update;

      // Notify connectivity heartbeat
      connectivityHeartbeat.setRuleVersion(update.version.version);

      // Persist to local storage (for edge node recovery)
      await this.persistRules(update);

      logger.info({
        event: 'rules_updated',
        previousVersion: previousVersion?.version,
        newVersion: update.version.version,
        clinicalRules: update.rules.clinical.length,
        administrativeRules: update.rules.administrative.length,
        billingRules: update.rules.billing.length,
        changelog: update.changelog,
      });

      this.emit({
        type: 'rules_updated',
        timestamp: new Date(),
        data: {
          version: update.version.version,
          previousVersion: previousVersion?.version,
        },
      });
    } catch (error) {
      // Rollback on failure
      this.currentVersion = previousVersion;

      logger.error({
        event: 'rule_update_failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Load rules from local cache (for offline startup)
   */
  async loadFromCache(): Promise<RuleUpdate | null> {
    try {
      // In a real edge node, this would read from SQLite or file system
      // For now, we use in-memory cache
      if (this.localRulesCache) {
        this.currentVersion = this.localRulesCache.version;
        connectivityHeartbeat.setRuleVersion(this.localRulesCache.version.version);

        logger.info({
          event: 'rules_loaded_from_cache',
          version: this.currentVersion.version,
        });

        return this.localRulesCache;
      }

      return null;
    } catch (error) {
      logger.error({
        event: 'rule_cache_load_failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return null;
    }
  }

  /**
   * Initialize with default rules (fallback when no cache)
   */
  initializeWithDefaults(version: string): void {
    this.currentVersion = {
      version,
      timestamp: new Date(),
      checksum: 'default',
    };

    connectivityHeartbeat.setRuleVersion(version);

    logger.info({
      event: 'rules_initialized_with_defaults',
      version,
    });
  }

  /**
   * Subscribe to rule update events
   */
  subscribe(listener: SyncEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Verify update checksum
   */
  private async verifyChecksum(update: RuleUpdate): Promise<boolean> {
    try {
      // Calculate checksum of rule content
      const content = JSON.stringify(update.rules);
      const encoder = new TextEncoder();
      const data = encoder.encode(content);

      // Use SubtleCrypto for SHA-256 (available in both browser and Node.js)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const calculatedChecksum = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      const isValid = calculatedChecksum === update.version.checksum;

      if (!isValid) {
        logger.error({
          event: 'rule_checksum_mismatch',
          expected: update.version.checksum,
          calculated: calculatedChecksum,
        });
      }

      return isValid;
    } catch (error) {
      // If checksum verification fails, allow update but log warning
      logger.warn({
        event: 'rule_checksum_verification_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return true; // Fail open for availability
    }
  }

  /**
   * Persist rules to local storage
   */
  private async persistRules(update: RuleUpdate): Promise<void> {
    // In a real edge node implementation, this would write to SQLite or file system
    // For now, in-memory storage is used (localRulesCache)
    // The persistence layer can be plugged in based on deployment environment
    this.localRulesCache = update;
  }

  /**
   * Emit event to listeners
   */
  private emit(event: SyncEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        logger.error({
          event: 'rule_updater_listener_error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const ruleUpdater = new RuleUpdater();
