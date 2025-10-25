/**
 * Patient Medical Record PDF Export API
 *
 * GET /api/portal/records/[id]/pdf
 * Generate and download SOAP note as PDF
 */
import { NextRequest, NextResponse } from 'next/server';
export declare function GET(request: NextRequest, { params }: {
    params: {
        id: string;
    };
}): Promise<NextResponse<unknown>>;
//# sourceMappingURL=route.d.ts.map