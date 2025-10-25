/**
 * Patient API - List and Create
 *
 * GET  /api/patients - List patients with pagination
 * POST /api/patients - Create new patient
 */
import { NextResponse } from 'next/server';
export declare const dynamic = "force-dynamic";
/**
 * GET /api/patients
 * List patients with pagination and filtering
 * SECURITY: Enforces tenant isolation - users can only access their own patients
 */
export declare const GET: any;
/**
 * POST /api/patients
 * Create new patient with blockchain hash
 */
export declare function POST(request: Request): Promise<NextResponse<{
    success: boolean;
    data: any;
    message: string;
}> | NextResponse<{
    error: string;
}>>;
//# sourceMappingURL=route.d.ts.map