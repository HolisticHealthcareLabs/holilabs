/**
 * Audit Archival Worker
 *
 * BullMQ worker that processes audit log archival and deletion jobs
 * for HIPAA-compliant 6-year retention
 */

import { Worker, Job } from 'bullmq';
import { defaultWorkerOptions, QueueName } from '../config';
import {
  archiveOldAuditLogs,
  deleteExpiredAuditLogs,
  archiveAuditLogsByDateRange,
  ArchiveResult,
  DeletionResult,
} from '@/lib/jobs/audit-archival';
import logger from '@/lib/logger';

// Job data interface
export interface AuditArchivalJobData {
  type: 'archive' | 'delete' | 'archive-range';
  startDate?: string; // ISO string (for archive-range)
  endDate?: string; // ISO string (for archive-range)
}

// Job result interface
export type AuditArchivalJobResult = ArchiveResult | DeletionResult;

/**
 * Process audit archival job
 */
async function processAuditArchival(
  job: Job<AuditArchivalJobData, AuditArchivalJobResult>
): Promise<AuditArchivalJobResult> {
  const { type, startDate, endDate } = job.data;

  logger.info({
    event: 'audit_archival_job_start',
    jobId: job.id,
    type,
    startDate,
    endDate,
  });

  try {
    // Update job progress
    await job.updateProgress(10);

    let result: AuditArchivalJobResult;

    if (type === 'archive') {
      // Archive old logs (daily job)
      result = await archiveOldAuditLogs();
      await job.updateProgress(90);
    } else if (type === 'delete') {
      // Delete expired logs (annual job)
      result = await deleteExpiredAuditLogs();
      await job.updateProgress(90);
    } else if (type === 'archive-range' && startDate && endDate) {
      // Archive specific date range (manual trigger)
      result = await archiveAuditLogsByDateRange(
        new Date(startDate),
        new Date(endDate)
      );
      await job.updateProgress(90);
    } else {
      throw new Error('Invalid job data: missing required fields or invalid type');
    }

    await job.updateProgress(100);

    logger.info({
      event: 'audit_archival_job_complete',
      jobId: job.id,
      type,
      success: result.success,
      recordCount: 'recordCount' in result ? result.recordCount : undefined,
      deletedCount: 'deletedCount' in result ? result.deletedCount : undefined,
    });

    return result;
  } catch (error) {
    logger.error({
      event: 'audit_archival_job_error',
      jobId: job.id,
      type,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create and start the audit archival worker
 */
export function startAuditArchivalWorker(): Worker {
  const worker = new Worker<AuditArchivalJobData, AuditArchivalJobResult>(
    QueueName.AUDIT_ARCHIVAL,
    processAuditArchival,
    defaultWorkerOptions
  );

  // Worker event handlers
  worker.on('completed', (job, result) => {
    logger.info({
      event: 'worker_job_completed',
      queue: QueueName.AUDIT_ARCHIVAL,
      jobId: job.id,
      type: job.data.type,
      success: result.success,
    });
  });

  worker.on('failed', (job, err) => {
    logger.error({
      event: 'worker_job_failed',
      queue: QueueName.AUDIT_ARCHIVAL,
      jobId: job?.id,
      type: job?.data.type,
      error: err.message,
    });
  });

  worker.on('error', (err) => {
    logger.error({
      event: 'worker_error',
      queue: QueueName.AUDIT_ARCHIVAL,
      error: err.message,
    });
  });

  logger.info({
    event: 'worker_started',
    queue: QueueName.AUDIT_ARCHIVAL,
    concurrency: defaultWorkerOptions.concurrency,
  });

  return worker;
}
