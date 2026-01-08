/**
 * Production Email Queue with BullMQ
 *
 * Features:
 * - Redis-backed job queue with persistence
 * - 3 retry attempts with exponential backoff (2s, 4s, 8s)
 * - Primary provider: Resend
 * - Fallback provider: SendGrid (on final attempt)
 * - Comprehensive error handling and logging
 * - Job metrics and monitoring
 *
 * @module email/email-queue
 */

import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import logger from '@/lib/logger';
import { sendEmail as sendViaResend } from './resend';
import { sendEmail as sendViaSendGrid } from './sendgrid';

/**
 * Email job data structure
 */
export interface EmailJobData {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  priority?: 'low' | 'normal' | 'high';
  metadata?: Record<string, any>;
}

/**
 * Email job result
 */
interface EmailJobResult {
  success: boolean;
  provider: 'resend' | 'sendgrid';
  messageId?: string;
  error?: string;
  timestamp: Date;
}

/**
 * Redis connection configuration
 */
function getRedisConnection(): Redis {
  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;

  if (!redisUrl) {
    throw new Error('REDIS_URL or UPSTASH_REDIS_REST_URL environment variable is required for email queue');
  }

  // Support both standard Redis and Upstash Redis
  if (redisUrl.includes('upstash')) {
    // For Upstash, use REST URL format
    const url = new URL(redisUrl);
    return new Redis({
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      password: url.password,
      tls: url.protocol === 'https:' ? {} : undefined,
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false,
    });
  } else {
    // Standard Redis connection
    return new Redis(redisUrl, {
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false,
    });
  }
}

/**
 * Create Redis connection for BullMQ
 */
let redisConnection: Redis | null = null;

function getConnection(): Redis {
  if (!redisConnection) {
    redisConnection = getRedisConnection();
  }
  return redisConnection;
}

/**
 * Email Queue Configuration
 */
const EMAIL_QUEUE_NAME = 'email-notifications';

const queueConfig = {
  connection: getConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 2000, // Start with 2 seconds
    },
    removeOnComplete: {
      age: 86400, // Keep completed jobs for 24 hours
      count: 1000, // Keep last 1000 completed jobs
    },
    removeOnFail: {
      age: 604800, // Keep failed jobs for 7 days
      count: 5000, // Keep last 5000 failed jobs
    },
  },
};

/**
 * Initialize email queue
 */
export const emailQueue = new Queue<EmailJobData, EmailJobResult>(
  EMAIL_QUEUE_NAME,
  queueConfig
);

/**
 * Queue events for monitoring
 */
export const emailQueueEvents = new QueueEvents(EMAIL_QUEUE_NAME, {
  connection: getConnection(),
});

/**
 * Process email job with provider fallback
 */
async function processEmailJob(job: Job<EmailJobData>): Promise<EmailJobResult> {
  const { to, subject, html, text, replyTo, cc, bcc, metadata } = job.data;
  const attemptNumber = job.attemptsMade + 1;
  const isFinalAttempt = attemptNumber >= 3;

  logger.info({
    event: 'email_job_processing',
    jobId: job.id,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    attemptNumber,
    isFinalAttempt,
    metadata,
  });

  // Use SendGrid as fallback on final attempt, otherwise use Resend
  const useFallback = isFinalAttempt && attemptNumber > 1;
  const provider = useFallback ? 'sendgrid' : 'resend';

  try {
    let success: boolean;

    if (provider === 'resend') {
      logger.info({
        event: 'email_sending_via_resend',
        jobId: job.id,
        attemptNumber,
      });

      success = await sendViaResend({
        to,
        subject,
        html,
        text,
        replyTo,
        cc,
        bcc,
      });
    } else {
      logger.info({
        event: 'email_sending_via_sendgrid_fallback',
        jobId: job.id,
        attemptNumber,
      });

      const result = await sendViaSendGrid({
        to,
        subject,
        html,
        text,
        replyTo,
        cc,
        bcc,
      });

      success = result.success;
    }

    if (success) {
      const result: EmailJobResult = {
        success: true,
        provider,
        messageId: `${provider}-${job.id}-${Date.now()}`,
        timestamp: new Date(),
      };

      logger.info({
        event: 'email_sent_successfully',
        jobId: job.id,
        provider,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        attemptNumber,
        metadata,
      });

      return result;
    } else {
      throw new Error(`${provider} returned false (email not sent)`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error({
      event: 'email_send_error',
      jobId: job.id,
      provider,
      error: errorMessage,
      attemptNumber,
      isFinalAttempt,
      willRetry: !isFinalAttempt,
      metadata,
    });

    // If this was Resend and not the final attempt, throw to trigger retry
    // If this was SendGrid (final attempt), throw to mark as failed
    throw new Error(`Failed to send email via ${provider}: ${errorMessage}`);
  }
}

/**
 * Initialize email queue worker
 */
export function startEmailWorker(): Worker<EmailJobData, EmailJobResult> {
  const worker = new Worker<EmailJobData, EmailJobResult>(
    EMAIL_QUEUE_NAME,
    processEmailJob,
    {
      connection: getConnection(),
      concurrency: 5, // Process up to 5 emails concurrently
      limiter: {
        max: 100, // Max 100 jobs
        duration: 60000, // per minute (rate limiting)
      },
    }
  );

  // Worker event handlers
  worker.on('completed', (job) => {
    logger.info({
      event: 'email_job_completed',
      jobId: job.id,
      attempts: job.attemptsMade,
    });
  });

  worker.on('failed', (job, error) => {
    logger.error({
      event: 'email_job_failed',
      jobId: job?.id,
      error: error.message,
      attempts: job?.attemptsMade,
    });
  });

  worker.on('error', (error) => {
    logger.error({
      event: 'email_worker_error',
      error: error.message,
    });
  });

  logger.info({
    event: 'email_worker_started',
    queueName: EMAIL_QUEUE_NAME,
    concurrency: 5,
  });

  return worker;
}

/**
 * Queue an email for delivery
 *
 * @param emailData - Email content and recipients
 * @returns Job ID for tracking
 *
 * @example
 * ```typescript
 * const jobId = await queueEmail({
 *   to: 'patient@example.com',
 *   subject: 'Appointment Reminder',
 *   html: '<p>Your appointment is tomorrow</p>',
 *   priority: 'high',
 *   metadata: { appointmentId: '123', type: 'reminder' }
 * });
 * ```
 */
export async function queueEmail(emailData: EmailJobData): Promise<string> {
  try {
    // Determine job priority
    const priority = emailData.priority || 'normal';
    const priorityValue = {
      high: 1,
      normal: 5,
      low: 10,
    }[priority];

    // Add job to queue
    const job = await emailQueue.add(
      'send-email',
      emailData,
      {
        priority: priorityValue,
        removeOnComplete: true,
        removeOnFail: false, // Keep failed jobs for debugging
      }
    );

    logger.info({
      event: 'email_queued',
      jobId: job.id,
      to: Array.isArray(emailData.to) ? emailData.to.join(', ') : emailData.to,
      subject: emailData.subject,
      priority,
      metadata: emailData.metadata,
    });

    return job.id!;
  } catch (error) {
    logger.error({
      event: 'email_queue_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      emailData: {
        to: emailData.to,
        subject: emailData.subject,
      },
    });
    throw error;
  }
}

/**
 * Get email job status
 */
export async function getEmailJobStatus(jobId: string) {
  const job = await emailQueue.getJob(jobId);

  if (!job) {
    return null;
  }

  const state = await job.getState();
  const progress = job.progress;
  const failedReason = job.failedReason;

  return {
    id: job.id,
    state,
    progress,
    failedReason,
    attemptsMade: job.attemptsMade,
    data: job.data,
    finishedOn: job.finishedOn,
    processedOn: job.processedOn,
  };
}

/**
 * Get queue metrics for monitoring
 */
export async function getEmailQueueMetrics() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    emailQueue.getWaitingCount(),
    emailQueue.getActiveCount(),
    emailQueue.getCompletedCount(),
    emailQueue.getFailedCount(),
    emailQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

/**
 * Retry a failed email job
 */
export async function retryFailedEmail(jobId: string): Promise<boolean> {
  try {
    const job = await emailQueue.getJob(jobId);

    if (!job) {
      logger.warn({
        event: 'retry_email_job_not_found',
        jobId,
      });
      return false;
    }

    await job.retry();

    logger.info({
      event: 'email_job_retried',
      jobId,
    });

    return true;
  } catch (error) {
    logger.error({
      event: 'retry_email_error',
      jobId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Clear completed jobs (for maintenance)
 */
export async function clearCompletedJobs(): Promise<number> {
  const jobs = await emailQueue.clean(86400000, 1000, 'completed'); // 24 hours, limit 1000

  logger.info({
    event: 'email_queue_cleaned',
    jobsRemoved: jobs.length,
    type: 'completed',
  });

  return jobs.length;
}

/**
 * Graceful shutdown
 */
export async function shutdownEmailQueue(): Promise<void> {
  logger.info({
    event: 'email_queue_shutdown_started',
  });

  await emailQueue.close();

  if (redisConnection) {
    await redisConnection.quit();
  }

  logger.info({
    event: 'email_queue_shutdown_complete',
  });
}

// Handle process termination
if (typeof process !== 'undefined') {
  process.on('SIGTERM', async () => {
    await shutdownEmailQueue();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    await shutdownEmailQueue();
    process.exit(0);
  });
}
