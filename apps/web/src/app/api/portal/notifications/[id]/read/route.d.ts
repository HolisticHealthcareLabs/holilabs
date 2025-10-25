/**
 * Mark Notification as Read API
 *
 * POST /api/portal/notifications/[id]/read - Mark notification as read
 */
import { NextRequest, NextResponse } from 'next/server';
export declare function POST(request: NextRequest, { params }: {
    params: {
        id: string;
    };
}): Promise<NextResponse<{
    success: boolean;
    error: string;
}> | NextResponse<{
    success: boolean;
    message: string;
    data: any;
}>>;
//# sourceMappingURL=route.d.ts.map