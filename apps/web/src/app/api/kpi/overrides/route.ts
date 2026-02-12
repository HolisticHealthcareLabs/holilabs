/**
 * GET /api/kpi/overrides
 * Retrieves override reasons ranked by frequency
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOverrideReasons, validateFilterState } from '@/lib/kpi';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = req.nextUrl.searchParams;

    // Parse filter parameters
    const filter = validateFilterState({
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
    });

    // Fetch override reasons
    const overrideReasons = await getOverrideReasons(filter);

    return NextResponse.json(overrideReasons, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=60', // Cache for 60 seconds
      },
    });
  } catch (error) {
    console.error('[KPI Overrides] API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch override reasons',
      },
      { status: 500 }
    );
  }
}
