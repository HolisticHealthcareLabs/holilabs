/**
 * Sync Protocol
 *
 * Main coordinator for Edge-to-Cloud synchronization.
 * Orchestrates the offline queue, connectivity heartbeat, and rule updater.
 *
 * Architecture:
 * - LOCAL FIRST: Traffic Light runs entirely on edge node
 * - ASYNC SYNC: Events batched and synced when connection stable
 * - FIREWALL SAFE: All communication over HTTPS/443
 *
 * @module lib/sync/protocol
 */

import logger from '@/lib/logger';
import type {
  SyncResult,
  SyncConflict,
  Resolution,
  ConnectionStatus,
  SyncConfig,
  SyncEvent,
  SyncEventListener,
  PatientCacheEntry,
  QueueItem,
} from './types';
import { DEFAULT_SYNC_CONFIG } from './types';
import { offlineQueue } from './queue';
import { connectivityHeartbeat } from './connectivity';
import { ruleUpdater } from './rule-updater';

// ═══════════════════════════════════════════════════════════════════════════════
// SYNC PROTOCOL IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

export class SyncProtocol {
  private config: SyncConfig;
  private listeners: SyncEventListener[] = [];
  private syncInterval: NodeJS.Timeout | null = null;
  private isStarted = false;

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = { ...DEFAULT_SYNC_CONFIG, ...config };
  }

  /**
   * Initialize and start the sync protocol
   */
  async start(): Promise<void> {
    if (this.isStarted) return;

    logger.info({ event: 'sync_protocol_starting' });

    // 1. Load cached rules (for offline startup)
    await ruleUpdater.loadFromCache();
    if (!ruleUpdater.getCurrentVersion()) {
      // Initialize with default version if no cache
      ruleUpdater.initializeWithDefaults('v2026.01.00-default');
    }

    // 2. Start heartbeat monitoring
    connectivityHeartbeat.start();

    // 3. Start rule update polling
    ruleUpdater.start();

    // 4. Start periodic sync
    this.startPeriodicSync();

    // 5. Subscribe to queue events
    this.setupEventForwarding();

    this.isStarted = true;

    logger.info({
      event: 'sync_protocol_started',
      config: {
        batchSize: this.config.batchSize,
        batchIntervalMs: this.config.batchIntervalMs,
        pollIntervalMs: this.config.pollIntervalMs,
      },
    });
  }

  /**
   * Stop the sync protocol
   */
  stop(): void {
    if (!this.isStarted) return;

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    connectivityHeartbeat.stop();
    ruleUpdater.stop();

    this.isStarted = false;

    logger.info({ event: 'sync_protocol_stopped' });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PUSH: Edge → Cloud (async, batched)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Push assurance events to cloud
   */
  async pushAssuranceEvents(): Promise<SyncResult> {
    return this.pushBatch('assurance_event', '/api/sync/assurance-events');
  }

  /**
   * Push human feedback to cloud
   */
  async pushHumanFeedback(): Promise<SyncResult> {
    return this.pushBatch('human_feedback', '/api/sync/human-feedback');
  }

  /**
   * Push outcomes to cloud
   */
  async pushOutcomes(): Promise<SyncResult> {
    return this.pushBatch('outcome', '/api/sync/outcomes');
  }

  /**
   * Generic batch push
   */
  private async pushBatch(
    itemType: 'assurance_event' | 'human_feedback' | 'outcome',
    endpoint: string
  ): Promise<SyncResult> {
    const items = offlineQueue.getItemsByType(itemType)
      .filter((i) => i.status === 'pending' || i.status === 'failed');

    if (items.length === 0) {
      return {
        success: true,
        syncedCount: 0,
        failedCount: 0,
        errors: [],
        timestamp: new Date(),
      };
    }

    return offlineQueue.processBatch(async (batch) => {
      const result = await this.sendBatch(batch, endpoint);
      return result;
    });
  }

  /**
   * Send batch to cloud
   */
  private async sendBatch(
    items: QueueItem[],
    endpoint: string
  ): Promise<SyncResult> {
    const connectionStatus = connectivityHeartbeat.getStatus();

    if (connectionStatus === 'offline') {
      return {
        success: false,
        syncedCount: 0,
        failedCount: items.length,
        errors: items.map((item) => ({
          itemId: item.id,
          itemType: item.type,
          error: 'Offline',
          retryable: true,
        })),
        timestamp: new Date(),
      };
    }

    try {
      this.emit({ type: 'sync_started', timestamp: new Date(), data: { itemCount: items.length } });

      const response = await fetch(`${this.config.cloudBaseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Type': 'edge-node',
        },
        body: JSON.stringify({
          items: items.map((item) => item.data),
        }),
        signal: AbortSignal.timeout(30000), // 30s timeout for batch
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json() as {
        synced: string[];
        failed: Array<{ id: string; error: string; retryable: boolean }>;
      };

      const syncResult: SyncResult = {
        success: result.failed.length === 0,
        syncedCount: result.synced.length,
        failedCount: result.failed.length,
        errors: result.failed.map((f) => ({
          itemId: f.id,
          itemType: items.find((i) => i.id === f.id)?.type || 'assurance_event',
          error: f.error,
          retryable: f.retryable,
        })),
        timestamp: new Date(),
      };

      logger.info({
        event: 'sync_batch_completed',
        endpoint,
        synced: syncResult.syncedCount,
        failed: syncResult.failedCount,
      });

      this.emit({
        type: 'sync_completed',
        timestamp: new Date(),
        data: { synced: syncResult.syncedCount, failed: syncResult.failedCount },
      });

      return syncResult;
    } catch (error) {
      logger.error({
        event: 'sync_batch_failed',
        endpoint,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      this.emit({ type: 'sync_failed', timestamp: new Date(), data: { error } });

      return {
        success: false,
        syncedCount: 0,
        failedCount: items.length,
        errors: items.map((item) => ({
          itemId: item.id,
          itemType: item.type,
          error: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
        })),
        timestamp: new Date(),
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PULL: Cloud → Edge (periodic, non-blocking)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Pull rule updates (delegated to ruleUpdater)
   */
  async pullRuleUpdates(): Promise<void> {
    await ruleUpdater.forceUpdate();
  }

  /**
   * Pull patient cache for specified patients
   */
  async pullPatientCache(patientIds: string[]): Promise<PatientCacheEntry[]> {
    const connectionStatus = connectivityHeartbeat.getStatus();

    if (connectionStatus === 'offline') {
      logger.debug({ event: 'patient_cache_pull_skipped', reason: 'offline' });
      return [];
    }

    try {
      const response = await fetch(`${this.config.cloudBaseUrl}/api/sync/patient-cache`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Type': 'edge-node',
        },
        body: JSON.stringify({ patientIds }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json() as { patients: PatientCacheEntry[] };

      logger.debug({
        event: 'patient_cache_pulled',
        requestedCount: patientIds.length,
        receivedCount: data.patients.length,
      });

      return data.patients;
    } catch (error) {
      logger.warn({
        event: 'patient_cache_pull_failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFLICT RESOLUTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Resolve sync conflict
   *
   * Default strategy: Remote wins (cloud is source of truth for most data)
   * Exception: Human feedback always uses local (doctor's override is sacred)
   */
  async resolveConflict(conflict: SyncConflict): Promise<Resolution> {
    let strategy: Resolution['strategy'];

    // Human feedback: local always wins (LGPD Article 20 - human decision takes precedence)
    if (conflict.itemType === 'human_feedback') {
      strategy = 'local_wins';
    }
    // Outcome data: remote wins (insurers are source of truth for glosa data)
    else if (conflict.itemType === 'outcome') {
      strategy = 'remote_wins';
    }
    // Assurance events: newer wins
    else if (conflict.localTimestamp > conflict.remoteTimestamp) {
      strategy = 'local_wins';
    } else {
      strategy = 'remote_wins';
    }

    const resolution: Resolution = {
      conflictId: `${conflict.itemType}-${conflict.itemId}`,
      strategy,
      resolvedAt: new Date(),
    };

    logger.info({
      event: 'conflict_resolved',
      itemType: conflict.itemType,
      itemId: conflict.itemId,
      strategy,
    });

    this.emit({
      type: 'conflict_detected',
      timestamp: new Date(),
      data: { conflict, resolution },
    });

    return resolution;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATUS & HEALTH
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return connectivityHeartbeat.getStatus();
  }

  /**
   * Get sync health summary
   */
  getHealthSummary(): SyncHealthSummary {
    const queueStats = offlineQueue.getStats();
    const connectivityState = connectivityHeartbeat.getState();
    const ruleVersion = ruleUpdater.getCurrentVersion();
    const stalenessWarning = connectivityHeartbeat.getStalenessWarning();

    return {
      connectionStatus: connectivityState.status,
      lastSuccessfulSync: connectivityState.lastSuccessfulSync,
      latencyMs: connectivityState.latencyMs,
      queueDepth: queueStats.total,
      pendingItems: queueStats.pending,
      failedItems: queueStats.failed,
      ruleVersion: ruleVersion?.version || 'unknown',
      rulesStale: stalenessWarning.show,
      stalenessWarning: stalenessWarning.show ? stalenessWarning.message : null,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT SUBSCRIPTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Subscribe to sync events
   */
  subscribe(listener: SyncEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Start periodic sync
   */
  private startPeriodicSync(): void {
    this.syncInterval = setInterval(async () => {
      const status = connectivityHeartbeat.getStatus();

      if (status === 'online') {
        // Push all pending items
        await Promise.all([
          this.pushAssuranceEvents(),
          this.pushHumanFeedback(),
          this.pushOutcomes(),
        ]);
      }
    }, this.config.batchIntervalMs);
  }

  /**
   * Setup event forwarding from sub-components
   */
  private setupEventForwarding(): void {
    // Forward queue events
    offlineQueue.subscribe((event) => this.emit(event));

    // Forward connectivity events
    connectivityHeartbeat.subscribe((event) => this.emit(event));

    // Forward rule update events
    ruleUpdater.subscribe((event) => this.emit(event));
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
          event: 'sync_protocol_listener_error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HEALTH SUMMARY TYPE
// ═══════════════════════════════════════════════════════════════════════════════

export interface SyncHealthSummary {
  connectionStatus: ConnectionStatus;
  lastSuccessfulSync: Date | null;
  latencyMs: number | null;
  queueDepth: number;
  pendingItems: number;
  failedItems: number;
  ruleVersion: string;
  rulesStale: boolean;
  stalenessWarning: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const syncProtocol = new SyncProtocol();

// Re-export components for direct access
export { offlineQueue } from './queue';
export { connectivityHeartbeat } from './connectivity';
export { ruleUpdater } from './rule-updater';
