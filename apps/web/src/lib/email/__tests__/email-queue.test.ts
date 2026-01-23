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
 *
 * REQUIRES: REDIS_URL environment variable
 * Skip in unit test mode - run in CI with proper environment
 */

// Skip integration tests if Redis is not available
const isIntegrationTest = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
const describeIntegration = isIntegrationTest ? describe : describe.skip;

// Only import modules if running integration tests to avoid initialization errors
let Queue: any, Worker: any, Job: any, QueueEvents: any, Redis: any;
let queueEmail: any, startEmailWorker: any, getEmailJobStatus: any;
let getEmailQueueMetrics: any, retryFailedEmail: any, clearCompletedJobs: any;
let shutdownEmailQueue: any, emailQueue: any;
let resendModule: any, sendgridModule: any, logger: any;
type EmailJobData = any;

if (isIntegrationTest) {
  const bullmq = require('bullmq');
  Queue = bullmq.Queue;
  Worker = bullmq.Worker;
  Job = bullmq.Job;
  QueueEvents = bullmq.QueueEvents;
  Redis = require('ioredis').default;
  const emailQueueModule = require('../email-queue');
  queueEmail = emailQueueModule.queueEmail;
  startEmailWorker = emailQueueModule.startEmailWorker;
  getEmailJobStatus = emailQueueModule.getEmailJobStatus;
  getEmailQueueMetrics = emailQueueModule.getEmailQueueMetrics;
  retryFailedEmail = emailQueueModule.retryFailedEmail;
  clearCompletedJobs = emailQueueModule.clearCompletedJobs;
  shutdownEmailQueue = emailQueueModule.shutdownEmailQueue;
  emailQueue = emailQueueModule.emailQueue;
  resendModule = require('../resend');
  sendgridModule = require('../sendgrid');
  logger = require('@/lib/logger').default;
}

// Mock dependencies (only affects integration test environment)
if (isIntegrationTest) {
  jest.mock('bullmq');
  jest.mock('ioredis');
  jest.mock('../resend');
  jest.mock('../sendgrid');
  jest.mock('@/lib/logger');
}

describeIntegration('Email Queue System', () => {
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
    (Queue.prototype.add as jest.Mock) = jest.fn().mockResolvedValue({
      id: 'test-job-123',
    });

    (Queue.prototype.getJob as jest.Mock) = jest.fn();
    (Queue.prototype.getWaitingCount as jest.Mock) = jest.fn().mockResolvedValue(5);
    (Queue.prototype.getActiveCount as jest.Mock) = jest.fn().mockResolvedValue(2);
    (Queue.prototype.getCompletedCount as jest.Mock) = jest.fn().mockResolvedValue(100);
    (Queue.prototype.getFailedCount as jest.Mock) = jest.fn().mockResolvedValue(3);
    (Queue.prototype.getDelayedCount as jest.Mock) = jest.fn().mockResolvedValue(1);
    (Queue.prototype.clean as jest.Mock) = jest.fn().mockResolvedValue([]);
    (Queue.prototype.close as jest.Mock) = jest.fn().mockResolvedValue(undefined);

    (Worker.prototype.on as jest.Mock) = jest.fn().mockReturnThis();

    (Redis.prototype.quit as jest.Mock) = jest.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('queueEmail', () => {
    it('should queue email successfully with normal priority', async () => {
      const jobId = await queueEmail(mockEmailData);

      expect(jobId).toBe('test-job-123');
      expect(Queue.prototype.add).toHaveBeenCalledWith(
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

      expect(Queue.prototype.add).toHaveBeenCalledWith(
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

      expect(Queue.prototype.add).toHaveBeenCalledWith(
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

      expect(Queue.prototype.add).toHaveBeenCalledWith(
        'send-email',
        emailWithCcBcc,
        expect.any(Object)
      );
    });

    it('should handle queue error and log it', async () => {
      const error = new Error('Redis connection failed');
      (Queue.prototype.add as jest.Mock).mockRejectedValueOnce(error);

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

      expect(Queue.prototype.add).toHaveBeenCalledWith(
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
      const mockOn = jest.fn((event, handler) => {
        if (event === 'completed') {
          // Simulate job completion
          handler({ id: 'completed-job-1', attemptsMade: 1 });
        }
        return {} as any;
      });

      (Worker.prototype.on as jest.Mock) = mockOn;

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
      const mockOn = jest.fn((event, handler) => {
        if (event === 'failed') {
          // Simulate job failure
          handler(
            { id: 'failed-job-1', attemptsMade: 3 },
            new Error('All attempts failed')
          );
        }
        return {} as any;
      });

      (Worker.prototype.on as jest.Mock) = mockOn;

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
      const mockOn = jest.fn((event, handler) => {
        if (event === 'error') {
          // Simulate worker error
          handler(new Error('Worker connection lost'));
        }
        return {} as any;
      });

      (Worker.prototype.on as jest.Mock) = mockOn;

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
      (Queue.prototype.getJob as jest.Mock).mockResolvedValueOnce(mockJob);

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
      (Queue.prototype.getJob as jest.Mock).mockResolvedValueOnce(null);

      const status = await getEmailJobStatus('non-existent-job');

      expect(status).toBeNull();
    });

    it('should return failed job status with reason', async () => {
      const failedJob = {
        ...createMockJob('failed-job-1', mockEmailData, 3, 'failed'),
        failedReason: 'All providers unavailable',
      };
      (Queue.prototype.getJob as jest.Mock).mockResolvedValueOnce(failedJob);

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
      (Queue.prototype.getJob as jest.Mock).mockResolvedValueOnce(completedJob);

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
      expect(Queue.prototype.getWaitingCount).toHaveBeenCalled();
      expect(Queue.prototype.getActiveCount).toHaveBeenCalled();
      expect(Queue.prototype.getCompletedCount).toHaveBeenCalled();
      expect(Queue.prototype.getFailedCount).toHaveBeenCalled();
      expect(Queue.prototype.getDelayedCount).toHaveBeenCalled();
    });

    it('should handle zero counts', async () => {
      (Queue.prototype.getWaitingCount as jest.Mock).mockResolvedValueOnce(0);
      (Queue.prototype.getActiveCount as jest.Mock).mockResolvedValueOnce(0);
      (Queue.prototype.getCompletedCount as jest.Mock).mockResolvedValueOnce(0);
      (Queue.prototype.getFailedCount as jest.Mock).mockResolvedValueOnce(0);
      (Queue.prototype.getDelayedCount as jest.Mock).mockResolvedValueOnce(0);

      const metrics = await getEmailQueueMetrics();

      expect(metrics.total).toBe(0);
    });

    it('should calculate total correctly', async () => {
      (Queue.prototype.getWaitingCount as jest.Mock).mockResolvedValueOnce(10);
      (Queue.prototype.getActiveCount as jest.Mock).mockResolvedValueOnce(5);
      (Queue.prototype.getCompletedCount as jest.Mock).mockResolvedValueOnce(200);
      (Queue.prototype.getFailedCount as jest.Mock).mockResolvedValueOnce(15);
      (Queue.prototype.getDelayedCount as jest.Mock).mockResolvedValueOnce(3);

      const metrics = await getEmailQueueMetrics();

      expect(metrics.total).toBe(233); // 10 + 5 + 200 + 15 + 3
    });
  });

  describe('retryFailedEmail', () => {
    it('should retry failed email successfully', async () => {
      const mockJob = createMockJob('retry-job-1', mockEmailData, 3, 'failed');
      (Queue.prototype.getJob as jest.Mock).mockResolvedValueOnce(mockJob);

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
      (Queue.prototype.getJob as jest.Mock).mockResolvedValueOnce(null);

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
      (Queue.prototype.getJob as jest.Mock).mockResolvedValueOnce(mockJob);

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
      (Queue.prototype.clean as jest.Mock).mockResolvedValueOnce(removedJobs);

      const count = await clearCompletedJobs();

      expect(count).toBe(3);
      expect(Queue.prototype.clean).toHaveBeenCalledWith(
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
      (Queue.prototype.clean as jest.Mock).mockResolvedValueOnce([]);

      const count = await clearCompletedJobs();

      expect(count).toBe(0);
    });
  });

  describe('shutdownEmailQueue', () => {
    it('should shutdown queue and close Redis connection', async () => {
      await shutdownEmailQueue();

      expect(Queue.prototype.close).toHaveBeenCalled();
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

      expect(Queue.prototype.add).toHaveBeenCalledWith(
        'send-email',
        highPriorityEmail,
        expect.objectContaining({ priority: 1 })
      );
    });

    it('should map normal priority to value 5', async () => {
      const normalPriorityEmail = { ...mockEmailData, priority: 'normal' as const };
      await queueEmail(normalPriorityEmail);

      expect(Queue.prototype.add).toHaveBeenCalledWith(
        'send-email',
        normalPriorityEmail,
        expect.objectContaining({ priority: 5 })
      );
    });

    it('should map low priority to value 10', async () => {
      const lowPriorityEmail = { ...mockEmailData, priority: 'low' as const };
      await queueEmail(lowPriorityEmail);

      expect(Queue.prototype.add).toHaveBeenCalledWith(
        'send-email',
        lowPriorityEmail,
        expect.objectContaining({ priority: 10 })
      );
    });
  });

  describe('Job Configuration', () => {
    it('should configure completed jobs to be removed', async () => {
      await queueEmail(mockEmailData);

      expect(Queue.prototype.add).toHaveBeenCalledWith(
        'send-email',
        mockEmailData,
        expect.objectContaining({
          removeOnComplete: true,
        })
      );
    });

    it('should keep failed jobs for debugging', async () => {
      await queueEmail(mockEmailData);

      expect(Queue.prototype.add).toHaveBeenCalledWith(
        'send-email',
        mockEmailData,
        expect.objectContaining({
          removeOnFail: false,
        })
      );
    });
  });

  describe('Rate Limiting', () => {
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
      (Queue.prototype.add as jest.Mock).mockRejectedValueOnce('Unknown error');

      await expect(queueEmail(mockEmailData)).rejects.toBe('Unknown error');
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'email_queue_error',
          error: 'Unknown error',
        })
      );
    });

    it('should handle job without ID', async () => {
      (Queue.prototype.getJob as jest.Mock).mockResolvedValueOnce({
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
      (Queue.prototype.getJob as jest.Mock).mockResolvedValueOnce(mockJob);
      const status = await getEmailJobStatus(jobId);
      expect(status?.state).toBe('waiting');
    });

    it('should handle full lifecycle: queue → fail → retry → complete', async () => {
      // Queue email
      const jobId = await queueEmail(mockEmailData);

      // First check - failed
      const failedJob = createMockJob(jobId, mockEmailData, 3, 'failed');
      (Queue.prototype.getJob as jest.Mock).mockResolvedValueOnce(failedJob);
      const failedStatus = await getEmailJobStatus(jobId);
      expect(failedStatus?.state).toBe('failed');

      // Retry
      (Queue.prototype.getJob as jest.Mock).mockResolvedValueOnce(failedJob);
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
