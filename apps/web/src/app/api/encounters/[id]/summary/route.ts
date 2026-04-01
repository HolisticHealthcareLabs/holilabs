/**
 * GET /api/encounters/[id]/summary
 *
 * Returns encounter + linked prescriptions + alert count.
 * Used by Cortex sidecar and web dashboard.
 *
 * @compliance HIPAA Minimum Necessary, LGPD Art. 11
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute, verifyPatientAccess } from '@/lib/api/middleware';

export const dynamic = 'force-dynamic';

export const GET = createProtectedRoute(
  async (_request: NextRequest, context: any) => {
    const encounterId = context.params?.id;
    if (!encounterId) {
      return NextResponse.json({ error: 'Missing encounter ID' }, { status: 400 });
    }

    const encounter = await prisma.clinicalEncounter.findUnique({
      where: { id: encounterId },
      include: {
        prescriptions: {
          select: {
            id: true,
            medications: true,
            diagnosis: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        patient: {
          select: { id: true, firstName: true, lastName: true, mrn: true },
        },
        provider: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!encounter) {
      return NextResponse.json({ error: 'Encounter not found' }, { status: 404 });
    }

    const hasAccess = await verifyPatientAccess(context.user!.id, encounter.patientId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied: no clinical relationship with this patient' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      encounter: {
        id: encounter.id,
        status: encounter.status,
        chiefComplaint: encounter.chiefComplaint,
        scheduledAt: encounter.scheduledAt,
        startedAt: encounter.startedAt,
        endedAt: encounter.endedAt,
        patient: encounter.patient,
        provider: encounter.provider,
      },
      prescriptions: encounter.prescriptions,
      prescriptionCount: encounter.prescriptions.length,
    });
  },
  { roles: ['ADMIN', 'CLINICIAN', 'PHYSICIAN'], skipCsrf: true }
);
