/**
 * Available Slots API for Rescheduling
 * GET /api/appointments/confirm/[token]/available-slots
 */
import { NextRequest, NextResponse } from 'next/server';
export declare function GET(request: NextRequest, { params }: {
    params: {
        token: string;
    };
}): Promise<NextResponse<{
    success: boolean;
    error: string;
}> | NextResponse<{
    success: boolean;
    data: {
        slots: any;
    };
}>>;
//# sourceMappingURL=route.d.ts.map