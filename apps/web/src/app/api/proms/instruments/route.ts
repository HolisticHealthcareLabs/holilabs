export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { createPublicRoute } from '@/lib/api/middleware';

/**
 * GET /api/proms/instruments — catalog of PROM instruments.
 * Public (patient-facing) — no PHI involved.
 */
export const GET = createPublicRoute(async () => {
  try {
    const instruments = await prisma.promInstrument.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        displayEn: true,
        displayPt: true,
        displayEs: true,
        description: true,
        version: true,
        licensingNote: true,
        citationPmid: true,
        itemCount: true,
      },
      orderBy: { slug: 'asc' },
    });

    return NextResponse.json({
      data: instruments,
      total: instruments.length,
    });
  } catch (error) {
    return safeErrorResponse(error);
  }
});
