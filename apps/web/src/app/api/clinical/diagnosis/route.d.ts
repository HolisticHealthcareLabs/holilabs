/**
 * AI Diagnosis Assistant API
 *
 * Clinical decision support system that provides:
 * - Differential diagnosis based on symptoms
 * - Red flag identification
 * - Recommended diagnostic workup
 * - Specialist referral recommendations
 *
 * Uses Claude for critical medical decisions (high accuracy)
 * Tracks usage for cost monitoring and freemium enforcement
 *
 * Usage: POST /api/clinical/diagnosis
 */
import { NextRequest, NextResponse } from 'next/server';
export declare const dynamic = "force-dynamic";
interface DiagnosisResponse {
    success: boolean;
    diagnosis?: {
        differentialDiagnosis: {
            condition: string;
            probability: 'high' | 'moderate' | 'low';
            reasoning: string;
            icd10Code?: string;
        }[];
        redFlags: {
            flag: string;
            severity: 'critical' | 'serious' | 'monitor';
            action: string;
        }[];
        diagnosticWorkup: {
            test: string;
            priority: 'urgent' | 'routine' | 'optional';
            reasoning: string;
        }[];
        referrals: {
            specialty: string;
            urgency: 'immediate' | 'urgent' | 'routine';
            reason: string;
        }[];
        clinicalReasoning: string;
        followUp: {
            timeframe: string;
            instructions: string;
        };
    };
    usage?: {
        provider: string;
        tokens: number;
        cost: number;
        responseTime: number;
    };
    quotaInfo?: {
        dailyUsed: number;
        dailyLimit: number;
        remaining: number;
    };
    error?: string;
}
export declare function POST(req: NextRequest): Promise<NextResponse<DiagnosisResponse>>;
export {};
//# sourceMappingURL=route.d.ts.map