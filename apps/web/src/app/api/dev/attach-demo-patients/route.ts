import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * DEV ONLY: Attach existing demo/synthetic patients to the current clinician so the UI always has data.
 * This is intentionally behind NODE_ENV === 'development'.
 */
export const POST = createProtectedRoute(
  async (_req: NextRequest, context: any) => {
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const clinicianId = context.user.id;

    // If the clinician already has patients, do nothing.
    const existingCount = await prisma.patient.count({
      where: { assignedClinicianId: clinicianId },
    });
    if (existingCount > 0) {
      return NextResponse.json({ success: true, message: 'Clinician already has patients', attached: 0 }, { status: 200 });
    }

    // Reassign up to 50 existing patients (seeded synthetic) to this clinician.
    const candidates = await prisma.patient.findMany({
      where: { assignedClinicianId: { not: clinicianId } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true },
    });

    if (candidates.length === 0) {
      return NextResponse.json({ success: true, message: 'No patients exist to attach', attached: 0 }, { status: 200 });
    }

    await prisma.patient.updateMany({
      where: { id: { in: candidates.map((c) => c.id) } },
      data: { assignedClinicianId: clinicianId },
    });

    return NextResponse.json(
      { success: true, message: 'Attached demo patients to clinician', attached: candidates.length },
      { status: 200 }
    );
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
    skipCsrf: true,
    audit: { action: 'UPDATE', resource: 'Patient' },
  }
);


