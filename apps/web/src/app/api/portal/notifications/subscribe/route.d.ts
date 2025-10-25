/**
 * Push Notification Subscribe API
 * Saves push subscription to database
 */
import { NextRequest, NextResponse } from 'next/server';
export declare function POST(request: NextRequest): Promise<NextResponse<{
    success: boolean;
    data: {
        subscriptionId: any;
    };
    message: string;
}> | NextResponse<{
    success: boolean;
    error: string;
}>>;
//# sourceMappingURL=route.d.ts.map