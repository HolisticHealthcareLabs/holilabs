/**
 * Patient Appointments API
 *
 * GET /api/portal/appointments
 * Fetch all appointments for authenticated patient
 *
 * POST /api/portal/appointments
 * Request a new appointment
 */
import { NextRequest, NextResponse } from 'next/server';
export declare function GET(request: NextRequest): Promise<NextResponse<{
    success: boolean;
    data: {
        appointments: any;
        summary: {
            total: any;
            upcoming: any;
            past: any;
        };
        upcomingAppointments: any;
        pastAppointments: any;
    };
}> | NextResponse<{
    success: boolean;
    error: string;
}>>;
export declare function POST(request: NextRequest): Promise<NextResponse<{
    success: boolean;
    error: string;
}> | NextResponse<{
    success: boolean;
    message: string;
    data: any;
}>>;
//# sourceMappingURL=route.d.ts.map