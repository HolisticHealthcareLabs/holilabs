/**
 * Health 3.0 Offline Sync Package - Type Definitions
 * Clinical-grade offline-first synchronization types
 */

// Cache strategy types - define how data is cached and retrieved
export type CacheStrategy = 'CACHE_FIRST' | 'NETWORK_FIRST' | 'STALE_WHILE_REVALIDATE' | 'NETWORK_ONLY';

// Clinical resource types that require special handling
export type ClinicalResourceType =
  | 'patient-demographics'
  | 'active-medications'
  | 'lab-results'
  | 'vital-signs'
  | 'prevention-alerts'
  | 'reference-data'
  | 'imaging-metadata'
  | 'encounter-active'
  | 'clinical-notes'
  | string; // Allow custom resource types

// HTTP methods for sync operations
export type SyncMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// Conflict resolution strategies
export type ConflictResolutionStrategy = 'LAST_WRITE_WINS' | 'MANUAL_REVIEW' | 'SERVER_WINS';

// Sync queue item statuses
export type SyncQueueItemStatus = 'PENDING' | 'IN_FLIGHT' | 'FAILED' | 'COMPLETED';

// Conflict resolution outcomes
export type ConflictResolution = 'PENDING' | 'LOCAL_WINS' | 'SERVER_WINS' | 'MANUAL';

/**
 * Clinical Cache Rule
 * Defines how a clinical resource should be cached and how fresh it needs to be
 *
 * Safety Invariants:
 * - CYRUS: tenantScoped MUST always be true for clinical data
 * - RUTH: staleWarningMs used to show "data may be stale" warning to clinician
 */
export interface ClinicalCacheRule {
  /** Type of clinical resource being cached */
  resourceType: ClinicalResourceType;

  /** Caching strategy for this resource type */
  strategy: CacheStrategy;

  /** Maximum time cached data can be used (ms) before forced revalidation */
  maxAgeMs: number;

  /** Time threshold (ms) after which to show "data may be stale" warning - RUTH invariant */
  staleWarningMs: number;

  /** CYRUS: Cache keys must include tenantId - always true for clinical data */
  tenantScoped: boolean;

  /** Can this resource be modified offline and queued for sync? */
  offlineWritable: boolean;

  /** Optional custom headers to include in requests */
  headers?: Record<string, string>;
}

/**
 * Cache Entry Metadata
 * Tracks when data was cached and its freshness
 */
export interface CacheEntryMetadata {
  /** When this entry was cached */
  cachedAt: number; // timestamp ms

  /** Resource type (for staleness rules) */
  resourceType: ClinicalResourceType;

  /** Tenant ID for CYRUS isolation */
  tenantId: string;

  /** For tracking stale data (RUTH) */
  staleWarningMs: number;
}

/**
 * Sync Queue Item
 * Represents a pending offline operation waiting to sync to server
 *
 * Safety Invariants:
 * - QUINN: failures are non-blocking - item stays in queue for retry
 * - CYRUS: tenantId ensures tenant isolation
 * - ELENA: medication conflicts MUST require manual review
 */
export interface SyncQueueItem {
  /** Unique identifier for this queue item */
  id: string;

  /** Tenant ID - CYRUS invariant: ensure isolation */
  tenantId: string;

  /** Type of clinical resource being synced */
  resourceType: ClinicalResourceType;

  /** HTTP method for this operation */
  method: SyncMethod;

  /** API endpoint URL */
  url: string;

  /** Request body (for POST/PUT/PATCH) */
  body: unknown;

  /** When this item was queued */
  createdAt: string; // ISO timestamp

  /** Number of times we've tried to sync this item */
  retryCount: number;

  /** Maximum retry attempts before giving up */
  maxRetries: number;

  /** Current status of this queue item */
  status: SyncQueueItemStatus;

  /** How to resolve conflicts if server has changes */
  conflictResolution: ConflictResolutionStrategy;

  /** If sync fails, this tracks why */
  lastError?: string;

  /** For tracking when we last tried */
  lastAttemptAt?: string; // ISO timestamp
}

/**
 * Sync Conflict
 * Represents a conflict detected during sync between local and server versions
 *
 * Safety Invariants:
 * - ELENA: Medication/prescription conflicts MUST always require human review
 * - RUTH: Stale data must be surfaced to clinician
 */
export interface SyncConflict {
  /** Unique conflict identifier */
  id: string;

  /** The local version (what was offline) */
  localVersion: unknown;

  /** The server version (what's on the server) */
  serverVersion: unknown;

  /** Type of resource in conflict */
  resourceType: ClinicalResourceType;

  /** Current resolution status */
  resolution: ConflictResolution;

  /** ELENA: Is this a medication conflict requiring human review? */
  requiresHumanReview: boolean;

  /** Why human review is needed (if applicable) */
  reviewReason?: string;

  /** Tenant ID for isolation */
  tenantId: string;

  /** When this conflict was detected */
  detectedAt: string; // ISO timestamp

  /** User who needs to resolve this (if applicable) */
  assignedTo?: string;
}

/**
 * Sync Queue Event
 * Events emitted by the sync queue for monitoring/logging
 */
export type SyncQueueEvent =
  | { type: 'sync-started'; itemCount: number; oldestItemAgeMs: number }
  | { type: 'sync-completed'; itemsCompleted: number; itemsFailed: number }
  | { type: 'sync-failed'; itemId: string; error: string; retryCount: number }
  | { type: 'conflict-detected'; conflict: SyncConflict }
  | { type: 'item-enqueued'; itemId: string; resourceType: string }
  | { type: 'item-dequeued'; itemId: string; status: SyncQueueItemStatus };

/**
 * Storage Backend Interface
 * Abstract storage operations so tests can mock storage
 */
export interface IStorageBackend {
  /** Get a value by key */
  get(key: string): Promise<unknown>;

  /** Set a value by key */
  set(key: string, value: unknown): Promise<void>;

  /** Remove a value by key */
  delete(key: string): Promise<void>;

  /** Check if key exists */
  has(key: string): Promise<boolean>;

  /** Get all keys matching pattern */
  keys(pattern?: string): Promise<string[]>;

  /** Clear all data */
  clear(): Promise<void>;
}

/**
 * Offline Store Interface
 * Abstract IndexedDB operations for offline patient data
 */
export interface IOfflineStore {
  /** Save clinical data locally */
  savePatientData(tenantId: string, patientId: string, data: unknown): Promise<void>;

  /** Retrieve locally cached patient data */
  getPatientData(tenantId: string, patientId: string): Promise<unknown | null>;

  /** Get all patients for a tenant */
  getPatientIds(tenantId: string): Promise<string[]>;

  /** Clear patient data for logout (CYRUS) */
  clearTenantData(tenantId: string): Promise<void>;

  /** Clear all data */
  clearAll(): Promise<void>;
}

/**
 * Cache Manager Interface
 */
export interface ICacheManager {
  get(key: string, tenantId: string): Promise<unknown | null>;
  put(key: string, tenantId: string, data: unknown, resourceType: ClinicalResourceType): Promise<void>;
  isStale(key: string, tenantId: string): Promise<boolean>;
  evict(tenantId: string): Promise<void>;
  addRule(rule: ClinicalCacheRule): void;
  getRule(resourceType: ClinicalResourceType): ClinicalCacheRule | null;
}

/**
 * Sync Queue Interface
 */
export interface ISyncQueue {
  enqueue(item: Omit<SyncQueueItem, 'id' | 'status' | 'retryCount' | 'createdAt'>): Promise<string>;
  dequeue(): Promise<SyncQueueItem | null>;
  getQueueDepth(): Promise<number>;
  getOldestPendingItem(): Promise<SyncQueueItem | null>;
  markCompleted(itemId: string): Promise<void>;
  markFailed(itemId: string, error: string): Promise<void>;
  on(event: string, handler: (data: SyncQueueEvent) => void): void;
  process(syncFn: (item: SyncQueueItem) => Promise<void>): Promise<void>;
}

/**
 * Conflict Resolver Interface
 */
export interface IConflictResolver {
  detectConflict(
    resourceType: ClinicalResourceType,
    localVersion: unknown,
    serverVersion: unknown,
  ): Promise<SyncConflict | null>;

  resolve(conflict: SyncConflict): Promise<ConflictResolution>;

  requiresManualReview(resourceType: ClinicalResourceType): boolean;
}
