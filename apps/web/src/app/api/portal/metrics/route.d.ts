/**
 * Patient Health Metrics API
 *
 * GET /api/portal/metrics
 * Fetch health metrics for authenticated patient
 */
import { NextRequest, NextResponse } from 'next/server';
export declare function GET(request: NextRequest): Promise<NextResponse<{
    success: boolean;
    data: {
        metrics: any[];
        summary: {
            bloodPressure: {
                systolic: any;
                diastolic: any;
                trend: string;
                unit: string;
            };
            heartRate: {
                value: any;
                trend: string;
                unit: string;
            };
            temperature: {
                value: any;
                trend: string;
                unit: string;
            };
            respiratoryRate: {
                value: any;
                trend: string;
                unit: string;
            };
            oxygenSaturation: {
                value: any;
                trend: string;
                unit: string;
            };
            weight: {
                value: any;
                trend: string;
                unit: string;
            };
        };
        dateRange: {
            start: string;
            end: string;
            days: number;
        };
    };
}> | NextResponse<{
    success: boolean;
    error: string;
}>>;
//# sourceMappingURL=route.d.ts.map