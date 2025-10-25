/**
 * Patient Medications API
 *
 * GET /api/portal/medications
 * Fetch all medications for authenticated patient
 */
import { NextRequest, NextResponse } from 'next/server';
export declare function GET(request: NextRequest): Promise<NextResponse<{
    success: boolean;
    data: {
        medications: any;
        summary: {
            total: any;
            active: any;
            inactive: any;
            needsRefill: number;
        };
        activeMedications: any;
        inactiveMedications: any;
        needsRefill: any[];
    };
}> | NextResponse<{
    success: boolean;
    error: string;
}>>;
//# sourceMappingURL=route.d.ts.map