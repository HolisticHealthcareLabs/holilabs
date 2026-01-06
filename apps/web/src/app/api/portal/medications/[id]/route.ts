/**
 * Individual Medication API
 *
 * GET /api/portal/medications/[id] - Get medication details
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

    const { id } = params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Medication ID is required',
        },
        { status: 400 }
      );
    }

    // Fetch medication with full details
    const medication = await prisma.medication.findUnique({
      where: { id },
      include: {
        prescriber: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialty: true,
            profilePictureUrl: true,
          },
        },
      },
    });

    if (!medication) {
      return NextResponse.json(
        {
          success: false,
          error: 'Medicamento no encontrado.',
        },
        { status: 404 }
      );
    }

    // Verify the medication belongs to the authenticated patient
    if (medication.patientId !== session.patientId) {
      logger.warn({
        event: 'unauthorized_medication_access_attempt',
        patientId: session.patientId,
        requestedMedicationId: id,
        actualMedicationPatientId: medication.patientId,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'No tienes permiso para acceder a este medicamento.',
        },
        { status: 403 }
      );
    }

    // HIPAA Audit Log: Patient accessed medication detail
    await createAuditLog({
      userAgent: request.headers.get('user-agent') || 'unknown',
      action: 'READ',
      resource: 'Medication',
      resourceId: medication.id,
      details: {
        patientId: session.patientId,
        medicationId: medication.id,
        medicationName: medication.name,
        isActive: medication.isActive,
        prescriberId: medication.prescriberId,
        accessType: 'PATIENT_MEDICATION_DETAIL',
      },
      success: true,
    });

    return NextResponse.json(
      {
        success: true,
        data: medication,
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
      event: 'patient_medication_fetch_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Error al cargar medicamento.',
      },
      { status: 500 }
    );
  }
}
