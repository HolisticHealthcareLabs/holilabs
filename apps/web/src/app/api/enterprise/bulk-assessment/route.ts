/**
 * Enterprise Bulk Assessment API — Blue Ocean Phase 3
 *
 * POST /api/enterprise/bulk-assessment
 *
 * Batch risk assessment for insurer cohort analysis.
 * Accepts an array of patient records, runs the risk calculator
 * with concurrency limited to 5, and returns population-level summary.
 *
 * Auth: x-pharma-partner-key header (shared enterprise auth).
 * Rate-limited: 10 requests/minute per API key.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  calculateCompositeRisk,
  type PatientRiskInput,
  type OverrideHistoryInput,
  type CompositeRiskResult,
  type RiskTier,
} from '@/services/risk-calculator.service';
import {
  batchExportForEnterprise,
  type PatientExportInput,
} from '@/services/enterprise-export.service';
import { estimateClaimCost } from '@/lib/finance/tuss-lookup';
import { validateEnterpriseKey } from '@/lib/enterprise/auth';
import { checkRateLimit, BULK_ASSESSMENT_LIMIT } from '@/lib/enterprise/rate-limiter';
import { dataFlywheelService } from '@/services/data-flywheel.service';
import { enterpriseUsageMeter } from '@/lib/enterprise/usage-meter';
import { webhookDispatcher } from '@/lib/enterprise/webhook-dispatcher';

export const dynamic = 'force-dynamic';

const MAX_BATCH_SIZE = 100;
const CONCURRENCY_LIMIT = 5;

// =============================================================================
// REQUEST SCHEMA
// =============================================================================

interface BulkPatientEntry {
  id: string;
  patient: PatientRiskInput;
  overrideHistory: OverrideHistoryInput;
  tussCodes?: string[];
}

interface BulkAssessmentRequest {
  patients: BulkPatientEntry[];
  organizationId: string;
}

function validateBulkRequest(body: unknown): body is BulkAssessmentRequest {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b.patients) || b.patients.length === 0) return false;
  if (typeof b.organizationId !== 'string' || b.organizationId.length === 0) return false;
  return true;
}

// =============================================================================
// CONCURRENCY-LIMITED PARALLEL EXECUTION
// =============================================================================

async function runWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  limit: number,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await fn(items[index]);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// =============================================================================
// COHORT CLASSIFICATION
// =============================================================================

function classifyCohort(scores: number[]): { tier: RiskTier; label: string } {
  if (scores.length === 0) return { tier: 'LOW', label: 'Insufficient Data' };
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  if (avg >= 75) return { tier: 'CRITICAL', label: 'Cohort Risk: Critical' };
  if (avg >= 50) return { tier: 'HIGH', label: 'Cohort Risk: High' };
  if (avg >= 25) return { tier: 'MODERATE', label: 'Cohort Risk: Moderate' };
  return { tier: 'LOW', label: 'Cohort Risk: Low' };
}

// =============================================================================
// HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // Auth
  const auth = validateEnterpriseKey(request);
  if (!auth.authorized) return auth.response!;

  // Rate limit (stricter for bulk)
  const keyHash = request.headers.get('x-pharma-partner-key')?.slice(0, 8) ?? 'unknown';
  const limit = checkRateLimit(`bulk:${keyHash}`, BULK_ASSESSMENT_LIMIT);
  if (!limit.allowed) return limit.response!;

  try {
    const body = await request.json();

    if (!validateBulkRequest(body)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid request body. Required: patients[] (non-empty), organizationId.' },
        { status: 400 },
      );
    }

    if (body.patients.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: 'Bad Request', message: `Batch size exceeds maximum of ${MAX_BATCH_SIZE}.` },
        { status: 400 },
      );
    }

    // Step 1: Calculate risk for each patient (concurrency-limited)
    const assessmentResults = await runWithConcurrency(
      body.patients,
      async (entry) => {
        const patient: PatientRiskInput = {
          ...entry.patient,
          lastBloodPressureCheck: entry.patient.lastBloodPressureCheck
            ? new Date(entry.patient.lastBloodPressureCheck as unknown as string)
            : null,
          lastCholesterolTest: entry.patient.lastCholesterolTest
            ? new Date(entry.patient.lastCholesterolTest as unknown as string)
            : null,
          lastHbA1c: entry.patient.lastHbA1c
            ? new Date(entry.patient.lastHbA1c as unknown as string)
            : null,
          lastPhysicalExam: entry.patient.lastPhysicalExam
            ? new Date(entry.patient.lastPhysicalExam as unknown as string)
            : null,
        };

        const riskResult = calculateCompositeRisk(patient, entry.overrideHistory);
        return { id: entry.id, riskResult, tussCodes: entry.tussCodes ?? [] };
      },
      CONCURRENCY_LIMIT,
    );

    // Step 2: Build export inputs and run batch de-identification
    const exportInputs: PatientExportInput[] = assessmentResults.map((r) => ({
      patientId: r.id,
      riskResult: r.riskResult,
      recentTussCodes: r.tussCodes,
      protocolCompliance: r.riskResult.confidence,
      organizationId: body.organizationId,
    }));

    const { successful, failed } = batchExportForEnterprise(exportInputs);

    // Step 3: Compute population-level statistics
    const scores = assessmentResults.map((r) => r.riskResult.compositeScore);
    const cohort = classifyCohort(scores);

    const tierDistribution: Record<RiskTier, number> = { LOW: 0, MODERATE: 0, HIGH: 0, CRITICAL: 0 };
    for (const r of assessmentResults) {
      tierDistribution[r.riskResult.riskTier]++;
    }

    const avgConfidence = assessmentResults.length > 0
      ? Math.round((assessmentResults.reduce((sum, r) => sum + r.riskResult.confidence, 0) / assessmentResults.length) * 100) / 100
      : 0;

    // Step 4: Aggregate cost estimate from all TUSS codes
    const allTussCodes = assessmentResults.flatMap((r) => r.tussCodes);
    const aggregateCostEstimate = allTussCodes.length > 0
      ? estimateClaimCost(allTussCodes, cohort.tier === 'CRITICAL' ? 'BLOCK' : 'PASS')
      : null;

    // Flywheel ingest for each successful assessment (non-blocking)
    for (const r of assessmentResults) {
      const syntheticColor = r.riskResult.riskTier === 'CRITICAL' ? 'RED' as const
        : r.riskResult.riskTier === 'HIGH' ? 'YELLOW' as const
        : 'GREEN' as const;

      dataFlywheelService.ingest({
        trafficLightResult: { color: syntheticColor, signals: [] },
        patientRiskInput: {
          cvdRiskScore: null, diabetesRiskScore: null,
          lastBloodPressureCheck: null, lastCholesterolTest: null,
          lastHbA1c: null, lastPhysicalExam: null,
          tobaccoUse: false, tobaccoPackYears: null,
          alcoholUse: false, alcoholDrinksPerWeek: null,
          physicalActivityMinutesWeek: null, bmi: null, ageYears: 0,
        },
        overrideHistory: { totalOverrides: 0, hardBlockOverrides: 0, totalRulesEvaluated: 0 },
        patientId: r.id,
        organizationId: body.organizationId,
        tussCodes: r.tussCodes,
      }).catch(() => {});
    }

    // Dispatch BULK_ASSESSMENT_COMPLETED webhook
    webhookDispatcher.dispatch('BULK_ASSESSMENT_COMPLETED', {
      totalAssessed: assessmentResults.length,
      successfulExports: successful.length,
      failedExports: failed.length,
      cohortTier: cohort.tier,
      averageRiskScore: scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
        : 0,
    }).catch(() => {});

    // Usage metering
    enterpriseUsageMeter.logUsage({
      endpoint: '/api/enterprise/bulk-assessment',
      apiKeyHash: keyHash,
      timestamp: new Date().toISOString(),
      responseTimeMs: Date.now() - startTime,
      patientCount: assessmentResults.length,
      statusCode: 200,
      method: 'POST',
    });

    return NextResponse.json({
      __format: 'enterprise_bulk_assessment_v1',
      summary: {
        cohortClassification: cohort.label,
        cohortTier: cohort.tier,
        totalAssessed: assessmentResults.length,
        successfulExports: successful.length,
        failedExports: failed.length,
        averageRiskScore: scores.length > 0
          ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
          : 0,
        averageConfidence: avgConfidence,
        tierDistribution,
        aggregateCostEstimate,
      },
      assessments: successful,
      failures: failed.map((f) => ({ error: f.error })), // Strip patientId from response
      meta: {
        apiVersion: '1.0.0',
        batchSize: body.patients.length,
        concurrencyLimit: CONCURRENCY_LIMIT,
        assessedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Bulk assessment failed.' },
      { status: 500 },
    );
  }
}
