import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { enqueuePatientDossierJob } from '@/lib/patients/dossier-queue';
import { generatePatientDossier } from '@/lib/patients/dossier';

export const dynamic = 'force-dynamic';

const DOSSIER_TTL_MINUTES = Number(process.env.DOSSIER_TTL_MINUTES || 60);

export const POST = createProtectedRoute(
  async (_req: NextRequest, context: any) => {
    const patientId = context.params?.id as string | undefined;
    if (!patientId) return NextResponse.json({ error: 'Patient ID required' }, { status: 400 });

    // Only assigned clinician can generate dossier.
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, assignedClinicianId: context.user.id },
      select: { id: true },
    });
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found or access denied' }, { status: 404 });
    }

    const existing = await (prisma as any).patientDossier.findUnique({
      where: { patientId },
      select: { id: true, status: true, lastComputedAt: true },
    });

    const isFresh =
      existing?.status === 'READY' &&
      existing?.lastComputedAt &&
      Date.now() - new Date(existing.lastComputedAt).getTime() < DOSSIER_TTL_MINUTES * 60 * 1000;

    if (isFresh) {
      return NextResponse.json(
        { success: true, data: { status: 'READY', dossierId: existing.id, fresh: true } },
        { status: 200 }
      );
    }

    // Enqueue async job (silent background).
    const enq = await enqueuePatientDossierJob({
      patientId,
      clinicianId: context.user.id,
      reason: 'CO_PILOT_OPEN',
    });

    // If queue isn't available (local dev without Redis/workers), fall back to inline generation.
    if (!enq.enqueued) {
      const res = await generatePatientDossier({
        patientId,
        clinicianId: context.user.id,
        reason: 'CO_PILOT_OPEN',
      });
      return NextResponse.json(
        { success: true, data: { status: res.status, dossierId: res.dossierId, fresh: false, mode: 'inline' } },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { success: true, data: { status: 'PENDING', dossierId: existing?.id || null, fresh: false, mode: 'queued' } },
      { status: 202 }
    );
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
    skipCsrf: true,
    audit: { action: 'UPDATE', resource: 'PatientDossierEnsure' },
  }
);


