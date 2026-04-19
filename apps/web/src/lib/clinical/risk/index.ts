/**
 * Perioperative risk calculator suite — barrel export.
 *
 * Pure-TypeScript implementations of five validated pre-op scores:
 *   - RCRI       (cardiac risk)
 *   - ASA-PS     (physical status classification)
 *   - STOP-BANG  (obstructive sleep apnea screening)
 *   - CFS        (Clinical Frailty Scale)
 *   - mFI-5      (Modified Frailty Index, 5-item)
 *
 * Regulatory posture: clinician-facing information tools, not autonomous
 * CDSS. Outputs are advisory; no automatic treatment decisions are taken.
 */
export type { CalculatorId, CalculatorCitation, CalculatorResult } from './types';

export { computeRcri, type RcriInput, type RcriTier } from './rcri';
export {
  computeAsaPs, ASA_DESCRIPTIONS,
  type AsaPsInput, type AsaClass, type AsaTier,
} from './asaps';
export { computeStopBang, type StopBangInput, type StopBangTier } from './stopbang';
export {
  computeCfs, CFS_DESCRIPTIONS,
  type CfsInput, type CfsLevel, type CfsTier,
} from './cfs';
export { computeMfi5, type Mfi5Input, type Mfi5Tier } from './mfi5';
