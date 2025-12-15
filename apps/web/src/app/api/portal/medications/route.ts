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

    // Fetch medications
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
        // TODO: prescription relation doesn't exist in Prisma schema yet
        // prescription: {
        //   select: {
        //     id: true,
        //     startDate: true,
        //     endDate: true,
        //     status: true,
        //     refillsRemaining: true,
        //   },
        // },
      },
      orderBy: [
        { isActive: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Separate active and inactive
    const activeMedications = medications.filter((med) => med.isActive);
    const inactiveMedications = medications.filter((med) => !med.isActive);

    // TODO: prescription relation doesn't exist - cannot check refill needs
    // Check for medications needing refill
    // const needsRefill = activeMedications.filter((med) => {
    //   if (!med.prescription) return false;
    //   const endDate = new Date(med.prescription.endDate);
    //   const daysUntilEnd = Math.ceil(
    //     (endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    //   );
    //   return daysUntilEnd <= 7 && med.prescription.refillsRemaining > 0;
    // });
    const needsRefill: any[] = [];

    logger.info({
      event: 'patient_medications_fetched',
      patientId: session.patientId,
      patientUserId: session.userId,
      total: medications.length,
      active: activeMedications.length,
      inactive: inactiveMedications.length,
      needsRefill: needsRefill.length,
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
