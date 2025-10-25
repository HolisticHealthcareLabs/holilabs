/**
 * Conversation Messages API
 *
 * GET /api/messages/[conversationId] - Get messages for a conversation
 * PATCH /api/messages/[conversationId] - Mark conversation as read
 */
import { NextRequest, NextResponse } from 'next/server';
export declare const dynamic = "force-dynamic";
/**
 * GET - Get all messages for a conversation
 */
export declare function GET(request: NextRequest, { params }: {
    params: {
        conversationId: string;
    };
}): Promise<NextResponse<{
    success: boolean;
    data: {
        messages: any;
    };
}> | NextResponse<{
    success: boolean;
    error: string;
}>>;
/**
 * PATCH - Mark all messages in conversation as read
 */
export declare function PATCH(request: NextRequest, { params }: {
    params: {
        conversationId: string;
    };
}): Promise<NextResponse<{
    success: boolean;
    message: string;
}> | NextResponse<{
    success: boolean;
    error: string;
}>>;
//# sourceMappingURL=route.d.ts.map