/**
 * CDSS V3 - Sync Service
 *
 * Single-responsibility service for FHIR bi-directional sync.
 * Implements optimistic locking and conflict detection.
 *
 * CRITICAL: NO AUTO-MERGE. All conflicts require human review.
 */

import { prisma } from '@/lib/prisma';
import { getFhirSyncQueue } from '@/lib/queue/queues';
import { JobRepository } from '@/lib/repositories';
import logger from '@/lib/logger';
import type {
  FhirSyncJobData,
  SyncDirection,
  SyncOperation,
  FhirResourceType,
} from '@/lib/queue/types';
import type { FHIRSyncEvent, SyncStatus, ConflictResolution } from '@prisma/client';

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

export class SyncService {
  constructor(private readonly jobRepo: JobRepository) {}

  /**
   * Push local patient data to FHIR server
   * Returns sync event ID - caller should poll for status
   */
  async pushPatient(patientId: string): Promise<string> {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new Error(`Patient ${patientId} not found`);
    }

    logger.info({
      event: 'fhir_sync_push_start',
      patientId,
      resourceType: 'Patient',
    });

    // Create sync event record
    const syncEvent = await prisma.fHIRSyncEvent.create({
      data: {
        direction: 'OUTBOUND',
        resourceType: 'Patient',
        resourceId: patientId,
        operation: patient.fhirId ? 'UPDATE' : 'CREATE',
        status: 'PENDING',
        localVersion: patient.version || 1,
        remoteVersion: patient.fhirId || null,
      },
    });

    // Create analysis job for tracking
    const analysisJob = await this.jobRepo.create({
      type: 'FHIR_SYNC',
      patientId,
      inputData: {
        direction: 'OUTBOUND',
        resourceType: 'Patient',
        operation: patient.fhirId ? 'UPDATE' : 'CREATE',
        syncEventId: syncEvent.id,
      },
    });

    // Prepare job data for BullMQ
    const jobData: FhirSyncJobData = {
      direction: 'OUTBOUND',
      resourceType: 'Patient',
      localId: patientId,
      fhirResourceId: patient.fhirId || undefined,
      operation: patient.fhirId ? 'UPDATE' : 'CREATE',
      localVersion: patient.version || 1,
      remoteVersion: patient.fhirId || undefined,
      payload: patient,
    };

    // Add to BullMQ queue
    const queue = getFhirSyncQueue();
    const bullmqJob = await queue.add('sync-patient', jobData, {
      jobId: analysisJob.id,
    });

    // Update job record
    await this.jobRepo.update(analysisJob.id, {
      bullmqJobId: bullmqJob.id,
    });

    logger.info({
      event: 'fhir_sync_push_enqueued',
      syncEventId: syncEvent.id,
      patientId,
    });

    return syncEvent.id;
  }

  /**
   * Pull patient data from FHIR server
   */
  async pullPatient(fhirResourceId: string, localPatientId?: string): Promise<string> {
    logger.info({
      event: 'fhir_sync_pull_start',
      fhirResourceId,
      localPatientId,
    });

    // Create sync event record
    const syncEvent = await prisma.fHIRSyncEvent.create({
      data: {
        direction: 'INBOUND',
        resourceType: 'Patient',
        resourceId: fhirResourceId,
        operation: localPatientId ? 'UPDATE' : 'CREATE',
        status: 'PENDING',
        localVersion: 0,
        remoteVersion: fhirResourceId,
      },
    });

    // If we have a local patient, create analysis job
    if (localPatientId) {
      const analysisJob = await this.jobRepo.create({
        type: 'FHIR_SYNC',
        patientId: localPatientId,
        inputData: {
          direction: 'INBOUND',
          resourceType: 'Patient',
          operation: 'UPDATE',
          syncEventId: syncEvent.id,
          fhirResourceId,
        },
      });

      const queue = getFhirSyncQueue();
      await queue.add('sync-patient', {
        direction: 'INBOUND',
        resourceType: 'Patient',
        localId: localPatientId,
        fhirResourceId,
        operation: 'UPDATE',
        localVersion: 0,
        remoteVersion: fhirResourceId,
        payload: null,
      } as FhirSyncJobData, {
        jobId: analysisJob.id,
      });

      await this.jobRepo.update(analysisJob.id, {
        bullmqJobId: analysisJob.id,
      });
    }

    return syncEvent.id;
  }

  /**
   * Get sync event status
   */
  async getSyncStatus(syncEventId: string): Promise<FHIRSyncEvent | null> {
    return prisma.fHIRSyncEvent.findUnique({
      where: { id: syncEventId },
    });
  }

  /**
   * Get pending conflicts for review
   */
  async getPendingConflicts(): Promise<FHIRSyncEvent[]> {
    return prisma.fHIRSyncEvent.findMany({
      where: { status: 'CONFLICT' },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get conflicts for a specific resource
   */
  async getResourceConflicts(
    resourceType: string,
    resourceId: string
  ): Promise<FHIRSyncEvent[]> {
    return prisma.fHIRSyncEvent.findMany({
      where: {
        resourceType,
        resourceId,
        status: 'CONFLICT',
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Resolve a sync conflict
   * CRITICAL: This is the ONLY way to resolve conflicts - no auto-merge
   */
  async resolveConflict(input: ConflictResolutionInput): Promise<FHIRSyncEvent> {
    const { syncEventId, resolution, resolvedBy, mergedData } = input;

    const syncEvent = await prisma.fHIRSyncEvent.findUnique({
      where: { id: syncEventId },
    });

    if (!syncEvent) {
      throw new Error(`Sync event ${syncEventId} not found`);
    }

    if (syncEvent.status !== 'CONFLICT') {
      throw new Error(`Sync event ${syncEventId} is not in CONFLICT status`);
    }

    logger.info({
      event: 'fhir_sync_conflict_resolve_start',
      syncEventId,
      resolution,
      resolvedBy,
    });

    // Update sync event with resolution
    const resolved = await prisma.fHIRSyncEvent.update({
      where: { id: syncEventId },
      data: {
        status: 'SYNCED',
        resolution,
        resolvedBy,
        resolvedAt: new Date(),
      },
    });

    // If resolution requires applying changes, do so
    if (resolution === 'KEEP_REMOTE' || resolution === 'MANUAL_MERGE') {
      // Apply the resolved data to local record
      // This would typically call the appropriate repository
      if (syncEvent.resourceType === 'Patient' && mergedData) {
        await prisma.patient.update({
          where: { id: syncEvent.resourceId },
          data: mergedData as any,
        });
      }
    }

    if (resolution === 'KEEP_LOCAL') {
      // Re-push local data to remote
      if (syncEvent.resourceType === 'Patient') {
        await this.pushPatient(syncEvent.resourceId);
      }
    }

    logger.info({
      event: 'fhir_sync_conflict_resolved',
      syncEventId,
      resolution,
      resolvedBy,
    });

    return resolved;
  }

  /**
   * Mark sync as failed
   */
  async markFailed(syncEventId: string, errorMessage: string): Promise<void> {
    await prisma.fHIRSyncEvent.update({
      where: { id: syncEventId },
      data: {
        status: 'FAILED',
        errorMessage,
      },
    });

    logger.error({
      event: 'fhir_sync_failed',
      syncEventId,
      errorMessage,
    });
  }

  /**
   * Mark sync as having conflict
   * Called when version mismatch or data conflict detected
   */
  async markConflict(
    syncEventId: string,
    localData: unknown,
    remoteData: unknown
  ): Promise<void> {
    await prisma.fHIRSyncEvent.update({
      where: { id: syncEventId },
      data: {
        status: 'CONFLICT',
        conflictData: {
          local: localData,
          remote: remoteData,
          detectedAt: new Date().toISOString(),
        },
      },
    });

    logger.warn({
      event: 'fhir_sync_conflict_detected',
      syncEventId,
      message: 'Human review required - no auto-merge',
    });
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
    const [pending, inProgress, synced, conflicts, failed] = await Promise.all([
      prisma.fHIRSyncEvent.count({ where: { status: 'PENDING' } }),
      prisma.fHIRSyncEvent.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.fHIRSyncEvent.count({ where: { status: 'SYNCED' } }),
      prisma.fHIRSyncEvent.count({ where: { status: 'CONFLICT' } }),
      prisma.fHIRSyncEvent.count({ where: { status: 'FAILED' } }),
    ]);

    return { pending, inProgress, synced, conflicts, failed };
  }
}

// Export factory function for dependency injection
export function createSyncService(
  jobRepo: JobRepository = new JobRepository()
): SyncService {
  return new SyncService(jobRepo);
}
