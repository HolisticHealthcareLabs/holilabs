/**
 * Verify OTP API
 *
 * POST /api/portal/auth/otp/verify - Verify OTP code
 */
import { NextRequest, NextResponse } from 'next/server';
export declare const dynamic = "force-dynamic";
export declare function POST(request: NextRequest): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    success: boolean;
    message: string;
    patient: {
        id: any;
        firstName: any;
        lastName: any;
    };
}>>;
//# sourceMappingURL=route.d.ts.map