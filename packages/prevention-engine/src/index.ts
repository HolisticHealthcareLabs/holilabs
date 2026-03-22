/**
 * @holi/prevention-engine
 *
 * Health 3.0 — Rule-Based Prevention Alert Evaluator
 *
 * RUTH: ANVISA SaMD: Class I — informational clinical decision support.
 * This package evaluates patient health data against evidence-based clinical rules
 * and generates prevention alerts for clinician review. Not for autonomous diagnosis.
 *
 * ELENA invariants enforced at load time:
 *   - Every rule has sourceAuthority + citationUrl
 *   - LLM output is not a permitted clinical evidence source
 *   - humanReviewRequired = true on every generated alert
 *
 * ─── EVALUATING ─────────────────────────────────────────────────────────
 * import { preventionEvaluator } from '@holi/prevention-engine';
 * const alerts = preventionEvaluator.evaluate(canonicalRecord, patientHistory);
 *
 * ─── RULE REGISTRY ───────────────────────────────────────────────────────
 * import { ruleRegistry } from '@holi/prevention-engine';
 * const rules = ruleRegistry.getAllRules();
 * ruleRegistry.registerCustomRule(myRule); // validates ELENA invariants
 *
 * ─── TYPES ──────────────────────────────────────────────────────────────
 * import type { PreventionAlert, ClinicalRule, PatientHistory } from '@holi/prevention-engine';
 */

export { PreventionEvaluator, preventionEvaluator } from './evaluator';
export { RuleRegistry, ruleRegistry } from './rule-registry';

export type {
  ClinicalRule,
  PreventionAlert,
  PatientHistory,
  RuleResult,
  RuleSeverity,
  RuleCategory,
  RuleCondition,
  RuleConditionOperator,
} from './types';
