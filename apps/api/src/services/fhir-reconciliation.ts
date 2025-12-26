/**
 * FHIR Reconciliation Service
 * Detects and fixes sync drift between Holi and Medplum
 * Runs nightly or on-demand to ensure data consistency
 */

import type { PrismaClient } from '@prisma/client';
import { enqueueEncounterSync, enqueueObservationSync } from './fhir-queue';

/**
 * Logging utilities
 */
function log(level: 'info' | 'warn' | 'error', message: string, context?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    service: 'fhir-reconciliation',
    message,
    ...context,
  };
  console[level === 'error' ? 'error' : 'log'](JSON.stringify(logEntry));
}

/**
 * Reconciliation result
 */
export interface ReconciliationResult {
  startTime: Date;
  endTime: Date;
  durationMs: number;
  encounters: {
    total: number;
    notSynced: number;
    stale: number;
    enqueued: number;
    errors: number;
  };
  observations: {
    total: number;
    notSynced: number;
    stale: number;
    enqueued: number;
    errors: number;
  };
  errors: string[];
}

/**
 * Check if a resource is "stale" (needs re-sync)
 */
function isStale(lastSyncedAt: Date | null, updatedAt: Date): boolean {
  if (!lastSyncedAt) return true;
  // Consider stale if updated after last sync
  return updatedAt > lastSyncedAt;
}

/**
 * Reconcile Encounters
 */
async function reconcileEncounters(
  prisma: PrismaClient,
  options: {
    orgId?: string;
    batchSize?: number;
    staleDays?: number;
  } = {}
): Promise<ReconciliationResult['encounters']> {
  const { orgId, batchSize = 1000, staleDays = 1 } = options;

  log('info', 'Starting encounter reconciliation', { orgId, batchSize, staleDays });

  const result = {
    total: 0,
    notSynced: 0,
    stale: 0,
    enqueued: 0,
    errors: 0,
  };

  try {
    // Find encounters that need sync
    const encounters = await prisma.encounter.findMany({
      where: {
        fhirSyncEnabled: true,
        ...(orgId ? { orgId } : {}),
        OR: [
          // Never synced
          { lastSyncedAt: null },
          // Updated after last sync
          {
            lastSyncedAt: {
              lt: new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000),
            },
          },
        ],
      },
      include: {
        patientToken: true,
      },
      take: batchSize,
      orderBy: {
        updatedAt: 'asc', // Oldest first
      },
    });

    result.total = encounters.length;

    for (const encounter of encounters) {
      if (!encounter.lastSyncedAt) {
        result.notSynced++;
      } else if (isStale(encounter.lastSyncedAt, encounter.updatedAt)) {
        result.stale++;
      }

      try {
        await enqueueEncounterSync({
          encounter,
          patientToken: encounter.patientToken,
        });
        result.enqueued++;
      } catch (error) {
        log('error', 'Failed to enqueue encounter', {
          encounterId: encounter.id,
          error: (error as Error).message,
        });
        result.errors++;
      }
    }

    log('info', 'Encounter reconciliation complete', result);
    return result;
  } catch (error) {
    log('error', 'Encounter reconciliation failed', {
      error: (error as Error).message,
    });
    throw error;
  }
}

/**
 * Reconcile Observations
 */
async function reconcileObservations(
  prisma: PrismaClient,
  options: {
    orgId?: string;
    batchSize?: number;
    staleDays?: number;
  } = {}
): Promise<ReconciliationResult['observations']> {
  const { orgId, batchSize = 1000, staleDays = 1 } = options;

  log('info', 'Starting observation reconciliation', { orgId, batchSize, staleDays });

  const result = {
    total: 0,
    notSynced: 0,
    stale: 0,
    enqueued: 0,
    errors: 0,
  };

  try {
    // Find observations that need sync
    const observations = await prisma.observation.findMany({
      where: {
        fhirSyncEnabled: true,
        ...(orgId ? { orgId } : {}),
        OR: [
          // Never synced
          { lastSyncedAt: null },
          // Updated after last sync
          {
            lastSyncedAt: {
              lt: new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000),
            },
          },
        ],
      },
      include: {
        patientToken: true,
      },
      take: batchSize,
      orderBy: {
        updatedAt: 'asc', // Oldest first
      },
    });

    result.total = observations.length;

    for (const observation of observations) {
      if (!observation.lastSyncedAt) {
        result.notSynced++;
      } else if (isStale(observation.lastSyncedAt, observation.updatedAt)) {
        result.stale++;
      }

      try {
        await enqueueObservationSync({
          observation,
          patientToken: observation.patientToken,
        });
        result.enqueued++;
      } catch (error) {
        log('error', 'Failed to enqueue observation', {
          observationId: observation.id,
          error: (error as Error).message,
        });
        result.errors++;
      }
    }

    log('info', 'Observation reconciliation complete', result);
    return result;
  } catch (error) {
    log('error', 'Observation reconciliation failed', {
      error: (error as Error).message,
    });
    throw error;
  }
}

/**
 * Run full reconciliation (all resource types)
 */
export async function runReconciliation(
  prisma: PrismaClient,
  options: {
    orgId?: string;
    batchSize?: number;
    staleDays?: number;
  } = {}
): Promise<ReconciliationResult> {
  const startTime = new Date();
  const errors: string[] = [];

  log('info', 'Starting full FHIR reconciliation', options);

  let encounterResult: ReconciliationResult['encounters'] = {
    total: 0,
    notSynced: 0,
    stale: 0,
    enqueued: 0,
    errors: 0,
  };

  let observationResult: ReconciliationResult['observations'] = {
    total: 0,
    notSynced: 0,
    stale: 0,
    enqueued: 0,
    errors: 0,
  };

  // Reconcile encounters
  try {
    encounterResult = await reconcileEncounters(prisma, options);
  } catch (error) {
    errors.push(`Encounter reconciliation failed: ${(error as Error).message}`);
  }

  // Reconcile observations
  try {
    observationResult = await reconcileObservations(prisma, options);
  } catch (error) {
    errors.push(`Observation reconciliation failed: ${(error as Error).message}`);
  }

  const endTime = new Date();
  const durationMs = endTime.getTime() - startTime.getTime();

  const result: ReconciliationResult = {
    startTime,
    endTime,
    durationMs,
    encounters: encounterResult,
    observations: observationResult,
    errors,
  };

  log('info', 'Full reconciliation complete', {
    durationMs,
    totalEnqueued: encounterResult.enqueued + observationResult.enqueued,
    totalErrors: encounterResult.errors + observationResult.errors,
  });

  // Store reconciliation result in audit log
  try {
    await prisma.auditEvent.create({
      data: {
        orgId: options.orgId || 'system',
        eventType: 'FHIR_RECONCILIATION',
        payload: result,
      },
    });
  } catch (error) {
    log('error', 'Failed to log reconciliation result', {
      error: (error as Error).message,
    });
  }

  return result;
}

/**
 * Get reconciliation statistics (for monitoring)
 */
export async function getReconciliationStats(
  prisma: PrismaClient,
  orgId?: string
): Promise<{
  encounters: {
    total: number;
    synced: number;
    notSynced: number;
    stale: number;
  };
  observations: {
    total: number;
    synced: number;
    notSynced: number;
    stale: number;
  };
}> {
  const [
    totalEncounters,
    syncedEncounters,
    notSyncedEncounters,
    totalObservations,
    syncedObservations,
    notSyncedObservations,
  ] = await Promise.all([
    prisma.encounter.count({
      where: {
        fhirSyncEnabled: true,
        ...(orgId ? { orgId } : {}),
      },
    }),
    prisma.encounter.count({
      where: {
        fhirSyncEnabled: true,
        lastSyncedAt: { not: null },
        ...(orgId ? { orgId } : {}),
      },
    }),
    prisma.encounter.count({
      where: {
        fhirSyncEnabled: true,
        lastSyncedAt: null,
        ...(orgId ? { orgId } : {}),
      },
    }),
    prisma.observation.count({
      where: {
        fhirSyncEnabled: true,
        ...(orgId ? { orgId } : {}),
      },
    }),
    prisma.observation.count({
      where: {
        fhirSyncEnabled: true,
        lastSyncedAt: { not: null },
        ...(orgId ? { orgId } : {}),
      },
    }),
    prisma.observation.count({
      where: {
        fhirSyncEnabled: true,
        lastSyncedAt: null,
        ...(orgId ? { orgId } : {}),
      },
    }),
  ]);

  // Calculate stale (updated after last sync)
  const staleEncounters = await prisma.encounter.count({
    where: {
      fhirSyncEnabled: true,
      lastSyncedAt: { not: null },
      updatedAt: { gt: prisma.encounter.fields.lastSyncedAt as any },
      ...(orgId ? { orgId } : {}),
    },
  });

  const staleObservations = await prisma.observation.count({
    where: {
      fhirSyncEnabled: true,
      lastSyncedAt: { not: null },
      updatedAt: { gt: prisma.observation.fields.lastSyncedAt as any },
      ...(orgId ? { orgId } : {}),
    },
  });

  return {
    encounters: {
      total: totalEncounters,
      synced: syncedEncounters,
      notSynced: notSyncedEncounters,
      stale: staleEncounters,
    },
    observations: {
      total: totalObservations,
      synced: syncedObservations,
      notSynced: notSyncedObservations,
      stale: staleObservations,
    },
  };
}

/**
 * Get recent reconciliation history
 */
export async function getReconciliationHistory(
  prisma: PrismaClient,
  limit = 10
): Promise<Array<{
  timestamp: Date;
  durationMs: number;
  totalEnqueued: number;
  totalErrors: number;
}>> {
  const auditEvents = await prisma.auditEvent.findMany({
    where: {
      eventType: 'FHIR_RECONCILIATION',
    },
    orderBy: {
      ts: 'desc',
    },
    take: limit,
  });

  return auditEvents.map((event) => {
    const payload = event.payload as any;
    return {
      timestamp: event.ts,
      durationMs: payload.durationMs || 0,
      totalEnqueued:
        (payload.encounters?.enqueued || 0) + (payload.observations?.enqueued || 0),
      totalErrors: (payload.encounters?.errors || 0) + (payload.observations?.errors || 0),
    };
  });
}
