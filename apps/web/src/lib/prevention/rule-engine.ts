/**
 * JSON-Logic Rule Engine for Clinical Protocols
 *
 * This module replaces hardcoded TypeScript clinical rules with a data-driven
 * approach using JSON-Logic expressions stored in the database.
 *
 * Benefits:
 * - Rules can be updated without code deployment
 * - Non-technical staff can manage protocols via UI (future)
 * - Consistent rule evaluation across services
 * - Audit trail for rule changes
 *
 * @see https://jsonlogic.com/
 */

import jsonLogic from 'json-logic-js';
import type {
  PatientState,
  ClinicalProtocolRule,
  ClinicalAction,
  RuleEvaluationResult,
  RuleEngineOutput,
  SkippedRule,
} from '@med-app/types';
import logger from '@/lib/logger';

// ============================================
// CUSTOM JSON-LOGIC OPERATIONS
// ============================================

/**
 * Register custom operations for clinical use cases
 */
function registerCustomOperations(): void {
  // Check if a value is within a range (inclusive)
  jsonLogic.add_operation('between', (value: number, min: number, max: number) => {
    return value >= min && value <= max;
  });

  // Check age in years (handles demographics.age or direct age)
  jsonLogic.add_operation('age_between', (age: number, min: number, max: number) => {
    return age >= min && age <= max;
  });

  // Check if any item in array contains a substring
  jsonLogic.add_operation('array_contains_any', (arr: string[], patterns: string[]) => {
    if (!Array.isArray(arr) || !Array.isArray(patterns)) return false;
    return patterns.some(pattern =>
      arr.some(item => item.toLowerCase().includes(pattern.toLowerCase()))
    );
  });

  // Check if any medication matches (case-insensitive)
  jsonLogic.add_operation('has_medication', (meds: string[], medPattern: string) => {
    if (!Array.isArray(meds)) return false;
    return meds.some(m => m.toLowerCase().includes(medPattern.toLowerCase()));
  });

  // Check if any condition matches ICD-10 prefix
  jsonLogic.add_operation('has_condition_icd', (conditions: string[], icdPrefix: string) => {
    if (!Array.isArray(conditions)) return false;
    return conditions.some(c => c.toUpperCase().startsWith(icdPrefix.toUpperCase()));
  });

  // Check data age in hours
  jsonLogic.add_operation('data_age_hours', (timestamp: string) => {
    if (!timestamp) return Infinity;
    const dataTime = new Date(timestamp).getTime();
    const now = Date.now();
    return (now - dataTime) / (1000 * 60 * 60);
  });
}

// Register custom operations on module load
registerCustomOperations();

// ============================================
// RULE VALIDATION
// ============================================

interface ValidationResult {
  isValid: boolean;
  missingFields: string[];
  staleData: boolean;
  lowConfidence: boolean;
}

/**
 * Validate that patient state meets rule requirements
 */
function validatePatientState(
  patientState: PatientState,
  rule: ClinicalProtocolRule
): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    missingFields: [],
    staleData: false,
    lowConfidence: false,
  };

  // Check confidence threshold
  if (patientState.confidence < rule.validation.minConfidence) {
    result.isValid = false;
    result.lowConfidence = true;
  }

  // Check data freshness if required
  if (rule.validation.maxDataAgeHours) {
    const dataAgeHours = (Date.now() - new Date(patientState.timestamp).getTime()) / (1000 * 60 * 60);
    if (dataAgeHours > rule.validation.maxDataAgeHours) {
      result.isValid = false;
      result.staleData = true;
    }
  }

  // Check required fields
  if (rule.validation.requiredFields) {
    for (const field of rule.validation.requiredFields) {
      const value = getNestedValue(patientState, field);
      if (value === undefined || value === null) {
        result.missingFields.push(field);
        result.isValid = false;
      }
    }
  }

  return result;
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: unknown, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

// ============================================
// RULE EVALUATION
// ============================================

/**
 * Evaluate a single clinical protocol rule against patient state
 */
function evaluateRule(
  patientState: PatientState,
  rule: ClinicalProtocolRule
): RuleEvaluationResult | SkippedRule {
  // Validate patient state meets rule requirements
  const validation = validatePatientState(patientState, rule);

  if (!validation.isValid) {
    let reason: SkippedRule['reason'];
    let details: string;

    if (validation.lowConfidence) {
      reason = 'low_confidence';
      details = `Confidence ${patientState.confidence} < required ${rule.validation.minConfidence}`;
    } else if (validation.staleData) {
      reason = 'stale_data';
      details = `Data older than ${rule.validation.maxDataAgeHours} hours`;
    } else {
      reason = 'missing_data';
      details = `Missing fields: ${validation.missingFields.join(', ')}`;
    }

    return {
      ruleId: rule.ruleId,
      reason,
      details,
    };
  }

  // Build data context for JSON-Logic
  // Merge patientState with any additional demographics for easier access
  const dataContext = {
    ...patientState,
    demographics: patientState.vitals, // Alias for backward compatibility
  };

  try {
    // Evaluate the JSON-Logic rule
    const result = jsonLogic.apply(rule.logic as jsonLogic.RulesLogic, dataContext);

    // Determine the action based on result
    let action: ClinicalAction;

    if (result === true || result === rule.logic.then) {
      action = rule.logic.then;
    } else if (result === false || result === null || result === undefined) {
      action = rule.logic.fallback;
    } else if (typeof result === 'string' && isValidClinicalAction(result)) {
      action = result;
    } else {
      // Unexpected result type, use fallback
      logger.warn({
        event: 'rule_unexpected_result',
        ruleId: rule.ruleId,
        result,
        resultType: typeof result,
      });
      action = rule.logic.fallback;
    }

    // Don't return no_action results unless they require review
    if (action === 'no_action' && !rule.validation.requireHumanReview) {
      return {
        ruleId: rule.ruleId,
        reason: 'missing_data', // We'll use this to indicate no action needed
        details: 'Rule evaluated to no_action',
      };
    }

    return {
      action,
      protocol: rule.ruleId,
      confidence: patientState.confidence,
      requiresReview: rule.validation.requireHumanReview,
      triggeredAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error({
      event: 'rule_evaluation_error',
      ruleId: rule.ruleId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      ruleId: rule.ruleId,
      reason: 'evaluation_error',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Type guard for valid clinical actions
 */
function isValidClinicalAction(value: string): value is ClinicalAction {
  const validActions = [
    'refer_endocrinology',
    'refer_cardiology',
    'refer_oncology',
    'refer_nephrology',
    'refer_gastroenterology',
    'order_lab',
    'order_imaging',
    'order_a1c_screening',
    'order_colonoscopy',
    'order_mammogram',
    'order_pap_smear',
    'order_lipid_panel',
    'flag_urgent',
    'flag_critical',
    'continue_monitoring',
    'schedule_followup',
    'alert_provider',
    'no_action',
  ];
  return validActions.includes(value);
}

// ============================================
// MAIN EVALUATION FUNCTION
// ============================================

/**
 * Evaluate multiple clinical protocols against patient state
 *
 * @param patientState - Current patient state from AI Scribe
 * @param protocols - Array of clinical protocols to evaluate
 * @returns RuleEngineOutput with actions, triggered rules, and skipped rules
 *
 * @example
 * ```typescript
 * const output = await evaluateProtocols(patientState, protocols);
 * console.log(output.actions); // Actions to take
 * console.log(output.triggeredRules); // Which rules fired
 * ```
 */
export function evaluateProtocols(
  patientState: PatientState,
  protocols: ClinicalProtocolRule[]
): RuleEngineOutput {
  const startTime = performance.now();
  const actions: RuleEvaluationResult[] = [];
  const triggeredRules: string[] = [];
  const skippedRules: SkippedRule[] = [];

  // Filter to only active protocols
  const activeProtocols = protocols.filter(p => p.metadata.isActive);

  for (const protocol of activeProtocols) {
    const result = evaluateRule(patientState, protocol);

    if ('action' in result) {
      // Rule fired and returned an action
      actions.push(result);
      triggeredRules.push(result.protocol);
    } else {
      // Rule was skipped
      skippedRules.push(result);
    }
  }

  const evaluationTimeMs = Math.round(performance.now() - startTime);

  logger.info({
    event: 'rule_engine_evaluation_complete',
    totalProtocols: protocols.length,
    activeProtocols: activeProtocols.length,
    triggeredRules: triggeredRules.length,
    skippedRules: skippedRules.length,
    evaluationTimeMs,
  });

  return {
    actions,
    triggeredRules,
    skippedRules,
    evaluationTimeMs,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create a safe fallback rule result for error scenarios
 */
export function createFallbackResult(
  ruleId: string,
  fallbackAction: ClinicalAction
): RuleEvaluationResult {
  return {
    action: fallbackAction,
    protocol: ruleId,
    confidence: 0,
    requiresReview: true,
    triggeredAt: new Date().toISOString(),
  };
}

/**
 * Convert a simple condition to JSON-Logic format
 *
 * @example
 * ```typescript
 * const logic = buildSimpleRule('vitals.a1c', '>', 6.5, 'refer_endocrinology');
 * // Returns: { if: { ">": [{ "var": "vitals.a1c" }, 6.5] }, then: "refer_endocrinology", fallback: "no_action" }
 * ```
 */
export function buildSimpleRule(
  variable: string,
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=',
  value: number | string | boolean,
  thenAction: ClinicalAction,
  fallbackAction: ClinicalAction = 'no_action'
): ClinicalProtocolRule['logic'] {
  return {
    if: {
      operator,
      variable,
      value,
    },
    then: thenAction,
    fallback: fallbackAction,
  };
}

/**
 * Build an AND condition combining multiple rules
 */
export function buildAndCondition(
  conditions: Array<{ variable: string; operator: string; value: unknown }>,
  thenAction: ClinicalAction,
  fallbackAction: ClinicalAction = 'no_action'
): ClinicalProtocolRule['logic'] {
  return {
    if: {
      operator: 'and',
      conditions: conditions.map(c => ({
        operator: c.operator as ClinicalProtocolRule['logic']['if']['operator'],
        variable: c.variable,
        value: c.value,
      })),
    },
    then: thenAction,
    fallback: fallbackAction,
  };
}

// ============================================
// RULE EXECUTION WITH JSON-LOGIC NATIVE FORMAT
// ============================================

/**
 * Execute a raw JSON-Logic rule directly (for advanced use cases)
 *
 * This allows using the native JSON-Logic format when needed:
 * { "and": [{ ">": [{ "var": "vitals.a1c" }, 6.5] }, { ">=": [{ "var": "demographics.age" }, 45] }] }
 */
export function executeRawJsonLogic(
  logic: jsonLogic.RulesLogic,
  data: Record<string, unknown>
): unknown {
  try {
    return jsonLogic.apply(logic, data);
  } catch (error) {
    logger.error({
      event: 'raw_json_logic_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Validate that a JSON-Logic rule is syntactically correct
 */
export function validateJsonLogicSyntax(logic: unknown): boolean {
  try {
    // Try to apply with empty data - will throw if invalid syntax
    jsonLogic.apply(logic as jsonLogic.RulesLogic, {});
    return true;
  } catch {
    return false;
  }
}

// ============================================
// EXPORTS
// ============================================

export {
  evaluateRule,
  validatePatientState,
  registerCustomOperations,
};

// Re-export JSON-Logic for direct access if needed
export { jsonLogic };
