/**
 * Appointment Confirmation API
 * GET /api/appointments/confirm/[token] - Get appointment details
 * POST /api/appointments/confirm/[token] - Confirm/Cancel/Reschedule appointment
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
        appointment: any;
    };
}>>;
export declare function POST(request: NextRequest, { params }: {
    params: {
        token: string;
    };
}): Promise<NextResponse<{
    success: boolean;
    error: string;
}> | NextResponse<{
    success: boolean;
    message: string;
    data: {
        appointment: {
            id: any;
            status: any;
            confirmationStatus: any;
        };
    };
}>>;
//# sourceMappingURL=route.d.ts.map