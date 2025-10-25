/**
 * Public Form Access API
 *
 * GET /api/forms/public/[token] - Patient accesses form
 * POST /api/forms/public/[token] - Save progress (auto-save)
 */
import { NextRequest, NextResponse } from 'next/server';
export declare const dynamic = "force-dynamic";
export declare function GET(request: NextRequest, { params }: {
    params: {
        token: string;
    };
}): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    success: boolean;
    form: {
        id: any;
        template: any;
        patient: any;
        status: any;
        responses: any;
        expiresAt: any;
        currentStepIndex: any;
        progressPercent: any;
    };
}>>;
export declare function POST(request: NextRequest, { params }: {
    params: {
        token: string;
    };
}): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    success: boolean;
    message: string;
}>>;
//# sourceMappingURL=route.d.ts.map