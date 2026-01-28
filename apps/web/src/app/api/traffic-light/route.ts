/**
 * Traffic Light API
 *
 * Unified evaluation endpoint for clinical, administrative, and billing rules.
 * Provides real-time blocking decisions for patient safety AND revenue integrity.
 *
 * Endpoints:
 * - POST /api/traffic-light/evaluate - Evaluate rules for an action
 * - POST /api/traffic-light/override - Record override decision
 * - GET /api/traffic-light/rules - Get active rules (admin)
 *
 * LGPD Article 20 Compliance:
 * - Every signal includes regulatory reference
 * - Messages provided in Portuguese
 * - Human override always possible with justification
 *
 * @module api/traffic-light
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyInternalAgentToken } from '@/lib/hash';
import { trafficLightEngine } from '@/lib/traffic-light/engine';
import { assuranceCaptureService } from '@/services/assurance-capture.service';
import { createAuditLog } from '@/lib/audit';
import logger from '@/lib/logger';
import { emitTrafficLightEvent } from '@/lib/socket-server';
import type { EvaluationAction } from '@/lib/traffic-light/types';

export const dynamic = 'force-dynamic';

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

const evaluateSchema = z.object({
  patientId: z.string().min(1),
  action: z.enum(['order', 'prescription', 'procedure', 'diagnosis', 'billing', 'admission', 'discharge']),
  payload: z.object({
    // Medication fields
    medication: z
      .object({
        name: z.string(),
        dose: z.string().optional(),
        frequency: z.string().optional(),
        route: z.string().optional(),
      })
      .optional(),

    // Procedure fields
    procedure: z
      .object({
        code: z.string(),
        description: z.string().optional(),
        quantity: z.number().optional(),
      })
      .optional(),

    // Diagnosis fields
    diagnosis: z
      .object({
        icd10Code: z.string(),
        description: z.string().optional(),
      })
      .optional(),

    // Billing fields
    tissCode: z.string().optional(),
    billedAmount: z.number().optional(),
    priorAuthStatus: z.enum(['pending', 'approved', 'denied', 'not_required']).optional(),
    priorAuthExpiry: z.string().optional(),
    opmeItems: z.array(z.string()).optional(),
    opmeAuthApproved: z.boolean().optional(),

    // Documentation fields
    providedDocuments: z.array(z.string()).optional(),
    informedConsentSigned: z.boolean().optional(),
    lgpdConsentSigned: z.boolean().optional(),
    patientIdentificationVerified: z.boolean().optional(),
    preopEvaluationDate: z.string().optional(),

    // Team fields
    surgicalTeam: z
      .object({
        surgeon: z.boolean().optional(),
        anesthesiologist: z.boolean().optional(),
        assistant: z.boolean().optional(),
      })
      .optional(),

    // Flags
    isInvasive: z.boolean().optional(),
    dataSharing: z.boolean().optional(),
  }),
  inputContextSnapshot: z.record(z.unknown()).optional(),
  clinicId: z.string().optional(),
});

const overrideSchema = z.object({
  evaluationId: z.string().min(1),
  patientId: z.string().min(1),
  action: z.enum(['order', 'prescription', 'procedure', 'diagnosis', 'billing', 'admission', 'discharge']),
  signals: z.array(
    z.object({
      ruleId: z.string(),
      color: z.enum(['RED', 'YELLOW', 'GREEN']),
    })
  ),
  overrideDecision: z.object({
    proceed: z.boolean(),
    justification: z.string().min(10).max(2000),
    supervisorApproval: z
      .object({
        supervisorId: z.string(),
        approvedAt: z.string(),
      })
      .optional(),
  }),
});

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH HELPER
// ═══════════════════════════════════════════════════════════════════════════════

async function authenticateRequest(
  req: NextRequest
): Promise<{ userId: string; clinicId?: string } | null> {
  const internalToken = req.headers.get('X-Agent-Internal-Token');

  if (internalToken && verifyInternalAgentToken(internalToken)) {
    const userEmail = req.headers.get('X-Agent-User-Email');
    const headerUserId = req.headers.get('X-Agent-User-Id');
    const headerClinicId = req.headers.get('X-Agent-Clinic-Id');

    if (userEmail) {
      const dbUser = await prisma.user.findFirst({
        where: { OR: [{ id: headerUserId || '' }, { email: userEmail }] },
        select: { id: true },
      });

      if (dbUser) {
        return { userId: dbUser.id, clinicId: headerClinicId || undefined };
      }
    }
  }

  const session = await auth();
  const user = session?.user as { id?: string } | undefined;

  if (!user?.id) {
    return null;
  }

  // Get clinicId from database if needed
  return { userId: user.id, clinicId: undefined };
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST: Evaluate Traffic Light
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Check if this is an override request
    if (body.overrideDecision) {
      return handleOverride(req, body, authResult);
    }

    // Otherwise, evaluate traffic light
    const validation = evaluateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validation.error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    const { patientId, action, payload, inputContextSnapshot, clinicId } = validation.data;

    logger.info({
      event: 'traffic_light_request',
      action,
      patientId: patientId.substring(0, 8) + '...',
      userId: authResult.userId,
    });

    // Evaluate all rules
    const result = await trafficLightEngine.evaluate({
      patientId,
      action: action as EvaluationAction,
      payload,
      inputContextSnapshot: inputContextSnapshot || { ...payload },
      clinicId: clinicId || authResult.clinicId,
    });

    // Emit Socket.IO event for real-time UI updates
    emitTrafficLightEvent({
      evaluationId: result.metadata.patientIdHash || 'unknown',
      patientId,
      action,
      color: result.color,
      signalCount: result.signals.length,
      overridden: false,
      clinicId: clinicId || authResult.clinicId,
      userId: authResult.userId,
    });

    // Add response headers for RLHF tracking
    const response = NextResponse.json({
      success: true,
      data: {
        color: result.color,
        signals: result.signals,
        canOverride: result.canOverride,
        overrideRequires: result.overrideRequires,
        totalGlosaRisk: result.totalGlosaRisk,
        needsChatAssistance: result.needsChatAssistance,
        summary: result.summary,
      },
      metadata: {
        ...result.metadata,
        serverLatencyMs: Date.now() - startTime,
      },
    });

    // Add tracking header for frontend to use in override requests
    response.headers.set('X-Evaluation-Id', result.metadata.patientIdHash || 'unknown');

    return response;
  } catch (error) {
    logger.error({
      event: 'traffic_light_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'Failed to evaluate traffic light',
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : 'Unknown error',
        }),
      },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// OVERRIDE HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

async function handleOverride(
  req: NextRequest,
  body: unknown,
  authResult: { userId: string; clinicId?: string }
): Promise<NextResponse> {
  const validation = overrideSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Validation error',
        details: validation.error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      },
      { status: 400 }
    );
  }

  const { patientId, action, signals, overrideDecision } = validation.data;

  // Check if supervisor approval is required but not provided
  const hasRedSignal = signals.some((s) => s.color === 'RED');
  if (hasRedSignal && !overrideDecision.supervisorApproval) {
    return NextResponse.json(
      {
        error: 'Supervisor approval required for RED signal override',
        code: 'SUPERVISOR_REQUIRED',
      },
      { status: 403 }
    );
  }

  logger.info({
    event: 'traffic_light_override',
    action,
    proceed: overrideDecision.proceed,
    signalCount: signals.length,
    hasRedSignal,
    userId: authResult.userId,
  });

  // Capture for RLHF - this is the "conflict" data that makes the model valuable
  try {
    const captureResult = await assuranceCaptureService.captureAIEvent({
      patientId,
      eventType: action === 'billing' ? 'BILLING' : 'ALERT',
      clinicId: authResult.clinicId || 'unknown',
      inputContextSnapshot: { action, signals },
      aiRecommendation: {
        trafficLightColor: signals.some((s) => s.color === 'RED')
          ? 'RED'
          : signals.some((s) => s.color === 'YELLOW')
            ? 'YELLOW'
            : 'GREEN',
        signals: signals.map((s) => s.ruleId),
        recommendedAction: 'block',
      },
      aiProvider: 'rules-engine',
    });

    // Record human decision
    await assuranceCaptureService.recordHumanDecision(captureResult.eventId, {
      decision: {
        proceed: overrideDecision.proceed,
        overriddenSignals: signals.map((s) => s.ruleId),
      },
      override: true,
      reason: overrideDecision.justification,
    });

    // Audit log
    await createAuditLog(
      {
        action: 'UPDATE',
        resource: 'TrafficLight',
        resourceId: patientId,
        details: {
          type: 'override',
          signals: signals.map((s) => s.ruleId),
          proceed: overrideDecision.proceed,
          hasSupervision: !!overrideDecision.supervisorApproval,
        },
        success: true,
      },
      req
    );

    // Emit Socket.IO event for traffic light override
    emitTrafficLightEvent({
      evaluationId: captureResult.eventId,
      patientId,
      action,
      color: signals.some((s) => s.color === 'RED')
        ? 'RED'
        : signals.some((s) => s.color === 'YELLOW')
          ? 'YELLOW'
          : 'GREEN',
      signalCount: signals.length,
      overridden: true,
      clinicId: authResult.clinicId,
      userId: authResult.userId,
    });

    return NextResponse.json({
      success: true,
      data: {
        overrideAccepted: true,
        eventId: captureResult.eventId,
        message: overrideDecision.proceed
          ? 'Override accepted. Proceed with caution.'
          : 'Override recorded. Action blocked.',
        messagePortuguese: overrideDecision.proceed
          ? 'Override aceito. Prosseguir com cautela.'
          : 'Override registrado. Acao bloqueada.',
      },
    });
  } catch (error) {
    logger.error({
      event: 'traffic_light_override_capture_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Still return success - the override was valid, just logging failed
    return NextResponse.json({
      success: true,
      data: {
        overrideAccepted: true,
        message: 'Override accepted (logging failed).',
        messagePortuguese: 'Override aceito (log falhou).',
      },
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET: Get Active Rules (Admin)
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rules = trafficLightEngine.getRules();

    // Format rules for response (without evaluate functions)
    const formattedRules = {
      clinical: rules.clinical.map((r) => ({
        id: r.id,
        name: r.name,
        category: r.category,
        defaultColor: r.defaultColor,
        isActive: r.isActive,
        description: r.description,
        descriptionPortuguese: r.descriptionPortuguese,
        regulatoryReference: r.regulatoryReference,
      })),
      administrative: rules.administrative.map((r) => ({
        id: r.id,
        name: r.name,
        category: r.category,
        defaultColor: r.defaultColor,
        isActive: r.isActive,
        description: r.description,
        descriptionPortuguese: r.descriptionPortuguese,
        regulatoryReference: r.regulatoryReference,
      })),
      billing: rules.billing.map((r) => ({
        id: r.id,
        name: r.name,
        category: r.category,
        defaultColor: r.defaultColor,
        isActive: r.isActive,
        description: r.description,
        descriptionPortuguese: r.descriptionPortuguese,
        regulatoryReference: r.regulatoryReference,
        glosaRiskWeight: r.glosaRiskWeight,
      })),
    };

    return NextResponse.json({
      success: true,
      data: {
        rules: formattedRules,
        summary: {
          clinical: rules.clinical.length,
          administrative: rules.administrative.length,
          billing: rules.billing.length,
          total: rules.clinical.length + rules.administrative.length + rules.billing.length,
        },
      },
    });
  } catch (error) {
    logger.error({
      event: 'traffic_light_get_rules_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json({ error: 'Failed to get rules' }, { status: 500 });
  }
}
