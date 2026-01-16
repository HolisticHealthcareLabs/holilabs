/**
 * Patient Provider Directory API
 *
 * GET /api/portal/providers
 * - Lists clinician profiles patients can select for booking and care coordination.
 *
 * POST /api/portal/providers
 * - Select a clinician as the patient's assigned clinician.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requirePatientSession } from '@/lib/auth/patient-session';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const ProvidersQuerySchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const SelectProviderSchema = z.object({
  clinicianId: z.string().min(1),
});

export async function GET(request: NextRequest) {
  const session = await requirePatientSession();

  const sp = request.nextUrl.searchParams;
  const parsed = ProvidersQuerySchema.safeParse({
    q: sp.get('q') || undefined,
    limit: sp.get('limit') || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid query parameters', details: parsed.error.errors },
      { status: 400 }
    );
  }

  const { q, limit } = parsed.data;

  const where: any = {
    role: { in: ['PHYSICIAN', 'NURSE', 'CLINICIAN'] },
  };

  if (q) {
    where.OR = [
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
      { specialty: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [patient, clinicians] = await Promise.all([
    prisma.patient.findUnique({
      where: { id: session.patientId },
      select: { assignedClinicianId: true },
    }),
    prisma.user.findMany({
      where,
      take: limit,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        specialty: true,
        licenseNumber: true,
        profilePictureUrl: true,
      },
    }),
  ]);

  return NextResponse.json(
    {
      success: true,
      data: {
        assignedClinicianId: patient?.assignedClinicianId || null,
        clinicians,
      },
    },
    { status: 200 }
  );
}

export async function POST(request: NextRequest) {
  const session = await requirePatientSession();
  const body = await request.json().catch(() => ({}));
  const parsed = SelectProviderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid payload', details: parsed.error.errors },
      { status: 400 }
    );
  }

  const clinician = await prisma.user.findUnique({
    where: { id: parsed.data.clinicianId },
    select: { id: true, role: true, firstName: true, lastName: true },
  });

  if (!clinician || !['PHYSICIAN', 'NURSE', 'CLINICIAN'].includes(clinician.role)) {
    return NextResponse.json(
      { success: false, error: 'Clinician not found' },
      { status: 404 }
    );
  }

  await prisma.patient.update({
    where: { id: session.patientId },
    data: { assignedClinicianId: clinician.id },
  });

  await createAuditLog({
    action: 'UPDATE',
    resource: 'Patient',
    resourceId: session.patientId,
    details: {
      patientId: session.patientId,
      actionType: 'PATIENT_SELECTED_CLINICIAN',
      clinicianId: clinician.id,
      clinicianName: `${clinician.firstName} ${clinician.lastName}`,
    },
    success: true,
  });

  return NextResponse.json(
    { success: true, message: 'Clinician selected', clinicianId: clinician.id },
    { status: 200 }
  );
}


