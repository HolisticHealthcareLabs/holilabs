/**
 * GET /api/encounters?patientId=<id>
 *
 * Returns the list of ClinicalEncounters for a patient, ordered by
 * scheduledAt descending (most recent first).
 *
 * Used by: Patient detail page encounters timeline.
 *
 * @compliance HIPAA Minimum Necessary, LGPD Art. 11
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';

export const dynamic = 'force-dynamic';

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const patientId = request.nextUrl.searchParams.get('patientId');

    if (!patientId) {
      return NextResponse.json(
        { error: 'Missing required query param: patientId' },
        { status: 400 }
      );
    }

    // RBAC: verify caller is assigned clinician or admin
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { assignedClinicianId: true },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    if (
      patient.assignedClinicianId !== context.user.id &&
      context.user.role !== 'ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const encounters = await prisma.clinicalEncounter.findMany({
      where: { patientId },
      orderBy: { scheduledAt: 'desc' },
      take: 20,
      select: {
        id: true,
        status: true,
        chiefComplaint: true,
        scheduledAt: true,
        startedAt: true,
        endedAt: true,
      },
    });

    return NextResponse.json({ data: encounters });
  },
  { roles: ['ADMIN', 'CLINICIAN', 'PHYSICIAN'], skipCsrf: true, audit: { action: 'READ', resource: 'Encounter' } }
);
