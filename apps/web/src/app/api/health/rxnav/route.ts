/**
 * RxNav API Health Check Endpoint
 *
 * GET /api/health/rxnav
 *
 * Returns health status and metrics for the RxNav API integration
 */

import { NextResponse } from 'next/server';
import { getHealthMetrics } from '@/lib/integrations/monitoring';

export async function GET() {
  try {
    const metrics = getHealthMetrics();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...metrics,
    });
  } catch (error) {
    console.error('[API] Health check error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve health metrics',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
