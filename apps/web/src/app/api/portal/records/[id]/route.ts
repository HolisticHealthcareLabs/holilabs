/**
 * Patient Medical Record Detail API
 *
 * GET /api/portal/records/[id]
 * Fetch single medical record with full details
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePatientSession } from '@/lib/auth/patient-session';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate patient
    const session = await requirePatientSession();

    const recordId = params.id;

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

    // Check if record exists
    if (!record) {
      return NextResponse.json(
        {
          success: false,
          error: 'Registro no encontrado.',
        },
        { status: 404 }
      );
    }

    // Verify record belongs to authenticated patient
    if (record.patientId !== session.patientId) {
      logger.warn({
        event: 'unauthorized_record_access_attempt',
        patientId: session.userId,
        requestedPatientId: record.patientId,
        recordId,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado para ver este registro.',
        },
        { status: 403 }
      );
    }

    // HIPAA Audit Log: Patient viewed their medical record detail
    await createAuditLog({
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      action: 'READ',
      resource: 'SOAPNote',
      resourceId: recordId,
      details: {
        patientId: session.patientId,
        recordId,
        clinicianId: record.clinicianId,
        chiefComplaint: record.chiefComplaint,
        status: record.status,
        accessType: 'PATIENT_RECORD_DETAIL',
      },
      success: true,
    });

    return NextResponse.json(
      {
        success: true,
        data: record,
      },
      { status: 200 }
    );
  } catch (error) {
    // Check if it's an auth error
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado. Por favor, inicia sesión.',
        },
        { status: 401 }
      );
    }

    logger.error({
      event: 'patient_record_fetch_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      recordId: params.id,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Error al cargar el registro médico.',
      },
      { status: 500 }
    );
  }
}
