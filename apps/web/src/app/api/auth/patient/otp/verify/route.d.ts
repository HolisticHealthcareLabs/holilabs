/**
 * Patient OTP Verify API
 *
 * POST /api/auth/patient/otp/verify
 * Verify OTP code and create authenticated session
 */
import { NextRequest, NextResponse } from 'next/server';
export declare function POST(request: NextRequest): Promise<NextResponse<{
    success: boolean;
    error: string;
}> | NextResponse<{
    success: boolean;
    error: any;
    attemptsLeft: any;
}> | NextResponse<{
    success: boolean;
    message: string;
    patient: {
        id: any;
        patientId: any;
        email: any;
        phone: any;
        firstName: any;
        lastName: any;
        phoneVerified: boolean;
    };
}>>;
//# sourceMappingURL=route.d.ts.map