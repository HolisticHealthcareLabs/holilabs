/**
 * CDSS V3 - Summary Generation Worker
 *
 * BullMQ worker that processes summary generation jobs.
 * Calls LLM with de-identified transcript and validates output with Zod.
 *
 * Flow:
 * 1. Receive job with de-identified transcript and patient context
 * 2. Call Claude to generate structured summary
 * 3. Validate output with SummaryDraftSchema
 * 4. Save draft to encounter
 * 5. Return result
 */

import { Worker, Job } from 'bullmq';
import { defaultWorkerOptions, QueueName } from '../config';
import logger from '@/lib/logger';
import { createSummaryService } from '@/lib/services/summary.service';
import { encounterRepository } from '@/lib/repositories';
import { SummaryDraftSchema } from '@/lib/schemas/summary-draft.schema';
import type {
  SummaryGenJobData,
  SummaryGenJobResult,
} from '../types';

// Worker concurrency - limit to prevent API rate limiting
const WORKER_CONCURRENCY = parseInt(
  process.env.SUMMARY_GEN_CONCURRENCY || '2',
  10
);

/**
 * Process a summary generation job
 */
async function processSummaryGenJob(
  job: Job<SummaryGenJobData>
): Promise<SummaryGenJobResult> {
  const { encounterId, deidTranscript, patientContext, providerId, language } = job.data;

  logger.info({
    event: 'summary_gen_job_started',
    queue: QueueName.SUMMARY_GENERATION,
    jobId: job.id,
    encounterId,
    transcriptLength: deidTranscript.length,
  });

  try {
    // Update progress: Starting
    await job.updateProgress(10);

    // 1. Create summary service instance
    const summaryService = createSummaryService();

    await job.updateProgress(20);

    // 2. Generate draft using LLM
    // Note: transcript is already de-identified (done in enqueueGeneration)
    const draft = await summaryService.generateDraft(
      deidTranscript,
      patientContext,
      language || 'en'
    );

    await job.updateProgress(80);

    // 3. Draft is already validated by SummaryDraftSchema in generateDraft
    // Re-validate here for extra safety
    const validatedDraft = SummaryDraftSchema.parse(draft);

    // 4. Save draft to encounter
    await encounterRepository.saveSummaryDraft(encounterId, validatedDraft);

    await job.updateProgress(100);

    logger.info({
      event: 'summary_gen_job_completed',
      queue: QueueName.SUMMARY_GENERATION,
      jobId: job.id,
      encounterId,
      sectionsGenerated: Object.keys(validatedDraft).length,
    });

    return {
      encounterId,
      success: true,
      draft: validatedDraft,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error during summary generation';

    // Check if it's a Zod validation error
    const isValidationError = error instanceof Error && error.name === 'ZodError';

    logger.error({
      event: 'summary_gen_job_failed',
      queue: QueueName.SUMMARY_GENERATION,
      jobId: job.id,
      encounterId,
      error: errorMessage,
      isValidationError,
    });

    // Re-throw to mark job as failed in BullMQ
    throw error;
  }
}

/**
 * Start the summary generation worker
 */
export function startSummaryGenerationWorker(): Worker<
  SummaryGenJobData,
  SummaryGenJobResult
> {
  const worker = new Worker<SummaryGenJobData, SummaryGenJobResult>(
    QueueName.SUMMARY_GENERATION,
    processSummaryGenJob,
    {
      ...defaultWorkerOptions,
      concurrency: WORKER_CONCURRENCY,
    }
  );

  worker.on('failed', (job, err) => {
    logger.error({
      event: 'summary_gen_worker_job_failed',
      queue: QueueName.SUMMARY_GENERATION,
      jobId: job?.id,
      error: err.message,
    });
  });

  worker.on('completed', (job, result) => {
    logger.info({
      event: 'summary_gen_worker_job_completed',
      queue: QueueName.SUMMARY_GENERATION,
      jobId: job.id,
      encounterId: result.encounterId,
      success: result.success,
    });
  });

  worker.on('progress', (job, progress) => {
    logger.debug({
      event: 'summary_gen_worker_progress',
      queue: QueueName.SUMMARY_GENERATION,
      jobId: job.id,
      progress,
    });
  });

  logger.info({
    event: 'summary_gen_worker_started',
    queue: QueueName.SUMMARY_GENERATION,
    concurrency: WORKER_CONCURRENCY,
  });

  return worker;
}
