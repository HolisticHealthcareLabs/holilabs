/**
 * CDSS V3 - Sync Service
 *
 * Single-responsibility service for FHIR bi-directional sync.
 * Implements optimistic locking and conflict detection.
 *
 * CRITICAL: NO AUTO-MERGE. All conflicts require human review.
 *
 * NOTE: This service is stubbed pending FHIRSyncEvent model creation in Prisma schema.
 */

import { JobRepository } from '@/lib/repositories';
import logger from '@/lib/logger';

// Local type definitions for FHIR sync (model not yet in Prisma schema)
export type SyncStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CONFLICT' | 'SYNCED';
export type ConflictResolution = 'LOCAL_WINS' | 'REMOTE_WINS' | 'MERGED' | 'SKIPPED' | 'KEEP_LOCAL' | 'KEEP_REMOTE' | 'MANUAL_MERGE';

export interface FHIRSyncEvent {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  resourceType: string;
  resourceId: string;
  operation: string;
  status: SyncStatus;
  localVersion: number;
  remoteVersion: string | null;
  localData?: unknown;
  remoteData?: unknown;
  conflictData?: unknown;
  conflictResolution?: ConflictResolution;
  resolution?: ConflictResolution;
  resolvedBy?: string;
  resolvedAt?: Date;
  syncedAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Sync result with conflict status
 */
export interface SyncResult {
  success: boolean;
  syncEventId: string;
  status: SyncStatus;
  conflictDetected: boolean;
  error?: string;
}

/**
 * Conflict resolution input
 */
export interface ConflictResolutionInput {
  syncEventId: string;
  resolution: ConflictResolution;
  resolvedBy: string;
  mergedData?: unknown;
}

const NOT_IMPLEMENTED_MSG = 'FHIR Sync not available: FHIRSyncEvent model not yet added to Prisma schema';

export class SyncService {
  constructor(private readonly jobRepo: JobRepository) {}

  /**
   * Push local patient data to FHIR server
   * Returns sync event ID - caller should poll for status
   */
  async pushPatient(_patientId: string): Promise<string> {
    logger.warn({
      event: 'fhir_sync_push_not_implemented',
      message: NOT_IMPLEMENTED_MSG,
    });
    throw new Error(NOT_IMPLEMENTED_MSG);
  }

  /**
   * Pull patient data from FHIR server
   */
  async pullPatient(_fhirResourceId: string, _localPatientId?: string): Promise<string> {
    logger.warn({
      event: 'fhir_sync_pull_not_implemented',
      message: NOT_IMPLEMENTED_MSG,
    });
    throw new Error(NOT_IMPLEMENTED_MSG);
  }

  /**
   * Get sync event status
   */
  async getSyncStatus(_syncEventId: string): Promise<FHIRSyncEvent | null> {
    logger.warn({
      event: 'fhir_sync_status_not_implemented',
      message: NOT_IMPLEMENTED_MSG,
    });
    throw new Error(NOT_IMPLEMENTED_MSG);
  }

  /**
   * Get pending conflicts for review
   */
  async getPendingConflicts(): Promise<FHIRSyncEvent[]> {
    logger.warn({
      event: 'fhir_sync_conflicts_not_implemented',
      message: NOT_IMPLEMENTED_MSG,
    });
    throw new Error(NOT_IMPLEMENTED_MSG);
  }

  /**
   * Get conflicts for a specific resource
   */
  async getResourceConflicts(
    _resourceType: string,
    _resourceId: string
  ): Promise<FHIRSyncEvent[]> {
    logger.warn({
      event: 'fhir_sync_resource_conflicts_not_implemented',
      message: NOT_IMPLEMENTED_MSG,
    });
    throw new Error(NOT_IMPLEMENTED_MSG);
  }

  /**
   * Resolve a sync conflict
   * CRITICAL: This is the ONLY way to resolve conflicts - no auto-merge
   */
  async resolveConflict(_input: ConflictResolutionInput): Promise<FHIRSyncEvent> {
    logger.warn({
      event: 'fhir_sync_resolve_not_implemented',
      message: NOT_IMPLEMENTED_MSG,
    });
    throw new Error(NOT_IMPLEMENTED_MSG);
  }

  /**
   * Mark sync as failed
   */
  async markFailed(_syncEventId: string, _errorMessage: string): Promise<void> {
    logger.warn({
      event: 'fhir_sync_mark_failed_not_implemented',
      message: NOT_IMPLEMENTED_MSG,
    });
    throw new Error(NOT_IMPLEMENTED_MSG);
  }

  /**
   * Mark sync as having conflict
   * Called when version mismatch or data conflict detected
   */
  async markConflict(
    _syncEventId: string,
    _localData: unknown,
    _remoteData: unknown
  ): Promise<void> {
    logger.warn({
      event: 'fhir_sync_mark_conflict_not_implemented',
      message: NOT_IMPLEMENTED_MSG,
    });
    throw new Error(NOT_IMPLEMENTED_MSG);
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(): Promise<{
    pending: number;
    inProgress: number;
    synced: number;
    conflicts: number;
    failed: number;
  }> {
    logger.warn({
      event: 'fhir_sync_stats_not_implemented',
      message: NOT_IMPLEMENTED_MSG,
    });
    // Return zeros instead of throwing to allow dashboard to load
    return { pending: 0, inProgress: 0, synced: 0, conflicts: 0, failed: 0 };
  }
}

// Export factory function for dependency injection
export function createSyncService(
  jobRepo: JobRepository = new JobRepository()
): SyncService {
  return new SyncService(jobRepo);
}
