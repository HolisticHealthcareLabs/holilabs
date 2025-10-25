/**
 * Patient Context API
 *
 * Generate formatted patient context for AI prompts
 *
 * GET /api/ai/patient-context?patientId=xxx&format=full|soap|scribe|summary
 */
import { NextRequest, NextResponse } from 'next/server';
export declare const dynamic = "force-dynamic";
export declare function GET(request: NextRequest): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    success: boolean;
    patient: {
        id: any;
        name: string;
        mrn: any;
    };
    format: string;
    context: any;
}>>;
//# sourceMappingURL=route.d.ts.map