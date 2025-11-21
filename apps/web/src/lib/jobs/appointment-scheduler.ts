/**
 * Appointment Reminder Scheduler
 * Automated cron jobs for sending appointment reminders
 * Runs daily at 9 AM to send reminders for tomorrow's appointments
 */

import cron, { ScheduledTask } from 'node-cron';
import { sendRemindersForTomorrow } from '../notifications/appointment-reminders';
import logger from '../logger';

// Environment configuration
const ENABLE_SCHEDULER = process.env.ENABLE_APPOINTMENT_SCHEDULER !== 'false'; // Enabled by default
const REMINDER_SCHEDULE = process.env.REMINDER_CRON_SCHEDULE || '0 9 * * *'; // Default: 9 AM daily

// Task tracking
let isRunning = false;
let lastRun: Date | null = null;
let lastResult: { total: number; sent: number; failed: number } | null = null;
let scheduledTask: ScheduledTask | null = null;

/**
 * Execute the daily reminder task
 */
async function executeDailyReminders(): Promise<void> {
  if (isRunning) {
    logger.warn({
      event: 'reminder_scheduler_skipped',
      reason: 'Previous task still running',
    });
    return;
  }

  isRunning = true;
  const startTime = new Date();

  logger.info({
    event: 'reminder_scheduler_started',
    time: startTime.toISOString(),
  });

  try {
    const result = await sendRemindersForTomorrow();

    lastRun = new Date();
    lastResult = result;

    const duration = Date.now() - startTime.getTime();

    logger.info({
      event: 'reminder_scheduler_completed',
      duration: `${duration}ms`,
      total: result.total,
      sent: result.sent,
      failed: result.failed,
      success_rate: result.total > 0 ? `${((result.sent / result.total) * 100).toFixed(2)}%` : 'N/A',
    });

    // Alert if failure rate is high
    if (result.total > 0 && result.failed / result.total > 0.2) {
      logger.error({
        event: 'reminder_scheduler_high_failure_rate',
        total: result.total,
        failed: result.failed,
        rate: `${((result.failed / result.total) * 100).toFixed(2)}%`,
      });
    }
  } catch (error: any) {
    logger.error({
      event: 'reminder_scheduler_error',
      error: error.message,
      stack: error.stack,
    });
  } finally {
    isRunning = false;
  }
}

/**
 * Start the automated reminder scheduler
 */
export function startAppointmentScheduler(): void {
  if (!ENABLE_SCHEDULER) {
    logger.info({
      event: 'reminder_scheduler_disabled',
      message: 'Set ENABLE_APPOINTMENT_SCHEDULER=true to enable',
    });
    return;
  }

  if (scheduledTask) {
    logger.warn({
      event: 'reminder_scheduler_already_running',
      message: 'Scheduler is already active',
    });
    return;
  }

  // Validate cron expression
  if (!cron.validate(REMINDER_SCHEDULE)) {
    logger.error({
      event: 'reminder_scheduler_invalid_schedule',
      schedule: REMINDER_SCHEDULE,
      message: 'Invalid cron expression',
    });
    return;
  }

  // Schedule the task
  scheduledTask = cron.schedule(
    REMINDER_SCHEDULE,
    async () => {
      await executeDailyReminders();
    },
    {
      timezone: 'America/Mexico_City', // Adjust based on your timezone
    }
  );

  logger.info({
    event: 'reminder_scheduler_started',
    schedule: REMINDER_SCHEDULE,
    timezone: 'America/Mexico_City',
    next_run: scheduledTask ? getNextRunTime() : 'Unknown',
  });

  // Also run immediately on startup if NODE_ENV is development
  if (process.env.NODE_ENV === 'development' && process.env.RUN_REMINDERS_ON_STARTUP === 'true') {
    logger.info({
      event: 'reminder_scheduler_startup_run',
      message: 'Running reminders immediately (development mode)',
    });
    executeDailyReminders();
  }
}

/**
 * Stop the scheduler
 */
export function stopAppointmentScheduler(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;

    logger.info({
      event: 'reminder_scheduler_stopped',
    });
  }
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus(): {
  enabled: boolean;
  isRunning: boolean;
  lastRun: Date | null;
  lastResult: { total: number; sent: number; failed: number } | null;
  nextRun: string | null;
  schedule: string;
} {
  return {
    enabled: ENABLE_SCHEDULER,
    isRunning,
    lastRun,
    lastResult,
    nextRun: scheduledTask ? getNextRunTime() : null,
    schedule: REMINDER_SCHEDULE,
  };
}

/**
 * Manually trigger the reminder task (for testing/admin)
 */
export async function triggerManualReminders(): Promise<{
  success: boolean;
  result?: { total: number; sent: number; failed: number };
  error?: string;
}> {
  try {
    if (isRunning) {
      return {
        success: false,
        error: 'Reminder task is already running',
      };
    }

    await executeDailyReminders();

    return {
      success: true,
      result: lastResult || undefined,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get next scheduled run time
 */
function getNextRunTime(): string {
  if (!scheduledTask) return 'Not scheduled';

  try {
    // Get the next execution time from the cron job
    // This is a bit of a hack since node-cron doesn't expose this directly
    const now = new Date();
    const schedule = REMINDER_SCHEDULE.split(' ');
    const minute = schedule[0];
    const hour = schedule[1];

    // Parse cron values (simplified - works for basic expressions)
    const nextHour = hour === '*' ? now.getHours() : parseInt(hour);
    const nextMinute = minute === '*' ? now.getMinutes() : parseInt(minute);

    const nextRun = new Date();
    nextRun.setHours(nextHour, nextMinute, 0, 0);

    // If the time has passed today, schedule for tomorrow
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    return nextRun.toLocaleString('en-US', {
      timeZone: 'America/Mexico_City',
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return 'Unknown';
  }
}

// Export for testing
export { executeDailyReminders };
