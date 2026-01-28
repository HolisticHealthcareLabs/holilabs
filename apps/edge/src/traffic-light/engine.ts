/**
 * Traffic Light Engine (Edge Node)
 *
 * Local-first evaluation with <10ms latency.
 * NEVER hits the internet for blocking decisions.
 *
 * Evaluates:
 * - Clinical rules (drug interactions, allergies, dosing)
 * - Billing rules (TISS validation, glosa prevention)
 * - Administrative rules (documentation, authorization)
 */

import { RuleCache } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';

export type TrafficLightColor = 'RED' | 'YELLOW' | 'GREEN';
export type RuleCategory = 'clinical' | 'administrative' | 'billing';

export interface TrafficLightSignal {
  ruleId: string;
  ruleName: string;
  ruleVersionId?: string;
  category: RuleCategory;
  color: TrafficLightColor;
  message: string;
  messagePortuguese: string;
  regulatoryReference?: string;
  evidence: string[];
  suggestedCorrection?: string;
  estimatedGlosaRisk?: {
    probability: number;
    estimatedAmount: number;
    denialCode?: string;
  };
}

export interface TrafficLightResult {
  color: TrafficLightColor;
  signals: TrafficLightSignal[];
  canOverride: boolean;
  overrideRequires?: 'justification' | 'supervisor' | 'blocked';
  totalGlosaRisk?: {
    probability: number;
    totalAmountAtRisk: number;
    highestRiskCode?: string;
  };
  needsChatAssistance: boolean;
  evaluationMs: number;
}

export interface EvaluationContext {
  patientHash: string;
  action: 'order' | 'prescription' | 'procedure' | 'diagnosis' | 'billing';
  payload: Record<string, unknown>;
  rules: RuleCache[];
}

/**
 * Evaluate traffic light locally
 */
export async function evaluateTrafficLight(
  context: EvaluationContext
): Promise<TrafficLightResult> {
  const startTime = performance.now();
  const signals: TrafficLightSignal[] = [];

  try {
    // Filter rules by action type
    const applicableRules = context.rules.filter(rule => {
      const logic = JSON.parse(rule.ruleLogic) as RuleLogic;
      return logic.applicableTo?.includes(context.action) ?? true;
    });

    logger.debug('Evaluating traffic light', {
      action: context.action,
      applicableRules: applicableRules.length,
    });

    // Evaluate each rule
    for (const rule of applicableRules) {
      const signal = evaluateRule(rule, context);
      if (signal) {
        signals.push(signal);
      }
    }

    // Determine overall color (worst wins)
    const color = determineOverallColor(signals);

    // Calculate override requirements
    const { canOverride, overrideRequires } = determineOverrideRequirements(signals);

    // Calculate aggregate glosa risk
    const totalGlosaRisk = calculateTotalGlosaRisk(signals);

    const evaluationMs = performance.now() - startTime;

    logger.info('Traffic light evaluation complete', {
      color,
      signalCount: signals.length,
      evaluationMs: evaluationMs.toFixed(2),
    });

    return {
      color,
      signals,
      canOverride,
      overrideRequires,
      totalGlosaRisk,
      needsChatAssistance: color !== 'GREEN',
      evaluationMs,
    };
  } catch (error) {
    logger.error('Traffic light evaluation error', { error });

    // Fail safe - return GREEN with warning
    return {
      color: 'GREEN',
      signals: [{
        ruleId: 'SYSTEM_ERROR',
        ruleName: 'Evaluation Error',
        category: 'clinical',
        color: 'YELLOW',
        message: 'Rule evaluation failed - proceed with caution',
        messagePortuguese: 'Avaliação de regras falhou - prossiga com cautela',
        evidence: [],
      }],
      canOverride: true,
      needsChatAssistance: true,
      evaluationMs: performance.now() - startTime,
    };
  }
}

interface RuleLogic {
  applicableTo?: string[];
  conditions?: RuleCondition[];
  color: TrafficLightColor;
  message: string;
  messagePortuguese: string;
  regulatoryReference?: string;
  suggestedCorrection?: string;
  glosaRisk?: {
    probability: number;
    baseAmount: number;
    denialCode?: string;
  };
}

interface RuleCondition {
  field: string;
  operator: 'equals' | 'contains' | 'in' | 'not_in' | 'greater_than' | 'less_than' | 'exists' | 'not_exists' | 'matches';
  value: unknown;
}

/**
 * Evaluate a single rule against the context
 */
function evaluateRule(
  rule: RuleCache,
  context: EvaluationContext
): TrafficLightSignal | null {
  try {
    const logic = JSON.parse(rule.ruleLogic) as RuleLogic;

    // Check if rule is active
    if (!rule.isActive) {
      return null;
    }

    // Evaluate conditions
    if (logic.conditions && logic.conditions.length > 0) {
      const allConditionsMet = logic.conditions.every(condition =>
        evaluateCondition(condition, context.payload)
      );

      if (!allConditionsMet) {
        return null;
      }
    }

    // Rule triggered - create signal
    return {
      ruleId: rule.ruleId,
      ruleName: rule.name,
      ruleVersionId: rule.version,
      category: rule.category as RuleCategory,
      color: logic.color,
      message: logic.message,
      messagePortuguese: logic.messagePortuguese,
      regulatoryReference: logic.regulatoryReference,
      evidence: extractEvidence(logic.conditions || [], context.payload),
      suggestedCorrection: logic.suggestedCorrection,
      estimatedGlosaRisk: logic.glosaRisk ? {
        probability: logic.glosaRisk.probability,
        estimatedAmount: logic.glosaRisk.baseAmount,
        denialCode: logic.glosaRisk.denialCode,
      } : undefined,
    };
  } catch (error) {
    logger.error('Rule evaluation error', {
      ruleId: rule.ruleId,
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return null;
  }
}

/**
 * Evaluate a single condition
 */
function evaluateCondition(
  condition: RuleCondition,
  payload: Record<string, unknown>
): boolean {
  const fieldValue = getNestedValue(payload, condition.field);

  switch (condition.operator) {
    case 'equals':
      return fieldValue === condition.value;

    case 'contains':
      if (typeof fieldValue === 'string') {
        return fieldValue.toLowerCase().includes(String(condition.value).toLowerCase());
      }
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(condition.value);
      }
      return false;

    case 'in':
      if (Array.isArray(condition.value)) {
        return condition.value.includes(fieldValue);
      }
      return false;

    case 'not_in':
      if (Array.isArray(condition.value)) {
        return !condition.value.includes(fieldValue);
      }
      return true;

    case 'greater_than':
      return typeof fieldValue === 'number' && fieldValue > Number(condition.value);

    case 'less_than':
      return typeof fieldValue === 'number' && fieldValue < Number(condition.value);

    case 'exists':
      return fieldValue !== undefined && fieldValue !== null;

    case 'not_exists':
      return fieldValue === undefined || fieldValue === null;

    case 'matches':
      if (typeof fieldValue === 'string' && typeof condition.value === 'string') {
        try {
          const regex = new RegExp(condition.value);
          return regex.test(fieldValue);
        } catch {
          return false;
        }
      }
      return false;

    default:
      logger.warn('Unknown condition operator', { operator: condition.operator });
      return false;
  }
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Extract evidence from triggered conditions
 */
function extractEvidence(
  conditions: RuleCondition[],
  payload: Record<string, unknown>
): string[] {
  return conditions.map(condition => {
    const value = getNestedValue(payload, condition.field);
    return `${condition.field}: ${JSON.stringify(value)} ${condition.operator} ${JSON.stringify(condition.value)}`;
  });
}

/**
 * Determine overall color (worst wins)
 */
function determineOverallColor(signals: TrafficLightSignal[]): TrafficLightColor {
  if (signals.some(s => s.color === 'RED')) {
    return 'RED';
  }
  if (signals.some(s => s.color === 'YELLOW')) {
    return 'YELLOW';
  }
  return 'GREEN';
}

/**
 * Determine override requirements based on signals
 */
function determineOverrideRequirements(signals: TrafficLightSignal[]): {
  canOverride: boolean;
  overrideRequires?: 'justification' | 'supervisor' | 'blocked';
} {
  const redSignals = signals.filter(s => s.color === 'RED');
  const yellowSignals = signals.filter(s => s.color === 'YELLOW');

  // Clinical RED signals with lethal risk cannot be overridden
  const lethalSignals = redSignals.filter(
    s => s.category === 'clinical' && s.message.toLowerCase().includes('lethal')
  );

  if (lethalSignals.length > 0) {
    return { canOverride: false, overrideRequires: 'blocked' };
  }

  // Other RED signals require supervisor
  if (redSignals.length > 0) {
    return { canOverride: true, overrideRequires: 'supervisor' };
  }

  // YELLOW signals require justification
  if (yellowSignals.length > 0) {
    return { canOverride: true, overrideRequires: 'justification' };
  }

  return { canOverride: true };
}

/**
 * Calculate aggregate glosa risk
 */
function calculateTotalGlosaRisk(signals: TrafficLightSignal[]): {
  probability: number;
  totalAmountAtRisk: number;
  highestRiskCode?: string;
} | undefined {
  const glosaSignals = signals.filter(s => s.estimatedGlosaRisk);

  if (glosaSignals.length === 0) {
    return undefined;
  }

  // Sum up amounts
  const totalAmountAtRisk = glosaSignals.reduce(
    (sum, s) => sum + (s.estimatedGlosaRisk?.estimatedAmount || 0),
    0
  );

  // Combined probability (1 - product of (1 - individual probabilities))
  const combinedProbability = 1 - glosaSignals.reduce(
    (product, s) => product * (1 - (s.estimatedGlosaRisk?.probability || 0)),
    1
  );

  // Find highest risk signal
  const highestRisk = glosaSignals.reduce((max, s) =>
    (s.estimatedGlosaRisk?.probability || 0) > (max.estimatedGlosaRisk?.probability || 0)
      ? s
      : max
  );

  return {
    probability: Math.round(combinedProbability * 100) / 100,
    totalAmountAtRisk,
    highestRiskCode: highestRisk.estimatedGlosaRisk?.denialCode,
  };
}

/**
 * Get human-readable color meaning
 */
export function getColorMeaning(color: TrafficLightColor): {
  meaning: string;
  meaningPortuguese: string;
  action: string;
  actionPortuguese: string;
} {
  switch (color) {
    case 'RED':
      return {
        meaning: 'Hard Block - High Risk',
        meaningPortuguese: 'Bloqueio Total - Alto Risco',
        action: 'Action blocked. Supervisor override or correction required.',
        actionPortuguese: 'Ação bloqueada. Necessária aprovação de supervisor ou correção.',
      };
    case 'YELLOW':
      return {
        meaning: 'Soft Block - Attention Required',
        meaningPortuguese: 'Bloqueio Parcial - Atenção Necessária',
        action: 'Review signals and provide justification to proceed.',
        actionPortuguese: 'Revise os alertas e forneça justificativa para prosseguir.',
      };
    case 'GREEN':
      return {
        meaning: 'Pass - No Issues Detected',
        meaningPortuguese: 'Liberado - Nenhum Problema Detectado',
        action: 'Proceed with action.',
        actionPortuguese: 'Prossiga com a ação.',
      };
  }
}
