/**
 * Notifications API
 *
 * GET /api/portal/notifications - Get patient's notifications
 * POST /api/portal/notifications/[id]/read - Mark notification as read
 * DELETE /api/portal/notifications/[id] - Delete notification
 */
import { NextRequest, NextResponse } from 'next/server';
export declare function GET(request: NextRequest): Promise<NextResponse<{
    success: boolean;
    data: {
        notifications: any;
        unreadCount: any;
        total: any;
    };
}> | NextResponse<{
    success: boolean;
    error: string;
}>>;
//# sourceMappingURL=route.d.ts.map