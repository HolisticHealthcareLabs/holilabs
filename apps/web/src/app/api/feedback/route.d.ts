/**
 * Feedback API Endpoint
 *
 * Handles user feedback submissions during A/B testing
 */
import { NextRequest, NextResponse } from 'next/server';
export declare function POST(request: NextRequest): Promise<NextResponse<{
    success: boolean;
    message: string;
}> | NextResponse<{
    error: string;
    message: string;
}>>;
//# sourceMappingURL=route.d.ts.map