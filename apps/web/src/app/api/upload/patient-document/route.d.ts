/**
 * Patient Document Upload API
 *
 * Handles file upload with encryption and cloud storage
 *
 * POST /api/upload/patient-document
 */
import { NextRequest, NextResponse } from 'next/server';
export declare const dynamic = "force-dynamic";
export declare function POST(request: NextRequest): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    success: boolean;
    file: {
        id: any;
        name: any;
        size: any;
        type: any;
        category: string;
        uploadedAt: any;
    };
}>>;
//# sourceMappingURL=route.d.ts.map