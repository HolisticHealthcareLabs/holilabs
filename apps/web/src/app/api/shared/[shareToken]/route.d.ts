/**
 * Public Shared Medical Record API
 *
 * GET /api/shared/[shareToken]
 * Access a shared medical record via secure token (no authentication required)
 */
import { NextRequest, NextResponse } from 'next/server';
export declare function GET(request: NextRequest, { params }: {
    params: {
        shareToken: string;
    };
}): Promise<NextResponse<{
    success: boolean;
    error: string;
}> | NextResponse<{
    success: boolean;
    data: {
        record: any;
        share: {
            recipientName: any;
            purpose: any;
            expiresAt: any;
            allowDownload: any;
        };
    };
}>>;
//# sourceMappingURL=route.d.ts.map