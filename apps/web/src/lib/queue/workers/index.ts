/**
 * BullMQ Workers Index
 *
 * Starts all background job workers
 */

import { Worker } from 'bullmq';
import { startCorrectionAggregationWorker } from './correction-aggregation.worker';
import { startAuditArchivalWorker } from './audit-archival.worker';
import { startPatientDossierWorker } from './patient-dossier.worker';
import { startDocumentParserWorker } from './document-parser.worker';
import { startSummaryGenerationWorker } from './summary-generation.worker';
import { startFhirSyncWorker } from './fhir-sync.worker';
import logger from '@/lib/logger';

// Store active workers for graceful shutdown
const activeWorkers: Worker[] = [];

/**
 * Start all workers
 */
export function startAllWorkers(): void {
  logger.info({ event: 'starting_all_workers' });

  // Start correction aggregation worker
  const correctionWorker = startCorrectionAggregationWorker();
  activeWorkers.push(correctionWorker);

  // Start audit archival worker (HIPAA compliance)
  const auditArchivalWorker = startAuditArchivalWorker();
  activeWorkers.push(auditArchivalWorker);

  // Start patient dossier worker (de-identified longitudinal cache)
  const dossierWorker = startPatientDossierWorker();
  activeWorkers.push(dossierWorker);

  // CDSS V3: Start document parser worker (sandboxed parsing)
  const documentParserWorker = startDocumentParserWorker();
  activeWorkers.push(documentParserWorker);

  // CDSS V3: Start summary generation worker (LLM + Zod validation)
  const summaryGenWorker = startSummaryGenerationWorker();
  activeWorkers.push(summaryGenWorker);

  // CDSS V3: Start FHIR sync worker (bi-directional Medplum sync)
  const fhirSyncWorker = startFhirSyncWorker();
  activeWorkers.push(fhirSyncWorker);

  // TODO: Add more workers as needed
  // const patientRemindersWorker = startPatientRemindersWorker();
  // activeWorkers.push(patientRemindersWorker);

  logger.info({
    event: 'all_workers_started',
    count: activeWorkers.length,
  });
}

/**
 * Stop all workers gracefully
 */
export async function stopAllWorkers(): Promise<void> {
  logger.info({ event: 'stopping_all_workers' });

  await Promise.all(
    activeWorkers.map((worker) =>
      worker.close().catch((err) => {
        logger.error({
          event: 'worker_close_error',
          workerName: worker.name,
          error: err.message,
        });
      })
    )
  );

  logger.info({ event: 'all_workers_stopped' });
}

// Graceful shutdown on process termination
process.on('SIGTERM', async () => {
  logger.info({ event: 'sigterm_received' });
  await stopAllWorkers();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info({ event: 'sigint_received' });
  await stopAllWorkers();
  process.exit(0);
});
