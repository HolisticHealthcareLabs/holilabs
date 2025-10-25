/**
 * Session API Route
 *
 * GET /api/auth/session - Get current user session
 */
import { NextRequest, NextResponse } from 'next/server';
export declare const dynamic = "force-dynamic";
export declare function GET(request: NextRequest): Promise<NextResponse<{
    user: {
        id: any;
        email: any;
        type: string;
    };
}> | NextResponse<{
    user: null;
}> | NextResponse<{
    error: string;
}>>;
//# sourceMappingURL=route.d.ts.map