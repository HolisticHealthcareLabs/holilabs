/**
 * POST /api/prescriptions/safety-check
 *
 * Unified clinical + financial pre-check for prescriptions.
 * Runs clinical safety (DOAC, attestation, CDS engine) and billing guardrails
 * (FIN-001 ICD-10 mismatch, FIN-002 TUSS hallucination, FIN-003 quantity limit)
 * in parallel and merges all alerts into a single traffic-light response.
 *
 * Color logic:
 *   RED  — any BLOCK severity OR FIN-002 (invalid TUSS)
 *   AMBER — any ATTESTATION_REQUIRED, FIN-001, or FIN-003
 *   GREEN — all checks passed
 *
 * @compliance FDA 21 CFR Part 11, HIPAA, LGPD, ANVISA Class I
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { checkAttestation } from '@/lib/clinical/safety/attestation-gate';
import { evaluateDOACRule } from '@/lib/clinical/safety/doac-evaluator';
import { logDOACEvaluation } from '@/lib/clinical/safety/governance-events';
import { cdsEngine } from '@/lib/cds/engines/cds-engine';
import type { CDSContext, CDSAlert } from '@/lib/cds/types';
import { checkICD10Match, checkTUSSCode, checkQuantityLimit } from '@/lib/finance/billing-guardrails';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

const DOAC_DRUGS = new Set(['rivaroxaban', 'apixaban', 'edoxaban', 'dabigatran']);

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const start = Date.now();

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { patientId, medications, encounter, payer, context: clinicalCtx } = body;

    if (!patientId) {
      return NextResponse.json({ error: 'Missing required field: patientId' }, { status: 400 });
    }
    if (!Array.isArray(medications) || medications.length === 0) {
      return NextResponse.json({ error: 'Missing required field: medications (non-empty array)' }, { status: 400 });
    }

    const actorId = context.user?.id ?? 'system';
    const traceId = uuidv4();
    const icd10Codes: string[] = encounter?.icd10Codes ?? [];
    const payerMaxQuantity: number = payer?.maxQuantity ?? 30;

    // =========================================================================
    // PARALLEL EVALUATION
    // =========================================================================

    const allAlerts: CDSAlert[] = [];
    const missingFields: string[] = [];
    const financialRulesFired: string[] = [];

    // 1. Attestation check (uses first medication for context)
    const firstMed = medications[0];
    const attestationResult = checkAttestation({
      medication: firstMed?.name,
      patient: {
        creatinineClearance: clinicalCtx?.creatinineClearance,
        weight: clinicalCtx?.weight,
        age: clinicalCtx?.age,
        labTimestamp: clinicalCtx?.labTimestamp,
      },
    });

    if (attestationResult.required) {
      if (attestationResult.missingFields) {
        missingFields.push(...attestationResult.missingFields);
      }
      allAlerts.push({
        id: uuidv4(),
        ruleId: 'ATT-GATE',
        summary: attestationResult.message,
        detail: attestationResult.legalBasis,
        severity: 'warning',
        category: 'guideline-recommendation',
        indicator: 'warning',
        source: { label: 'Attestation Gate', url: 'https://holilabs.com/attestation' },
        timestamp: new Date().toISOString(),
      });
    }

    // 2. DOAC evaluation (for each DOAC medication)
    const doacEvals = await Promise.all(
      medications
        .filter((m: any) => DOAC_DRUGS.has(m.name?.toLowerCase()))
        .map(async (m: any) => {
          const result = evaluateDOACRule({
            medication: m.name.toLowerCase() as any,
            patient: {
              creatinineClearance: clinicalCtx?.creatinineClearance ?? null,
              weight: clinicalCtx?.weight ?? null,
              age: clinicalCtx?.age ?? null,
              labTimestamp: clinicalCtx?.labTimestamp ?? null,
              recentMedications: clinicalCtx?.currentMedications ?? [],
            },
          });

          logDOACEvaluation({
            actor: actorId,
            patientId,
            medication: m.name,
            severity: result.severity,
            ruleId: result.ruleId,
            traceId,
          });

          return result;
        })
    );

    for (const doac of doacEvals) {
      if (doac.severity !== 'PASS') {
        allAlerts.push({
          id: uuidv4(),
          ruleId: doac.ruleId,
          summary: doac.rationale,
          detail: doac.detailedRationale,
          severity: doac.severity === 'BLOCK' ? 'critical' : 'warning',
          category: doac.severity === 'BLOCK' ? 'contraindication' : 'guideline-recommendation',
          indicator: doac.severity === 'BLOCK' ? 'critical' : 'warning',
          source: { label: 'DOAC Evaluator', url: doac.citationUrl },
          timestamp: new Date().toISOString(),
        });
      }
    }

    // 3. CDS Engine evaluation
    try {
      const cdsContext: CDSContext = {
        patientId,
        userId: actorId,
        hookInstance: traceId,
        hookType: 'medication-prescribe',
        context: {
          patientId,
          medications: medications.map((m: any, idx: number) => ({
            id: `med-${idx}`,
            name: m.name,
            dosage: m.dose,
            frequency: m.frequency,
            route: m.route,
            status: 'active' as const,
          })),
          demographics: clinicalCtx?.age
            ? { age: clinicalCtx.age, gender: 'unknown' as const, birthDate: '' }
            : undefined,
        },
      };

      const cdsResult = await cdsEngine.evaluate(cdsContext, 'medication-prescribe');
      allAlerts.push(...cdsResult.alerts);
    } catch {
      // CDS engine failure is non-blocking — proceed with other checks
    }

    // 4. Financial guardrails (per medication)
    for (const med of medications) {
      const icd10Code = icd10Codes[0]; // primary diagnosis

      const fin001 = checkICD10Match(med.name, icd10Code);
      if (fin001) {
        allAlerts.push(fin001);
        financialRulesFired.push('FIN-001');
      }

      const fin002 = checkTUSSCode(med.tussCode);
      if (fin002) {
        allAlerts.push(fin002);
        financialRulesFired.push('FIN-002');
      }

      const fin003 = checkQuantityLimit(med.quantity, payerMaxQuantity);
      if (fin003) {
        allAlerts.push(fin003);
        financialRulesFired.push('FIN-003');
      }
    }

    // =========================================================================
    // COLOR DETERMINATION
    // =========================================================================

    const hasBlock = allAlerts.some((a) => a.severity === 'critical');
    const hasFin002 = financialRulesFired.includes('FIN-002');
    const hasAttestOrAmber = allAlerts.some(
      (a) => a.severity === 'warning' || a.ruleId === 'ATT-GATE'
    );

    let color: 'GREEN' | 'AMBER' | 'RED';
    if (hasBlock || hasFin002) {
      color = 'RED';
    } else if (hasAttestOrAmber) {
      color = 'AMBER';
    } else {
      color = 'GREEN';
    }

    const processingTimeMs = Date.now() - start;

    return NextResponse.json({
      color,
      signal: allAlerts,
      attestationRequired: attestationResult.required,
      missingFields,
      recommendations: allAlerts
        .filter((a) => a.suggestions?.length)
        .flatMap((a) => a.suggestions!.map((s) => s.label)),
      financialRisk: {
        glosaRisk: financialRulesFired.length > 0,
        rulesFired: financialRulesFired,
      },
      processingTimeMs,
      governance: {
        legalBasis: 'FDA 21 CFR Part 11 + HIPAA 45 CFR §164.312(b) + LGPD Art. 11',
        timestamp: new Date().toISOString(),
      },
    });
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'PHYSICIAN'],
    skipCsrf: false,
  }
);
