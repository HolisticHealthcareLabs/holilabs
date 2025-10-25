/**
 * Health Metrics API
 *
 * GET /api/portal/health-metrics - Fetch patient's health metrics
 * POST /api/portal/health-metrics - Add a new health metric
 */
import { NextRequest, NextResponse } from 'next/server';
export declare function GET(request: NextRequest): Promise<NextResponse<{
    success: boolean;
    data: {
        metrics: any;
        metricsByType: any;
        latestMetrics: Record<string, any>;
        summary: {
            total: any;
            types: number;
        };
    };
}> | NextResponse<{
    success: boolean;
    error: string;
}>>;
export declare function POST(request: NextRequest): Promise<NextResponse<{
    success: boolean;
    message: string;
    data: any;
}> | NextResponse<{
    success: boolean;
    error: string;
}>>;
//# sourceMappingURL=route.d.ts.map