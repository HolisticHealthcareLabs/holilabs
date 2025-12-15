/**
 * BullMQ Queue Instances
 *
 * Creates and exports singleton queue instances for background job processing
 */

import { Queue } from 'bullmq';
import { defaultQueueOptions, QueueName } from './config';
import logger from '@/lib/logger';

// Singleton queue instances
let correctionAggregationQueue: Queue | null = null;
let patientRemindersQueue: Queue | null = null;
let labResultsQueue: Queue | null = null;
let prescriptionRefillsQueue: Queue | null = null;
let emailNotificationsQueue: Queue | null = null;
let smsNotificationsQueue: Queue | null = null;
let whatsappMessagesQueue: Queue | null = null;

/**
 * Get or create the correction aggregation queue
 */
export function getCorrectionAggregationQueue(): Queue {
  if (!correctionAggregationQueue) {
    correctionAggregationQueue = new Queue(
      QueueName.CORRECTION_AGGREGATION,
      defaultQueueOptions
    );
    logger.info({
      event: 'queue_initialized',
      queueName: QueueName.CORRECTION_AGGREGATION,
    });
  }
  return correctionAggregationQueue;
}

/**
 * Get or create the patient reminders queue
 */
export function getPatientRemindersQueue(): Queue {
  if (!patientRemindersQueue) {
    patientRemindersQueue = new Queue(
      QueueName.PATIENT_REMINDERS,
      defaultQueueOptions
    );
    logger.info({
      event: 'queue_initialized',
      queueName: QueueName.PATIENT_REMINDERS,
    });
  }
  return patientRemindersQueue;
}

/**
 * Get or create the lab results queue
 */
export function getLabResultsQueue(): Queue {
  if (!labResultsQueue) {
    labResultsQueue = new Queue(QueueName.LAB_RESULTS, defaultQueueOptions);
    logger.info({
      event: 'queue_initialized',
      queueName: QueueName.LAB_RESULTS,
    });
  }
  return labResultsQueue;
}

/**
 * Get or create the prescription refills queue
 */
export function getPrescriptionRefillsQueue(): Queue {
  if (!prescriptionRefillsQueue) {
    prescriptionRefillsQueue = new Queue(
      QueueName.PRESCRIPTION_REFILLS,
      defaultQueueOptions
    );
    logger.info({
      event: 'queue_initialized',
      queueName: QueueName.PRESCRIPTION_REFILLS,
    });
  }
  return prescriptionRefillsQueue;
}

/**
 * Get or create the email notifications queue
 */
export function getEmailNotificationsQueue(): Queue {
  if (!emailNotificationsQueue) {
    emailNotificationsQueue = new Queue(
      QueueName.EMAIL_NOTIFICATIONS,
      defaultQueueOptions
    );
    logger.info({
      event: 'queue_initialized',
      queueName: QueueName.EMAIL_NOTIFICATIONS,
    });
  }
  return emailNotificationsQueue;
}

/**
 * Get or create the SMS notifications queue
 */
export function getSmsNotificationsQueue(): Queue {
  if (!smsNotificationsQueue) {
    smsNotificationsQueue = new Queue(
      QueueName.SMS_NOTIFICATIONS,
      defaultQueueOptions
    );
    logger.info({
      event: 'queue_initialized',
      queueName: QueueName.SMS_NOTIFICATIONS,
    });
  }
  return smsNotificationsQueue;
}

/**
 * Get or create the WhatsApp messages queue
 */
export function getWhatsappMessagesQueue(): Queue {
  if (!whatsappMessagesQueue) {
    whatsappMessagesQueue = new Queue(
      QueueName.WHATSAPP_MESSAGES,
      defaultQueueOptions
    );
    logger.info({
      event: 'queue_initialized',
      queueName: QueueName.WHATSAPP_MESSAGES,
    });
  }
  return whatsappMessagesQueue;
}

/**
 * Close all queue connections (for graceful shutdown)
 */
export async function closeAllQueues(): Promise<void> {
  const queues = [
    correctionAggregationQueue,
    patientRemindersQueue,
    labResultsQueue,
    prescriptionRefillsQueue,
    emailNotificationsQueue,
    smsNotificationsQueue,
    whatsappMessagesQueue,
  ];

  await Promise.all(
    queues
      .filter((q) => q !== null)
      .map((queue) =>
        queue!.close().catch((err) => {
          logger.error({
            event: 'queue_close_error',
            queueName: queue!.name,
            error: err.message,
          });
        })
      )
  );

  logger.info({ event: 'all_queues_closed' });
}
