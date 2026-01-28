/**
 * Clinical Intelligence API - Master Decision Flow
 *
 * Law 3 Compliance: Design for Failure
 * Uses processWithFallback() pattern - 100% reliability even if AI fails.
 *
 * Law 4 Compliance: Hybrid Core
 * AI generates insights, deterministic code executes decisions.
 *
 * Law 6 Compliance: LLM-as-Judge
 * Every AI interaction graded asynchronously.
 *
 * Law 7 Compliance: Context Merging
 * AI output combined with patient history before rules engine.
 *
 * Usage: POST /api/clinical/decision
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import * as crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

/**
 * Verify internal agent gateway token (HMAC-signed, 1-minute validity)
 */
function verifyInternalToken(token: string | null): boolean {
  if (!token) return false;
  const secret = process.env.NEXTAUTH_SECRET || 'dev-secret';
  const now = Math.floor(Date.now() / 60000);
  for (const timestamp of [now, now - 1]) {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`agent-internal:${timestamp}`)
      .digest('hex');
    if (token === expected) return true;
  }
  return false;
}
import {
  processClinicalDecision,
  processDiagnosisOnly,
  processTreatmentOnly,
} from '@/lib/clinical/process-clinical-decision';
import { createAuditLog } from '@/lib/audit';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// ═══════════════════════════════════════════════════════════════
// REQUEST VALIDATION
// ═══════════════════════════════════════════════════════════════

const vitalSignsSchema = z.object({
  systolicBp: z.number().min(50).max(300).optional(),
  diastolicBp: z.number().min(20).max(200).optional(),
  heartRate: z.number().min(20).max(300).optional(),
  temperature: z.number().min(30).max(45).optional(),
  respiratoryRate: z.number().min(4).max(60).optional(),
  oxygenSaturation: z.number().min(50).max(100).optional(),
  weight: z.number().min(0.5).max(500).optional(),
  height: z.number().min(20).max(300).optional(),
}).optional();

const aiScribeOutputSchema = z.object({
  chiefComplaint: z.string().min(1).max(1000).optional(),
  vitalSigns: vitalSignsSchema,
  symptoms: z.array(z.string().max(200)).max(50).optional(),
  medicationsMentioned: z.array(z.string().max(200)).max(50).optional(),
  allergiesMentioned: z.array(z.string().max(200)).max(50).optional(),
  assessmentNotes: z.string().max(5000).optional(),
  duration: z.string().max(200).optional(),
  severity: z.enum(['mild', 'moderate', 'severe']).optional(),
});

const requestSchema = z.object({
  patientId: z.string().min(1),
  aiScribeOutput: aiScribeOutputSchema,
  mode: z.enum(['full', 'diagnosis-only', 'treatment-only']).optional().default('full'),
  icd10Code: z.string().optional(), // Required for treatment-only mode
});

// ═══════════════════════════════════════════════════════════════
// RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════

interface ClinicalDecisionResponse {
  success: boolean;
  data?: {
    interactionId: string;
    patientId: string;
    diagnosis?: {
      differentials: Array<{
        icd10Code: string;
        name: string;
        probability: number;
        confidence: string;
        reasoning: string;
        redFlags: string[];
        workupSuggestions: string[];
      }>;
      urgency: 'emergent' | 'urgent' | 'routine';
    };
    treatments?: Array<{
      recommendations: Array<{
        type: string;
        priority: string;
        medication?: {
          name: string;
          dose?: string;
          frequency?: string;
        };
        rationale: string;
        evidenceGrade: string;
        contraindications: string[];
      }>;
    }>;
    alerts: Array<{
      type: string;
      severity: string;
      message: string;
      items?: string[];
    }>;
    processingMethods: {
      diagnosis?: 'ai' | 'fallback' | 'hybrid';
      treatments?: Array<'ai' | 'fallback' | 'hybrid'>;
    };
    timestamp: string;
  };
  metadata?: {
    mode: string;
    latencyMs: number;
    fallbackUsed: boolean;
  };
  error?: string;
}

// ═══════════════════════════════════════════════════════════════
// API HANDLER
// ═══════════════════════════════════════════════════════════════

export async function POST(req: NextRequest): Promise<NextResponse<ClinicalDecisionResponse>> {
  const startTime = Date.now();

  try {
    // 1. Authenticate user (internal token or session)
    let userId: string | undefined;
    const internalToken = req.headers.get('X-Agent-Internal-Token');

    if (internalToken && verifyInternalToken(internalToken)) {
      const userEmail = req.headers.get('X-Agent-User-Email');
      const headerUserId = req.headers.get('X-Agent-User-Id');
      if (userEmail) {
        const dbUser = await prisma.user.findFirst({
          where: { OR: [{ id: headerUserId || '' }, { email: userEmail }] },
          select: { id: true },
        });
        userId = dbUser?.id;
      }
    }

    // Fall back to session auth
    if (!userId) {
      const session = await auth();
      userId = (session?.user as any)?.id;
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse and validate request
    const body = await req.json();
    const validationResult = requestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Validation error: ${validationResult.error.errors.map(e => e.message).join(', ')}`,
        },
        { status: 400 }
      );
    }

    const { patientId, aiScribeOutput, mode, icd10Code } = validationResult.data;

    // 3. Check patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true },
    });

    if (!patient) {
      return NextResponse.json(
        { success: false, error: 'Patient not found' },
        { status: 404 }
      );
    }

    // 4. Validate mode-specific requirements
    if (mode === 'treatment-only' && !icd10Code) {
      return NextResponse.json(
        { success: false, error: 'icd10Code is required for treatment-only mode' },
        { status: 400 }
      );
    }

    logger.info({
      event: 'clinical_decision_api_start',
      patientId,
      mode,
      hasChiefComplaint: !!aiScribeOutput.chiefComplaint,
      symptomCount: aiScribeOutput.symptoms?.length || 0,
    });

    // 4. Process based on mode
    let response: ClinicalDecisionResponse;

    switch (mode) {
      case 'diagnosis-only': {
        if (!aiScribeOutput.chiefComplaint) {
          return NextResponse.json(
            { success: false, error: 'chiefComplaint is required for diagnosis mode' },
            { status: 400 }
          );
        }

        const diagnosisResult = await processDiagnosisOnly(patientId, {
          chiefComplaint: aiScribeOutput.chiefComplaint,
          duration: aiScribeOutput.duration,
          severity: aiScribeOutput.severity,
          associatedSymptoms: aiScribeOutput.symptoms,
        });

        response = {
          success: true,
          data: {
            interactionId: `diagnosis_${Date.now()}`,
            patientId,
            diagnosis: diagnosisResult.data,
            alerts: [],
            processingMethods: {
              diagnosis: diagnosisResult.method,
            },
            timestamp: new Date().toISOString(),
          },
          metadata: {
            mode: 'diagnosis-only',
            latencyMs: Date.now() - startTime,
            fallbackUsed: diagnosisResult.method === 'fallback',
          },
        };
        break;
      }

      case 'treatment-only': {
        const treatmentResult = await processTreatmentOnly(patientId, icd10Code!);

        response = {
          success: true,
          data: {
            interactionId: `treatment_${Date.now()}`,
            patientId,
            treatments: [{
              recommendations: treatmentResult.data,
            }],
            alerts: [],
            processingMethods: {
              treatments: [treatmentResult.method],
            },
            timestamp: new Date().toISOString(),
          },
          metadata: {
            mode: 'treatment-only',
            latencyMs: Date.now() - startTime,
            fallbackUsed: treatmentResult.method === 'fallback',
          },
        };
        break;
      }

      case 'full':
      default: {
        const decision = await processClinicalDecision(patientId, aiScribeOutput);

        response = {
          success: true,
          data: {
            interactionId: decision.interactionId,
            patientId: decision.patientId,
            diagnosis: decision.diagnosis.data,
            treatments: decision.treatments.map(t => ({
              recommendations: t.data,
            })),
            alerts: decision.alerts,
            processingMethods: decision.processingMethods,
            timestamp: decision.timestamp,
          },
          metadata: {
            mode: 'full',
            latencyMs: Date.now() - startTime,
            fallbackUsed:
              decision.processingMethods.diagnosis === 'fallback' ||
              decision.processingMethods.treatments.includes('fallback'),
          },
        };
        break;
      }
    }

    // 5. Audit log (HIPAA compliance)
    await createAuditLog(
      {
        action: 'CREATE',
        resource: 'ClinicalDecision',
        resourceId: patientId,
        details: {
          patientId,
          interactionId: response.data?.interactionId,
          mode,
          diagnosisMethod: response.data?.processingMethods?.diagnosis,
          treatmentMethods: response.data?.processingMethods?.treatments,
          differentialCount: response.data?.diagnosis?.differentials?.length || 0,
          alertCount: response.data?.alerts?.length || 0,
          latencyMs: response.metadata?.latencyMs,
          fallbackUsed: response.metadata?.fallbackUsed,
        },
        success: true,
      },
      req
    );

    logger.info({
      event: 'clinical_decision_api_complete',
      patientId,
      mode,
      latencyMs: Date.now() - startTime,
      fallbackUsed: response.metadata?.fallbackUsed,
    });

    return NextResponse.json(response);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error({
      event: 'clinical_decision_api_error',
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process clinical decision',
        ...(process.env.NODE_ENV === 'development' && { details: errorMessage }),
      },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// GET: Health check and capabilities
// ═══════════════════════════════════════════════════════════════

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // Check for internal agent gateway token first
    let userId: string | undefined;
    const internalToken = req.headers.get('X-Agent-Internal-Token');

    if (internalToken && verifyInternalToken(internalToken)) {
      const userEmail = req.headers.get('X-Agent-User-Email');
      const headerUserId = req.headers.get('X-Agent-User-Id');
      if (userEmail) {
        const dbUser = await prisma.user.findFirst({
          where: { OR: [{ id: headerUserId || '' }, { email: userEmail }] },
          select: { id: true },
        });
        userId = dbUser?.id;
      }
    }

    // Fall back to session auth
    if (!userId) {
      const session = await auth();
      userId = (session?.user as any)?.id;
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      service: 'Clinical Intelligence API',
      version: '2.0.0',
      capabilities: {
        modes: ['full', 'diagnosis-only', 'treatment-only'],
        features: [
          'symptom-to-diagnosis',
          'treatment-recommendations',
          'context-merging',
          'deterministic-fallback',
          'llm-as-judge-evaluation',
          'hash-chained-audit',
        ],
      },
      laws: {
        law1_logicAsData: 'Clinical rules stored in database',
        law3_designForFailure: 'processWithFallback() wraps all AI calls',
        law4_hybridCore: 'AI generates insights, code executes decisions',
        law5_dataContract: 'All AI output validated via Zod',
        law6_llmAsJudge: 'Async quality evaluation on every interaction',
        law7_contextMerging: 'Real-time AI + historical data combined',
      },
      health: 'ok',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Health check failed' },
      { status: 500 }
    );
  }
}
