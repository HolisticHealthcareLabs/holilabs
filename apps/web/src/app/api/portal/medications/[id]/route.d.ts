/**
 * Individual Medication API
 *
 * GET /api/portal/medications/[id] - Get medication details
 */
import { NextRequest, NextResponse } from 'next/server';
export declare function GET(request: NextRequest, { params }: {
    params: {
        id: string;
    };
}): Promise<NextResponse<{
    success: boolean;
    error: string;
}> | NextResponse<{
    success: boolean;
    data: any;
}>>;
//# sourceMappingURL=route.d.ts.map