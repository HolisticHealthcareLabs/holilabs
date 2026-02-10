/**
 * Shared Type Definitions (Unified "Golden Record")
 * 
 * MIRRORS: apps/edge/src/generated/prisma/index.d.ts (RuleCache)
 * MIRRORS: apps/edge/src/traffic-light/engine.ts (TrafficLight types)
 */

export type TrafficLightColor = 'RED' | 'YELLOW' | 'GREEN';
export type RuleCategory = 'clinical' | 'administrative' | 'billing';

export const OVERRIDE_REASON_CODES = [
    'BENEFIT_OUTWEIGHS_RISK',
    'PATIENT_TOLERANT',
    'PALLIATIVE_CARE',
    'GUIDELINE_MISMATCH',
    'OTHER',
] as const;

export type OverrideReasonCode = (typeof OVERRIDE_REASON_CODES)[number];

export function isOverrideReasonCode(value: unknown): value is OverrideReasonCode {
    return typeof value === 'string' && OVERRIDE_REASON_CODES.includes(value as OverrideReasonCode);
}

export interface GovernanceEventContext {
    protocolVersion?: string;
    country?: string;
    siteId?: string;
}

// The Database Schema (Simulated for Web)
export interface RuleCache {
    id: string; // Prisma internal ID
    ruleId: string; // Business ID (e.g., "BSTH-001")
    name: string;
    version: string;
    category: string;
    isActive: boolean;
    ruleLogic: string; // JSON String of RuleLogic
    description?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

// The Logic Definition (JSON structure stored in ruleLogic)
export interface RuleLogic {
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

export interface RuleCondition {
    field: string;
    operator: 'equals' | 'contains' | 'in' | 'not_in' | 'greater_than' | 'less_than' | 'exists' | 'not_exists' | 'matches';
    value: unknown;
}

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
    patientHash?: string;
    action: 'order' | 'prescription' | 'procedure' | 'diagnosis' | 'billing';
    payload: Record<string, unknown>;
    rules?: RuleCache[]; // Optional override, usually fetched from DB
}

export interface GovernanceVerdict {
    action: 'PASSED' | 'BLOCKED' | 'FLAGGED' | 'SHADOW_BLOCK';
    ruleId?: string;
    reason?: string;
    severity: 'INFO' | 'SOFT_NUDGE' | 'HARD_BLOCK';
    transactionId: string;
}
