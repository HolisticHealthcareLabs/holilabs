/**
 * AI Diagnosis Assistant API
 *
 * Law 3 Compliance: Design for Failure
 * Uses symptomDiagnosisEngine with processWithFallback() - 100% reliability.
 *
 * Law 4 Compliance: Hybrid Core
 * AI generates insights, deterministic rules execute when AI fails.
 *
 * Law 5 Compliance: Data Contract
 * All AI outputs validated via Zod schemas.
 *
 * Clinical decision support system that provides:
 * - Differential diagnosis based on symptoms
 * - Red flag identification
 * - Recommended diagnostic workup
 * - Specialist referral recommendations
 *
 * Usage: POST /api/clinical/diagnosis
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { trackUsage } from '@/lib/ai/usage-tracker';
import { prisma } from '@/lib/prisma';
import {
  sanitizeString,
  validateArray,
  sanitizeMedicationName,
} from '@/lib/security/validation';
import { createAuditLog } from '@/lib/audit';
import { symptomDiagnosisEngine } from '@/lib/clinical/engines/symptom-diagnosis-engine';
import type { SymptomInput, PatientContext } from '@holilabs/shared-types';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface DiagnosisRequest {
  // Patient Information
  patientId?: string;
  age: number;
  sex: 'M' | 'F' | 'Other';

  // Clinical Presentation
  chiefComplaint: string;
  symptoms: string[];
  symptomDuration?: string;
  symptomOnset?: 'sudden' | 'gradual';

  // Medical History
  medicalHistory?: string[];
  medications?: string[];
  allergies?: string[];
  familyHistory?: string[];

  // Vital Signs
  vitalSigns?: {
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
    respiratoryRate?: number;
    oxygenSaturation?: number;
  };

  // Physical Exam
  physicalExam?: string;

  // Lab Results
  labResults?: {
    name: string;
    value: string;
    unit?: string;
    normalRange?: string;
  }[];
}

interface DiagnosisResponse {
  success: boolean;
  diagnosis?: {
    // Differential Diagnosis
    differentialDiagnosis: {
      condition: string;
      probability: 'high' | 'moderate' | 'low';
      reasoning: string;
      icd10Code?: string;
    }[];

    // Red Flags
    redFlags: {
      flag: string;
      severity: 'critical' | 'serious' | 'monitor';
      action: string;
    }[];

    // Recommended Workup
    diagnosticWorkup: {
      test: string;
      priority: 'urgent' | 'routine' | 'optional';
      reasoning: string;
    }[];

    // Referrals
    referrals: {
      specialty: string;
      urgency: 'immediate' | 'urgent' | 'routine';
      reason: string;
    }[];

    // Clinical Reasoning
    clinicalReasoning: string;

    // Follow-up
    followUp: {
      timeframe: string;
      instructions: string;
    };
  };

  // Usage Tracking
  usage?: {
    provider: string;
    tokens: number;
    cost: number;
    responseTime: number;
  };

  // Rate Limiting
  quotaInfo?: {
    dailyUsed: number;
    dailyLimit: number;
    remaining: number;
  };

  error?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<DiagnosisResponse>> {
  const startTime = Date.now();

  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body: DiagnosisRequest = await req.json();

    // 3. Validate and sanitize inputs
    // Validate required fields
    if (!body.chiefComplaint || !body.symptoms || body.symptoms.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Chief complaint and symptoms are required' },
        { status: 400 }
      );
    }

    // Validate age
    if (typeof body.age !== 'number' || body.age < 0 || body.age > 150) {
      return NextResponse.json(
        { success: false, error: 'Invalid age (must be 0-150)' },
        { status: 400 }
      );
    }

    // Validate and sanitize text fields
    try {
      body.chiefComplaint = sanitizeString(body.chiefComplaint, 1000);

      if (body.physicalExam) {
        body.physicalExam = sanitizeString(body.physicalExam, 5000);
      }

      if (body.symptomDuration) {
        body.symptomDuration = sanitizeString(body.symptomDuration, 200);
      }
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    // Validate arrays
    try {
      validateArray(body.symptoms, 50, (item: any) => typeof item === 'string');
      body.symptoms = body.symptoms.map(s => sanitizeString(s, 200));

      if (body.medicalHistory) {
        validateArray(body.medicalHistory, 50, (item: any) => typeof item === 'string');
        body.medicalHistory = body.medicalHistory.map(s => sanitizeString(s, 200));
      }

      if (body.medications) {
        validateArray(body.medications, 50, (item: any) => typeof item === 'string');
        body.medications = body.medications.map(m => sanitizeMedicationName(m));
      }

      if (body.allergies) {
        validateArray(body.allergies, 50, (item: any) => typeof item === 'string');
        body.allergies = body.allergies.map(a => sanitizeString(a, 200));
      }

      if (body.familyHistory) {
        validateArray(body.familyHistory, 50, (item: any) => typeof item === 'string');
        body.familyHistory = body.familyHistory.map(f => sanitizeString(f, 200));
      }

      if (body.labResults) {
        validateArray(body.labResults, 50, (item: any) => typeof item === 'object');
        body.labResults = body.labResults.map(lab => ({
          name: sanitizeString(lab.name, 100),
          value: sanitizeString(lab.value, 100),
          unit: lab.unit ? sanitizeString(lab.unit, 50) : undefined,
          normalRange: lab.normalRange ? sanitizeString(lab.normalRange, 100) : undefined,
        }));
      }
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    // Validate vital signs if provided
    if (body.vitalSigns) {
      if (body.vitalSigns.bloodPressure) {
        body.vitalSigns.bloodPressure = sanitizeString(body.vitalSigns.bloodPressure, 20);
      }
      if (body.vitalSigns.heartRate && (body.vitalSigns.heartRate < 0 || body.vitalSigns.heartRate > 300)) {
        return NextResponse.json(
          { success: false, error: 'Invalid heart rate' },
          { status: 400 }
        );
      }
      if (body.vitalSigns.temperature && (body.vitalSigns.temperature < 20 || body.vitalSigns.temperature > 50)) {
        return NextResponse.json(
          { success: false, error: 'Invalid temperature' },
          { status: 400 }
        );
      }
      if (body.vitalSigns.respiratoryRate && (body.vitalSigns.respiratoryRate < 0 || body.vitalSigns.respiratoryRate > 100)) {
        return NextResponse.json(
          { success: false, error: 'Invalid respiratory rate' },
          { status: 400 }
        );
      }
      if (body.vitalSigns.oxygenSaturation && (body.vitalSigns.oxygenSaturation < 0 || body.vitalSigns.oxygenSaturation > 100)) {
        return NextResponse.json(
          { success: false, error: 'Invalid oxygen saturation' },
          { status: 400 }
        );
      }
    }

    // 4. Check user's subscription tier and quota
    const subscriptionTier = await prisma.subscriptionTier.findUnique({
      where: { userId: (session.user as any).id },
    });

    const tier = subscriptionTier?.tier || 'FREE';
    const dailyUsed = subscriptionTier?.dailyAIUsed || 0;
    const dailyLimit = subscriptionTier?.dailyAILimit || 10;

    // Enforce rate limiting
    if (dailyUsed >= dailyLimit) {
      return NextResponse.json(
        {
          success: false,
          error: 'Daily AI query limit reached',
          quotaInfo: {
            dailyUsed,
            dailyLimit,
            remaining: 0,
          },
        },
        { status: 429 }
      );
    }

    // 5. Build symptom input for engine (Law 2: Interface First)
    const symptomInput: SymptomInput = {
      chiefComplaint: body.chiefComplaint,
      duration: body.symptomDuration,
      severity: undefined, // Could map from body if available
      associatedSymptoms: body.symptoms,
      aggravatingFactors: undefined,
      relievingFactors: undefined,
    };

    // 6. Build patient context for engine
    const patientContext: PatientContext = {
      patientId: body.patientId || 'anonymous',
      age: body.age,
      sex: body.sex === 'Other' ? 'O' : body.sex,
      diagnoses: body.medicalHistory?.map((condition, idx) => ({
        id: `hist_${idx}_${Date.now()}`,
        icd10Code: 'Z87.89', // Other personal history
        name: condition,
        clinicalStatus: 'ACTIVE' as const,
      })) || [],
      medications: body.medications?.map((med, idx) => ({
        id: `med_${idx}_${Date.now()}`,
        name: med,
        rxNormCode: undefined,
        status: 'ACTIVE' as const,
      })) || [],
      allergies: body.allergies?.map((allergy, idx) => ({
        id: `allergy_${idx}_${Date.now()}`,
        allergen: allergy,
        type: 'OTHER' as const,
        severity: 'moderate' as const,
        status: 'ACTIVE' as const,
      })) || [],
      recentLabs: body.labResults?.map((lab, idx) => ({
        id: `lab_${idx}_${Date.now()}`,
        name: lab.name,
        value: lab.value,
        unit: lab.unit || '',
        resultDate: new Date().toISOString(),
      })) || [],
    };

    logger.info({
      event: 'diagnosis_api_engine_call',
      patientId: body.patientId,
      chiefComplaint: body.chiefComplaint,
      symptomCount: body.symptoms.length,
    });

    // 7. Use SymptomDiagnosisEngine with built-in fallback (Law 3: Design for Failure)
    const result = await symptomDiagnosisEngine.evaluate(symptomInput, patientContext);

    const responseTime = Date.now() - startTime;

    logger.info({
      event: 'diagnosis_api_engine_complete',
      method: result.method,
      confidence: result.confidence,
      differentialCount: result.data.differentials.length,
      latencyMs: responseTime,
    });

    // 8. Transform engine output to legacy response format for backwards compatibility
    const diagnosis = transformToLegacyFormat(result);

    // 9. Track usage in database (fallback uses no AI provider, record as claude with 0 tokens)
    await trackUsage({
      provider: 'claude', // Always record as claude since that's the primary provider
      userId: (session.user as any).id,
      promptTokens: result.aiLatencyMs ? 500 : 0, // Estimated if AI was used
      completionTokens: result.aiLatencyMs ? 1000 : 0,
      totalTokens: result.aiLatencyMs ? 1500 : 0,
      responseTimeMs: responseTime,
      fromCache: false,
      queryComplexity: 'complex',
      feature: 'diagnosis_assistant',
    });

    // 10. Update user's daily usage count
    if (subscriptionTier) {
      await prisma.subscriptionTier.update({
        where: { userId: (session.user as any).id },
        data: {
          dailyAIUsed: dailyUsed + 1,
          monthlyAIUsed: { increment: 1 },
        },
      });
    } else {
      // Create default FREE tier for user if doesn't exist
      await prisma.subscriptionTier.create({
        data: {
          userId: (session.user as any).id,
          tier: 'FREE',
          dailyAIUsed: 1,
          monthlyAIUsed: 1,
          dailyAILimit: 10,
          monthlyAILimit: 300,
        },
      });
    }

    // 11. HIPAA Audit Log: AI diagnosis assistant used for patient
    await createAuditLog({
      action: 'CREATE',
      resource: 'DiagnosisAssistant',
      resourceId: body.patientId || 'clinical-assessment',
      details: {
        patientId: body.patientId,
        patientAge: body.age,
        chiefComplaint: body.chiefComplaint,
        symptomsCount: body.symptoms.length,
        differentialDiagnosisCount: result.data.differentials.length,
        redFlagsCount: result.data.differentials.reduce((sum, d) => sum + d.redFlags.length, 0),
        processingMethod: result.method,
        confidence: result.confidence,
        fallbackReason: result.fallbackReason,
        responseTimeMs: responseTime,
        accessType: 'AI_DIAGNOSIS_ASSISTANT',
      },
      success: true,
    }, req);

    // 12. Return diagnosis with processing metadata
    return NextResponse.json({
      success: true,
      diagnosis,
      metadata: {
        processingMethod: result.method,
        confidence: result.confidence,
        fallbackReason: result.fallbackReason,
        urgency: result.data.urgency,
      },
      usage: {
        provider: result.method === 'ai' ? 'claude' : 'deterministic-fallback',
        tokens: result.aiLatencyMs ? 1500 : 0,
        cost: result.method === 'ai' ? 0.005 : 0, // Estimated
        responseTime,
      },
      quotaInfo: {
        dailyUsed: dailyUsed + 1,
        dailyLimit,
        remaining: dailyLimit - dailyUsed - 1,
      },
    });

  } catch (error: any) {
    console.error('[Diagnosis API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate diagnosis',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
      { status: 500 }
    );
  }
}

/**
 * Transform engine output to legacy response format for backwards compatibility.
 * This maintains API contract while using the new Law-compliant engine internally.
 */
function transformToLegacyFormat(
  result: import('@/lib/clinical/process-with-fallback').ProcessingResult<import('@holilabs/shared-types').DiagnosisOutput>
): DiagnosisResponse['diagnosis'] {
  const data = result.data;

  return {
    differentialDiagnosis: data.differentials.map((d) => ({
      condition: d.name,
      probability: probabilityToLevel(d.probability),
      reasoning: d.reasoning,
      icd10Code: d.icd10Code,
    })),
    redFlags: data.differentials.flatMap((d) =>
      d.redFlags.map((flag) => ({
        flag,
        severity: 'serious' as const, // Default severity
        action: 'Evaluate immediately',
      }))
    ),
    diagnosticWorkup: data.differentials.flatMap((d) =>
      d.workupSuggestions.map((test) => ({
        test,
        priority: 'routine' as const,
        reasoning: `Recommended for ${d.name}`,
      }))
    ),
    referrals: data.urgency === 'emergent'
      ? [
          {
            specialty: 'Emergency Medicine',
            urgency: 'immediate' as const,
            reason: 'Emergent condition identified',
          },
        ]
      : [],
    clinicalReasoning: data.differentials
      .slice(0, 3)
      .map((d) => `${d.name} (${(d.probability * 100).toFixed(0)}%): ${d.reasoning}`)
      .join('\n\n'),
    followUp: {
      timeframe: urgencyToFollowUp(data.urgency),
      instructions:
        result.method === 'fallback'
          ? 'Deterministic analysis used. Recommend clinical review.'
          : 'AI-assisted analysis. Clinical correlation recommended.',
    },
  };
}

/**
 * Convert numeric probability to categorical level
 */
function probabilityToLevel(probability: number): 'high' | 'moderate' | 'low' {
  if (probability >= 0.6) return 'high';
  if (probability >= 0.3) return 'moderate';
  return 'low';
}

/**
 * Convert urgency to follow-up timeframe
 */
function urgencyToFollowUp(urgency: 'emergent' | 'urgent' | 'routine'): string {
  switch (urgency) {
    case 'emergent':
      return 'Immediate';
    case 'urgent':
      return 'Within 24-48 hours';
    case 'routine':
      return 'Within 1-2 weeks';
    default:
      return 'As clinically indicated';
  }
}
