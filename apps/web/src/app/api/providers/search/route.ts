export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { createPublicRoute } from '@/lib/api/middleware';
import { searchProviders } from '@/lib/search/provider-search';
import { z } from 'zod';

const searchSchema = z.object({
  q: z.string().optional(),
  country: z.string().length(2).optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  specialty: z.string().optional(),
  isCam: z.enum(['true', 'false']).optional(),
  systemType: z.enum(['CONVENTIONAL', 'INTEGRATIVE', 'TRADITIONAL', 'COMPLEMENTARY']).optional(),
  insurancePlan: z.string().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(1).max(500).default(50),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['relevance', 'rating', 'name']).default('relevance'),
});

export const GET = createPublicRoute(async (request: Request) => {
  try {
    const url = new URL(request.url);
    const params = searchSchema.parse(Object.fromEntries(url.searchParams));

    const result = await searchProviders({
      q: params.q,
      country: params.country,
      state: params.state,
      city: params.city,
      specialty: params.specialty,
      systemType: params.systemType,
      isCam: params.isCam === undefined ? undefined : params.isCam === 'true',
      insurancePlan: params.insurancePlan,
      lat: params.lat,
      lng: params.lng,
      radiusKm: params.radiusKm,
      sort: params.sort,
      page: params.page,
      limit: params.limit,
    });

    return NextResponse.json({
      data: result.items,
      pagination: {
        page: params.page,
        limit: params.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / params.limit),
      },
      meta: {
        backend: result.backend,
        processingTimeMs: result.processingTimeMs,
      },
    });
  } catch (error) {
    return safeErrorResponse(error);
  }
});
