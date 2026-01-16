import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const GET = createProtectedRoute(
  async (_req: NextRequest, context: any) => {
    const patientId = context.params?.id as string | undefined;
    if (!patientId) return NextResponse.json({ error: 'Patient ID required' }, { status: 400 });

    // Only assigned clinician can read dossier.
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, assignedClinicianId: context.user.id },
      select: { id: true },
    });
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found or access denied' }, { status: 404 });
    }

    const dossier = await (prisma as any).patientDossier.findUnique({
      where: { patientId },
      select: {
        id: true,
        status: true,
        version: true,
        deidentifiedSummary: true,
        structured: true,
        dataHash: true,
        lastComputedAt: true,
        lastSourceEventAt: true,
        lastError: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, data: dossier || null }, { status: 200 });
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
    skipCsrf: true,
    audit: { action: 'READ', resource: 'PatientDossier' },
  }
);


