/**
 * Correction Aggregation Worker
 *
 * BullMQ worker that processes correction aggregation jobs
 */

import { Worker, Job } from 'bullmq';
import { defaultWorkerOptions, QueueName } from '../config';
import { aggregateDailyCorrections, aggregateCorrectionsRange } from '@/lib/jobs/correction-aggregation';
import logger from '@/lib/logger';

// Job data interface
export interface CorrectionAggregationJobData {
  type: 'daily' | 'range';
  startDate?: string; // ISO string
  endDate?: string; // ISO string
}

// Job result interface
export interface CorrectionAggregationJobResult {
  processed: boolean;
  results: any | null;
  error?: string;
}

/**
 * Process correction aggregation job
 */
async function processCorrectionAggregation(
  job: Job<CorrectionAggregationJobData, CorrectionAggregationJobResult>
): Promise<CorrectionAggregationJobResult> {
  const { type, startDate, endDate } = job.data;

  logger.info({
    event: 'correction_aggregation_job_start',
    jobId: job.id,
    type,
    startDate,
    endDate,
  });

  try {
    // Update job progress
    await job.updateProgress(10);

    let result;

    if (type === 'daily') {
      // Process daily corrections
      result = await aggregateDailyCorrections();
    } else if (type === 'range' && startDate && endDate) {
      // Process date range
      result = await aggregateCorrectionsRange(
        new Date(startDate),
        new Date(endDate)
      );
    } else {
      throw new Error('Invalid job data: missing required fields');
    }

    await job.updateProgress(100);

    logger.info({
      event: 'correction_aggregation_job_complete',
      jobId: job.id,
      processed: result.processed,
      totalCorrections: result.results?.totalCorrections || 0,
    });

    return result;
  } catch (error) {
    logger.error({
      event: 'correction_aggregation_job_error',
      jobId: job.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      processed: false,
      results: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create and start the correction aggregation worker
 */
export function startCorrectionAggregationWorker(): Worker {
  const worker = new Worker<
    CorrectionAggregationJobData,
    CorrectionAggregationJobResult
  >(
    QueueName.CORRECTION_AGGREGATION,
    processCorrectionAggregation,
    defaultWorkerOptions
  );

  // Worker event handlers
  worker.on('completed', (job, result) => {
    logger.info({
      event: 'worker_job_completed',
      queue: QueueName.CORRECTION_AGGREGATION,
      jobId: job.id,
      processed: result.processed,
    });
  });

  worker.on('failed', (job, err) => {
    logger.error({
      event: 'worker_job_failed',
      queue: QueueName.CORRECTION_AGGREGATION,
      jobId: job?.id,
      error: err.message,
    });
  });

  worker.on('error', (err) => {
    logger.error({
      event: 'worker_error',
      queue: QueueName.CORRECTION_AGGREGATION,
      error: err.message,
    });
  });

  logger.info({
    event: 'worker_started',
    queue: QueueName.CORRECTION_AGGREGATION,
    concurrency: defaultWorkerOptions.concurrency,
  });

  return worker;
}
