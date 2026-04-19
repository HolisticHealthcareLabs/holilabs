export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { createPublicRoute } from '@/lib/api/middleware';

/**
 * GET /api/herbals/[slug] — full detail for a single herbal entry, including
 * mechanism, citation trail, and interacting medication classes.
 */
export const GET = createPublicRoute(async (
  _request: Request,
  { params }: { params: { slug: string } }
) => {
  try {
    const herbal = await prisma.herbalContraindication.findUnique({
      where: { slug: params.slug },
    });

    if (!herbal) {
      return NextResponse.json({ error: 'Herbal entry not found' }, { status: 404 });
    }

    return NextResponse.json({
      data: herbal,
      meta: {
        citationUrl: herbal.citationPmid
          ? `https://pubmed.ncbi.nlm.nih.gov/${herbal.citationPmid}/`
          : null,
      },
    });
  } catch (error) {
    return safeErrorResponse(error);
  }
});
