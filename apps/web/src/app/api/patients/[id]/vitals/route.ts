import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { invalidateVitals, invalidatePatientFullContext } from '@/lib/cache/patient-context-cache';

export const dynamic = 'force-dynamic';

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const patientId = context.params?.id as string | undefined;
    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID required' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      systolicBP,
      diastolicBP,
      heartRate,
      temperature,
      respiratoryRate,
      oxygenSaturation,
      weight,
      height,
      source = 'MANUAL',
    } = body || {};

    // Minimal validation: accept empty submissions? no.
    const hasAny =
      systolicBP !== undefined ||
      diastolicBP !== undefined ||
      heartRate !== undefined ||
      temperature !== undefined ||
      respiratoryRate !== undefined ||
      oxygenSaturation !== undefined ||
      weight !== undefined ||
      height !== undefined;

    if (!hasAny) {
      return NextResponse.json({ error: 'At least one vital is required' }, { status: 400 });
    }

    // Ensure clinician can access this patient (same constraint used across app)
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, assignedClinicianId: context.user.id },
      select: { id: true },
    });
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found or access denied' }, { status: 404 });
    }

    const created = await prisma.vitalSign.create({
      data: {
        patientId,
        systolicBP: systolicBP ?? null,
        diastolicBP: diastolicBP ?? null,
        heartRate: heartRate ?? null,
        temperature: temperature ?? null,
        respiratoryRate: respiratoryRate ?? null,
        oxygenSaturation: oxygenSaturation ?? null,
        weight: weight ?? null,
        height: height ?? null,
        recordedBy: context.user.id,
        source,
      },
    });

    // Bust caches so the Co-Pilot snapshot updates immediately
    await Promise.all([invalidateVitals(patientId), invalidatePatientFullContext(patientId)]);

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
    skipCsrf: true,
    audit: { action: 'CREATE', resource: 'VitalSign' },
  }
);


