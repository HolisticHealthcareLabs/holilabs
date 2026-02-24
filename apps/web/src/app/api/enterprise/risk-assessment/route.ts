/**
 * Enterprise Risk Assessment API — Blue Ocean Phase 3
 *
 * POST /api/enterprise/risk-assessment
 *
 * Single-patient risk assessment endpoint for insurer consumption.
 * Auth: x-pharma-partner-key header validated via shared enterprise auth.
 * Rate-limited: 60 requests/minute per API key.
 *
 * HARD CONSTRAINTS:
 *   1. 401 immediately if API key is wrong or missing.
 *   2. 429 if rate limit exceeded.
 *   3. Response NEVER contains PII — all output passes through enterprise-export PII scanner.
 *   4. Returns CompositeRiskScore + ActuarialConfidence only.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  calculateCompositeRisk,
  type PatientRiskInput,
  type OverrideHistoryInput,
} from '@/services/risk-calculator.service';
import {
  exportForEnterprise,
  ExportPIIViolationError,
} from '@/services/enterprise-export.service';
import { estimateClaimCost } from '@/lib/finance/tuss-lookup';
import { validateEnterpriseKey } from '@/lib/enterprise/auth';
import { checkRateLimit, SINGLE_ASSESSMENT_LIMIT } from '@/lib/enterprise/rate-limiter';
import { dataFlywheelService } from '@/services/data-flywheel.service';
import { enterpriseUsageMeter } from '@/lib/enterprise/usage-meter';

export const dynamic = 'force-dynamic';

// =============================================================================
// REQUEST SCHEMA
// =============================================================================

interface RiskAssessmentRequest {
  /** Patient data — already anonymized or from internal lookup */
  patient: PatientRiskInput;
  /** Override history for this patient */
  overrideHistory: OverrideHistoryInput;
  /** Recent TUSS codes for cost estimation */
  tussCodes?: string[];
  /** Organization ID for de-identification */
  organizationId: string;
}

function validateRequest(body: unknown): body is RiskAssessmentRequest {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  if (!b.patient || typeof b.patient !== 'object') return false;
  if (!b.overrideHistory || typeof b.overrideHistory !== 'object') return false;
  if (typeof b.organizationId !== 'string' || b.organizationId.length === 0) return false;

  const p = b.patient as Record<string, unknown>;
  if (typeof p.ageYears !== 'number') return false;
  if (typeof p.tobaccoUse !== 'boolean') return false;
  if (typeof p.alcoholUse !== 'boolean') return false;

  const o = b.overrideHistory as Record<string, unknown>;
  if (typeof o.totalOverrides !== 'number') return false;
  if (typeof o.hardBlockOverrides !== 'number') return false;
  if (typeof o.totalRulesEvaluated !== 'number') return false;

  return true;
}

// =============================================================================
// HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // Step 1: Auth — reject immediately if key is wrong
  const auth = validateEnterpriseKey(request);
  if (!auth.authorized) return auth.response!;

  // Step 2: Rate limit
  const keyHash = request.headers.get('x-pharma-partner-key')?.slice(0, 8) ?? 'unknown';
  const limit = checkRateLimit(`single:${keyHash}`, SINGLE_ASSESSMENT_LIMIT);
  if (!limit.allowed) return limit.response!;

  try {
    const body = await request.json();

    // Step 2: Validate request shape
    if (!validateRequest(body)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid request body. Required: patient, overrideHistory, organizationId.' },
        { status: 400 },
      );
    }

    // Step 3: Parse dates (JSON doesn't preserve Date objects — they arrive as strings)
    const raw = body.patient as unknown as Record<string, unknown>;
    const patient: PatientRiskInput = {
      ...body.patient,
      lastBloodPressureCheck: raw.lastBloodPressureCheck
        ? new Date(raw.lastBloodPressureCheck as string)
        : null,
      lastCholesterolTest: raw.lastCholesterolTest
        ? new Date(raw.lastCholesterolTest as string)
        : null,
      lastHbA1c: raw.lastHbA1c
        ? new Date(raw.lastHbA1c as string)
        : null,
      lastPhysicalExam: raw.lastPhysicalExam
        ? new Date(raw.lastPhysicalExam as string)
        : null,
    };

    // Step 4: Calculate composite risk
    const riskResult = calculateCompositeRisk(patient, body.overrideHistory);

    // Step 5: Run through enterprise export pipeline (PII scan + pseudonymization)
    const anonymizedPayload = exportForEnterprise({
      patientId: `api-${Date.now()}`, // API callers don't send real IDs
      riskResult,
      recentTussCodes: body.tussCodes ?? [],
      protocolCompliance: riskResult.confidence,
      organizationId: body.organizationId,
    });

    // Step 6: Cost estimation if TUSS codes provided
    const costEstimate = body.tussCodes?.length
      ? estimateClaimCost(body.tussCodes, riskResult.riskTier === 'CRITICAL' ? 'BLOCK' : 'PASS')
      : null;

    // Flywheel ingest — persist assessment (non-blocking)
    const syntheticColor = riskResult.riskTier === 'CRITICAL' ? 'RED' as const
      : riskResult.riskTier === 'HIGH' ? 'YELLOW' as const
      : 'GREEN' as const;

    dataFlywheelService.ingest({
      trafficLightResult: { color: syntheticColor, signals: [] },
      patientRiskInput: patient,
      overrideHistory: body.overrideHistory,
      patientId: `api-${Date.now()}`,
      organizationId: body.organizationId,
      tussCodes: body.tussCodes,
    }).catch(() => {});

    // Usage metering
    enterpriseUsageMeter.logUsage({
      endpoint: '/api/enterprise/risk-assessment',
      apiKeyHash: keyHash,
      timestamp: new Date().toISOString(),
      responseTimeMs: Date.now() - startTime,
      patientCount: 1,
      statusCode: 200,
      method: 'POST',
    });

    return NextResponse.json({
      __format: 'enterprise_risk_assessment_v1',
      assessment: anonymizedPayload,
      costEstimate,
      meta: {
        apiVersion: '1.0.0',
        assessedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    if (err instanceof ExportPIIViolationError) {
      // PII was detected in output — do NOT return the payload
      return NextResponse.json(
        { error: 'Export Safety Violation', message: 'PII detected in output. Export aborted.' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Risk assessment failed.' },
      { status: 500 },
    );
  }
}
