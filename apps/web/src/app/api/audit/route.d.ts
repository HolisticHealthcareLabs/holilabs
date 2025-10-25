/**
 * Audit Log API
 *
 * POST /api/audit - Create audit log entry
 */
import { NextResponse } from 'next/server';
export declare const dynamic = "force-dynamic";
/**
 * POST /api/audit
 * Create audit log entry for compliance
 */
export declare function POST(request: Request): Promise<NextResponse<{
    success: boolean;
    data: any;
}> | NextResponse<{
    error: string;
    details: any;
}>>;
//# sourceMappingURL=route.d.ts.map