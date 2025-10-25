/**
 * Book Appointment API
 * Creates a new appointment and sends confirmation notification
 */
import { NextRequest, NextResponse } from 'next/server';
export declare function POST(request: NextRequest): Promise<NextResponse<{
    success: boolean;
    error: string;
}> | NextResponse<{
    success: boolean;
    data: {
        appointment: {
            id: any;
            title: any;
            startTime: any;
            endTime: any;
            type: any;
            status: any;
            clinician: {
                name: string;
                email: any;
            };
        };
    };
    message: string;
}>>;
//# sourceMappingURL=route.d.ts.map