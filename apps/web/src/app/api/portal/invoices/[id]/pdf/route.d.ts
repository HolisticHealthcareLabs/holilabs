/**
 * Generate and Download Invoice PDF
 * API Route: /api/portal/invoices/[id]/pdf
 */
import { NextRequest, NextResponse } from 'next/server';
export declare function GET(request: NextRequest, { params }: {
    params: {
        id: string;
    };
}): Promise<NextResponse<unknown>>;
//# sourceMappingURL=route.d.ts.map