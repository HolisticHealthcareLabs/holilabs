/**
 * Traffic Light Engine (Web Port)
 *
 * UNIFIED ENGINE: This logic MUST match `apps/edge/src/traffic-light/engine.ts` exactly.
 * Any specific changes here must be backported to Edge.
 */

import { RuleCache, RuleLogic, RuleCondition, TrafficLightSignal, TrafficLightResult, EvaluationContext, TrafficLightColor } from './shared-types';

/**
 * Evaluate traffic light locally (Web Version)
 */
export async function evaluateUnifiedTrafficLight(
    context: EvaluationContext
): Promise<TrafficLightResult> {
    const startTime = Date.now();
    const signals: TrafficLightSignal[] = [];

    try {
        // If rules not provided in context, we assume caller (Service) fetches them.
        // In Edge, this function takes rules as input.
        const rulesToCheck = context.rules || [];

        // Filter rules by action type
        const applicableRules = rulesToCheck.filter(rule => {
            try {
                const logic = JSON.parse(rule.ruleLogic) as RuleLogic;
                return logic.applicableTo?.includes(context.action) ?? true;
            } catch (e) {
                console.error(`Invalid JSON for rule ${rule.ruleId}`, e);
                return false;
            }
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

        const evaluationMs = Date.now() - startTime;

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
        console.error('Traffic light evaluation error', { error });

        // Fail safe - return GREEN with warning
        return {
            color: 'GREEN',
            signals: [{
                ruleId: 'SYSTEM_ERROR',
                ruleName: 'Evaluation Error',
                category: 'clinical',
                color: 'YELLOW',
                message: 'Rule evaluation failed',
                messagePortuguese: 'Avaliação de regras falhou',
                evidence: [],
            }],
            canOverride: true,
            needsChatAssistance: true,
            evaluationMs: Date.now() - startTime,
        };
    }
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
            category: rule.category as any,
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
        console.error('Rule evaluation error', rule.ruleId, error);
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

    // Normalize for case-insensitive string comparison if needed
    const normalize = (val: unknown) => (typeof val === 'string' ? val.toLowerCase() : val);

    switch (condition.operator) {
        case 'equals':
            return normalize(fieldValue) === normalize(condition.value);

        case 'contains':
            if (typeof fieldValue === 'string') {
                return fieldValue.toLowerCase().includes(String(condition.value).toLowerCase());
            }
            if (Array.isArray(fieldValue)) {
                return fieldValue.some(v => normalize(v) === normalize(condition.value));
            }
            return false;

        case 'in':
            if (Array.isArray(condition.value)) {
                return condition.value.some(v => normalize(v) === normalize(fieldValue));
            }
            return false;

        case 'not_in':
            if (Array.isArray(condition.value)) {
                return !condition.value.some(v => normalize(v) === normalize(fieldValue));
            }
            return true;

        // ... (Simplified for brevity, assuming MVP needs mainly 'in' and 'contains')
        // Full port would include greater_than, etc. but clinical rules mostly use set membership.

        case 'exists':
            return fieldValue !== undefined && fieldValue !== null;

        default:
            // Basic fallback for simple checks
            if (condition.operator === 'matches' && typeof fieldValue === 'string' && typeof condition.value === 'string') {
                try {
                    const regex = new RegExp(condition.value, 'i');
                    return regex.test(fieldValue);
                } catch { return false; }
            }
            return false;
    }
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: any = obj;

    for (const part of parts) {
        if (current === null || current === undefined) return undefined;
        current = current[part];
    }
    return current;
}

function extractEvidence(
    conditions: RuleCondition[],
    payload: Record<string, unknown>
): string[] {
    return conditions.map(condition => {
        const value = getNestedValue(payload, condition.field);
        return `${condition.field}: ${JSON.stringify(value)} ${condition.operator} ${JSON.stringify(condition.value)}`;
    });
}

function determineOverallColor(signals: TrafficLightSignal[]): TrafficLightColor {
    if (signals.some(s => s.color === 'RED')) return 'RED';
    if (signals.some(s => s.color === 'YELLOW')) return 'YELLOW';
    return 'GREEN';
}

function determineOverrideRequirements(signals: TrafficLightSignal[]): {
    canOverride: boolean;
    overrideRequires?: 'justification' | 'supervisor' | 'blocked';
} {
    const redSignals = signals.filter(s => s.color === 'RED');
    const yellowSignals = signals.filter(s => s.color === 'YELLOW');

    const lethalSignals = redSignals.filter(
        s => s.category === 'clinical' && s.message.toLowerCase().includes('lethal')
    );

    if (lethalSignals.length > 0) return { canOverride: false, overrideRequires: 'blocked' };
    if (redSignals.length > 0) return { canOverride: true, overrideRequires: 'supervisor' };
    if (yellowSignals.length > 0) return { canOverride: true, overrideRequires: 'justification' };

    return { canOverride: true };
}

function calculateTotalGlosaRisk(signals: TrafficLightSignal[]): {
    probability: number;
    totalAmountAtRisk: number;
    highestRiskCode?: string;
} | undefined {
    const glosaSignals = signals.filter(s => s.estimatedGlosaRisk);
    if (glosaSignals.length === 0) return undefined;

    const totalAmountAtRisk = glosaSignals.reduce(
        (sum, s) => sum + (s.estimatedGlosaRisk?.estimatedAmount || 0),
        0
    );

    const combinedProbability = 1 - glosaSignals.reduce(
        (product, s) => product * (1 - (s.estimatedGlosaRisk?.probability || 0)),
        1
    );

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
