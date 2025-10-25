/**
 * Patient Messages API
 *
 * GET /api/portal/messages
 * Fetch conversation with assigned clinician
 *
 * POST /api/portal/messages
 * Send a new message to clinician
 */
import { NextRequest, NextResponse } from 'next/server';
export declare function GET(request: NextRequest): Promise<NextResponse<{
    success: boolean;
    error: string;
}> | NextResponse<{
    success: boolean;
    data: {
        messages: any[];
        clinician: any;
        hasMore: boolean;
    };
}>>;
export declare function POST(request: NextRequest): Promise<NextResponse<{
    success: boolean;
    error: string;
}> | NextResponse<{
    success: boolean;
    message: string;
    data: {
        id: string;
        content: string;
        type: "URGENT" | "TEXT" | "QUESTION";
        sentAt: string;
        senderId: any;
        receiverId: any;
        isRead: boolean;
    };
}>>;
//# sourceMappingURL=route.d.ts.map