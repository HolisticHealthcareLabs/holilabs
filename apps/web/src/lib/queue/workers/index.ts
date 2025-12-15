/**
 * BullMQ Workers Index
 *
 * Starts all background job workers
 */

import { Worker } from 'bullmq';
import { startCorrectionAggregationWorker } from './correction-aggregation.worker';
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
