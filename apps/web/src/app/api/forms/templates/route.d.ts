/**
 * Form Templates API
 *
 * GET /api/forms/templates - List all form templates
 */
import { NextRequest, NextResponse } from 'next/server';
export declare const dynamic = "force-dynamic";
export declare function GET(request: NextRequest): Promise<NextResponse<{
    success: boolean;
    templates: any;
}> | NextResponse<{
    error: string;
}>>;
//# sourceMappingURL=route.d.ts.map