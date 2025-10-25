/**
 * Start Recording Session API
 *
 * POST /api/recordings/start
 * Start a new audio recording session for a consultation
 */
import { NextRequest, NextResponse } from 'next/server';
export declare function POST(request: NextRequest): Promise<NextResponse<{
    success: boolean;
    error: string;
}> | NextResponse<{
    success: boolean;
    message: string;
    data: any;
}>>;
//# sourceMappingURL=route.d.ts.map