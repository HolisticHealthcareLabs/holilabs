/**
 * LGPD Art. 18 — Habeas Data: Patient Data Export
 *
 * GET /api/patients/[id]/export
 * Returns all personal and clinical data for a patient in machine-readable JSON.
 *
 * @compliance LGPD Art. 18 (I, II) — Right of access and data portability
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute, verifyPatientAccess } from '@/lib/api/middleware';

export const dynamic = 'force-dynamic';

const PAGE_LIMIT = 1000;

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const patientId = context.params?.id;

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID required' }, { status: 400 });
    }

    const user = context.user;
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Authorization: ADMIN can export any patient; PATIENT can export themselves; others must own the patient
    if (user.role !== 'ADMIN' && user.role !== 'PATIENT') {
      const hasAccess = await verifyPatientAccess(user.id, patientId);
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'You do not have permission to export this patient record' },
          { status: 403 }
        );
      }
    }

    if (user.role === 'PATIENT' && user.id !== patientId) {
      return NextResponse.json(
        { error: 'You can only export your own records' },
        { status: 403 }
      );
    }

    // Fetch patient record
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Pagination check for lab results (DoS prevention)
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor') || undefined;

    // Fetch all clinical domains in parallel (lab results paginated)
    const [prescriptions, clinicalNotes, vitalSigns, diagnoses, consents, labResultsPage, auditLogs] =
      await Promise.all([
        prisma.prescription.findMany({ where: { patientId } }),
        prisma.clinicalNote.findMany({ where: { patientId } }),
        prisma.vitalSign.findMany({ where: { patientId } }),
        prisma.diagnosis.findMany({ where: { patientId } }),
        prisma.consent.findMany({ where: { patientId } }),
        prisma.labResult.findMany({
          where: { patientId },
          take: PAGE_LIMIT,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          orderBy: { id: 'asc' },
        }),
        prisma.auditLog.findMany({ where: { resourceId: patientId } }),
      ]);

    // Check if lab results need pagination
    const labResults = labResultsPage.slice(0, PAGE_LIMIT);
    const nextCursor = labResultsPage.length === PAGE_LIMIT ? labResultsPage[PAGE_LIMIT - 1]?.id : undefined;

    // Omit internal/encrypted fields from patient record
    const { id, firstName, lastName, email, dateOfBirth, gender, phone, address, mrn, createdAt, updatedAt, assignedClinicianId } = patient as any;
    const patientExport = { id, firstName, lastName, email, dateOfBirth, gender, phone, address, mrn, createdAt, updatedAt, assignedClinicianId };

    return NextResponse.json(
      {
        patient: patientExport,
        prescriptions,
        diagnoses,
        vitalSigns,
        clinicalNotes,
        consents,
        labResults,
        auditLogs,
        meta: {
          exportedAt: new Date().toISOString(),
          pagination: nextCursor ? { nextCursor } : null,
        },
      },
      { status: 200 }
    );
  },
  { skipCsrf: true }
);
