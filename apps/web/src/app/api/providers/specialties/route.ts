export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { createPublicRoute } from '@/lib/api/middleware';

export const GET = createPublicRoute(async (request: Request) => {
  try {
    const url = new URL(request.url);
    const systemType = url.searchParams.get('systemType');
    const isCam = url.searchParams.get('isCam');

    const where: Record<string, unknown> = {};
    if (systemType) where.systemType = systemType;
    if (isCam !== null) where.isCam = isCam === 'true';

    const specialties = await prisma.medicalSpecialty.findMany({
      where,
      select: {
        id: true,
        slug: true,
        displayPt: true,
        displayEs: true,
        displayEn: true,
        isCam: true,
        systemType: true,
        pnpicRecognized: true,
        isAreaOfExpertise: true,
        parentId: true,
        _count: { select: { physicians: true } },
      },
      orderBy: [{ systemType: 'asc' }, { displayEn: 'asc' }],
    });

    const grouped = {
      CONVENTIONAL: specialties.filter((s) => s.systemType === 'CONVENTIONAL'),
      INTEGRATIVE: specialties.filter((s) => s.systemType === 'INTEGRATIVE'),
      TRADITIONAL: specialties.filter((s) => s.systemType === 'TRADITIONAL'),
      COMPLEMENTARY: specialties.filter((s) => s.systemType === 'COMPLEMENTARY'),
    };

    return NextResponse.json({ data: grouped, total: specialties.length });
  } catch (error) {
    return safeErrorResponse(error);
  }
});
