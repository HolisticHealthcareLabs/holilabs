/**
 * Mark All Notifications as Read API
 *
 * PUT /api/notifications/read-all
 * Mark all notifications as read for authenticated user
 */
import { NextRequest, NextResponse } from 'next/server';
export declare function PUT(request: NextRequest): Promise<NextResponse<{
    success: boolean;
    message: string;
    data: {
        count: any;
    };
}> | NextResponse<{
    success: boolean;
    error: string;
}>>;
//# sourceMappingURL=route.d.ts.map