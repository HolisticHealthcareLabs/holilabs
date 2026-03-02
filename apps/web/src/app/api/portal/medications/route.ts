/**
 * Patient Medications API
 *
 * GET /api/portal/medications
 * Fetch all medications for authenticated patient
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePatientSession } from '@/lib/auth/patient-session';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    // Authenticate patient
    const session = await requirePatientSession();

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get('active') === 'true';

    // Build filter conditions
    const where: any = {
      patientId: session.patientId,
    };

    if (activeOnly) {
      where.isActive = true;
    }

    // Fetch medications with prescriber and prescription data
    const medications = await prisma.medication.findMany({
      where,
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
        prescription: {
          select: {
            id: true,
            signedAt: true,
            status: true,
            refillsRemaining: true,
            daysSupply: true,
          },
        },
      },
      orderBy: [
        { isActive: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Separate active and inactive
    const activeMedications = medications.filter((med) => med.isActive);
    const inactiveMedications = medications.filter((med) => !med.isActive);

    // Check for medications needing refill (supply runs out within 7 days)
    const needsRefill = activeMedications.filter((med: any) => {
      if (!med.prescription?.signedAt || !med.prescription?.daysSupply) return false;
      const supplyEndDate = new Date(med.prescription.signedAt);
      supplyEndDate.setDate(supplyEndDate.getDate() + med.prescription.daysSupply);
      const daysUntilEnd = Math.ceil(
        (supplyEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilEnd <= 7 && (med.prescription.refillsRemaining ?? 0) > 0;
    });

    // HIPAA Audit Log: Patient accessed their medications list
    await createAuditLog({
      action: 'READ',
      resource: 'Medication',
      resourceId: session.patientId,
      details: {
        patientId: session.patientId,
        total: medications.length,
        active: activeMedications.length,
        inactive: inactiveMedications.length,
        needsRefill: needsRefill.length,
        activeOnly,
        accessType: 'PATIENT_MEDICATIONS_LIST',
      },
      success: true,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          medications,
          summary: {
            total: medications.length,
            active: activeMedications.length,
            inactive: inactiveMedications.length,
            needsRefill: needsRefill.length,
          },
          activeMedications,
          inactiveMedications,
          needsRefill,
        },
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
      event: 'patient_medications_fetch_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Error al cargar medicamentos.',
      },
      { status: 500 }
    );
  }
}
