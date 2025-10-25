/**
 * Patient Profile API
 *
 * GET /api/portal/profile
 * Fetch profile data for authenticated patient
 *
 * PATCH /api/portal/profile
 * Update profile data
 */
import { NextRequest, NextResponse } from 'next/server';
export declare function GET(request: NextRequest): Promise<NextResponse<{
    success: boolean;
    error: string;
}> | NextResponse<{
    success: boolean;
    data: {
        id: any;
        patientId: any;
        firstName: any;
        lastName: any;
        dateOfBirth: any;
        gender: any;
        assignedClinician: any;
        stats: {
            activeMedications: any;
            upcomingAppointments: any;
            totalDocuments: any;
        };
        createdAt: any;
    };
}>>;
export declare function PATCH(request: NextRequest): Promise<NextResponse<{
    success: boolean;
    message: string;
    data: any;
}> | NextResponse<{
    success: boolean;
    error: string;
}>>;
//# sourceMappingURL=route.d.ts.map