/**
 * Test Push Notification API
 * Sends a test push notification to the authenticated user
 */
import { NextRequest, NextResponse } from 'next/server';
export declare function POST(request: NextRequest): Promise<NextResponse<{
    success: boolean;
    message: string;
    data: {
        sentCount: any;
    };
}> | NextResponse<{
    success: boolean;
    error: string;
}>>;
//# sourceMappingURL=route.d.ts.map