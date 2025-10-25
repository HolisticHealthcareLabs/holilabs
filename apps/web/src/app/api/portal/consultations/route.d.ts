/**
 * Patient Consultations API
 *
 * GET /api/portal/consultations
 * Fetch all consultation recordings for authenticated patient
 */
import { NextRequest, NextResponse } from 'next/server';
export declare function GET(request: NextRequest): Promise<NextResponse<{
    success: boolean;
    data: any[];
}> | NextResponse<{
    success: boolean;
    error: string;
}>>;
//# sourceMappingURL=route.d.ts.map