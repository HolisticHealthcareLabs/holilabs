/**
 * Transcribe Recording API
 *
 * POST /api/recordings/[id]/transcribe
 * Transcribe audio using OpenAI Whisper and generate SOAP notes with GPT-4
 */
import { NextRequest, NextResponse } from 'next/server';
export declare function POST(request: NextRequest, { params }: {
    params: {
        id: string;
    };
}): Promise<NextResponse<{
    success: boolean;
    error: string;
}> | NextResponse<{
    success: boolean;
    message: string;
    data: {
        recording: any;
        transcript: string;
        soapNotes: {
            subjective: any;
            objective: any;
            assessment: any;
            plan: any;
        } | null;
        diagnosis: any;
        icd10Codes: string[];
        clinicalNote: {
            id: any;
        } | null;
    };
}>>;
//# sourceMappingURL=route.d.ts.map