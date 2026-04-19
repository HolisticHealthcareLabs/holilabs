export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { createPublicRoute } from '@/lib/api/middleware';

/**
 * GET /api/proms/instruments/[slug] — full questionnaire with questions.
 */
export const GET = createPublicRoute(async (
  _request: Request,
  { params }: { params: { slug: string } }
) => {
  try {
    const instrument = await prisma.promInstrument.findUnique({
      where: { slug: params.slug },
      include: {
        questions: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            orderIndex: true,
            itemCode: true,
            domain: true,
            recallPeriod: true,
            textEn: true,
            textPt: true,
            textEs: true,
            responseOptions: true,
            reverseScored: true,
          },
        },
      },
    });

    if (!instrument) {
      return NextResponse.json({ error: 'Instrument not found' }, { status: 404 });
    }

    return NextResponse.json({
      data: instrument,
      meta: {
        citationUrl: instrument.citationPmid
          ? `https://pubmed.ncbi.nlm.nih.gov/${instrument.citationPmid}/`
          : null,
      },
    });
  } catch (error) {
    return safeErrorResponse(error);
  }
});
