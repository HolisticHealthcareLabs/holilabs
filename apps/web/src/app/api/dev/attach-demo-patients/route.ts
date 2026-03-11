import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * DEV ONLY: Attach existing demo/synthetic patients to the current clinician so the UI always has data.
 * This is intentionally behind NODE_ENV === 'development'.
 */
export const POST = createProtectedRoute(
  async (req: NextRequest, context: any) => {
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    let clinicianId = context.user?.id;

    if (!clinicianId) {
      const demoClinician = await prisma.user.findFirst({
        where: { email: 'doctor@holilabs.com' },
      });
      clinicianId = demoClinician?.id;
    }

    if (!clinicianId) {
      return NextResponse.json(
        { error: 'Clinician ID not found. Run main seed first.' },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const countRaw = url.searchParams.get('count');
    const countParsed = countRaw ? Number(countRaw) : 10;
    const count = Number.isFinite(countParsed)
      ? Math.min(50, Math.max(1, Math.floor(countParsed)))
      : 10;

    const existingCount = await prisma.patient.count({
      where: { assignedClinicianId: clinicianId },
    });
    if (existingCount > 0) {
      return NextResponse.json(
        { success: true, message: 'Clinician already has patients', attached: 0 },
        { status: 200 }
      );
    }

    const candidates = await prisma.patient.findMany({
      where: { assignedClinicianId: { not: clinicianId } },
      orderBy: { createdAt: 'desc' },
      take: count,
      select: { id: true },
    });

    if (candidates.length === 0) {
      const firstNames = [
        'María',
        'Juan',
        'Ana',
        'Carlos',
        'Sofía',
        'Luis',
        'Elena',
        'Miguel',
        'Lucía',
        'Pedro',
      ];
      const lastNames = [
        'García',
        'Rodríguez',
        'Martínez',
        'López',
        'González',
        'Hernández',
        'Pérez',
        'Sánchez',
        'Ramírez',
        'Torres',
      ];

      const demoPatients = Array.from({ length: count }, (_, i) => {
        const fn = firstNames[i % firstNames.length];
        const ln = lastNames[i % lastNames.length];
        const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
        const mrn = `MRN-DEMO-${clinicianId?.slice(0, 6).toUpperCase()}-${String(i + 1).padStart(2, '0')}-${rand}`;
        const tokenId = `PT-DEMO-${crypto.randomBytes(6).toString('hex')}`;
        const dob = new Date();
        dob.setFullYear(dob.getFullYear() - (28 + (i % 42)));

        return {
          firstName: fn,
          lastName: ln,
          dateOfBirth: dob,
          mrn,
          tokenId,
          gender: 'U',
          assignedClinicianId: clinicianId,
          country: 'MX',
          region: 'DEMO',
        } as any;
      });

      for (const p of demoPatients) {
        await prisma.patient.create({ data: p });
      }

      return NextResponse.json(
        {
          success: true,
          message: 'Created demo patients for clinician',
          attached: demoPatients.length,
        },
        { status: 200 }
      );
    }

    await prisma.patient.updateMany({
      where: { id: { in: candidates.map((c) => c.id) } },
      data: { assignedClinicianId: clinicianId },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Attached demo patients to clinician',
        attached: candidates.length,
      },
      { status: 200 }
    );
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'],
    skipCsrf: true,
  }
);
