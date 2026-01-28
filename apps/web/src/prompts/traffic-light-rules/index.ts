/**
 * Traffic Light Rules (Prompt-Native)
 *
 * PROMPT-NATIVE ARCHITECTURE:
 * Rules are defined declaratively in templates, not TypeScript logic.
 * The engine loads and compiles rules at runtime, enabling:
 * - Rule updates without code deployments
 * - Auditable decision logic for LGPD/HIPAA compliance
 * - A/B testing of different rule strictness levels
 * - Non-engineers can review/modify rules
 *
 * Usage:
 *   import { getLoadedRules, getRuleTemplates } from '@/prompts/traffic-light-rules';
 *
 *   // For evaluation
 *   const rules = getLoadedRules();
 *   for (const rule of rules.all) {
 *     const result = await rule.evaluate(context);
 *   }
 *
 *   // For admin UI
 *   const templates = getRuleTemplates();
 */

// Types
export * from './types';

// Rule Templates
export { CLINICAL_RULES, DRUG_INTERACTIONS, ALLERGY_GROUPS, CROSS_REACTIVITY } from './clinical-rules';
export { BILLING_RULES, TISS_CODES, GLOSA_CODES, CID_PROCEDURE_COMPATIBILITY } from './billing-rules';
export { ADMINISTRATIVE_RULES, DOCUMENTATION_REQUIREMENTS, CONSENT_REQUIREMENTS } from './administrative-rules';

// Rule Loader
export { loadRules, getRuleTemplates, getLoadedRules, reloadRules } from './rule-loader';
export type { LoadedRules } from './rule-loader';
