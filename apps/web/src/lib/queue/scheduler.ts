/**
 * BullMQ Job Scheduler
 *
 * Schedules recurring and one-time jobs
 */

import { getCorrectionAggregationQueue } from './queues';
import logger from '@/lib/logger';

/**
 * Schedule daily correction aggregation job
 * Runs every day at 1:00 AM
 */
export async function scheduleDailyCorrectionAggregation(): Promise<void> {
  const queue = getCorrectionAggregationQueue();

  try {
    // Add repeatable job with cron expression
    await queue.add(
      'daily-aggregation',
      {
        type: 'daily' as const,
      },
      {
        repeat: {
          pattern: '0 1 * * *', // Every day at 1:00 AM
        },
        // Remove job after completion to avoid duplication
        removeOnComplete: true,
        removeOnFail: false,
      }
    );

    logger.info({
      event: 'daily_job_scheduled',
      job: 'correction_aggregation',
      schedule: '0 1 * * * (1:00 AM daily)',
    });
  } catch (error) {
    logger.error({
      event: 'daily_job_schedule_error',
      job: 'correction_aggregation',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Trigger immediate correction aggregation for testing or manual runs
 */
export async function triggerImmediateCorrectionAggregation(
  startDate?: Date,
  endDate?: Date
): Promise<string> {
  const queue = getCorrectionAggregationQueue();

  try {
    const job = await queue.add(
      'immediate-aggregation',
      {
        type: startDate && endDate ? ('range' as const) : ('daily' as const),
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      },
      {
        priority: 1, // High priority
      }
    );

    logger.info({
      event: 'immediate_job_triggered',
      job: 'correction_aggregation',
      jobId: job.id,
      type: startDate && endDate ? 'range' : 'daily',
    });

    return job.id!;
  } catch (error) {
    logger.error({
      event: 'immediate_job_trigger_error',
      job: 'correction_aggregation',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Initialize all scheduled jobs
 */
export async function initializeScheduledJobs(): Promise<void> {
  logger.info({ event: 'initializing_scheduled_jobs' });

  try {
    // Schedule daily correction aggregation
    await scheduleDailyCorrectionAggregation();

    // TODO: Add more scheduled jobs here
    // await scheduleDailyPatientReminders();
    // await scheduleWeeklyReports();

    logger.info({ event: 'scheduled_jobs_initialized' });
  } catch (error) {
    logger.error({
      event: 'scheduled_jobs_initialization_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
