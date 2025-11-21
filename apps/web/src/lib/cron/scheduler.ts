/**
 * Cron Scheduler
 *
 * Sets up scheduled jobs for background tasks
 * Runs the reminder executor every minute
 */

import cron, { ScheduledTask } from 'node-cron';
import { executeScheduledReminders } from '@/lib/jobs/reminder-executor';
import logger from '@/lib/logger';

let isSchedulerRunning = false;
let reminderJob: ScheduledTask | null = null;

/**
 * Initialize the cron scheduler
 */
export function initializeScheduler() {
  if (isSchedulerRunning) {
    logger.info({
      event: 'scheduler_already_running',
      message: 'Cron scheduler is already initialized',
    });
    return;
  }

  // Schedule reminder executor to run every minute
  reminderJob = cron.schedule('* * * * *', async () => {
    try {
      logger.info({
        event: 'cron_reminder_job_start',
        timestamp: new Date().toISOString(),
      });

      const stats = await executeScheduledReminders();

      logger.info({
        event: 'cron_reminder_job_complete',
        stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error({
        event: 'cron_reminder_job_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  });

  isSchedulerRunning = true;

  logger.info({
    event: 'scheduler_initialized',
    message: 'Cron scheduler started successfully',
    jobs: [
      {
        name: 'reminder-executor',
        schedule: '* * * * *',
        description: 'Execute scheduled reminders every minute',
      },
    ],
  });
}

/**
 * Stop the cron scheduler
 */
export function stopScheduler() {
  if (reminderJob) {
    reminderJob.stop();
    reminderJob = null;
  }

  isSchedulerRunning = false;

  logger.info({
    event: 'scheduler_stopped',
    message: 'Cron scheduler stopped',
  });
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus() {
  return {
    isRunning: isSchedulerRunning,
    jobs: isSchedulerRunning
      ? [
          {
            name: 'reminder-executor',
            schedule: '* * * * *',
            status: 'active',
          },
        ]
      : [],
  };
}
