export const dynamic = "force-dynamic";
/**
 * Individual Medication API
 *
 * GET /api/portal/medications/[id] - Get medication details
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPatientPortalRoute, type PatientPortalContext } from '@/lib/api/patient-portal-middleware';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';

export const GET = createPatientPortalRoute(
  async (request: NextRequest, context: PatientPortalContext) => {
    const id = request.nextUrl.pathname.split('/').at(-1);

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Medication ID is required',
        },
        { status: 400 }
      );
    }

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

    if (medication.patientId !== context.session.patientId) {
      logger.warn({
        event: 'unauthorized_medication_access_attempt',
        patientId: context.session.patientId,
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

    await createAuditLog({
      action: 'READ',
      resource: 'Medication',
      resourceId: medication.id,
      details: {
        patientId: context.session.patientId,
        medicationId: medication.id,
        medicationName: medication.name,
        isActive: medication.isActive,
        prescriberId: medication.prescriber?.id,
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
  },
  { audit: { action: 'READ', resource: 'Medication' } }
);
