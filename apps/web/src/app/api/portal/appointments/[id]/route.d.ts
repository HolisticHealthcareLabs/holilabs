/**
 * Individual Appointment API
 *
 * GET /api/portal/appointments/[id] - Get appointment details
 * PATCH /api/portal/appointments/[id] - Cancel appointment
 */
import { NextRequest, NextResponse } from 'next/server';
export declare function GET(request: NextRequest, { params }: {
    params: {
        id: string;
    };
}): Promise<NextResponse<{
    success: boolean;
    error: string;
}> | NextResponse<{
    success: boolean;
    data: any;
}>>;
export declare function PATCH(request: NextRequest, { params }: {
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