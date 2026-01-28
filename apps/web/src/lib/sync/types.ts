/**
 * Sync Module Types
 *
 * Type definitions for Edge-to-Cloud synchronization protocol.
 * Supports offline-first architecture with guaranteed delivery.
 *
 * Key Features:
 * - Long polling over HTTPS/443 (firewall-safe)
 * - Conflict resolution for concurrent edits
 * - Staleness detection for rule updates
 *
 * @module lib/sync/types
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CONNECTION STATUS
// ═══════════════════════════════════════════════════════════════════════════════

export type ConnectionStatus = 'online' | 'degraded' | 'offline';

export interface ConnectivityState {
  status: ConnectionStatus;
  lastSuccessfulSync: Date | null;
  lastCheckAt: Date;
  latencyMs: number | null;
  failedAttempts: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYNC RESULTS
// ═══════════════════════════════════════════════════════════════════════════════

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: SyncError[];
  timestamp: Date;
}

export interface SyncError {
  itemId: string;
  itemType: 'assurance_event' | 'human_feedback' | 'outcome';
  error: string;
  retryable: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RULE UPDATES
// ═══════════════════════════════════════════════════════════════════════════════

export interface RuleVersion {
  version: string; // e.g., "v2026.01.28"
  timestamp: Date;
  checksum: string; // SHA256 of rule JSON
}

export interface RuleUpdate {
  version: RuleVersion;
  rules: {
    clinical: RuleDefinitionData[];
    administrative: RuleDefinitionData[];
    billing: RuleDefinitionData[];
  };
  changelog?: string;
}

export interface RuleDefinitionData {
  id: string;
  name: string;
  category: 'CLINICAL' | 'ADMINISTRATIVE' | 'BILLING';
  defaultColor: 'RED' | 'YELLOW' | 'GREEN';
  isActive: boolean;
  description: string;
  descriptionPortuguese: string;
  regulatoryReference?: string;
  glosaRiskWeight?: number;
  // Rule logic is stored separately, not synced here
}

export interface StalenessWarning {
  show: boolean;
  message: string;
  messagePortuguese: string;
  severity: 'warning' | 'critical';
  currentVersion: string;
  lastSyncAt: Date | null;
  hoursSinceSync: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFLICT RESOLUTION
// ═══════════════════════════════════════════════════════════════════════════════

export interface SyncConflict {
  itemId: string;
  itemType: 'assurance_event' | 'human_feedback' | 'outcome' | 'patient_cache';
  localVersion: unknown;
  remoteVersion: unknown;
  localTimestamp: Date;
  remoteTimestamp: Date;
}

export interface Resolution {
  conflictId: string;
  strategy: 'local_wins' | 'remote_wins' | 'merge' | 'skip';
  mergedValue?: unknown;
  resolvedAt: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUEUE ITEMS
// ═══════════════════════════════════════════════════════════════════════════════

export type QueueItemType = 'assurance_event' | 'human_feedback' | 'outcome';

export type QueueItemStatus = 'pending' | 'in_flight' | 'failed' | 'synced';

export interface QueueItem<T = unknown> {
  id: string;
  type: QueueItemType;
  data: T;
  status: QueueItemStatus;
  createdAt: Date;
  lastAttemptAt: Date | null;
  attemptCount: number;
  errorMessage: string | null;
  priority: number; // Higher = more urgent (alerts before routine)
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATIENT CACHE
// ═══════════════════════════════════════════════════════════════════════════════

export interface PatientCacheEntry {
  patientIdHash: string;
  data: {
    age?: number;
    sex?: 'M' | 'F' | 'OTHER';
    allergies: Array<{
      allergen: string;
      severity: 'MILD' | 'MODERATE' | 'SEVERE';
      type: 'MEDICATION' | 'FOOD' | 'ENVIRONMENTAL' | 'OTHER';
    }>;
    medications: Array<{
      name: string;
      dose?: string;
      frequency?: string;
      isActive: boolean;
    }>;
    diagnoses: Array<{
      icd10Code: string;
      description: string;
      status: 'ACTIVE' | 'RESOLVED' | 'CHRONIC';
    }>;
  };
  cachedAt: Date;
  expiresAt: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYNC PROTOCOL CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

export interface SyncConfig {
  // Cloud endpoint
  cloudBaseUrl: string;

  // Long polling (firewall-safe)
  longPollTimeoutMs: number; // Default: 30000ms
  pollIntervalMs: number; // Default: 60000ms (check every minute)

  // Batch sync
  batchSize: number; // Default: 100 items per batch
  batchIntervalMs: number; // Default: 5000ms (flush every 5 seconds)

  // Retry
  maxRetryAttempts: number; // Default: 5
  retryBackoffMs: number; // Default: 1000ms (exponential backoff)

  // Staleness
  staleWarningHours: number; // Default: 48 hours
  staleCriticalHours: number; // Default: 168 hours (7 days)

  // Heartbeat
  heartbeatIntervalMs: number; // Default: 300000ms (5 minutes)
}

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  cloudBaseUrl: process.env.CLOUD_SYNC_URL || 'https://api.holilabs.com',
  longPollTimeoutMs: 30000,
  pollIntervalMs: 60000,
  batchSize: 100,
  batchIntervalMs: 5000,
  maxRetryAttempts: 5,
  retryBackoffMs: 1000,
  staleWarningHours: 48,
  staleCriticalHours: 168,
  heartbeatIntervalMs: 300000,
};

// ═══════════════════════════════════════════════════════════════════════════════
// SYNC EVENTS (for UI updates)
// ═══════════════════════════════════════════════════════════════════════════════

export type SyncEventType =
  | 'sync_started'
  | 'sync_completed'
  | 'sync_failed'
  | 'connection_changed'
  | 'rules_updated'
  | 'rules_stale'
  | 'conflict_detected'
  | 'queue_item_added'
  | 'queue_item_synced';

export interface SyncEvent {
  type: SyncEventType;
  timestamp: Date;
  data?: unknown;
}

export type SyncEventListener = (event: SyncEvent) => void;
