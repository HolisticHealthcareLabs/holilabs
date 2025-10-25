/**
 * Patient Search API
 *
 * GET /api/search/patients?q=query&filter=active
 * Search patients by name, MRN, Token ID, CNS, CPF
 */
import { NextRequest, NextResponse } from 'next/server';
export declare const dynamic = "force-dynamic";
/**
 * GET /api/search/patients
 * Search patients across multiple fields
 */
export declare function GET(request: NextRequest): Promise<NextResponse<{
    success: boolean;
    data: never[];
    message: string;
}> | NextResponse<{
    success: boolean;
    data: any;
    meta: {
        query: string;
        filter: string;
        count: any;
        limit: number;
    };
}> | NextResponse<{
    error: string;
    details: any;
}>>;
//# sourceMappingURL=route.d.ts.map