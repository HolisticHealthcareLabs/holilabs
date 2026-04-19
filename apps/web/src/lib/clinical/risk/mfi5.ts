/**
 * Modified Frailty Index, 5-item (mFI-5) — Subramaniam S et al.
 * J Am Coll Surg 2018;226:173–181. PMID: 29155268.
 * https://pubmed.ncbi.nlm.nih.gov/29155268/
 *
 * Short derivation of the original 11-item mFI. Five equal-weight binary
 * factors. Score ≥2 = frail (associated with increased mortality, morbidity,
 * and readmission in NSQIP analyses across >15 surgical specialties).
 */
import type { CalculatorResult, CalculatorCitation } from './types';

export type Mfi5Tier = 'NON_FRAIL' | 'PREFRAIL' | 'FRAIL';

export interface Mfi5Input {
  /** Functional health status — not independent (requires help with ADLs) */
  notIndependent: boolean;
  /** Diabetes mellitus (any type) */
  diabetes: boolean;
  /** COPD or recent pneumonia */
  copdOrPneumonia: boolean;
  /** Congestive heart failure within the last 30 days */
  chfWithin30d: boolean;
  /** Hypertension requiring medication */
  htnOnMeds: boolean;
}

const CITATION: CalculatorCitation = {
  source: 'Subramaniam S et al. J Am Coll Surg 2018;226:173–181 (Modified Frailty Index 5-item)',
  pmid: '29155268',
  validatedThrough: 2024,
};

export function computeMfi5(input: Mfi5Input): CalculatorResult<Mfi5Tier> {
  const factors: Array<{ label: string; present: boolean | null; contributes: number }> = [
    { label: 'Not functionally independent', present: input.notIndependent, contributes: input.notIndependent ? 1 : 0 },
    { label: 'Diabetes mellitus',            present: input.diabetes,       contributes: input.diabetes ? 1 : 0 },
    { label: 'COPD or recent pneumonia',     present: input.copdOrPneumonia, contributes: input.copdOrPneumonia ? 1 : 0 },
    { label: 'CHF within 30 days',           present: input.chfWithin30d,   contributes: input.chfWithin30d ? 1 : 0 },
    { label: 'Hypertension on medication',   present: input.htnOnMeds,      contributes: input.htnOnMeds ? 1 : 0 },
  ];
  const score = factors.reduce((n, f) => n + f.contributes, 0);

  let tier: Mfi5Tier;
  let interpretation: string;

  if (score === 0) {
    tier = 'NON_FRAIL';
    interpretation = 'Non-frail. Standard peri-operative risk stratification.';
  } else if (score === 1) {
    tier = 'PREFRAIL';
    interpretation = 'Pre-frail. Consider pre-habilitation and enhanced recovery protocols.';
  } else {
    tier = 'FRAIL';
    interpretation = 'Frail (≥2 factors). Associated with increased 30-day mortality, major complications, and readmission across NSQIP cohorts — consider geriatric co-management.';
  }

  return {
    calculator: 'MFI5',
    score,
    tier,
    interpretation,
    factorSummary: factors,
    warnings: [],
    citation: CITATION,
  };
}
