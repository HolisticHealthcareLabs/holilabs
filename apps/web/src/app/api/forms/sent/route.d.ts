/**
 * Sent Forms API
 *
 * GET /api/forms/sent - List all sent form instances
 */
import { NextRequest, NextResponse } from 'next/server';
export declare const dynamic = "force-dynamic";
export declare function GET(request: NextRequest): Promise<NextResponse<{
    success: boolean;
    forms: any;
}> | NextResponse<{
    error: string;
}>>;
//# sourceMappingURL=route.d.ts.map