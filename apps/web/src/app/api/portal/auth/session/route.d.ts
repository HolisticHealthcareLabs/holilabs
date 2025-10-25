/**
 * Patient Session API
 *
 * GET /api/portal/auth/session - Get current patient session
 */
import { NextRequest, NextResponse } from 'next/server';
export declare const dynamic = "force-dynamic";
export declare function GET(request: NextRequest): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    success: boolean;
    session: {
        patientUserId: any;
        patientId: any;
        email: any;
        expiresAt: string;
    };
    patient: {
        id: any;
        mrn: any;
        firstName: any;
        lastName: any;
        dateOfBirth: any;
        gender: any;
        email: any;
        phone: any;
    };
}>>;
//# sourceMappingURL=route.d.ts.map