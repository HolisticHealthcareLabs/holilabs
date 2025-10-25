/**
 * CSRF Token API
 *
 * GET /api/csrf - Generate and return a CSRF token
 */
import { NextResponse } from 'next/server';
export declare const dynamic = "force-dynamic";
export declare function GET(): Promise<NextResponse<{
    success: boolean;
    token: any;
}>>;
//# sourceMappingURL=route.d.ts.map