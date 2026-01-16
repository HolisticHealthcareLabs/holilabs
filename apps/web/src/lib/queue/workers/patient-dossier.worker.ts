/**
 * Patient Dossier Worker
 *
 * Builds a de-identified longitudinal dossier for a patient.
 */

import { Worker, Job } from 'bullmq';
import { defaultWorkerOptions, QueueName } from '../config';
import logger from '@/lib/logger';
import { generatePatientDossier, markPatientDossierFailed, DossierReason } from '@/lib/patients/dossier';

export type PatientDossierJobData = {
  patientId: string;
  clinicianId: string;
  reason: DossierReason;
};

export type PatientDossierJobResult = {
  ok: boolean;
  dossierId?: string;
  dataHash?: string;
};

export function startPatientDossierWorker(): Worker<PatientDossierJobData, PatientDossierJobResult> {
  const worker = new Worker<PatientDossierJobData, PatientDossierJobResult>(
    QueueName.PATIENT_DOSSIER,
    async (job: Job<PatientDossierJobData>) => {
      const { patientId, clinicianId, reason } = job.data;
      logger.info({
        event: 'patient_dossier_job_started',
        queue: QueueName.PATIENT_DOSSIER,
        jobId: job.id,
        patientId,
        clinicianId,
        reason,
      });

      try {
        const res = await generatePatientDossier({ patientId, clinicianId, reason });
        logger.info({
          event: 'patient_dossier_job_completed',
          queue: QueueName.PATIENT_DOSSIER,
          jobId: job.id,
          patientId,
          dossierId: res.dossierId,
        });
        return { ok: true, dossierId: res.dossierId, dataHash: res.dataHash };
      } catch (e: any) {
        const msg = e?.message || 'Patient dossier generation failed';
        logger.error({
          event: 'patient_dossier_job_failed',
          queue: QueueName.PATIENT_DOSSIER,
          jobId: job.id,
          patientId,
          error: msg,
        });
        await markPatientDossierFailed(patientId, msg);
        return { ok: false };
      }
    },
    {
      ...defaultWorkerOptions,
      // Dossier jobs can be moderately heavy; avoid overloading DB.
      concurrency: parseInt(process.env.DOSSIER_QUEUE_CONCURRENCY || '2', 10),
    }
  );

  worker.on('failed', (job, err) => {
    logger.error({
      event: 'patient_dossier_worker_job_failed',
      queue: QueueName.PATIENT_DOSSIER,
      jobId: job?.id,
      error: err.message,
    });
  });

  worker.on('completed', (job) => {
    logger.info({
      event: 'patient_dossier_worker_job_completed',
      queue: QueueName.PATIENT_DOSSIER,
      jobId: job.id,
    });
  });

  logger.info({
    event: 'patient_dossier_worker_started',
    queue: QueueName.PATIENT_DOSSIER,
  });

  return worker;
}


