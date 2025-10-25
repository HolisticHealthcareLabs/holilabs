/**
 * Patient Logout API
 *
 * POST /api/portal/auth/logout - Logout patient and clear session
 */
import { NextRequest, NextResponse } from 'next/server';
export declare const dynamic = "force-dynamic";
export declare function POST(request: NextRequest): Promise<NextResponse<{
    success: boolean;
    message: string;
}> | NextResponse<{
    error: string;
    details: string;
}>>;
//# sourceMappingURL=route.d.ts.map