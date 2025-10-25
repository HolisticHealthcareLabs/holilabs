/**
 * Patient OTP Send API
 *
 * POST /api/auth/patient/otp/send
 * Request an OTP code for SMS authentication
 */
import { NextRequest, NextResponse } from 'next/server';
export declare function POST(request: NextRequest): Promise<NextResponse<{
    success: boolean;
    error: any;
}> | NextResponse<{
    devCode?: any;
    success: boolean;
    message: string;
    expiresAt: any;
}>>;
//# sourceMappingURL=route.d.ts.map