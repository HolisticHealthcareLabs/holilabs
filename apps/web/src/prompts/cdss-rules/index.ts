/**
 * CDSS Rules (Prompt-Native)
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
 *   import { getLoadedCDSSRules, getCDSSRuleTemplates } from '@/prompts/cdss-rules';
 *
 *   // For evaluation
 *   const rules = getLoadedCDSSRules();
 *   for (const rule of rules.all) {
 *     const result = await rule.evaluate(patientContext);
 *   }
 *
 *   // For admin UI
 *   const templates = getCDSSRuleTemplates();
 *
 * @module prompts/cdss-rules
 */

// Types
export * from './types';

// Rule Templates
export {
  CLINICAL_RULES,
  DRUG_INTERACTIONS,
  DRUG_CLASSES,
  LAB_MONITORING,
  NEPHROTOXIC_DRUGS,
  HYPERTENSION_DRUGS,
  DIABETES_DRUGS,
} from './clinical-rules';

// Rule Loader
export {
  loadCDSSRules,
  getCDSSRuleTemplates,
  getLoadedCDSSRules,
  reloadCDSSRules,
  convertToAIInsight,
  type LoadedCDSSRules,
} from './rule-loader';
