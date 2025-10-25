/**
 * Patient Medical Record Detail API
 *
 * GET /api/portal/records/[id]
 * Fetch single medical record with full details
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