/**
 * Shared Prescription Safety Evaluation Service
 *
 * Contains the core parallel evaluation logic used by:
 *   - POST /api/prescriptions/safety-check  (manual prescription entry)
 *   - POST /api/copilot/draft-prescription  (AI-extracted prescriptions)
 *
 * This is an Extract Method refactoring — both API routes call this
 * function directly instead of duplicating logic or making internal HTTP calls.
 *
 * @compliance FDA 21 CFR Part 11, HIPAA, LGPD, ANVISA Class I
 */

import { checkAttestation } from './attestation-gate';
import { evaluateDOACRule } from './doac-evaluator';
import { logDOACEvaluation } from './governance-events';
import { cdsEngine } from '@/lib/cds/engines/cds-engine';
import type { CDSContext, CDSAlert } from '@/lib/cds/types';
import { checkICD10Match, checkTUSSCode, checkQuantityLimit } from '@/lib/finance/billing-guardrails';
import { v4 as uuidv4 } from 'uuid';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface MedicationInput {
  name: string;
  dose: string;
  frequency: string;
  route?: string;
  quantity?: number;
  tussCode?: string;
}

export interface ClinicalContext {
  creatinineClearance?: number;
  weight?: number;
  age?: number;
  labTimestamp?: string;
  currentMedications?: string[];
}

export interface PrescriptionSafetyResult {
  color: 'GREEN' | 'AMBER' | 'RED';
  signal: CDSAlert[];
  attestationRequired: boolean;
  missingFields: string[];
  financialRisk: { glosaRisk: boolean; rulesFired: string[] };
  processingTimeMs: number;
  governance: { legalBasis: string; timestamp: string };
}

// ── Constants ──────────────────────────────────────────────────────────────────

const DOAC_DRUGS = new Set(['rivaroxaban', 'apixaban', 'edoxaban', 'dabigatran']);

// ── Core Evaluation ────────────────────────────────────────────────────────────

/**
 * Run the full parallel safety evaluation pipeline for a set of medications.
 *
 * Evaluates in parallel:
 *   1. Attestation gate (stale/missing critical lab data)
 *   2. DOAC rules (renal contraindications per FDA labels)
 *   3. CDS engine (drug interactions, guidelines, prevention gaps)
 *   4. Billing guardrails (FIN-001 ICD mismatch, FIN-002 TUSS, FIN-003 qty)
 *
 * Color logic:
 *   RED  — any `critical` severity OR FIN-002 (TUSS hallucination)
 *   AMBER — any `warning` severity
 *   GREEN — all checks passed
 *
 * @param medications  Extracted or manually entered medication list
 * @param encounter    Encounter context (ICD-10 codes for FIN-001)
 * @param payer        Payer rules (maxQuantity for FIN-003)
 * @param clinicalCtx  Patient clinical data (labs, demographics for DOAC/ATT)
 * @param meta         Actor, patient, trace IDs for governance logging
 */
export async function evaluatePrescriptionSafety(
  medications: MedicationInput[],
  encounter: { icd10Codes?: string[] } | undefined,
  payer: { maxQuantity?: number } | undefined,
  clinicalCtx: ClinicalContext | undefined,
  meta: { actorId: string; patientId: string; traceId: string }
): Promise<PrescriptionSafetyResult> {
  const start = Date.now();
  const { actorId, patientId, traceId } = meta;

  const icd10Codes: string[] = encounter?.icd10Codes ?? [];
  const payerMaxQuantity: number = payer?.maxQuantity ?? 30;

  const allAlerts: CDSAlert[] = [];
  const missingFields: string[] = [];
  const financialRulesFired: string[] = [];

  // ── 1. Attestation gate ──────────────────────────────────────────────────────

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

  // ── 2. DOAC evaluation ───────────────────────────────────────────────────────

  const doacEvals = await Promise.all(
    medications
      .filter((m) => DOAC_DRUGS.has(m.name?.toLowerCase()))
      .map(async (m) => {
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

  // ── 3. CDS Engine evaluation (non-blocking) ──────────────────────────────────

  try {
    const cdsContext: CDSContext = {
      patientId,
      userId: actorId,
      hookInstance: traceId,
      hookType: 'medication-prescribe',
      context: {
        patientId,
        medications: medications.map((m, idx) => ({
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
    // CDS engine failure is non-blocking — proceed with remaining checks
  }

  // ── 4. Billing guardrails (per medication) ───────────────────────────────────

  for (const med of medications) {
    const icd10Code = icd10Codes[0]; // primary diagnosis code

    const fin001 = checkICD10Match(med.name, icd10Code);
    if (fin001) { allAlerts.push(fin001); financialRulesFired.push('FIN-001'); }

    const fin002 = checkTUSSCode(med.tussCode);
    if (fin002) { allAlerts.push(fin002); financialRulesFired.push('FIN-002'); }

    const fin003 = checkQuantityLimit(med.quantity, payerMaxQuantity);
    if (fin003) { allAlerts.push(fin003); financialRulesFired.push('FIN-003'); }
  }

  // ── 5. Color determination ────────────────────────────────────────────────────

  const hasBlock = allAlerts.some((a) => a.severity === 'critical');
  const hasFin002 = financialRulesFired.includes('FIN-002');
  const hasAmber = allAlerts.some((a) => a.severity === 'warning');

  let color: 'GREEN' | 'AMBER' | 'RED';
  if (hasBlock || hasFin002) {
    color = 'RED';
  } else if (hasAmber) {
    color = 'AMBER';
  } else {
    color = 'GREEN';
  }

  return {
    color,
    signal: allAlerts,
    attestationRequired: attestationResult.required,
    missingFields,
    financialRisk: {
      glosaRisk: financialRulesFired.length > 0,
      rulesFired: financialRulesFired,
    },
    processingTimeMs: Date.now() - start,
    governance: {
      legalBasis: 'FDA 21 CFR Part 11 + HIPAA 45 CFR §164.312(b) + LGPD Art. 11',
      timestamp: new Date().toISOString(),
    },
  };
}
