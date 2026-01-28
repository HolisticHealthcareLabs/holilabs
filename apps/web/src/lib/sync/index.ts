/**
 * Sync Module
 *
 * Edge-to-Cloud synchronization for offline-first architecture.
 *
 * @module lib/sync
 */

// Main protocol (orchestrator)
export { syncProtocol, type SyncHealthSummary } from './protocol';

// Individual components
export { offlineQueue, type QueueStats } from './queue';
export { connectivityHeartbeat } from './connectivity';
export { ruleUpdater } from './rule-updater';

// Types
export type {
  // Connection
  ConnectionStatus,
  ConnectivityState,
  // Sync results
  SyncResult,
  SyncError,
  // Rules
  RuleVersion,
  RuleUpdate,
  RuleDefinitionData,
  StalenessWarning,
  // Conflicts
  SyncConflict,
  Resolution,
  // Queue
  QueueItem,
  QueueItemType,
  QueueItemStatus,
  // Patient cache
  PatientCacheEntry,
  // Config
  SyncConfig,
  // Events
  SyncEventType,
  SyncEvent,
  SyncEventListener,
} from './types';

export { DEFAULT_SYNC_CONFIG } from './types';
