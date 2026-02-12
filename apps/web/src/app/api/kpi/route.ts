/**
 * GET /api/kpi
 * Retrieves all 4 KPIs with optional date range filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllKPIs, validateFilterState } from '@/lib/kpi';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = req.nextUrl.searchParams;

    // Parse filter parameters
    const filter = validateFilterState({
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
    });

    // Fetch all KPIs
    const kpis = await getAllKPIs(filter);

    return NextResponse.json(kpis, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=60', // Cache for 60 seconds
      },
    });
  } catch (error) {
    console.error('[KPI] API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch KPIs',
      },
      { status: 500 }
    );
  }
}
