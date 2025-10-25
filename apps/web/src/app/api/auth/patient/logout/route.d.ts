/**
 * Patient Logout API
 *
 * POST /api/auth/patient/logout
 * Clear patient session and logout
 */
import { NextResponse } from 'next/server';
export declare function POST(): Promise<NextResponse<{
    success: boolean;
    message: string;
}> | NextResponse<{
    success: boolean;
    error: string;
}>>;
//# sourceMappingURL=route.d.ts.map