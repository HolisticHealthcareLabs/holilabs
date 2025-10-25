/**
 * Send Form API
 *
 * POST /api/forms/send - Send a form to a patient
 */
import { NextRequest, NextResponse } from 'next/server';
export declare const dynamic = "force-dynamic";
export declare function POST(request: NextRequest): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    success: boolean;
    formInstanceId: any;
    accessToken: string;
    publicUrl: string;
    message: string;
}>>;
//# sourceMappingURL=route.d.ts.map