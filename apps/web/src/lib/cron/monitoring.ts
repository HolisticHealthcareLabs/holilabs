/**
 * Cron Job Monitoring System
 *
 * Tracks execution metrics, failures, and provides alerting for cron jobs
 * Integrates with structured logging for observability
 *
 * Features:
 * - Execution time tracking
 * - Success/failure rate monitoring
 * - Automatic alerting on consecutive failures
 * - Job health status
 * - Historical metrics (last 100 runs per job)
 *
 * Usage:
 *   import { CronMonitor } from '@/lib/cron/monitoring';
 *
 *   const monitor = CronMonitor.getInstance();
 *   const jobId = monitor.startJob('send_appointment_reminders');
 *
 *   try {
 *     // ... do work ...
 *     monitor.endJob(jobId, 'success', { processed: 10 });
 *   } catch (error) {
 *     monitor.endJob(jobId, 'failed', { error: error.message });
 *   }
 */

import logger from '@/lib/logger';

export interface CronJobMetrics {
  jobName: string;
  executionId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'running' | 'success' | 'failed';
  retryCount?: number;
  metadata?: Record<string, any>;
  error?: string;
}

export interface CronJobHealth {
  jobName: string;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  successRate: number;
  consecutiveFailures: number;
  lastRun?: Date;
  lastSuccess?: Date;
  lastFailure?: Date;
  averageDuration?: number;
  isHealthy: boolean;
}

/**
 * Singleton monitoring class for tracking cron job execution
 */
export class CronMonitor {
  private static instance: CronMonitor;
  private metrics: Map<string, CronJobMetrics[]> = new Map();
  private readonly maxHistoryPerJob = 100;
  private readonly failureThreshold = 3; // Alert after 3 consecutive failures

  private constructor() {
    logger.info({
      event: 'cron_monitor_initialized',
      message: 'Cron job monitoring system initialized',
    });
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): CronMonitor {
    if (!CronMonitor.instance) {
      CronMonitor.instance = new CronMonitor();
    }
    return CronMonitor.instance;
  }

  /**
   * Start tracking a cron job execution
   * Returns execution ID for tracking
   */
  public startJob(jobName: string, metadata?: Record<string, any>): string {
    const executionId = `${jobName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const metric: CronJobMetrics = {
      jobName,
      executionId,
      startTime: new Date(),
      status: 'running',
      metadata,
    };

    // Initialize job history if not exists
    if (!this.metrics.has(jobName)) {
      this.metrics.set(jobName, []);
    }

    // Add to history
    const history = this.metrics.get(jobName)!;
    history.push(metric);

    // Keep only last N runs
    if (history.length > this.maxHistoryPerJob) {
      history.shift();
    }

    logger.info({
      event: 'cron_job_started',
      jobName,
      executionId,
      timestamp: metric.startTime.toISOString(),
      metadata,
    });

    return executionId;
  }

  /**
   * End tracking a cron job execution
   */
  public endJob(
    executionId: string,
    status: 'success' | 'failed',
    result?: { error?: string; retryCount?: number; metadata?: Record<string, any> }
  ): void {
    // Find the metric by execution ID
    let foundMetric: CronJobMetrics | undefined;
    let jobName: string | undefined;

    for (const [name, history] of this.metrics.entries()) {
      const metric = history.find(m => m.executionId === executionId);
      if (metric) {
        foundMetric = metric;
        jobName = name;
        break;
      }
    }

    if (!foundMetric || !jobName) {
      logger.warn({
        event: 'cron_job_not_found',
        executionId,
        message: 'Attempted to end job that was not started',
      });
      return;
    }

    // Update metric
    foundMetric.endTime = new Date();
    foundMetric.duration = foundMetric.endTime.getTime() - foundMetric.startTime.getTime();
    foundMetric.status = status;
    foundMetric.retryCount = result?.retryCount;
    foundMetric.error = result?.error;
    foundMetric.metadata = { ...foundMetric.metadata, ...result?.metadata };

    // Log completion
    if (status === 'success') {
      logger.info({
        event: 'cron_job_completed',
        jobName,
        executionId,
        duration: foundMetric.duration,
        retries: foundMetric.retryCount,
        metadata: foundMetric.metadata,
      });
    } else {
      logger.error({
        event: 'cron_job_failed',
        jobName,
        executionId,
        duration: foundMetric.duration,
        retries: foundMetric.retryCount,
        error: foundMetric.error,
        metadata: foundMetric.metadata,
      });
    }

    // Check for consecutive failures and alert
    this.checkJobHealth(jobName);
  }

  /**
   * Get health status for a specific job
   */
  public getJobHealth(jobName: string): CronJobHealth | null {
    const history = this.metrics.get(jobName);
    if (!history || history.length === 0) {
      return null;
    }

    const totalRuns = history.filter(m => m.status !== 'running').length;
    const successfulRuns = history.filter(m => m.status === 'success').length;
    const failedRuns = history.filter(m => m.status === 'failed').length;

    // Calculate consecutive failures (from most recent runs)
    let consecutiveFailures = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].status === 'failed') {
        consecutiveFailures++;
      } else if (history[i].status === 'success') {
        break;
      }
    }

    // Find last run, success, and failure
    const lastRun = history[history.length - 1];
    const lastSuccess = [...history].reverse().find(m => m.status === 'success');
    const lastFailure = [...history].reverse().find(m => m.status === 'failed');

    // Calculate average duration
    const completedRuns = history.filter(m => m.duration !== undefined);
    const averageDuration = completedRuns.length > 0
      ? completedRuns.reduce((sum, m) => sum + (m.duration || 0), 0) / completedRuns.length
      : undefined;

    const successRate = totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0;
    const isHealthy = consecutiveFailures < this.failureThreshold && successRate >= 80;

    return {
      jobName,
      totalRuns,
      successfulRuns,
      failedRuns,
      successRate,
      consecutiveFailures,
      lastRun: lastRun?.startTime,
      lastSuccess: lastSuccess?.startTime,
      lastFailure: lastFailure?.startTime,
      averageDuration,
      isHealthy,
    };
  }

  /**
   * Get health status for all jobs
   */
  public getAllJobsHealth(): CronJobHealth[] {
    const healthStatuses: CronJobHealth[] = [];

    for (const jobName of this.metrics.keys()) {
      const health = this.getJobHealth(jobName);
      if (health) {
        healthStatuses.push(health);
      }
    }

    return healthStatuses;
  }

  /**
   * Get recent executions for a job
   */
  public getJobHistory(jobName: string, limit: number = 10): CronJobMetrics[] {
    const history = this.metrics.get(jobName);
    if (!history) {
      return [];
    }

    return history
      .slice(-limit)
      .reverse(); // Most recent first
  }

  /**
   * Check job health and alert if needed
   */
  private checkJobHealth(jobName: string): void {
    const health = this.getJobHealth(jobName);
    if (!health) return;

    // Alert on consecutive failures
    if (health.consecutiveFailures >= this.failureThreshold) {
      logger.error({
        event: 'cron_job_health_critical',
        jobName,
        consecutiveFailures: health.consecutiveFailures,
        successRate: health.successRate,
        lastSuccess: health.lastSuccess?.toISOString(),
        message: `ALERT: Job ${jobName} has failed ${health.consecutiveFailures} times consecutively`,
      });

      // TODO: Send alert via notification system (email, Slack, PagerDuty, etc.)
      this.sendAlert(jobName, health);
    }

    // Warn on low success rate
    if (health.totalRuns >= 10 && health.successRate < 80) {
      logger.warn({
        event: 'cron_job_health_degraded',
        jobName,
        successRate: health.successRate,
        totalRuns: health.totalRuns,
        message: `WARNING: Job ${jobName} has low success rate: ${health.successRate.toFixed(2)}%`,
      });
    }
  }

  /**
   * Send alert for critical job failures
   * TODO: Integrate with notification system (email, Slack, PagerDuty)
   */
  private sendAlert(jobName: string, health: CronJobHealth): void {
    logger.error({
      event: 'cron_alert_triggered',
      jobName,
      health,
      message: `CRITICAL: Cron job ${jobName} requires immediate attention`,
    });

    // TODO: Implement actual alerting
    // Examples:
    // - Send email to operations team
    // - Post to Slack channel
    // - Create PagerDuty incident
    // - Send SMS to on-call engineer
  }

  /**
   * Clear history for a specific job (for testing or maintenance)
   */
  public clearJobHistory(jobName: string): void {
    this.metrics.delete(jobName);
    logger.info({
      event: 'cron_history_cleared',
      jobName,
    });
  }

  /**
   * Clear all monitoring data (for testing or maintenance)
   */
  public clearAllHistory(): void {
    this.metrics.clear();
    logger.info({
      event: 'cron_all_history_cleared',
    });
  }

  /**
   * Export metrics as JSON (for external monitoring systems)
   */
  public exportMetrics(): { jobs: Record<string, CronJobHealth> } {
    const jobs: Record<string, CronJobHealth> = {};

    for (const jobName of this.metrics.keys()) {
      const health = this.getJobHealth(jobName);
      if (health) {
        jobs[jobName] = health;
      }
    }

    return { jobs };
  }
}

/**
 * Helper function to wrap cron job execution with monitoring
 * Automatically tracks start, end, success, and failure
 *
 * @example
 *   await withMonitoring('send_appointment_reminders', async () => {
 *     await sendRemindersForTomorrow();
 *   });
 */
export async function withMonitoring<T>(
  jobName: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const monitor = CronMonitor.getInstance();
  const executionId = monitor.startJob(jobName, metadata);

  let retryCount = 0;

  try {
    const result = await fn();
    monitor.endJob(executionId, 'success', { retryCount, metadata });
    return result;
  } catch (error) {
    monitor.endJob(executionId, 'failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      retryCount,
      metadata,
    });
    throw error;
  }
}

/**
 * Helper function for retry logic with exponential backoff
 *
 * @example
 *   await withRetry(async () => {
 *     await riskyOperation();
 *   }, { maxRetries: 3, initialDelay: 1000 });
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const initialDelay = options.initialDelay ?? 1000;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt);

        if (options.onRetry) {
          options.onRetry(attempt + 1, lastError);
        }

        logger.warn({
          event: 'retry_attempt',
          attempt: attempt + 1,
          maxRetries,
          delay,
          error: lastError.message,
        });

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// Export singleton instance for convenience
export const cronMonitor = CronMonitor.getInstance();
