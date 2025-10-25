/**
 * Available Appointment Slots API
 * Returns available time slots for a given clinician and date
 */
import { NextRequest, NextResponse } from 'next/server';
interface TimeSlot {
    time: string;
    available: boolean;
    reason?: string;
}
export declare function GET(request: NextRequest): Promise<NextResponse<{
    success: boolean;
    error: string;
}> | NextResponse<{
    success: boolean;
    data: {
        date: string;
        slots: never[];
        message: string;
    };
}> | NextResponse<{
    success: boolean;
    data: {
        clinician: {
            id: any;
            name: string;
        };
        date: string;
        slots: TimeSlot[];
        summary: {
            total: number;
            available: number;
            booked: number;
        };
    };
}>>;
export {};
//# sourceMappingURL=route.d.ts.map