/**
 * Clinical Prompt Templates Index
 *
 * PROMPT-NATIVE ARCHITECTURE:
 * All clinical decision logic is defined in prompt templates, not TypeScript code.
 *
 * Benefits:
 * 1. Change clinical reasoning without code changes
 * 2. Version control prompts separately from application code
 * 3. A/B test different prompt strategies
 * 4. Regulatory audit trail of decision-making logic
 * 5. Non-engineers can review/modify clinical rules
 *
 * Usage:
 *   import { buildDiagnosisPrompt, buildTreatmentPrompt } from '@/prompts';
 *   const prompt = buildDiagnosisPrompt(patientContext);
 */

// Diagnosis prompts
export {
  buildDiagnosisPrompt,
  DIAGNOSIS_EVALUATION_CRITERIA,
  URGENCY_DETERMINATION_PROMPT,
  type DiagnosisPromptContext,
} from './clinical-diagnosis.prompt';

// Treatment prompts
export {
  buildTreatmentPrompt,
  buildDrugInteractionPrompt,
  buildDoseValidationPrompt,
  TREATMENT_EVALUATION_CRITERIA,
  type TreatmentPromptContext,
  type DrugInteractionContext,
  type DoseValidationContext,
} from './clinical-treatment.prompt';

// Traffic Light prompts
export {
  buildTrafficLightPrompt,
  buildAllergyCheckPrompt,
  ALERT_AGGREGATION_PROMPT,
  type TrafficLightPromptContext,
  type AllergyCheckContext,
} from './traffic-light.prompt';

// Auditor prompt
export { AUDITOR_SYSTEM_PROMPT } from './auditor.prompt';

// Traffic Light Rules (Prompt-Native Architecture)
export {
  getLoadedRules,
  getRuleTemplates,
  reloadRules,
  CLINICAL_RULES,
  BILLING_RULES,
  ADMINISTRATIVE_RULES,
  DRUG_INTERACTIONS,
  ALLERGY_GROUPS,
  TISS_CODES,
  GLOSA_CODES,
} from './traffic-light-rules';

// CDSS Rules (Prompt-Native Architecture)
export {
  getLoadedCDSSRules,
  getCDSSRuleTemplates,
  reloadCDSSRules,
  convertToAIInsight,
  CLINICAL_RULES as CDSS_CLINICAL_RULES,
  DRUG_INTERACTIONS as CDSS_DRUG_INTERACTIONS,
  DRUG_CLASSES,
  LAB_MONITORING,
  NEPHROTOXIC_DRUGS,
  HYPERTENSION_DRUGS,
  DIABETES_DRUGS,
} from './cdss-rules';
