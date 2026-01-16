/**
 * BullMQ Queue Instances
 *
 * Creates and exports singleton queue instances for background job processing
 */

import { Queue } from 'bullmq';
import { defaultQueueOptions, cdssQueueOptions, QueueName } from './config';
import logger from '@/lib/logger';

// Singleton queue instances
let correctionAggregationQueue: Queue | null = null;
let auditArchivalQueue: Queue | null = null;
let patientDossierQueue: Queue | null = null;
let patientRemindersQueue: Queue | null = null;
let labResultsQueue: Queue | null = null;
let prescriptionRefillsQueue: Queue | null = null;
let emailNotificationsQueue: Queue | null = null;
let smsNotificationsQueue: Queue | null = null;
let whatsappMessagesQueue: Queue | null = null;

// CDSS V3 - Async Processing Queues
let documentParseQueue: Queue | null = null;
let summaryGenerationQueue: Queue | null = null;
let fhirSyncQueue: Queue | null = null;

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
 * Get or create the audit archival queue
 */
export function getAuditArchivalQueue(): Queue {
  if (!auditArchivalQueue) {
    auditArchivalQueue = new Queue(
      QueueName.AUDIT_ARCHIVAL,
      defaultQueueOptions
    );
    logger.info({
      event: 'queue_initialized',
      queueName: QueueName.AUDIT_ARCHIVAL,
    });
  }
  return auditArchivalQueue;
}

/**
 * Get or create the patient dossier queue
 * (de-identified longitudinal cache used by CDS)
 */
export function getPatientDossierQueue(): Queue {
  if (!patientDossierQueue) {
    patientDossierQueue = new Queue(QueueName.PATIENT_DOSSIER, defaultQueueOptions);
    logger.info({
      event: 'queue_initialized',
      queueName: QueueName.PATIENT_DOSSIER,
    });
  }
  return patientDossierQueue;
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

// ============================================================================
// CDSS V3 - Async Processing Queues
// ============================================================================

/**
 * Get or create the document parsing queue
 * Used for long-running PDF/document parsing jobs (30-120s)
 */
export function getDocumentParseQueue(): Queue {
  if (!documentParseQueue) {
    documentParseQueue = new Queue(QueueName.DOCUMENT_PARSE, cdssQueueOptions);
    logger.info({
      event: 'queue_initialized',
      queueName: QueueName.DOCUMENT_PARSE,
    });
  }
  return documentParseQueue;
}

/**
 * Get or create the summary generation queue
 * Used for LLM-based meeting summary draft generation (5-15s)
 */
export function getSummaryGenerationQueue(): Queue {
  if (!summaryGenerationQueue) {
    summaryGenerationQueue = new Queue(
      QueueName.SUMMARY_GENERATION,
      cdssQueueOptions
    );
    logger.info({
      event: 'queue_initialized',
      queueName: QueueName.SUMMARY_GENERATION,
    });
  }
  return summaryGenerationQueue;
}

/**
 * Get or create the FHIR sync queue
 * Used for bi-directional FHIR/Medplum synchronization
 */
export function getFhirSyncQueue(): Queue {
  if (!fhirSyncQueue) {
    fhirSyncQueue = new Queue(QueueName.FHIR_SYNC, cdssQueueOptions);
    logger.info({
      event: 'queue_initialized',
      queueName: QueueName.FHIR_SYNC,
    });
  }
  return fhirSyncQueue;
}

/**
 * Close all queue connections (for graceful shutdown)
 */
export async function closeAllQueues(): Promise<void> {
  const queues = [
    correctionAggregationQueue,
    auditArchivalQueue,
    patientDossierQueue,
    patientRemindersQueue,
    labResultsQueue,
    prescriptionRefillsQueue,
    emailNotificationsQueue,
    smsNotificationsQueue,
    whatsappMessagesQueue,
    // CDSS V3 queues
    documentParseQueue,
    summaryGenerationQueue,
    fhirSyncQueue,
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
