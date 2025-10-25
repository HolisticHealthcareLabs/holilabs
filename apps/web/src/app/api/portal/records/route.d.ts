/**
 * Patient Medical Records API
 *
 * GET /api/portal/records
 * Fetch all medical records (SOAP notes) for authenticated patient
 * with filtering, pagination, and search
 */
import { NextRequest, NextResponse } from 'next/server';
export declare function GET(request: NextRequest): Promise<NextResponse<{
    success: boolean;
    data: {
        records: any;
        pagination: {
            page: number;
            limit: number;
            totalCount: any;
            totalPages: number;
            hasNextPage: boolean;
            hasPrevPage: boolean;
        };
    };
}> | NextResponse<{
    success: boolean;
    error: string;
}>>;
//# sourceMappingURL=route.d.ts.map