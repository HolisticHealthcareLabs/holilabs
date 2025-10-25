/**
 * Patient API - Individual Operations
 *
 * GET    /api/patients/[id] - Get patient details
 * PUT    /api/patients/[id] - Update patient
 * DELETE /api/patients/[id] - Soft delete patient
 */
import { NextRequest, NextResponse } from 'next/server';
export declare const dynamic = "force-dynamic";
/**
 * GET /api/patients/[id]
 * Get detailed patient information
 */
export declare function GET(request: NextRequest, { params }: {
    params: {
        id: string;
    };
}): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    success: boolean;
    data: any;
}>>;
/**
 * PUT /api/patients/[id]
 * Update patient information
 */
export declare function PUT(request: NextRequest, { params }: {
    params: {
        id: string;
    };
}): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    success: boolean;
    data: any;
    message: string;
}>>;
/**
 * DELETE /api/patients/[id]
 * Soft delete patient (set isActive = false)
 */
export declare function DELETE(request: NextRequest, { params }: {
    params: {
        id: string;
    };
}): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    success: boolean;
    message: string;
}>>;
//# sourceMappingURL=route.d.ts.map