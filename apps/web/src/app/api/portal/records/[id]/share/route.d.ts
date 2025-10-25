/**
 * Medical Record Sharing API
 *
 * POST /api/portal/records/[id]/share
 * Create a secure, time-limited share link for a medical record
 */
import { NextRequest, NextResponse } from 'next/server';
export declare function POST(request: NextRequest, { params }: {
    params: {
        id: string;
    };
}): Promise<NextResponse<{
    success: boolean;
    error: string;
}> | NextResponse<{
    success: boolean;
    data: {
        shareId: any;
        shareUrl: string;
        shareToken: string;
        expiresAt: any;
        maxAccesses: any;
        recipientEmail: any;
    };
}>>;
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