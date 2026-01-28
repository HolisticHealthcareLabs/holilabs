/**
 * Connectivity Heartbeat
 *
 * Monitors connection to cloud and detects staleness.
 * Pings cloud every 5 minutes and generates warnings if rules are stale.
 *
 * Features:
 * - Connection status monitoring (online/degraded/offline)
 * - Staleness detection (>48h warning, >7d critical)
 * - Latency tracking
 * - Automatic recovery detection
 *
 * @module lib/sync/connectivity
 */

import logger from '@/lib/logger';
import type {
  ConnectionStatus,
  ConnectivityState,
  StalenessWarning,
  SyncConfig,
  SyncEvent,
  SyncEventListener,
} from './types';
import { DEFAULT_SYNC_CONFIG } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// HEARTBEAT IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

export class ConnectivityHeartbeat {
  private config: SyncConfig;
  private state: ConnectivityState;
  private listeners: SyncEventListener[] = [];
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private currentRuleVersion: string | null = null;
  private lastRuleSyncAt: Date | null = null;

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = { ...DEFAULT_SYNC_CONFIG, ...config };
    this.state = {
      status: 'offline', // Start pessimistic
      lastSuccessfulSync: null,
      lastCheckAt: new Date(),
      latencyMs: null,
      failedAttempts: 0,
    };
  }

  /**
   * Start the heartbeat monitor
   */
  start(): void {
    if (this.heartbeatInterval) return;

    // Initial check
    this.checkConnectivity();

    // Schedule periodic checks
    this.heartbeatInterval = setInterval(() => {
      this.checkConnectivity();
    }, this.config.heartbeatIntervalMs);

    logger.info({
      event: 'heartbeat_started',
      intervalMs: this.config.heartbeatIntervalMs,
    });
  }

  /**
   * Stop the heartbeat monitor
   */
  stop(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;

      logger.info({ event: 'heartbeat_stopped' });
    }
  }

  /**
   * Check connectivity to cloud
   */
  async checkConnectivity(): Promise<ConnectionStatus> {
    const startTime = Date.now();

    try {
      // Ping the cloud health endpoint
      const response = await fetch(`${this.config.cloudBaseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000), // 10s timeout
      });

      const latencyMs = Date.now() - startTime;
      const previousStatus = this.state.status;

      if (response.ok) {
        this.state = {
          status: 'online',
          lastSuccessfulSync: new Date(),
          lastCheckAt: new Date(),
          latencyMs,
          failedAttempts: 0,
        };

        // Log recovery
        if (previousStatus !== 'online') {
          logger.info({
            event: 'connection_recovered',
            previousStatus,
            latencyMs,
          });

          this.emit({
            type: 'connection_changed',
            timestamp: new Date(),
            data: { status: 'online', previousStatus },
          });
        }
      } else {
        // Server responded but with error
        this.handleDegradedConnection(latencyMs, `HTTP ${response.status}`);
      }
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      this.handleFailedConnection(latencyMs, error);
    }

    return this.state.status;
  }

  /**
   * Handle degraded connection (server responded with error)
   */
  private handleDegradedConnection(latencyMs: number, reason: string): void {
    const previousStatus = this.state.status;

    this.state.status = 'degraded';
    this.state.lastCheckAt = new Date();
    this.state.latencyMs = latencyMs;
    this.state.failedAttempts++;

    if (previousStatus !== 'degraded') {
      logger.warn({
        event: 'connection_degraded',
        reason,
        failedAttempts: this.state.failedAttempts,
      });

      this.emit({
        type: 'connection_changed',
        timestamp: new Date(),
        data: { status: 'degraded', previousStatus, reason },
      });
    }
  }

  /**
   * Handle failed connection (no response)
   */
  private handleFailedConnection(latencyMs: number, error: unknown): void {
    const previousStatus = this.state.status;

    this.state.failedAttempts++;
    this.state.lastCheckAt = new Date();
    this.state.latencyMs = latencyMs;

    // After 3 failed attempts, consider offline
    if (this.state.failedAttempts >= 3) {
      this.state.status = 'offline';
    } else {
      this.state.status = 'degraded';
    }

    if (previousStatus !== this.state.status) {
      logger.warn({
        event: 'connection_status_changed',
        status: this.state.status,
        previousStatus,
        failedAttempts: this.state.failedAttempts,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      this.emit({
        type: 'connection_changed',
        timestamp: new Date(),
        data: { status: this.state.status, previousStatus },
      });
    }
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.state.status;
  }

  /**
   * Get full connectivity state
   */
  getState(): ConnectivityState {
    return { ...this.state };
  }

  /**
   * Get last successful sync timestamp
   */
  getLastSuccessfulSync(): Date | null {
    return this.state.lastSuccessfulSync;
  }

  /**
   * Update rule version (called after successful rule sync)
   */
  setRuleVersion(version: string): void {
    this.currentRuleVersion = version;
    this.lastRuleSyncAt = new Date();

    logger.info({
      event: 'rule_version_updated',
      version,
    });
  }

  /**
   * Get current rule version
   */
  getRuleVersion(): string | null {
    return this.currentRuleVersion;
  }

  /**
   * Check if rules are stale
   */
  isRulesStale(): boolean {
    if (!this.lastRuleSyncAt) return true;

    const hoursSinceSync = (Date.now() - this.lastRuleSyncAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceSync >= this.config.staleWarningHours;
  }

  /**
   * Get stale rules warning for UI display
   */
  getStalenessWarning(): StalenessWarning {
    if (!this.lastRuleSyncAt) {
      return {
        show: true,
        message: 'Rules: Never synced - Contact IT',
        messagePortuguese: 'Regras: Nunca sincronizadas - Contate TI',
        severity: 'critical',
        currentVersion: this.currentRuleVersion || 'unknown',
        lastSyncAt: null,
        hoursSinceSync: Infinity,
      };
    }

    const hoursSinceSync = (Date.now() - this.lastRuleSyncAt.getTime()) / (1000 * 60 * 60);
    const version = this.currentRuleVersion || 'unknown';

    // Critical: >7 days
    if (hoursSinceSync >= this.config.staleCriticalHours) {
      return {
        show: true,
        message: `Rules: ${version} (Critical - ${Math.floor(hoursSinceSync / 24)} days old - Contact IT)`,
        messagePortuguese: `Regras: ${version} (Critico - ${Math.floor(hoursSinceSync / 24)} dias - Contate TI)`,
        severity: 'critical',
        currentVersion: version,
        lastSyncAt: this.lastRuleSyncAt,
        hoursSinceSync,
      };
    }

    // Warning: >48 hours
    if (hoursSinceSync >= this.config.staleWarningHours) {
      this.emit({
        type: 'rules_stale',
        timestamp: new Date(),
        data: { version, hoursSinceSync },
      });

      return {
        show: true,
        message: `Rules: ${version} (Stale - ${Math.floor(hoursSinceSync)}h old - Contact IT)`,
        messagePortuguese: `Regras: ${version} (Desatualizadas - ${Math.floor(hoursSinceSync)}h - Contate TI)`,
        severity: 'warning',
        currentVersion: version,
        lastSyncAt: this.lastRuleSyncAt,
        hoursSinceSync,
      };
    }

    // OK
    return {
      show: false,
      message: `Rules: ${version}`,
      messagePortuguese: `Regras: ${version}`,
      severity: 'warning',
      currentVersion: version,
      lastSyncAt: this.lastRuleSyncAt,
      hoursSinceSync,
    };
  }

  /**
   * Subscribe to connectivity events
   */
  subscribe(listener: SyncEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
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
          event: 'heartbeat_listener_error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const connectivityHeartbeat = new ConnectivityHeartbeat();
