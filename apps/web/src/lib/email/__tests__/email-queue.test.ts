/**
 * Email Queue Tests
 *
 * Comprehensive tests for production email queue system with:
 * - Retry logic (3 attempts, exponential backoff)
 * - Provider fallback (Resend → SendGrid)
 * - Job status tracking
 * - Queue metrics
 * - Error handling
 *
 * @group unit
 */

import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import {
  queueEmail,
  startEmailWorker,
  getEmailJobStatus,
  getEmailQueueMetrics,
  retryFailedEmail,
  clearCompletedJobs,
  shutdownEmailQueue,
  emailQueue,
  type EmailJobData,
} from '../email-queue';
import * as resendModule from '../resend';
import * as sendgridModule from '../sendgrid';
import logger from '@/lib/logger';

// Define mock functions inside jest.mock factory to avoid hoisting issues
// These are defined at module level but accessed via require after mocking
jest.mock('bullmq', () => {
  // Define all mocks inside the factory - this runs before any other code
  const mockAdd = jest.fn();
  const mockGetJob = jest.fn();
  const mockGetWaitingCount = jest.fn();
  const mockGetActiveCount = jest.fn();
  const mockGetCompletedCount = jest.fn();
  const mockGetFailedCount = jest.fn();
  const mockGetDelayedCount = jest.fn();
  const mockClean = jest.fn();
  const mockClose = jest.fn();
  const mockWorkerOn = jest.fn().mockReturnThis();
  const mockWorkerClose = jest.fn().mockResolvedValue(undefined);

  return {
    Queue: jest.fn().mockImplementation(() => ({
      add: mockAdd,
      getJob: mockGetJob,
      getWaitingCount: mockGetWaitingCount,
      getActiveCount: mockGetActiveCount,
      getCompletedCount: mockGetCompletedCount,
      getFailedCount: mockGetFailedCount,
      getDelayedCount: mockGetDelayedCount,
      clean: mockClean,
      close: mockClose,
    })),
    Worker: jest.fn().mockImplementation(() => ({
      on: mockWorkerOn,
      close: mockWorkerClose,
    })),
    QueueEvents: jest.fn().mockImplementation(() => ({
      on: jest.fn().mockReturnThis(),
      close: jest.fn().mockResolvedValue(undefined),
    })),
    Job: jest.fn(),
    // Export mocks for test access
    __mocks: {
      mockAdd,
      mockGetJob,
      mockGetWaitingCount,
      mockGetActiveCount,
      mockGetCompletedCount,
      mockGetFailedCount,
      mockGetDelayedCount,
      mockClean,
      mockClose,
      mockWorkerOn,
      mockWorkerClose,
    },
  };
});

// Import mocks after jest.mock (require is not hoisted)
const bullmqMocks = require('bullmq').__mocks;
const mockAdd = bullmqMocks.mockAdd;
const mockGetJob = bullmqMocks.mockGetJob;
const mockGetWaitingCount = bullmqMocks.mockGetWaitingCount;
const mockGetActiveCount = bullmqMocks.mockGetActiveCount;
const mockGetCompletedCount = bullmqMocks.mockGetCompletedCount;
const mockGetFailedCount = bullmqMocks.mockGetFailedCount;
const mockGetDelayedCount = bullmqMocks.mockGetDelayedCount;
const mockClean = bullmqMocks.mockClean;
const mockClose = bullmqMocks.mockClose;
const mockWorkerOn = bullmqMocks.mockWorkerOn;
const mockWorkerClose = bullmqMocks.mockWorkerClose;
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    quit: jest.fn().mockResolvedValue(undefined),
    on: jest.fn().mockReturnThis(),
  }));
});
jest.mock('../resend');
jest.mock('../sendgrid');
jest.mock('@/lib/logger');

describe('Email Queue System', () => {
  // Test data
  const mockEmailData: EmailJobData = {
    to: 'patient@test.com',
    subject: 'Test Email',
    html: '<p>Test content</p>',
    text: 'Test content',
    priority: 'normal',
    metadata: { type: 'test' },
  };

  // Mock job
  const createMockJob = (
    id: string,
    data: EmailJobData,
    attemptsMade: number = 0,
    state: string = 'waiting'
  ): Partial<Job<EmailJobData>> => ({
    id,
    data,
    attemptsMade,
    getState: jest.fn().mockResolvedValue(state),
    progress: 0,
    failedReason: null,
    finishedOn: null,
    processedOn: null,
    retry: jest.fn().mockResolvedValue(true),
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockAdd.mockResolvedValue({ id: 'test-job-123' });
    mockGetJob.mockResolvedValue(undefined);
    mockGetWaitingCount.mockResolvedValue(5);
    mockGetActiveCount.mockResolvedValue(2);
    mockGetCompletedCount.mockResolvedValue(100);
    mockGetFailedCount.mockResolvedValue(3);
    mockGetDelayedCount.mockResolvedValue(1);
    mockClean.mockResolvedValue([]);
    mockClose.mockResolvedValue(undefined);
    mockWorkerOn.mockReturnThis();
    mockWorkerClose.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('queueEmail', () => {
    it('should queue email successfully with normal priority', async () => {
      const jobId = await queueEmail(mockEmailData);

      expect(jobId).toBe('test-job-123');
      expect(mockAdd).toHaveBeenCalledWith(
        'send-email',
        mockEmailData,
        {
          priority: 5, // normal priority
          removeOnComplete: true,
          removeOnFail: false,
        }
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'email_queued',
          jobId: 'test-job-123',
          to: 'patient@test.com',
          subject: 'Test Email',
          priority: 'normal',
        })
      );
    });

    it('should queue email with high priority', async () => {
      const highPriorityEmail = { ...mockEmailData, priority: 'high' as const };
      await queueEmail(highPriorityEmail);

      expect(mockAdd).toHaveBeenCalledWith(
        'send-email',
        highPriorityEmail,
        expect.objectContaining({
          priority: 1, // high priority
        })
      );
    });

    it('should queue email with low priority', async () => {
      const lowPriorityEmail = { ...mockEmailData, priority: 'low' as const };
      await queueEmail(lowPriorityEmail);

      expect(mockAdd).toHaveBeenCalledWith(
        'send-email',
        lowPriorityEmail,
        expect.objectContaining({
          priority: 10, // low priority
        })
      );
    });

    it('should queue email with multiple recipients', async () => {
      const multiRecipientEmail: EmailJobData = {
        ...mockEmailData,
        to: ['patient1@test.com', 'patient2@test.com'],
      };

      const jobId = await queueEmail(multiRecipientEmail);

      expect(jobId).toBe('test-job-123');
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'patient1@test.com, patient2@test.com',
        })
      );
    });

    it('should queue email with CC and BCC', async () => {
      const emailWithCcBcc: EmailJobData = {
        ...mockEmailData,
        cc: ['cc@test.com'],
        bcc: ['bcc@test.com'],
      };

      await queueEmail(emailWithCcBcc);

      expect(mockAdd).toHaveBeenCalledWith(
        'send-email',
        emailWithCcBcc,
        expect.any(Object)
      );
    });

    it('should handle queue error and log it', async () => {
      const error = new Error('Redis connection failed');
      (mockAdd as jest.Mock).mockRejectedValueOnce(error);

      await expect(queueEmail(mockEmailData)).rejects.toThrow('Redis connection failed');
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'email_queue_error',
          error: 'Redis connection failed',
        })
      );
    });

    it('should default to normal priority if not specified', async () => {
      const emailWithoutPriority = { ...mockEmailData, priority: undefined };
      await queueEmail(emailWithoutPriority);

      expect(mockAdd).toHaveBeenCalledWith(
        'send-email',
        emailWithoutPriority,
        expect.objectContaining({
          priority: 5, // default normal priority
        })
      );
    });
  });

  describe('Email Job Processing - Retry Logic', () => {
    let processEmailJobFn: (job: Job<EmailJobData>) => Promise<any>;

    beforeEach(() => {
      // Capture the processor function passed to Worker constructor
      (Worker as jest.MockedClass<typeof Worker>).mockImplementation((queueName, processor, options) => {
        processEmailJobFn = processor as any;
        return {
          on: jest.fn().mockReturnThis(),
          close: jest.fn(),
        } as any;
      });
    });

    it('should use Resend on first attempt', async () => {
      (resendModule.sendEmail as jest.Mock).mockResolvedValueOnce(true);

      startEmailWorker();

      const mockJob = {
        id: 'job-1',
        data: mockEmailData,
        attemptsMade: 0, // First attempt
      } as Job<EmailJobData>;

      const result = await processEmailJobFn(mockJob);

      expect(resendModule.sendEmail).toHaveBeenCalledWith({
        to: mockEmailData.to,
        subject: mockEmailData.subject,
        html: mockEmailData.html,
        text: mockEmailData.text,
        replyTo: undefined,
        cc: undefined,
        bcc: undefined,
      });
      expect(sendgridModule.sendEmail).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.provider).toBe('resend');
    });

    it('should use Resend on second attempt', async () => {
      (resendModule.sendEmail as jest.Mock).mockResolvedValueOnce(true);

      startEmailWorker();

      const mockJob = {
        id: 'job-2',
        data: mockEmailData,
        attemptsMade: 1, // Second attempt
      } as Job<EmailJobData>;

      const result = await processEmailJobFn(mockJob);

      expect(resendModule.sendEmail).toHaveBeenCalled();
      expect(sendgridModule.sendEmail).not.toHaveBeenCalled();
      expect(result.provider).toBe('resend');
    });

    it('should fallback to SendGrid on final attempt (attempt 3)', async () => {
      (sendgridModule.sendEmail as jest.Mock).mockResolvedValueOnce({
        success: true,
        messageId: 'sendgrid-msg-123',
      });

      startEmailWorker();

      const mockJob = {
        id: 'job-3',
        data: mockEmailData,
        attemptsMade: 2, // Third attempt (final)
      } as Job<EmailJobData>;

      const result = await processEmailJobFn(mockJob);

      expect(resendModule.sendEmail).not.toHaveBeenCalled();
      expect(sendgridModule.sendEmail).toHaveBeenCalledWith({
        to: mockEmailData.to,
        subject: mockEmailData.subject,
        html: mockEmailData.html,
        text: mockEmailData.text,
        replyTo: undefined,
        cc: undefined,
        bcc: undefined,
      });
      expect(result.success).toBe(true);
      expect(result.provider).toBe('sendgrid');
    });

    it('should throw error when Resend fails on first attempt (triggers retry)', async () => {
      (resendModule.sendEmail as jest.Mock).mockRejectedValueOnce(new Error('Resend API error'));

      startEmailWorker();

      const mockJob = {
        id: 'job-4',
        data: mockEmailData,
        attemptsMade: 0,
      } as Job<EmailJobData>;

      await expect(processEmailJobFn(mockJob)).rejects.toThrow('Failed to send email via resend');
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'email_send_error',
          provider: 'resend',
          attemptNumber: 1,
          isFinalAttempt: false,
          willRetry: true,
        })
      );
    });

    it('should throw error when SendGrid fails on final attempt', async () => {
      (sendgridModule.sendEmail as jest.Mock).mockRejectedValueOnce(new Error('SendGrid API error'));

      startEmailWorker();

      const mockJob = {
        id: 'job-5',
        data: mockEmailData,
        attemptsMade: 2, // Final attempt
      } as Job<EmailJobData>;

      await expect(processEmailJobFn(mockJob)).rejects.toThrow('Failed to send email via sendgrid');
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'email_send_error',
          provider: 'sendgrid',
          attemptNumber: 3,
          isFinalAttempt: true,
          willRetry: false,
        })
      );
    });

    it('should log successful email delivery', async () => {
      (resendModule.sendEmail as jest.Mock).mockResolvedValueOnce(true);

      startEmailWorker();

      const mockJob = {
        id: 'job-6',
        data: mockEmailData,
        attemptsMade: 0,
      } as Job<EmailJobData>;

      await processEmailJobFn(mockJob);

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'email_sent_successfully',
          jobId: 'job-6',
          provider: 'resend',
          to: 'patient@test.com',
          subject: 'Test Email',
        })
      );
    });

    it('should include metadata in logs', async () => {
      (resendModule.sendEmail as jest.Mock).mockResolvedValueOnce(true);

      startEmailWorker();

      const emailWithMetadata: EmailJobData = {
        ...mockEmailData,
        metadata: { appointmentId: 'apt-123', type: 'reminder' },
      };

      const mockJob = {
        id: 'job-7',
        data: emailWithMetadata,
        attemptsMade: 0,
      } as Job<EmailJobData>;

      await processEmailJobFn(mockJob);

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'email_job_processing',
          metadata: { appointmentId: 'apt-123', type: 'reminder' },
        })
      );
    });

    it('should handle provider returning false', async () => {
      (resendModule.sendEmail as jest.Mock).mockResolvedValueOnce(false);

      startEmailWorker();

      const mockJob = {
        id: 'job-8',
        data: mockEmailData,
        attemptsMade: 0,
      } as Job<EmailJobData>;

      await expect(processEmailJobFn(mockJob)).rejects.toThrow('resend returned false');
    });
  });

  describe('Worker Initialization', () => {
    beforeEach(() => {
      // Restore Worker mock to use mockWorkerOn (may have been overridden by previous tests)
      (Worker as jest.MockedClass<typeof Worker>).mockImplementation(() => ({
        on: mockWorkerOn,
        close: mockWorkerClose,
      }) as any);
    });

    it('should start worker with correct configuration', () => {
      const worker = startEmailWorker();

      expect(Worker).toHaveBeenCalledWith(
        'email-notifications',
        expect.any(Function),
        expect.objectContaining({
          concurrency: 5,
          limiter: {
            max: 100,
            duration: 60000,
          },
        })
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'email_worker_started',
          queueName: 'email-notifications',
          concurrency: 5,
        })
      );
    });

    it('should setup worker event handlers', () => {
      const worker = startEmailWorker();

      expect(worker.on).toHaveBeenCalledWith('completed', expect.any(Function));
      expect(worker.on).toHaveBeenCalledWith('failed', expect.any(Function));
      expect(worker.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should log when job completes', () => {
      // Set up mockWorkerOn to invoke the 'completed' handler
      mockWorkerOn.mockImplementation((event: string, handler: (...args: any[]) => void) => {
        if (event === 'completed') {
          // Simulate job completion
          handler({ id: 'completed-job-1', attemptsMade: 1 });
        }
        return { on: mockWorkerOn };
      });

      startEmailWorker();

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'email_job_completed',
          jobId: 'completed-job-1',
          attempts: 1,
        })
      );
    });

    it('should log when job fails', () => {
      // Set up mockWorkerOn to invoke the 'failed' handler
      mockWorkerOn.mockImplementation((event: string, handler: (...args: any[]) => void) => {
        if (event === 'failed') {
          // Simulate job failure
          handler(
            { id: 'failed-job-1', attemptsMade: 3 },
            new Error('All attempts failed')
          );
        }
        return { on: mockWorkerOn };
      });

      startEmailWorker();

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'email_job_failed',
          jobId: 'failed-job-1',
          error: 'All attempts failed',
          attempts: 3,
        })
      );
    });

    it('should log worker errors', () => {
      // Set up mockWorkerOn to invoke the 'error' handler
      mockWorkerOn.mockImplementation((event: string, handler: (...args: any[]) => void) => {
        if (event === 'error') {
          // Simulate worker error
          handler(new Error('Worker connection lost'));
        }
        return { on: mockWorkerOn };
      });

      startEmailWorker();

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'email_worker_error',
          error: 'Worker connection lost',
        })
      );
    });
  });

  describe('getEmailJobStatus', () => {
    it('should return job status for existing job', async () => {
      const mockJob = createMockJob('status-job-1', mockEmailData, 1, 'active');
      mockGetJob.mockResolvedValueOnce(mockJob);

      const status = await getEmailJobStatus('status-job-1');

      expect(status).toEqual({
        id: 'status-job-1',
        state: 'active',
        progress: 0,
        failedReason: null,
        attemptsMade: 1,
        data: mockEmailData,
        finishedOn: null,
        processedOn: null,
      });
    });

    it('should return null for non-existent job', async () => {
      mockGetJob.mockResolvedValueOnce(null);

      const status = await getEmailJobStatus('non-existent-job');

      expect(status).toBeNull();
    });

    it('should return failed job status with reason', async () => {
      const failedJob = {
        ...createMockJob('failed-job-1', mockEmailData, 3, 'failed'),
        failedReason: 'All providers unavailable',
      };
      mockGetJob.mockResolvedValueOnce(failedJob);

      const status = await getEmailJobStatus('failed-job-1');

      expect(status?.state).toBe('failed');
      expect(status?.failedReason).toBe('All providers unavailable');
      expect(status?.attemptsMade).toBe(3);
    });

    it('should return completed job status', async () => {
      const completedJob = {
        ...createMockJob('completed-job-1', mockEmailData, 1, 'completed'),
        finishedOn: Date.now(),
        processedOn: Date.now() - 1000,
      };
      mockGetJob.mockResolvedValueOnce(completedJob);

      const status = await getEmailJobStatus('completed-job-1');

      expect(status?.state).toBe('completed');
      expect(status?.finishedOn).toBeTruthy();
      expect(status?.processedOn).toBeTruthy();
    });
  });

  describe('getEmailQueueMetrics', () => {
    it('should return queue metrics', async () => {
      const metrics = await getEmailQueueMetrics();

      expect(metrics).toEqual({
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 1,
        total: 111,
      });
      expect(mockGetWaitingCount).toHaveBeenCalled();
      expect(mockGetActiveCount).toHaveBeenCalled();
      expect(mockGetCompletedCount).toHaveBeenCalled();
      expect(mockGetFailedCount).toHaveBeenCalled();
      expect(mockGetDelayedCount).toHaveBeenCalled();
    });

    it('should handle zero counts', async () => {
      mockGetWaitingCount.mockResolvedValueOnce(0);
      mockGetActiveCount.mockResolvedValueOnce(0);
      mockGetCompletedCount.mockResolvedValueOnce(0);
      mockGetFailedCount.mockResolvedValueOnce(0);
      mockGetDelayedCount.mockResolvedValueOnce(0);

      const metrics = await getEmailQueueMetrics();

      expect(metrics.total).toBe(0);
    });

    it('should calculate total correctly', async () => {
      mockGetWaitingCount.mockResolvedValueOnce(10);
      mockGetActiveCount.mockResolvedValueOnce(5);
      mockGetCompletedCount.mockResolvedValueOnce(200);
      mockGetFailedCount.mockResolvedValueOnce(15);
      mockGetDelayedCount.mockResolvedValueOnce(3);

      const metrics = await getEmailQueueMetrics();

      expect(metrics.total).toBe(233); // 10 + 5 + 200 + 15 + 3
    });
  });

  describe('retryFailedEmail', () => {
    it('should retry failed email successfully', async () => {
      const mockJob = createMockJob('retry-job-1', mockEmailData, 3, 'failed');
      mockGetJob.mockResolvedValueOnce(mockJob);

      const result = await retryFailedEmail('retry-job-1');

      expect(result).toBe(true);
      expect(mockJob.retry).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'email_job_retried',
          jobId: 'retry-job-1',
        })
      );
    });

    it('should return false for non-existent job', async () => {
      mockGetJob.mockResolvedValueOnce(null);

      const result = await retryFailedEmail('non-existent-job');

      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'retry_email_job_not_found',
          jobId: 'non-existent-job',
        })
      );
    });

    it('should handle retry error', async () => {
      const mockJob = createMockJob('error-job-1', mockEmailData, 3, 'failed');
      (mockJob.retry as jest.Mock).mockRejectedValueOnce(new Error('Retry failed'));
      mockGetJob.mockResolvedValueOnce(mockJob);

      const result = await retryFailedEmail('error-job-1');

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'retry_email_error',
          jobId: 'error-job-1',
          error: 'Retry failed',
        })
      );
    });
  });

  describe('clearCompletedJobs', () => {
    it('should clear completed jobs', async () => {
      const removedJobs = ['job-1', 'job-2', 'job-3'];
      mockClean.mockResolvedValueOnce(removedJobs);

      const count = await clearCompletedJobs();

      expect(count).toBe(3);
      expect(mockClean).toHaveBeenCalledWith(
        86400000, // 24 hours in ms
        1000,
        'completed'
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'email_queue_cleaned',
          jobsRemoved: 3,
          type: 'completed',
        })
      );
    });

    it('should handle empty cleanup', async () => {
      mockClean.mockResolvedValueOnce([]);

      const count = await clearCompletedJobs();

      expect(count).toBe(0);
    });
  });

  describe('shutdownEmailQueue', () => {
    it('should shutdown queue and close Redis connection', async () => {
      await shutdownEmailQueue();

      expect(mockClose).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'email_queue_shutdown_started',
        })
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'email_queue_shutdown_complete',
        })
      );
    });
  });

  describe('Priority Handling', () => {
    it('should map high priority to value 1', async () => {
      const highPriorityEmail = { ...mockEmailData, priority: 'high' as const };
      await queueEmail(highPriorityEmail);

      expect(mockAdd).toHaveBeenCalledWith(
        'send-email',
        highPriorityEmail,
        expect.objectContaining({ priority: 1 })
      );
    });

    it('should map normal priority to value 5', async () => {
      const normalPriorityEmail = { ...mockEmailData, priority: 'normal' as const };
      await queueEmail(normalPriorityEmail);

      expect(mockAdd).toHaveBeenCalledWith(
        'send-email',
        normalPriorityEmail,
        expect.objectContaining({ priority: 5 })
      );
    });

    it('should map low priority to value 10', async () => {
      const lowPriorityEmail = { ...mockEmailData, priority: 'low' as const };
      await queueEmail(lowPriorityEmail);

      expect(mockAdd).toHaveBeenCalledWith(
        'send-email',
        lowPriorityEmail,
        expect.objectContaining({ priority: 10 })
      );
    });
  });

  describe('Job Configuration', () => {
    it('should configure completed jobs to be removed', async () => {
      await queueEmail(mockEmailData);

      expect(mockAdd).toHaveBeenCalledWith(
        'send-email',
        mockEmailData,
        expect.objectContaining({
          removeOnComplete: true,
        })
      );
    });

    it('should keep failed jobs for debugging', async () => {
      await queueEmail(mockEmailData);

      expect(mockAdd).toHaveBeenCalledWith(
        'send-email',
        mockEmailData,
        expect.objectContaining({
          removeOnFail: false,
        })
      );
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(() => {
      // Restore Worker mock to use mockWorkerOn
      (Worker as jest.MockedClass<typeof Worker>).mockImplementation(() => ({
        on: mockWorkerOn,
        close: mockWorkerClose,
      }) as any);
    });

    it('should configure worker with rate limiting', () => {
      startEmailWorker();

      expect(Worker).toHaveBeenCalledWith(
        'email-notifications',
        expect.any(Function),
        expect.objectContaining({
          limiter: {
            max: 100, // Max 100 jobs
            duration: 60000, // per minute
          },
        })
      );
    });
  });

  describe('Concurrency', () => {
    beforeEach(() => {
      // Restore Worker mock to use mockWorkerOn
      (Worker as jest.MockedClass<typeof Worker>).mockImplementation(() => ({
        on: mockWorkerOn,
        close: mockWorkerClose,
      }) as any);
    });

    it('should process up to 5 emails concurrently', () => {
      startEmailWorker();

      expect(Worker).toHaveBeenCalledWith(
        'email-notifications',
        expect.any(Function),
        expect.objectContaining({
          concurrency: 5,
        })
      );
    });
  });

  describe('Error Scenarios', () => {
    it('should handle unknown error types', async () => {
      (mockAdd as jest.Mock).mockRejectedValueOnce('Unknown error');

      await expect(queueEmail(mockEmailData)).rejects.toBe('Unknown error');
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'email_queue_error',
          error: 'Unknown error',
        })
      );
    });

    it('should handle job without ID', async () => {
      mockGetJob.mockResolvedValueOnce({
        ...createMockJob('', mockEmailData),
        id: undefined,
      });

      const result = await retryFailedEmail('');

      expect(result).toBe(true); // Should still succeed
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle full lifecycle: queue → process → complete', async () => {
      // Queue email
      const jobId = await queueEmail(mockEmailData);
      expect(jobId).toBe('test-job-123');

      // Get status
      const mockJob = createMockJob(jobId, mockEmailData, 0, 'waiting');
      mockGetJob.mockResolvedValueOnce(mockJob);
      const status = await getEmailJobStatus(jobId);
      expect(status?.state).toBe('waiting');
    });

    it('should handle full lifecycle: queue → fail → retry → complete', async () => {
      // Queue email
      const jobId = await queueEmail(mockEmailData);

      // First check - failed
      const failedJob = createMockJob(jobId, mockEmailData, 3, 'failed');
      mockGetJob.mockResolvedValueOnce(failedJob);
      const failedStatus = await getEmailJobStatus(jobId);
      expect(failedStatus?.state).toBe('failed');

      // Retry
      mockGetJob.mockResolvedValueOnce(failedJob);
      const retryResult = await retryFailedEmail(jobId);
      expect(retryResult).toBe(true);
    });

    it('should track metrics across multiple jobs', async () => {
      // Queue multiple emails
      await queueEmail({ ...mockEmailData, subject: 'Email 1' });
      await queueEmail({ ...mockEmailData, subject: 'Email 2' });
      await queueEmail({ ...mockEmailData, subject: 'Email 3' });

      // Get metrics
      const metrics = await getEmailQueueMetrics();
      expect(metrics.total).toBeGreaterThan(0);
    });
  });
});
