// @ts-nocheck
/**
 * BullMQ Job Queue for FHIR Sync Operations
 * Provides async, reliable, and observable FHIR resource synchronization
 */

import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import type { PrismaClient } from '@prisma/client';
import {
  syncPatientToFhir,
  syncEncounterToFhir,
  syncObservationToFhir,
  initFhirSyncService,
  type PatientSyncPayload,
  type EncounterSyncPayload,
  type ObservationSyncPayload,
  type SyncResult,
} from './fhir-sync-enhanced';

/**
 * Job type definitions
 */
export type FhirJobName = 'sync-patient' | 'sync-encounter' | 'sync-observation';

export interface FhirJobData {
  correlationId: string;
  orgId: string;
  resourceType: string;
  resourceId: string;
  payload:
  | { type: 'patient'; data: PatientSyncPayload }
  | { type: 'encounter'; data: EncounterSyncPayload }
  | { type: 'observation'; data: ObservationSyncPayload };
}

export interface FhirJobResult {
  jobId: string;
  success: boolean;
  fhirResourceId?: string;
  error?: string;
  processingTime: number;
}

/**
 * Queue configuration
 */
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const QUEUE_CONFIG = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 1000,
    },
    removeOnComplete: {
      age: 7 * 24 * 60 * 60, // 7 days
      count: 1000,
    },
    removeOnFail: {
      age: 30 * 24 * 60 * 60, // 30 days
      count: 5000,
    },
  },
};

/**
 * Logging utilities
 */
function log(level: 'info' | 'warn' | 'error', message: string, context?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    service: 'fhir-queue',
    message,
    ...context,
  };
  console[level === 'error' ? 'error' : 'log'](JSON.stringify(logEntry));
}

/**
 * Queue singleton
 */
let fhirQueue: Queue<FhirJobData, FhirJobResult> | null = null;
let fhirWorker: Worker<FhirJobData, FhirJobResult> | null = null;
let queueEvents: QueueEvents | null = null;

/**
 * Initialize the FHIR sync queue
 */
export async function initFhirQueue(prisma: PrismaClient): Promise<Queue<FhirJobData, FhirJobResult>> {
  if (fhirQueue) {
    log('warn', 'FHIR queue already initialized');
    return fhirQueue;
  }

  try {
    log('info', 'Initializing FHIR sync queue', { redisUrl: REDIS_URL });

    // Initialize sync service with Prisma
    initFhirSyncService(prisma);

    // Create queue
    fhirQueue = new Queue<FhirJobData, FhirJobResult>('fhir-sync', {
      connection: {
        url: REDIS_URL,
        maxRetriesPerRequest: null, // Disable built-in retries (we handle this)
      },
      defaultJobOptions: QUEUE_CONFIG.defaultJobOptions,
    });

    // Create worker
    fhirWorker = new Worker<FhirJobData, FhirJobResult>(
      'fhir-sync',
      async (job: Job<FhirJobData>) => {
        return await processFhirJob(job);
      },
      {
        connection: {
          url: REDIS_URL,
          maxRetriesPerRequest: null,
        },
        concurrency: 5, // Process 5 jobs concurrently
        limiter: {
          max: 10, // Max 10 jobs per...
          duration: 1000, // ...1 second (rate limiting)
        },
      }
    );

    // Queue events for monitoring
    queueEvents = new QueueEvents('fhir-sync', {
      connection: {
        url: REDIS_URL,
        maxRetriesPerRequest: null,
      },
    });

    // Event listeners
    setupEventListeners();

    log('info', 'FHIR sync queue initialized successfully', {
      concurrency: 5,
      rateLimit: '10 jobs/sec',
    });

    return fhirQueue;
  } catch (error) {
    log('error', 'Failed to initialize FHIR queue', {
      error: (error as Error).message,
    });
    throw error;
  }
}

/**
 * Process a single FHIR sync job
 */
async function processFhirJob(job: Job<FhirJobData>): Promise<FhirJobResult> {
  const startTime = Date.now();

  try {
    log('info', 'Processing FHIR job', {
      jobId: job.id,
      correlationId: job.data.correlationId,
      resourceType: job.data.resourceType,
      resourceId: job.data.resourceId,
      attempt: job.attemptsMade + 1,
    });

    let result: SyncResult;

    // Route to appropriate sync function
    switch (job.data.payload.type) {
      case 'patient':
        result = await syncPatientToFhir(job.data.payload.data);
        break;

      case 'encounter':
        result = await syncEncounterToFhir(job.data.payload.data);
        break;

      case 'observation':
        result = await syncObservationToFhir(job.data.payload.data);
        break;

      default:
        throw new Error(`Unknown job payload type: ${(job.data.payload as any).type}`);
    }

    const processingTime = Date.now() - startTime;

    if (result.success) {
      log('info', 'FHIR job completed successfully', {
        jobId: job.id,
        correlationId: job.data.correlationId,
        fhirResourceId: result.fhirResourceId,
        processingTime,
      });

      return {
        jobId: job.id!,
        success: true,
        fhirResourceId: result.fhirResourceId,
        processingTime,
      };
    } else {
      throw new Error(result.error || 'Sync failed');
    }
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = (error as Error).message;

    log('error', 'FHIR job failed', {
      jobId: job.id,
      correlationId: job.data.correlationId,
      error: errorMessage,
      attempt: job.attemptsMade + 1,
      processingTime,
    });

    // Throw to trigger BullMQ retry mechanism
    throw error;
  }
}

/**
 * Setup event listeners for observability
 */
function setupEventListeners(): void {
  if (!fhirWorker || !queueEvents) return;

  // Worker events
  fhirWorker.on('completed', (job: Job<FhirJobData>, result: FhirJobResult) => {
    log('info', 'Job completed', {
      jobId: job.id,
      correlationId: job.data.correlationId,
      processingTime: result.processingTime,
    });
  });

  fhirWorker.on('failed', (job: Job<FhirJobData> | undefined, error: Error) => {
    if (!job) return;

    log('error', 'Job failed permanently', {
      jobId: job.id,
      correlationId: job.data.correlationId,
      attempts: job.attemptsMade,
      error: error.message,
    });
  });

  fhirWorker.on('error', (error: Error) => {
    log('error', 'Worker error', { error: error.message });
  });

  // Queue events
  queueEvents.on('stalled', ({ jobId }: { jobId: string }) => {
    log('warn', 'Job stalled (possibly due to worker crash)', { jobId });
  });

  queueEvents.on('progress', ({ jobId, data }: { jobId: string; data: any }) => {
    log('info', 'Job progress', { jobId, progress: data });
  });
}

/**
 * Enqueue a Patient sync job
 */
export async function enqueuePatientSync(payload: PatientSyncPayload): Promise<string> {
  if (!fhirQueue) {
    throw new Error('FHIR queue not initialized. Call initFhirQueue() first.');
  }

  const correlationId = `patient-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const jobData: FhirJobData = {
    correlationId,
    orgId: payload.orgId,
    resourceType: 'Patient',
    resourceId: payload.id,
    payload: {
      type: 'patient',
      data: payload,
    },
  };

  const job = await fhirQueue.add('sync-patient', jobData, {
    jobId: correlationId, // Use correlation ID as job ID for idempotency
  });

  log('info', 'Patient sync job enqueued', {
    jobId: job.id,
    correlationId,
    patientTokenId: payload.patientTokenId,
  });

  return job.id!;
}

/**
 * Enqueue an Encounter sync job
 */
export async function enqueueEncounterSync(payload: EncounterSyncPayload): Promise<string> {
  if (!fhirQueue) {
    throw new Error('FHIR queue not initialized. Call initFhirQueue() first.');
  }

  const correlationId = `encounter-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const jobData: FhirJobData = {
    correlationId,
    orgId: payload.encounter.orgId,
    resourceType: 'Encounter',
    resourceId: payload.encounter.id,
    payload: {
      type: 'encounter',
      data: payload,
    },
  };

  const job = await fhirQueue.add('sync-encounter', jobData, {
    jobId: correlationId,
  });

  log('info', 'Encounter sync job enqueued', {
    jobId: job.id,
    correlationId,
    encounterId: payload.encounter.id,
  });

  return job.id!;
}

/**
 * Enqueue an Observation sync job
 */
export async function enqueueObservationSync(payload: ObservationSyncPayload): Promise<string> {
  if (!fhirQueue) {
    throw new Error('FHIR queue not initialized. Call initFhirQueue() first.');
  }

  const correlationId = `observation-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const jobData: FhirJobData = {
    correlationId,
    orgId: payload.observation.orgId,
    resourceType: 'Observation',
    resourceId: payload.observation.id,
    payload: {
      type: 'observation',
      data: payload,
    },
  };

  const job = await fhirQueue.add('sync-observation', jobData, {
    jobId: correlationId,
  });

  log('info', 'Observation sync job enqueued', {
    jobId: job.id,
    correlationId,
    observationId: payload.observation.id,
  });

  return job.id!;
}

/**
 * Get queue statistics for monitoring
 */
export async function getQueueStats(): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}> {
  if (!fhirQueue) {
    throw new Error('FHIR queue not initialized');
  }

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    fhirQueue.getWaitingCount(),
    fhirQueue.getActiveCount(),
    fhirQueue.getCompletedCount(),
    fhirQueue.getFailedCount(),
    fhirQueue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}

/**
 * Get failed jobs (for manual review/retry)
 */
export async function getFailedJobs(limit = 50): Promise<Job<FhirJobData>[]> {
  if (!fhirQueue) {
    throw new Error('FHIR queue not initialized');
  }

  return await fhirQueue.getFailed(0, limit);
}

/**
 * Retry a failed job by ID
 */
export async function retryFailedJob(jobId: string): Promise<void> {
  if (!fhirQueue) {
    throw new Error('FHIR queue not initialized');
  }

  const job = await fhirQueue.getJob(jobId);
  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  await job.retry();
  log('info', 'Job manually retried', { jobId });
}

/**
 * Clean up old jobs (for maintenance cron)
 */
export async function cleanOldJobs(): Promise<void> {
  if (!fhirQueue) {
    throw new Error('FHIR queue not initialized');
  }

  const grace = 30 * 24 * 60 * 60 * 1000; // 30 days
  const limit = 1000;

  await fhirQueue.clean(grace, limit, 'completed');
  await fhirQueue.clean(grace, limit, 'failed');

  log('info', 'Old jobs cleaned', { grace: '30 days', limit });
}

/**
 * Pause the queue (for maintenance)
 */
export async function pauseQueue(): Promise<void> {
  if (!fhirQueue) {
    throw new Error('FHIR queue not initialized');
  }

  await fhirQueue.pause();
  log('warn', 'FHIR queue paused');
}

/**
 * Resume the queue
 */
export async function resumeQueue(): Promise<void> {
  if (!fhirQueue) {
    throw new Error('FHIR queue not initialized');
  }

  await fhirQueue.resume();
  log('info', 'FHIR queue resumed');
}

/**
 * Graceful shutdown
 */
export async function shutdownFhirQueue(): Promise<void> {
  log('info', 'Shutting down FHIR queue...');

  if (fhirWorker) {
    await fhirWorker.close();
    log('info', 'Worker closed');
  }

  if (queueEvents) {
    await queueEvents.close();
    log('info', 'Queue events closed');
  }

  if (fhirQueue) {
    await fhirQueue.close();
    log('info', 'Queue closed');
  }

  fhirQueue = null;
  fhirWorker = null;
  queueEvents = null;

  log('info', 'FHIR queue shutdown complete');
}
