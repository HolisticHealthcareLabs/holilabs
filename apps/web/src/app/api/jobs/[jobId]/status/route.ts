/**
 * Job Status API - CDSS V3 Async Engine
 *
 * GET /api/jobs/[jobId]/status - Get the status of an async job
 *
 * Returns job status, progress, and result/error for BullMQ jobs.
 * Used by the frontend useJobStatus hook for polling.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getDocumentParseQueue,
  getSummaryGenerationQueue,
  getFhirSyncQueue,
} from '@/lib/queue/queues';
import { QueueName } from '@/lib/queue/config';
import logger from '@/lib/logger';
import type { JobStatusResponse } from '@/lib/queue/types';

export const dynamic = 'force-dynamic';

// Map of queue name prefixes to queue getters for job lookup
const queueGetters = {
  [QueueName.DOCUMENT_PARSE]: getDocumentParseQueue,
  [QueueName.SUMMARY_GENERATION]: getSummaryGenerationQueue,
  [QueueName.FHIR_SYNC]: getFhirSyncQueue,
};

/**
 * GET /api/jobs/[jobId]/status
 *
 * Retrieves the current status of an async job.
 * Searches across all CDSS queues to find the job.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;

    if (!jobId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Job ID is required',
        },
        { status: 400 }
      );
    }

    // Try to find job in all CDSS queues
    for (const [queueName, getQueue] of Object.entries(queueGetters)) {
      const queue = getQueue();
      const job = await queue.getJob(jobId);

      if (job) {
        const state = await job.getState();
        const progress =
          typeof job.progress === 'number' ? job.progress : 0;

        const response: JobStatusResponse = {
          id: job.id!,
          status: state as JobStatusResponse['status'],
          progress,
          result: state === 'completed' ? job.returnvalue : undefined,
          error: state === 'failed' ? job.failedReason : undefined,
          createdAt: job.timestamp ? new Date(job.timestamp).toISOString() : undefined,
          startedAt: job.processedOn
            ? new Date(job.processedOn).toISOString()
            : undefined,
          completedAt: job.finishedOn
            ? new Date(job.finishedOn).toISOString()
            : undefined,
        };

        logger.debug({
          event: 'job_status_fetched',
          jobId,
          queueName,
          status: state,
          progress,
        });

        return NextResponse.json({
          success: true,
          data: response,
        });
      }
    }

    // Job not found in any queue
    logger.warn({
      event: 'job_not_found',
      jobId,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Job not found',
      },
      { status: 404 }
    );
  } catch (error) {
    logger.error({
      event: 'job_status_error',
      jobId: params.jobId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch job status',
      },
      { status: 500 }
    );
  }
}
