/**
 * Patient Medical Record Detail API
 *
 * GET /api/portal/records/[id]
 * Fetch single medical record with full details
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPatientPortalRoute, type PatientPortalContext } from '@/lib/api/patient-portal-middleware';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';

export const GET = createPatientPortalRoute(
  async (request: NextRequest, context: PatientPortalContext) => {
    const recordId = context.params.id;

    // Fetch record with full details
    const record = await prisma.sOAPNote.findUnique({
      where: {
        id: recordId,
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            mrn: true,
          },
        },
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialty: true,
            licenseNumber: true,
            npi: true,
          },
        },
        session: {
          select: {
            id: true,
            audioFileName: true,
            audioDuration: true,
            createdAt: true,
            appointment: {
              select: {
                id: true,
                title: true,
                type: true,
                startTime: true,
              },
            },
          },
        },
      },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Registro no encontrado.' },
        { status: 404 }
      );
    }

    // Verify record belongs to authenticated patient
    if (record.patientId !== context.session.patientId) {
      logger.warn({
        event: 'unauthorized_record_access_attempt',
        patientId: context.session.userId,
        requestedPatientId: record.patientId,
        recordId,
      });

      return NextResponse.json(
        { success: false, error: 'No autorizado para ver este registro.' },
        { status: 403 }
      );
    }

    // HIPAA Audit Log: Patient viewed their medical record detail
    await createAuditLog({
      action: 'READ',
      resource: 'SOAPNote',
      resourceId: recordId,
      details: {
        patientId: context.session.patientId,
        recordId,
        clinicianId: record.clinicianId,
        chiefComplaint: record.chiefComplaint,
        status: record.status,
        accessType: 'PATIENT_RECORD_DETAIL',
      },
      success: true,
    });

    return NextResponse.json(
      { success: true, data: record },
      { status: 200 }
    );
  },
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 30 },
    audit: { action: 'READ', resource: 'Record' },
  }
);
