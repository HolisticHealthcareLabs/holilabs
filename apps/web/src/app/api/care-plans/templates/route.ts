export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { createPublicRoute } from '@/lib/api/middleware';

/**
 * GET /api/care-plans/templates — list ERAS CarePlan templates with full task timeline.
 */
export const GET = createPublicRoute(async () => {
  try {
    const templates = await prisma.carePlanTemplate.findMany({
      include: {
        tasks: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            orderIndex: true,
            phase: true,
            dayOffset: true,
            kind: true,
            title: true,
            instructions: true,
            promInstrumentSlug: true,
          },
        },
      },
      orderBy: { slug: 'asc' },
    });

    return NextResponse.json({ data: templates, total: templates.length });
  } catch (error) {
    return safeErrorResponse(error);
  }
});
