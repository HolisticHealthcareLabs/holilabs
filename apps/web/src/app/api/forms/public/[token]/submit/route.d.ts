/**
 * Form Submission API
 *
 * POST /api/forms/public/[token]/submit - Final form submission with signature
 */
import { NextRequest, NextResponse } from 'next/server';
export declare const dynamic = "force-dynamic";
export declare function POST(request: NextRequest, { params }: {
    params: {
        token: string;
    };
}): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    success: boolean;
    message: string;
    completedAt: any;
}>>;
//# sourceMappingURL=route.d.ts.map