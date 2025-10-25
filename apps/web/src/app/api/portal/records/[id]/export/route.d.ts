/**
 * Medical Record PDF Export API
 *
 * POST /api/portal/records/[id]/export
 * Export medical record as PDF with HIPAA-compliant formatting
 */
import { NextRequest, NextResponse } from 'next/server';
export declare function POST(request: NextRequest, { params }: {
    params: {
        id: string;
    };
}): Promise<NextResponse<unknown>>;
//# sourceMappingURL=route.d.ts.map