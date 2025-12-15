/**
 * Correction Aggregation Jobs API
 *
 * POST /api/admin/jobs/correction-aggregation
 * Trigger immediate correction aggregation job
 *
 * GET /api/admin/jobs/correction-aggregation
 * Get job status and history
 */

import { NextRequest, NextResponse } from 'next/server';
import { triggerImmediateCorrectionAggregation } from '@/lib/queue/scheduler';
import { getCorrectionAggregationQueue } from '@/lib/queue/queues';
import logger from '@/lib/logger';
import { z } from 'zod';

// Request schema for triggering jobs
const TriggerJobSchema = z.object({
  type: z.enum(['daily', 'range']).default('daily'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // TODO: Add admin authentication middleware
    // const session = await requireAdminSession();

    const body = await request.json();
    const validation = TriggerJobSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { type, startDate, endDate } = validation.data;

    // Validate date range
    if (type === 'range' && (!startDate || !endDate)) {
      return NextResponse.json(
        {
          success: false,
          error: 'startDate and endDate required for range type',
        },
        { status: 400 }
      );
    }

    const jobId = await triggerImmediateCorrectionAggregation(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );

    logger.info({
      event: 'correction_aggregation_job_triggered_via_api',
      jobId,
      type,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Correction aggregation job triggered',
        data: {
          jobId,
          type,
          startDate,
          endDate,
        },
      },
      { status: 202 }
    );
  } catch (error) {
    logger.error({
      event: 'correction_aggregation_job_trigger_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to trigger job',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // TODO: Add admin authentication middleware
    // const session = await requireAdminSession();

    const queue = getCorrectionAggregationQueue();

    // Get job counts
    const counts = await queue.getJobCounts(
      'completed',
      'failed',
      'delayed',
      'active',
      'waiting'
    );

    // Get recent completed jobs
    const completed = await queue.getCompleted(0, 10);
    const failed = await queue.getFailed(0, 10);
    const active = await queue.getActive(0, 10);
    const waiting = await queue.getWaiting(0, 10);

    // Get repeatable jobs (scheduled jobs)
    const repeatableJobs = await queue.getRepeatableJobs();

    return NextResponse.json(
      {
        success: true,
        data: {
          counts,
          recent: {
            completed: completed.map((job) => ({
              id: job.id,
              name: job.name,
              data: job.data,
              finishedOn: job.finishedOn,
              returnvalue: job.returnvalue,
            })),
            failed: failed.map((job) => ({
              id: job.id,
              name: job.name,
              data: job.data,
              failedReason: job.failedReason,
              finishedOn: job.finishedOn,
            })),
            active: active.map((job) => ({
              id: job.id,
              name: job.name,
              data: job.data,
              progress: job.progress,
            })),
            waiting: waiting.map((job) => ({
              id: job.id,
              name: job.name,
              data: job.data,
            })),
          },
          scheduled: repeatableJobs.map((job) => ({
            key: job.key,
            name: job.name,
            pattern: job.pattern,
            next: job.next,
          })),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error({
      event: 'correction_aggregation_job_status_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get job status',
      },
      { status: 500 }
    );
  }
}
