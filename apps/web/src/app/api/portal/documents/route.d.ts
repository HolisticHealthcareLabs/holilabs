/**
 * Patient Documents API
 *
 * GET /api/portal/documents
 * Fetch all documents for authenticated patient
 *
 * POST /api/portal/documents
 * Upload a new document
 */
import { NextRequest, NextResponse } from 'next/server';
export declare function GET(request: NextRequest): Promise<NextResponse<{
    success: boolean;
    data: {
        documents: any;
        summary: {
            total: any;
            totalSizeMB: string;
            byType: Record<string, number>;
        };
        documentsByType: any;
    };
}> | NextResponse<{
    success: boolean;
    error: string;
}>>;
//# sourceMappingURL=route.d.ts.map