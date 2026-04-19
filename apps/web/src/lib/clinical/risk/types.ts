/**
 * Shared types for perioperative risk calculators.
 *
 * Regulatory posture: these are clinician information tools (advisory),
 * not autonomous CDS. That keeps them outside ANVISA SaMD Class II per
 * RDC 751/2022 Rule 11 interpretation.
 */

export type CalculatorId = 'RCRI' | 'ASAPS' | 'STOPBANG' | 'CFS' | 'MFI5';

export interface CalculatorCitation {
  /** Plain-English source (e.g. "Lee et al. Circulation 1999") */
  source: string;
  /** PubMed ID when available */
  pmid?: string;
  /** DOI when available */
  doi?: string;
  /** LOINC code for the score (enables storage as a FHIR Observation) */
  loinc?: string;
  /** Most recent peer-reviewed validation year */
  validatedThrough?: number;
}

export interface CalculatorResult<Tier extends string = string> {
  calculator: CalculatorId;
  /** Numeric score where the scale is numeric. Null for pure ordinal classifiers (ASA, CFS). */
  score: number | null;
  /** The full ordinal tier. Always present. */
  tier: Tier;
  /** One-sentence clinical meaning */
  interpretation: string;
  /** When the tier implies an absolute risk, include it (range or point estimate) */
  absoluteRiskPercent?: number | string;
  /** Ordered list of items the calculator considered in the current scoring */
  factorSummary: Array<{ label: string; present: boolean | null; contributes: number }>;
  /** Any warnings about edge cases or unsupported inputs */
  warnings: string[];
  citation: CalculatorCitation;
}
