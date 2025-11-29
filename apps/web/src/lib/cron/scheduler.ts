/**
 * Cron Scheduler
 *
 * Sets up scheduled jobs for background tasks
 * Runs the reminder executor every minute
 */

import cron, { ScheduledTask } from 'node-cron';
import { executeScheduledReminders } from '@/lib/jobs/reminder-executor';
import { autoGenerateScreeningReminders } from '@/lib/prevention/screening-triggers';
import logger from '@/lib/logger';

let isSchedulerRunning = false;
let reminderJob: ScheduledTask | null = null;
let screeningTriggersJob: ScheduledTask | null = null;

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

  // Schedule screening triggers to run daily at 2:00 AM
  screeningTriggersJob = cron.schedule('0 2 * * *', async () => {
    try {
      logger.info({
        event: 'cron_screening_triggers_start',
        timestamp: new Date().toISOString(),
      });

      const result = await autoGenerateScreeningReminders();

      logger.info({
        event: 'cron_screening_triggers_complete',
        result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error({
        event: 'cron_screening_triggers_error',
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
      {
        name: 'screening-triggers',
        schedule: '0 2 * * *',
        description: 'Auto-generate screening reminders daily at 2:00 AM',
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

  if (screeningTriggersJob) {
    screeningTriggersJob.stop();
    screeningTriggersJob = null;
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
            description: 'Execute scheduled reminders every minute',
          },
          {
            name: 'screening-triggers',
            schedule: '0 2 * * *',
            status: 'active',
            description: 'Auto-generate screening reminders daily at 2:00 AM',
          },
        ]
      : [],
  };
}
