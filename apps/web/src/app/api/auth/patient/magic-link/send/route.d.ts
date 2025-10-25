/**
 * Patient Magic Link Send API
 *
 * POST /api/auth/patient/magic-link/send
 * Request a magic link for passwordless authentication
 */
import { NextRequest, NextResponse } from 'next/server';
export declare function POST(request: NextRequest): Promise<NextResponse<{
    success: boolean;
    error: any;
}> | NextResponse<{
    success: boolean;
    message: string;
    expiresInMinutes: number;
}>>;
//# sourceMappingURL=route.d.ts.map