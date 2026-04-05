/**
 * BullMQ Job Scheduler
 *
 * Schedules recurring and one-time jobs
 */

import { getCorrectionAggregationQueue, getAuditArchivalQueue } from './queues';
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
 * Schedule daily audit log archival job
 * Runs every day at 2:00 AM
 * Archives logs older than 1 year to compressed JSON files
 */
export async function scheduleDailyAuditArchival(): Promise<void> {
  const queue = getAuditArchivalQueue();

  try {
    // Add repeatable job with cron expression
    await queue.add(
      'daily-audit-archival',
      {
        type: 'archive' as const,
      },
      {
        repeat: {
          pattern: '0 2 * * *', // Every day at 2:00 AM
        },
        removeOnComplete: true,
        removeOnFail: false,
      }
    );

    logger.info({
      event: 'daily_job_scheduled',
      job: 'audit_archival',
      schedule: '0 2 * * * (2:00 AM daily)',
    });
  } catch (error) {
    logger.error({
      event: 'daily_job_schedule_error',
      job: 'audit_archival',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

// REMOVED: scheduleAnnualAuditDeletion — audit log deletion is prohibited
// per CYRUS CVI-004/005 and LGPD Art. 37. Logs are immutable; only soft-archival is allowed.

/**
 * Trigger immediate audit archival for testing or manual runs
 */
export async function triggerImmediateAuditArchival(
  startDate?: Date,
  endDate?: Date
): Promise<string> {
  const queue = getAuditArchivalQueue();

  try {
    const job = await queue.add(
      'immediate-audit-archival',
      {
        type: startDate && endDate ? ('archive-range' as const) : ('archive' as const),
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      },
      {
        priority: 1, // High priority
      }
    );

    logger.info({
      event: 'immediate_job_triggered',
      job: 'audit_archival',
      jobId: job.id,
      type: startDate && endDate ? 'archive-range' : 'archive',
    });

    return job.id!;
  } catch (error) {
    logger.error({
      event: 'immediate_job_trigger_error',
      job: 'audit_archival',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

// REMOVED: triggerImmediateAuditDeletion — audit log deletion is prohibited
// per CYRUS CVI-004/005 and LGPD Art. 37.

/**
 * Initialize all scheduled jobs
 */
export async function initializeScheduledJobs(): Promise<void> {
  logger.info({ event: 'initializing_scheduled_jobs' });

  try {
    // Schedule daily correction aggregation
    await scheduleDailyCorrectionAggregation();

    // Schedule daily audit archival (HIPAA compliance)
    await scheduleDailyAuditArchival();

    // NOTE: Annual audit deletion removed — CYRUS CVI-004/005 prohibits audit log deletion

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
