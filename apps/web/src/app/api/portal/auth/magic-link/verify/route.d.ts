/**
 * Verify Magic Link API
 *
 * POST /api/portal/auth/magic-link/verify - Verify magic link token and create session
 */
import { NextRequest, NextResponse } from 'next/server';
export declare const dynamic = "force-dynamic";
export declare function POST(request: NextRequest): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    success: boolean;
    patient: {
        id: any;
        firstName: any;
        lastName: any;
        mrn: any;
    };
}>>;
//# sourceMappingURL=route.d.ts.map