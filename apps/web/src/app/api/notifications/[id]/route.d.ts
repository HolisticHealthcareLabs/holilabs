/**
 * Individual Notification API
 *
 * PUT /api/notifications/[id]
 * Mark notification as read
 *
 * DELETE /api/notifications/[id]
 * Delete notification
 */
import { NextRequest, NextResponse } from 'next/server';
export declare function PUT(request: NextRequest, { params }: {
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
export declare function DELETE(request: NextRequest, { params }: {
    params: {
        id: string;
    };
}): Promise<NextResponse<{
    success: boolean;
    error: string;
}> | NextResponse<{
    success: boolean;
    message: string;
}>>;
//# sourceMappingURL=route.d.ts.map