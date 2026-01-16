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

    const events = await prisma.auditLog.findMany({
      where: { resourceId: patientId },
      orderBy: { timestamp: 'desc' },
      take: 50,
      select: {
        id: true,
        timestamp: true,
        action: true,
        resource: true,
        success: true,
        userEmail: true,
        details: true,
      },
    });

    return NextResponse.json({ success: true, data: events }, { status: 200 });
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
    skipCsrf: true,
    audit: { action: 'READ', resource: 'AuditLog' },
  }
);


