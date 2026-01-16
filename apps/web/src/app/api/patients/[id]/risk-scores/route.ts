import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const GET = createProtectedRoute(
  async (_req: NextRequest, context: any) => {
    const patientId = context.params?.id as string | undefined;
    if (!patientId) return NextResponse.json({ error: 'Patient ID required' }, { status: 400 });

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, assignedClinicianId: context.user.id },
      select: { id: true },
    });
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found or access denied' }, { status: 404 });
    }

    const scores = await prisma.riskScore.findMany({
      where: { patientId, isActive: true },
      orderBy: { calculatedAt: 'desc' },
      take: 25,
      select: {
        id: true,
        riskType: true,
        algorithmVersion: true,
        score: true,
        scorePercentage: true,
        category: true,
        recommendation: true,
        nextSteps: true,
        clinicalEvidence: true,
        calculatedAt: true,
        expiresAt: true,
      },
    });

    return NextResponse.json({ success: true, data: scores }, { status: 200 });
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
    skipCsrf: true,
    audit: { action: 'READ', resource: 'RiskScore' },
  }
);


