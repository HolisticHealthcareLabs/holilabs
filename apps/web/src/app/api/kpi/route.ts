export const dynamic = "force-dynamic";
/**
 * GET /api/kpi
 * Retrieves all 8 KPIs with optional date range filtering.
 * Pass ?include=definitions to receive KPI dictionary alongside values.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllKPIs, validateFilterState, KPI_DICTIONARY } from '@/lib/kpi';
import { createProtectedRoute, ApiContext } from '@/lib/api/middleware';

async function handler(req: NextRequest, _ctx: ApiContext): Promise<NextResponse> {
  const searchParams = req.nextUrl.searchParams;

  const filter = validateFilterState({
    startDate: searchParams.get('startDate') || undefined,
    endDate: searchParams.get('endDate') || undefined,
  });

  const kpis = await getAllKPIs(filter);

  const includeDefinitions = searchParams.get('include') === 'definitions';

  const body = includeDefinitions ? { kpis, definitions: KPI_DICTIONARY } : kpis;

  return NextResponse.json(body, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, max-age=60',
    },
  });
}

export const GET = createProtectedRoute(handler, {
  roles: ['ADMIN', 'PHYSICIAN', 'CLINICIAN', 'NURSE'],
  skipCsrf: true,
  audit: { action: 'KPI_VIEW', resource: 'kpi' },
});
