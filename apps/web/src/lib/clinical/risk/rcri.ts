/**
 * Revised Cardiac Risk Index (RCRI) — Lee et al., Circulation 1999;100:1043–1049.
 * PMID: 10477528. LOINC score code: 82810-3 (assertion-based).
 *
 * Six equal-weight binary factors predict 30-day major cardiac complications
 * in patients undergoing major non-cardiac surgery. Each factor = 1 point.
 *
 * Tier mapping (Lee 1999 + multiple external validations):
 *   0 factors   → 0.4%  (very low)
 *   1 factor    → 0.9%  (low)
 *   2 factors   → 6.6%  (intermediate)
 *   ≥3 factors  → 11%   (high)
 *
 * Well-validated across >100 external cohorts. Remains the most cited
 * perioperative cardiac risk score in use.
 */
import type { CalculatorResult, CalculatorCitation } from './types';

export type RcriTier = 'VERY_LOW' | 'LOW' | 'INTERMEDIATE' | 'HIGH';

export interface RcriInput {
  /** History of ischemic heart disease (prior MI, angina, positive stress test, use of nitrates, Q waves) */
  ischemicHeartDisease: boolean;
  /** History of congestive heart failure (prior pulmonary edema, bilateral rales, S3, CXR with pulmonary vascular redistribution) */
  congestiveHeartFailure: boolean;
  /** History of cerebrovascular disease (prior TIA or stroke) */
  cerebrovascularDisease: boolean;
  /** Insulin-treated diabetes mellitus */
  insulinDependentDiabetes: boolean;
  /** Preoperative creatinine > 2.0 mg/dL (>176.8 μmol/L) */
  creatinineOver2: boolean;
  /**
   * High-risk surgery: intraperitoneal, intrathoracic, or suprainguinal vascular.
   * All other surgeries = false.
   */
  highRiskSurgery: boolean;
}

const CITATION: CalculatorCitation = {
  source: 'Lee TH et al. Circulation 1999;100:1043–1049 (Revised Cardiac Risk Index)',
  pmid: '10477528',
  loinc: '82810-3',
  validatedThrough: 2024,
};

export function computeRcri(input: RcriInput): CalculatorResult<RcriTier> {
  const factors: Array<{ label: string; present: boolean | null; contributes: number }> = [
    { label: 'Ischemic heart disease',            present: input.ischemicHeartDisease,   contributes: input.ischemicHeartDisease ? 1 : 0 },
    { label: 'Congestive heart failure',          present: input.congestiveHeartFailure, contributes: input.congestiveHeartFailure ? 1 : 0 },
    { label: 'Cerebrovascular disease',           present: input.cerebrovascularDisease, contributes: input.cerebrovascularDisease ? 1 : 0 },
    { label: 'Insulin-dependent diabetes',        present: input.insulinDependentDiabetes, contributes: input.insulinDependentDiabetes ? 1 : 0 },
    { label: 'Creatinine > 2.0 mg/dL',            present: input.creatinineOver2,        contributes: input.creatinineOver2 ? 1 : 0 },
    { label: 'High-risk surgery',                 present: input.highRiskSurgery,        contributes: input.highRiskSurgery ? 1 : 0 },
  ];

  const score = factors.reduce((n, f) => n + f.contributes, 0);

  let tier: RcriTier;
  let interpretation: string;
  let absoluteRiskPercent: number;

  if (score === 0) {
    tier = 'VERY_LOW';
    interpretation = 'Very low 30-day cardiac complication risk.';
    absoluteRiskPercent = 0.4;
  } else if (score === 1) {
    tier = 'LOW';
    interpretation = 'Low 30-day cardiac complication risk.';
    absoluteRiskPercent = 0.9;
  } else if (score === 2) {
    tier = 'INTERMEDIATE';
    interpretation = 'Intermediate 30-day cardiac complication risk. Consider further evaluation.';
    absoluteRiskPercent = 6.6;
  } else {
    tier = 'HIGH';
    interpretation = 'High 30-day cardiac complication risk. Consider cardiology consultation.';
    absoluteRiskPercent = 11;
  }

  return {
    calculator: 'RCRI',
    score,
    tier,
    interpretation,
    absoluteRiskPercent,
    factorSummary: factors,
    warnings: [],
    citation: CITATION,
  };
}
