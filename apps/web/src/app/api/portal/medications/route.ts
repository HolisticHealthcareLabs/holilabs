export const dynamic = "force-dynamic";
/**
 * Patient Medications API
 *
 * GET /api/portal/medications
 * Fetch all medications for authenticated patient
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPatientPortalRoute, type PatientPortalContext } from '@/lib/api/patient-portal-middleware';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';

export const GET = createPatientPortalRoute(
  async (request: NextRequest, context: PatientPortalContext) => {
    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get('active') === 'true';

    const where: any = {
      patientId: context.session.patientId,
    };

    if (activeOnly) {
      where.isActive = true;
    }

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

    const activeMedications = medications.filter((med) => med.isActive);
    const inactiveMedications = medications.filter((med) => !med.isActive);

    const needsRefill = activeMedications.filter((med: any) => {
      if (!med.prescription?.signedAt || !med.prescription?.daysSupply) return false;
      const supplyEndDate = new Date(med.prescription.signedAt);
      supplyEndDate.setDate(supplyEndDate.getDate() + med.prescription.daysSupply);
      const daysUntilEnd = Math.ceil(
        (supplyEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilEnd <= 7 && (med.prescription.refillsRemaining ?? 0) > 0;
    });

    await createAuditLog({
      action: 'READ',
      resource: 'Medication',
      resourceId: context.session.patientId,
      details: {
        patientId: context.session.patientId,
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
  },
  { audit: { action: 'READ', resource: 'Medications' } }
);
