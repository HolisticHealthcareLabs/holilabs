/**
 * BullMQ Configuration
 *
 * Centralized configuration for BullMQ queues and Redis connection
 */

import { ConnectionOptions, QueueOptions, WorkerOptions } from 'bullmq';

// Redis connection configuration
export const redisConnection: ConnectionOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  // SOC 2 Control CC6.7: TLS for data in transit
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  // Connection retry strategy
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  // Reconnection settings
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
};

// Default queue options
export const defaultQueueOptions: QueueOptions = {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      age: 7 * 24 * 3600, // Keep completed jobs for 7 days
      count: 1000,
    },
    removeOnFail: {
      age: 30 * 24 * 3600, // Keep failed jobs for 30 days
      count: 5000,
    },
  },
};

// Default worker options
export const defaultWorkerOptions: WorkerOptions = {
  connection: redisConnection,
  concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '5', 10),
  limiter: {
    max: 10, // Max 10 jobs per duration
    duration: 1000, // Per second
  },
};

// Queue names enum
export enum QueueName {
  CORRECTION_AGGREGATION = 'correction-aggregation',
  AUDIT_ARCHIVAL = 'audit-archival',
  PATIENT_REMINDERS = 'patient-reminders',
  LAB_RESULTS = 'lab-results',
  PRESCRIPTION_REFILLS = 'prescription-refills',
  EMAIL_NOTIFICATIONS = 'email-notifications',
  SMS_NOTIFICATIONS = 'sms-notifications',
  WHATSAPP_MESSAGES = 'whatsapp-messages',
}
