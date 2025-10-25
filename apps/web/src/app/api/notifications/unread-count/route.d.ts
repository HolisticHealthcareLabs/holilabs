/**
 * Notifications Unread Count API
 *
 * GET /api/notifications/unread-count
 * Get unread notification count for authenticated user
 */
import { NextRequest, NextResponse } from 'next/server';
export declare function GET(request: NextRequest): Promise<NextResponse<{
    success: boolean;
    data: {
        count: any;
    };
}> | NextResponse<{
    success: boolean;
    error: string;
}>>;
//# sourceMappingURL=route.d.ts.map