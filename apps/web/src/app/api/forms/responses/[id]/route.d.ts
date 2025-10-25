/**
 * Form Responses API
 *
 * GET /api/forms/responses/[id] - Get form responses for a specific form instance
 */
import { NextRequest, NextResponse } from 'next/server';
export declare const dynamic = "force-dynamic";
export declare function GET(request: NextRequest, { params }: {
    params: {
        id: string;
    };
}): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    success: boolean;
    form: {
        id: any;
        status: any;
        progressPercent: any;
        responses: any;
        signatureDataUrl: any;
        completedAt: any;
        patient: any;
        template: any;
    };
}>>;
//# sourceMappingURL=route.d.ts.map