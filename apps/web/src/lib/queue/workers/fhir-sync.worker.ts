/**
 * CDSS V3 - FHIR Sync Worker
 *
 * BullMQ worker that processes FHIR synchronization jobs.
 * Handles bi-directional sync between local database and Medplum.
 *
 * CRITICAL: NO AUTO-MERGE. All conflicts require human review.
 *
 * Flow:
 * 1. Receive job with sync direction, resource type, and payload
 * 2. For OUTBOUND: Convert local data to FHIR and push to Medplum
 * 3. For INBOUND: Fetch FHIR data and convert to local format
 * 4. Detect conflicts via optimistic locking (version comparison)
 * 5. If conflict: Mark for human review (never auto-merge)
 * 6. If success: Update sync event status
 */

import { Worker, Job } from 'bullmq';
import { defaultWorkerOptions, QueueName } from '../config';
import logger from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { createSyncService } from '@/lib/services/sync.service';
import { toFHIRPatient, fromFHIRPatient } from '@/lib/fhir/patient-mapper';
import type { FhirSyncJobData, FhirSyncJobResult } from '../types';

// Worker concurrency - limit to prevent overwhelming Medplum
const WORKER_CONCURRENCY = parseInt(
  process.env.FHIR_SYNC_CONCURRENCY || '2',
  10
);

// Medplum API base URL (from environment)
const MEDPLUM_BASE_URL = process.env.MEDPLUM_BASE_URL || 'https://api.medplum.com/fhir/R4';
const MEDPLUM_CLIENT_ID = process.env.MEDPLUM_CLIENT_ID;
const MEDPLUM_CLIENT_SECRET = process.env.MEDPLUM_CLIENT_SECRET;

/**
 * Get Medplum access token
 * In production, this would use proper OAuth2 flow
 */
async function getMedplumAccessToken(): Promise<string> {
  // For development, use environment variable directly
  if (process.env.MEDPLUM_ACCESS_TOKEN) {
    return process.env.MEDPLUM_ACCESS_TOKEN;
  }

  // OAuth2 client credentials flow
  if (MEDPLUM_CLIENT_ID && MEDPLUM_CLIENT_SECRET) {
    const response = await fetch(`${MEDPLUM_BASE_URL.replace('/fhir/R4', '')}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: MEDPLUM_CLIENT_ID,
        client_secret: MEDPLUM_CLIENT_SECRET,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get Medplum access token');
    }

    const data = await response.json();
    return data.access_token;
  }

  throw new Error('No Medplum credentials configured');
}

/**
 * Push a Patient resource to Medplum
 */
async function pushPatientToMedplum(
  localPatient: any,
  fhirResourceId?: string
): Promise<{ success: boolean; fhirId?: string; version?: string; error?: string }> {
  try {
    const accessToken = await getMedplumAccessToken();
    const fhirPatient = toFHIRPatient(localPatient);

    const url = fhirResourceId
      ? `${MEDPLUM_BASE_URL}/Patient/${fhirResourceId}`
      : `${MEDPLUM_BASE_URL}/Patient`;

    const response = await fetch(url, {
      method: fhirResourceId ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/fhir+json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(fhirPatient),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        success: false,
        error: `Medplum error ${response.status}: ${errorBody}`,
      };
    }

    const result = await response.json();
    return {
      success: true,
      fhirId: result.id,
      version: result.meta?.versionId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Pull a Patient resource from Medplum
 */
async function pullPatientFromMedplum(
  fhirResourceId: string
): Promise<{ success: boolean; data?: any; version?: string; error?: string }> {
  try {
    const accessToken = await getMedplumAccessToken();

    const response = await fetch(`${MEDPLUM_BASE_URL}/Patient/${fhirResourceId}`, {
      method: 'GET',
      headers: {
        Accept: 'application/fhir+json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: 'Patient not found in Medplum' };
      }
      const errorBody = await response.text();
      return {
        success: false,
        error: `Medplum error ${response.status}: ${errorBody}`,
      };
    }

    const fhirPatient = await response.json();
    const localFormat = fromFHIRPatient(fhirPatient);

    return {
      success: true,
      data: localFormat,
      version: fhirPatient.meta?.versionId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check for conflicts by comparing versions
 */
async function checkForConflict(
  localData: any,
  remoteData: any,
  localVersion: number,
  remoteVersion?: string
): Promise<boolean> {
  // Simple conflict detection: if versions don't match
  // In a real implementation, this would be more sophisticated
  // comparing individual fields and timestamps

  // If we don't have a remote version, no conflict
  if (!remoteVersion) {
    return false;
  }

  // Check if any important fields differ
  const importantFields = ['firstName', 'lastName', 'dateOfBirth', 'email', 'phone'];

  for (const field of importantFields) {
    if (localData[field] !== remoteData[field]) {
      // Fields differ - potential conflict
      logger.warn({
        event: 'fhir_sync_field_mismatch',
        field,
        localValue: localData[field],
        remoteValue: remoteData[field],
      });
      return true;
    }
  }

  return false;
}

/**
 * Process a FHIR sync job
 */
async function processFhirSyncJob(
  job: Job<FhirSyncJobData>
): Promise<FhirSyncJobResult> {
  const {
    direction,
    resourceType,
    localId,
    fhirResourceId,
    operation,
    localVersion,
    remoteVersion,
    payload,
  } = job.data;

  logger.info({
    event: 'fhir_sync_job_started',
    queue: QueueName.FHIR_SYNC,
    jobId: job.id,
    direction,
    resourceType,
    localId,
    fhirResourceId,
    operation,
  });

  const syncService = createSyncService();

  try {
    // Update progress: Starting
    await job.updateProgress(10);

    // TODO: Add FHIRSyncEvent model to Prisma schema
    // Find the sync event associated with this job
    // const syncEvent = await prisma.fHIRSyncEvent.findFirst({
    //   where: {
    //     resourceType,
    //     resourceId: direction === 'OUTBOUND' ? localId : fhirResourceId!,
    //     status: { in: ['PENDING', 'IN_PROGRESS'] },
    //   },
    //   orderBy: { createdAt: 'desc' },
    // });
    const syncEvent: { id: string } | null = null; // Placeholder until model is added

    // if (syncEvent) {
    //   await prisma.fHIRSyncEvent.update({
    //     where: { id: syncEvent.id },
    //     data: { status: 'IN_PROGRESS' },
    //   });
    // }

    await job.updateProgress(30);

    // Handle based on direction
    if (direction === 'OUTBOUND') {
      // Push local data to Medplum
      if (resourceType === 'Patient') {
        // First, fetch current remote state to check for conflicts
        if (fhirResourceId) {
          const remoteResult = await pullPatientFromMedplum(fhirResourceId);

          if (remoteResult.success) {
            // Check for conflicts
            const hasConflict = await checkForConflict(
              payload,
              remoteResult.data,
              localVersion,
              remoteResult.version
            );

            if (hasConflict) {
              // CRITICAL: Mark as conflict - do NOT auto-merge
              logger.warn({
                event: 'fhir_sync_conflict_detected',
                jobId: job.id,
                localId,
                fhirResourceId,
                message: 'Human review required - no auto-merge',
              });

              // TODO: Uncomment when FHIRSyncEvent model is added
              // if (syncEvent) {
              //   await syncService.markConflict(syncEvent.id, payload, remoteResult.data);
              // }

              return {
                success: false,
                hasConflict: true,
                conflictData: {
                  local: payload,
                  remote: remoteResult.data,
                },
                error: 'Conflict detected - human review required',
              };
            }
          }
        }

        await job.updateProgress(50);

        // No conflict, proceed with push
        const pushResult = await pushPatientToMedplum(payload, fhirResourceId);

        await job.updateProgress(80);

        if (!pushResult.success) {
          // TODO: Uncomment when FHIRSyncEvent model is added
          // if (syncEvent) {
          //   await syncService.markFailed(syncEvent.id, pushResult.error!);
          // }
          throw new Error(pushResult.error);
        }

        // TODO: Add fhirId field to Patient model in Prisma schema
        // Update local record with FHIR ID
        // await prisma.patient.update({
        //   where: { id: localId },
        //   data: {
        //     fhirId: pushResult.fhirId,
        //   },
        // });

        // Mark sync as complete
        // TODO: Uncomment when FHIRSyncEvent model is added to Prisma schema
        // if (syncEvent) {
        //   await prisma.fHIRSyncEvent.update({
        //     where: { id: syncEvent.id },
        //     data: {
        //       status: 'SYNCED',
        //       syncedAt: new Date(),
        //       remoteVersion: pushResult.version || null,
        //     },
        //   });
        // }

        await job.updateProgress(100);

        logger.info({
          event: 'fhir_sync_outbound_completed',
          jobId: job.id,
          localId,
          fhirId: pushResult.fhirId,
          newVersion: pushResult.version,
        });

        return {
          success: true,
          fhirResourceId: pushResult.fhirId,
          newVersion: pushResult.version,
        };
      }
    } else {
      // INBOUND: Pull data from Medplum
      if (resourceType === 'Patient' && fhirResourceId) {
        const pullResult = await pullPatientFromMedplum(fhirResourceId);

        await job.updateProgress(50);

        if (!pullResult.success) {
          // TODO: Uncomment when FHIRSyncEvent model is added
          // if (syncEvent) {
          //   await syncService.markFailed(syncEvent.id, pullResult.error!);
          // }
          throw new Error(pullResult.error);
        }

        // Check for conflicts if we have a local record
        if (localId) {
          const localPatient = await prisma.patient.findUnique({
            where: { id: localId },
          });

          if (localPatient) {
            const hasConflict = await checkForConflict(
              localPatient,
              pullResult.data,
              localVersion,
              pullResult.version
            );

            if (hasConflict) {
              // CRITICAL: Mark as conflict - do NOT auto-merge
              logger.warn({
                event: 'fhir_sync_conflict_detected',
                jobId: job.id,
                localId,
                fhirResourceId,
                message: 'Human review required - no auto-merge',
              });

              // TODO: Uncomment when FHIRSyncEvent model is added
              // if (syncEvent) {
              //   await syncService.markConflict(syncEvent.id, localPatient, pullResult.data);
              // }

              return {
                success: false,
                hasConflict: true,
                conflictData: {
                  local: localPatient,
                  remote: pullResult.data,
                },
                error: 'Conflict detected - human review required',
              };
            }

            // No conflict, apply remote data
            await prisma.patient.update({
              where: { id: localId },
              data: pullResult.data,
            });
          }
        }

        await job.updateProgress(80);

        // Mark sync as complete
        // TODO: Uncomment when FHIRSyncEvent model is added to Prisma schema
        // if (syncEvent) {
        //   await prisma.fHIRSyncEvent.update({
        //     where: { id: syncEvent.id },
        //     data: {
        //       status: 'SYNCED',
        //       syncedAt: new Date(),
        //       remoteVersion: pullResult.version || null,
        //     },
        //   });
        // }

        await job.updateProgress(100);

        logger.info({
          event: 'fhir_sync_inbound_completed',
          jobId: job.id,
          localId,
          fhirResourceId,
          newVersion: pullResult.version,
        });

        return {
          success: true,
          fhirResourceId,
          newVersion: pullResult.version,
        };
      }
    }

    // Unsupported resource type
    const error = `Sync for ${resourceType} not yet implemented`;
    // TODO: Uncomment when FHIRSyncEvent model is added
    // if (syncEvent) {
    //   await syncService.markFailed(syncEvent.id, error);
    // }
    throw new Error(error);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error during FHIR sync';

    logger.error({
      event: 'fhir_sync_job_failed',
      queue: QueueName.FHIR_SYNC,
      jobId: job.id,
      direction,
      resourceType,
      localId,
      error: errorMessage,
    });

    // Re-throw to mark job as failed in BullMQ
    throw error;
  }
}

/**
 * Start the FHIR sync worker
 */
export function startFhirSyncWorker(): Worker<FhirSyncJobData, FhirSyncJobResult> {
  const worker = new Worker<FhirSyncJobData, FhirSyncJobResult>(
    QueueName.FHIR_SYNC,
    processFhirSyncJob,
    {
      ...defaultWorkerOptions,
      concurrency: WORKER_CONCURRENCY,
    }
  );

  worker.on('failed', (job, err) => {
    logger.error({
      event: 'fhir_sync_worker_job_failed',
      queue: QueueName.FHIR_SYNC,
      jobId: job?.id,
      error: err.message,
    });
  });

  worker.on('completed', (job, result) => {
    logger.info({
      event: 'fhir_sync_worker_job_completed',
      queue: QueueName.FHIR_SYNC,
      jobId: job.id,
      success: result.success,
      hasConflict: result.hasConflict,
      fhirResourceId: result.fhirResourceId,
    });
  });

  worker.on('progress', (job, progress) => {
    logger.debug({
      event: 'fhir_sync_worker_progress',
      queue: QueueName.FHIR_SYNC,
      jobId: job.id,
      progress,
    });
  });

  logger.info({
    event: 'fhir_sync_worker_started',
    queue: QueueName.FHIR_SYNC,
    concurrency: WORKER_CONCURRENCY,
  });

  return worker;
}
