/**
 * Prisma Middleware for Auto-Sync to FHIR
 * Automatically enqueues FHIR sync jobs when clinical resources are created/updated
 */

import type { Prisma, PrismaClient } from '@prisma/client';
import {
  enqueuePatientSync,
  enqueueEncounterSync,
  enqueueObservationSync,
} from '../services/fhir-queue';

/**
 * Logging utilities
 */
function log(level: 'info' | 'warn' | 'error', message: string, context?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    service: 'prisma-fhir-middleware',
    message,
    ...context,
  };
  console[level === 'error' ? 'error' : 'log'](JSON.stringify(logEntry));
}

/**
 * Check if FHIR sync is enabled globally
 */
function isFhirSyncEnabled(): boolean {
  return process.env.ENABLE_MEDPLUM === 'true';
}

/**
 * Prisma middleware for Encounter auto-sync
 */
async function handleEncounterSync(
  params: Prisma.MiddlewareParams,
  next: (params: Prisma.MiddlewareParams) => Promise<any>,
  prisma: PrismaClient
): Promise<any> {
  // Execute the query first
  const result = await next(params);

  // Only sync on create/update operations
  if (params.action !== 'create' && params.action !== 'update') {
    return result;
  }

  // Skip if FHIR sync disabled
  if (!isFhirSyncEnabled()) {
    return result;
  }

  try {
    // Get the encounter ID from result or params
    let encounterId: string;

    if (params.action === 'create') {
      encounterId = result.id;
    } else if (params.action === 'update' && params.args.where?.id) {
      encounterId = params.args.where.id;
    } else {
      // Bulk update or other operation - skip
      return result;
    }

    // Fetch full encounter with relations
    const encounter = await prisma.encounter.findUnique({
      where: { id: encounterId },
      include: {
        patientToken: true,
      },
    });

    if (!encounter) {
      log('warn', 'Encounter not found after create/update', { encounterId });
      return result;
    }

    // Skip if sync disabled for this resource
    if (!encounter.fhirSyncEnabled) {
      log('info', 'FHIR sync disabled for encounter', { encounterId });
      return result;
    }

    // Enqueue sync job (non-blocking)
    await enqueueEncounterSync({
      encounter,
      patientToken: encounter.patientToken,
    });

    log('info', 'Encounter sync job enqueued via middleware', {
      encounterId,
      action: params.action,
    });
  } catch (error) {
    // Log error but don't fail the original operation
    log('error', 'Failed to enqueue encounter sync', {
      error: (error as Error).message,
      action: params.action,
    });
  }

  return result;
}

/**
 * Prisma middleware for Observation auto-sync
 */
async function handleObservationSync(
  params: Prisma.MiddlewareParams,
  next: (params: Prisma.MiddlewareParams) => Promise<any>,
  prisma: PrismaClient
): Promise<any> {
  // Execute the query first
  const result = await next(params);

  // Only sync on create/update operations
  if (params.action !== 'create' && params.action !== 'update') {
    return result;
  }

  // Skip if FHIR sync disabled
  if (!isFhirSyncEnabled()) {
    return result;
  }

  try {
    // Get the observation ID from result or params
    let observationId: string;

    if (params.action === 'create') {
      observationId = result.id;
    } else if (params.action === 'update' && params.args.where?.id) {
      observationId = params.args.where.id;
    } else {
      // Bulk update or other operation - skip
      return result;
    }

    // Fetch full observation with relations
    const observation = await prisma.observation.findUnique({
      where: { id: observationId },
      include: {
        patientToken: true,
      },
    });

    if (!observation) {
      log('warn', 'Observation not found after create/update', { observationId });
      return result;
    }

    // Skip if sync disabled for this resource
    if (!observation.fhirSyncEnabled) {
      log('info', 'FHIR sync disabled for observation', { observationId });
      return result;
    }

    // Enqueue sync job (non-blocking)
    await enqueueObservationSync({
      observation,
      patientToken: observation.patientToken,
    });

    log('info', 'Observation sync job enqueued via middleware', {
      observationId,
      action: params.action,
    });
  } catch (error) {
    // Log error but don't fail the original operation
    log('error', 'Failed to enqueue observation sync', {
      error: (error as Error).message,
      action: params.action,
    });
  }

  return result;
}

/**
 * Register FHIR sync middleware with Prisma client
 */
export function registerFhirSyncMiddleware(prisma: PrismaClient): void {
  log('info', 'Registering FHIR sync middleware', {
    enabled: isFhirSyncEnabled(),
  });

  // Middleware for Encounter model
  prisma.$use(async (params, next) => {
    if (params.model === 'Encounter') {
      return await handleEncounterSync(params, next, prisma);
    }
    return next(params);
  });

  // Middleware for Observation model
  prisma.$use(async (params, next) => {
    if (params.model === 'Observation') {
      return await handleObservationSync(params, next, prisma);
    }
    return next(params);
  });

  log('info', 'FHIR sync middleware registered successfully');
}

/**
 * Bulk sync utility for existing records (migration/reconciliation)
 */
export async function bulkSyncEncounters(
  prisma: PrismaClient,
  options: {
    orgId?: string;
    onlyNotSynced?: boolean;
    limit?: number;
  } = {}
): Promise<{ total: number; enqueued: number; skipped: number }> {
  const { orgId, onlyNotSynced = true, limit = 1000 } = options;

  log('info', 'Starting bulk encounter sync', options);

  // Build query
  const where: Prisma.EncounterWhereInput = {
    fhirSyncEnabled: true,
    ...(orgId ? { orgId } : {}),
    ...(onlyNotSynced ? { lastSyncedAt: null } : {}),
  };

  const encounters = await prisma.encounter.findMany({
    where,
    include: {
      patientToken: true,
    },
    take: limit,
    orderBy: {
      createdAt: 'desc',
    },
  });

  let enqueued = 0;
  let skipped = 0;

  for (const encounter of encounters) {
    try {
      await enqueueEncounterSync({
        encounter,
        patientToken: encounter.patientToken,
      });
      enqueued++;
    } catch (error) {
      log('error', 'Failed to enqueue encounter in bulk sync', {
        encounterId: encounter.id,
        error: (error as Error).message,
      });
      skipped++;
    }
  }

  log('info', 'Bulk encounter sync complete', {
    total: encounters.length,
    enqueued,
    skipped,
  });

  return { total: encounters.length, enqueued, skipped };
}

/**
 * Bulk sync utility for observations
 */
export async function bulkSyncObservations(
  prisma: PrismaClient,
  options: {
    orgId?: string;
    onlyNotSynced?: boolean;
    limit?: number;
  } = {}
): Promise<{ total: number; enqueued: number; skipped: number }> {
  const { orgId, onlyNotSynced = true, limit = 1000 } = options;

  log('info', 'Starting bulk observation sync', options);

  // Build query
  const where: Prisma.ObservationWhereInput = {
    fhirSyncEnabled: true,
    ...(orgId ? { orgId } : {}),
    ...(onlyNotSynced ? { lastSyncedAt: null } : {}),
  };

  const observations = await prisma.observation.findMany({
    where,
    include: {
      patientToken: true,
    },
    take: limit,
    orderBy: {
      createdAt: 'desc',
    },
  });

  let enqueued = 0;
  let skipped = 0;

  for (const observation of observations) {
    try {
      await enqueueObservationSync({
        observation,
        patientToken: observation.patientToken,
      });
      enqueued++;
    } catch (error) {
      log('error', 'Failed to enqueue observation in bulk sync', {
        observationId: observation.id,
        error: (error as Error).message,
      });
      skipped++;
    }
  }

  log('info', 'Bulk observation sync complete', {
    total: observations.length,
    enqueued,
    skipped,
  });

  return { total: observations.length, enqueued, skipped };
}
