/**
 * Billing Guardrails — Glosa Prevention Rules
 *
 * Three deterministic rules that detect billing errors before a prescription is submitted:
 *
 *   FIN-001: ICD-10 mismatch — drug prescribed for wrong diagnosis
 *   FIN-002: TUSS code hallucination — invalid/unknown TUSS procedure code
 *   FIN-003: Quantity limit exceeded — quantity > payer reimbursable maximum
 *
 * Returns CDSAlert | null (null = no issue detected).
 * Non-destructive: if a field is absent, the rule is skipped (not fired).
 *
 * @compliance ANVISA Class I — deterministic only, no LLM
 * @since 2026-03-03
 */

import { v4 as uuidv4 } from 'uuid';
import type { CDSAlert } from '@/lib/cds/types';
import { getTUSSByCode } from './tuss-lookup';
import { validateICD10Match, hasDrugMapping } from './icd10-drug-map';

/** Default max quantity for LatAm payer reimbursement (30-day supply) */
export const DEFAULT_PAYER_MAX_QUANTITY = 30;

// ============================================================================
// FIN-001: ICD-10 Mismatch
// ============================================================================

/**
 * FIN-001: Check that the prescribed drug matches the encounter diagnosis.
 *
 * Fires AMBER when the drug has a known indication list AND the ICD-10 code
 * doesn't match any of those indications. Silent if drug is unmapped.
 *
 * @param drugName Drug name (e.g. "apixaban")
 * @param icd10Code ICD-10 diagnosis code (e.g. "E11.9")
 * @returns CDSAlert (AMBER) if mismatch, null otherwise
 */
export function checkICD10Match(drugName: string, icd10Code: string | undefined): CDSAlert | null {
  if (!icd10Code) return null;
  if (!hasDrugMapping(drugName)) return null;
  if (validateICD10Match(drugName, icd10Code)) return null;

  return {
    id: uuidv4(),
    ruleId: 'FIN-001',
    summary: `Indication mismatch: ${drugName} not indicated for ${icd10Code}`,
    detail: `${drugName} is not a recognized treatment for ICD-10 code ${icd10Code}. This prescription may be denied by the insurer (glosa). Verify diagnosis and update if needed.`,
    severity: 'warning',
    category: 'guideline-recommendation',
    indicator: 'warning',
    source: {
      label: 'Holi Billing Guardrails',
      url: 'https://holilabs.com/billing/fin-001',
    },
    timestamp: new Date().toISOString(),
  };
}

// ============================================================================
// FIN-002: TUSS Code Hallucination
// ============================================================================

/**
 * FIN-002: Check that a TUSS procedure code exists in the master data.
 *
 * Fires RED when a TUSS code is provided but not found in the TUSS master.
 * Silent if no TUSS code is provided (not required for all prescriptions).
 *
 * @param tussCode TUSS procedure code (e.g. "20104038")
 * @returns CDSAlert (critical/RED) if invalid, null otherwise
 */
export function checkTUSSCode(tussCode: string | undefined): CDSAlert | null {
  if (!tussCode) return null;

  const found = getTUSSByCode(tussCode);
  if (found) return null;

  return {
    id: uuidv4(),
    ruleId: 'FIN-002',
    summary: `Invalid TUSS code detected: ${tussCode}`,
    detail: `TUSS code "${tussCode}" does not exist in the TUSS master data. Submitting this code will result in automatic claim rejection (glosa). Verify the code before proceeding.`,
    severity: 'critical',
    category: 'contraindication',
    indicator: 'critical',
    source: {
      label: 'Holi Billing Guardrails',
      url: 'https://holilabs.com/billing/fin-002',
    },
    timestamp: new Date().toISOString(),
  };
}

// ============================================================================
// FIN-003: Quantity Limit Exceeded
// ============================================================================

/**
 * FIN-003: Check that the prescribed quantity doesn't exceed payer limits.
 *
 * Fires AMBER when quantity > payerMaxQuantity.
 * Silent if quantity is not provided.
 *
 * @param quantity Prescribed quantity (pills, units, etc.)
 * @param payerMaxQuantity Maximum reimbursable quantity (default: 30)
 * @returns CDSAlert (AMBER) if exceeded, null otherwise
 */
export function checkQuantityLimit(
  quantity: number | undefined,
  payerMaxQuantity: number = DEFAULT_PAYER_MAX_QUANTITY
): CDSAlert | null {
  if (quantity === undefined || quantity === null) return null;
  if (quantity <= payerMaxQuantity) return null;

  return {
    id: uuidv4(),
    ruleId: 'FIN-003',
    summary: `Quantity exceeds reimbursable limit: ${quantity} > ${payerMaxQuantity}`,
    detail: `Prescribed quantity (${quantity}) exceeds the payer's maximum reimbursable quantity (${payerMaxQuantity}). The excess will not be reimbursed and may trigger a glosa. Consider splitting into multiple prescriptions or obtaining prior authorization.`,
    severity: 'warning',
    category: 'dosing-guidance',
    indicator: 'warning',
    source: {
      label: 'Holi Billing Guardrails',
      url: 'https://holilabs.com/billing/fin-003',
    },
    timestamp: new Date().toISOString(),
  };
}
