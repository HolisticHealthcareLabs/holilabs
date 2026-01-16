import { getPatientDossierQueue } from '@/lib/queue/queues';
import logger from '@/lib/logger';
import type { DossierReason } from './dossier';

export async function enqueuePatientDossierJob(params: {
  patientId: string;
  clinicianId: string;
  reason: DossierReason;
}) {
  const { patientId, clinicianId, reason } = params;

  try {
    const queue = getPatientDossierQueue();
    const jobId = `patient-dossier:${patientId}`;
    await queue.add(
      'generate',
      { patientId, clinicianId, reason },
      {
        jobId,
        // Keep only the latest queued job per patient.
        removeOnComplete: true,
        removeOnFail: false,
      } as any
    );
    logger.info({ event: 'patient_dossier_job_enqueued', patientId, clinicianId, reason, jobId });
    return { enqueued: true as const, jobId };
  } catch (e: any) {
    logger.warn({ event: 'patient_dossier_enqueue_failed', patientId, clinicianId, reason, error: e?.message });
    return { enqueued: false as const, error: e?.message || 'enqueue failed' };
  }
}


