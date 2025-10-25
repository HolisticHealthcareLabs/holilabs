/**
 * Patient Magic Link Verify API
 *
 * POST /api/auth/patient/magic-link/verify
 * Verify magic link token and create authenticated session
 */
import { NextRequest, NextResponse } from 'next/server';
export declare function POST(request: NextRequest): Promise<NextResponse<{
    success: boolean;
    error: any;
}> | NextResponse<{
    success: boolean;
    message: string;
    patient: {
        id: any;
        patientId: any;
        email: any;
        firstName: any;
        lastName: any;
        emailVerified: boolean;
    };
}>>;
/**
 * GET endpoint to verify token from URL query parameter
 * This allows clicking the link directly from email
 */
export declare function GET(request: NextRequest): Promise<NextResponse<unknown>>;
//# sourceMappingURL=route.d.ts.map