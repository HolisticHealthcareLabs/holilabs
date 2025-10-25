/**
 * Medication Refill Request API
 *
 * POST /api/portal/medications/[id]/refill
 * Request a refill for a medication
 */
import { NextRequest, NextResponse } from 'next/server';
export declare function POST(request: NextRequest, { params }: {
    params: {
        id: string;
    };
}): Promise<NextResponse<{
    success: boolean;
    error: string;
}> | NextResponse<{
    success: boolean;
    message: string;
    data: {
        id: string;
        medicationId: any;
        patientId: any;
        status: string;
        requestedAt: string;
        notes: string | undefined;
        pharmacy: string | undefined;
    };
}>>;
//# sourceMappingURL=route.d.ts.map