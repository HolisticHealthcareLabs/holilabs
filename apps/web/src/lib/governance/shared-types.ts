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
    protocolVersion: string;
    country: string;
    siteId: string;
    unit: string;
    protocolMode: GovernanceProtocolMode;
    actorRole: GovernanceActorRole;
    timestamp: string;
}

export const GOVERNANCE_CONTEXT_REQUIRED_FIELDS = [
    'protocolVersion',
    'country',
    'siteId',
    'unit',
    'protocolMode',
    'actorRole',
    'timestamp',
] as const;

export const GOVERNANCE_CONTEXT_FALLBACK: GovernanceEventContext = {
    protocolVersion: 'v1',
    country: 'ZZ',
    siteId: 'unknown-site',
    unit: 'unknown-unit',
    protocolMode: 'UNKNOWN',
    actorRole: 'SYSTEM',
    timestamp: '1970-01-01T00:00:00.000Z',
};

export const GOVERNANCE_EVENT_TYPES = [
    'OVERRIDE',
    'BLOCKED',
    'FLAGGED',
    'IMPRESSION',
    'LATENCY',
] as const;

export type GovernanceEventType = (typeof GOVERNANCE_EVENT_TYPES)[number];

export const GOVERNANCE_EVENT_LOG_TYPES = [
    'PASSED',
    'BLOCKED',
    'FLAGGED',
    'SHADOW_BLOCK',
    'OVERRIDE',
] as const;

export type GovernanceEventLogType = (typeof GOVERNANCE_EVENT_LOG_TYPES)[number];

export const GOVERNANCE_SEVERITIES = ['INFO', 'SOFT_NUDGE', 'HARD_BLOCK'] as const;
export type GovernanceSeverity = (typeof GOVERNANCE_SEVERITIES)[number];

export const GOVERNANCE_BLOCKING_SEVERITIES = ['SOFT_NUDGE', 'HARD_BLOCK'] as const;
export type GovernanceBlockingSeverity = (typeof GOVERNANCE_BLOCKING_SEVERITIES)[number];

export const GOVERNANCE_PROTOCOL_MODES = [
    'DETERMINISTIC_100',
    'HYBRID_70_30',
    'UNKNOWN',
] as const;
export type GovernanceProtocolMode = (typeof GOVERNANCE_PROTOCOL_MODES)[number];

export const GOVERNANCE_ACTOR_ROLES = [
    'ADMIN',
    'CLINICIAN',
    'NURSE',
    'SYSTEM',
    'AGENT',
] as const;
export type GovernanceActorRole = (typeof GOVERNANCE_ACTOR_ROLES)[number];

export interface GovernanceContractError {
    field: string;
    message: string;
    allowedValues?: readonly string[];
}

export interface GovernanceOverrideEventRequest extends GovernanceEventContext {
    type: 'OVERRIDE';
    sessionId: string;
    ruleId?: string;
    reason: OverrideReasonCode;
    provider?: string;
    clinicId?: string;
    userId?: string;
    userName?: string;
}

export interface GovernanceBlockedEventRequest extends GovernanceEventContext {
    type: 'BLOCKED';
    sessionId: string;
    ruleId?: string;
    ruleName?: string;
    severity: GovernanceBlockingSeverity;
    description?: string;
    provider?: string;
    clinicId?: string;
    userId?: string;
    userName?: string;
}

export interface GovernanceFlaggedEventRequest extends GovernanceEventContext {
    type: 'FLAGGED';
    sessionId: string;
    ruleId?: string;
    ruleName?: string;
    severity: GovernanceSeverity;
    description?: string;
    provider?: string;
    clinicId?: string;
    userId?: string;
    userName?: string;
}

export interface GovernanceImpressionEventRequest {
    type: 'IMPRESSION';
    [key: string]: unknown;
}

export interface GovernanceLatencyEventRequest {
    type: 'LATENCY';
    [key: string]: unknown;
}

export type GovernanceEventRequest =
    | GovernanceOverrideEventRequest
    | GovernanceBlockedEventRequest
    | GovernanceFlaggedEventRequest
    | GovernanceImpressionEventRequest
    | GovernanceLatencyEventRequest;

export type GovernanceValidationResult =
    | { success: true; data: GovernanceEventRequest }
    | { success: false; errors: GovernanceContractError[] };

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getNonEmptyString(value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }
    const trimmedValue = value.trim();
    return trimmedValue.length > 0 ? trimmedValue : undefined;
}

function isEnumValue<T extends readonly string[]>(value: unknown, allowed: T): value is T[number] {
    return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

function collectRequiredContextErrors(payload: Record<string, unknown>): GovernanceContractError[] {
    const errors: GovernanceContractError[] = [];

    if (!getNonEmptyString(payload.protocolVersion)) {
        errors.push({ field: 'protocolVersion', message: 'protocolVersion is required' });
    }
    if (!getNonEmptyString(payload.country)) {
        errors.push({ field: 'country', message: 'country is required' });
    }
    if (!getNonEmptyString(payload.siteId)) {
        errors.push({ field: 'siteId', message: 'siteId is required' });
    }
    if (!getNonEmptyString(payload.unit)) {
        errors.push({ field: 'unit', message: 'unit is required' });
    }
    if (!isEnumValue(payload.protocolMode, GOVERNANCE_PROTOCOL_MODES)) {
        errors.push({
            field: 'protocolMode',
            message: 'protocolMode is invalid',
            allowedValues: GOVERNANCE_PROTOCOL_MODES,
        });
    }
    if (!isEnumValue(payload.actorRole, GOVERNANCE_ACTOR_ROLES)) {
        errors.push({
            field: 'actorRole',
            message: 'actorRole is invalid',
            allowedValues: GOVERNANCE_ACTOR_ROLES,
        });
    }

    const timestamp = getNonEmptyString(payload.timestamp);
    if (!timestamp) {
        errors.push({ field: 'timestamp', message: 'timestamp is required' });
    } else if (Number.isNaN(Date.parse(timestamp))) {
        errors.push({ field: 'timestamp', message: 'timestamp must be ISO-8601 compatible' });
    }

    return errors;
}

function buildValidatedContext(payload: Record<string, unknown>): GovernanceEventContext {
    return {
        protocolVersion: getNonEmptyString(payload.protocolVersion)!,
        country: getNonEmptyString(payload.country)!,
        siteId: getNonEmptyString(payload.siteId)!,
        unit: getNonEmptyString(payload.unit)!,
        protocolMode: payload.protocolMode as GovernanceProtocolMode,
        actorRole: payload.actorRole as GovernanceActorRole,
        timestamp: getNonEmptyString(payload.timestamp)!,
    };
}

/**
 * Strict runtime contract validation for governance telemetry events.
 * This is intentionally deterministic (no fallback dimensions) so reporting/KPIs remain trustworthy.
 */
export function validateGovernanceEventRequest(input: unknown): GovernanceValidationResult {
    if (!isRecord(input)) {
        return {
            success: false,
            errors: [{ field: 'body', message: 'Request body must be a JSON object' }],
        };
    }

    const type = input.type;
    if (!isEnumValue(type, GOVERNANCE_EVENT_TYPES)) {
        return {
            success: false,
            errors: [{
                field: 'type',
                message: 'Unknown governance event type',
                allowedValues: GOVERNANCE_EVENT_TYPES,
            }],
        };
    }

    if (type === 'IMPRESSION') {
        return { success: true, data: { type } };
    }

    if (type === 'LATENCY') {
        return { success: true, data: { type } };
    }

    const errors: GovernanceContractError[] = [];
    const sessionId = getNonEmptyString(input.sessionId);
    if (!sessionId) {
        errors.push({ field: 'sessionId', message: 'sessionId is required' });
    }

    errors.push(...collectRequiredContextErrors(input));

    if (type === 'OVERRIDE') {
        const reason = getNonEmptyString(input.reason);
        if (!reason || !isOverrideReasonCode(reason)) {
            errors.push({
                field: 'reason',
                message: 'Override requires a valid reason code',
                allowedValues: OVERRIDE_REASON_CODES,
            });
        }

        if (errors.length > 0) {
            return { success: false, errors };
        }

        return {
            success: true,
            data: {
                type,
                sessionId: sessionId!,
                ruleId: getNonEmptyString(input.ruleId),
                reason: reason as OverrideReasonCode,
                provider: getNonEmptyString(input.provider),
                clinicId: getNonEmptyString(input.clinicId),
                userId: getNonEmptyString(input.userId),
                userName: getNonEmptyString(input.userName),
                ...buildValidatedContext(input),
            },
        };
    }

    const severity = input.severity;
    if (type === 'BLOCKED') {
        if (!isEnumValue(severity, GOVERNANCE_BLOCKING_SEVERITIES)) {
            errors.push({
                field: 'severity',
                message: 'severity is invalid for BLOCKED events',
                allowedValues: GOVERNANCE_BLOCKING_SEVERITIES,
            });
        }

        if (errors.length > 0) {
            return { success: false, errors };
        }

        return {
            success: true,
            data: {
                type,
                sessionId: sessionId!,
                ruleId: getNonEmptyString(input.ruleId),
                ruleName: getNonEmptyString(input.ruleName),
                severity: severity as GovernanceBlockingSeverity,
                description: getNonEmptyString(input.description),
                provider: getNonEmptyString(input.provider),
                clinicId: getNonEmptyString(input.clinicId),
                userId: getNonEmptyString(input.userId),
                userName: getNonEmptyString(input.userName),
                ...buildValidatedContext(input),
            },
        };
    }

    if (!isEnumValue(severity, GOVERNANCE_SEVERITIES)) {
        errors.push({
            field: 'severity',
            message: 'severity is invalid for FLAGGED events',
            allowedValues: GOVERNANCE_SEVERITIES,
        });
    }

    if (errors.length > 0) {
        return { success: false, errors };
    }

    return {
        success: true,
        data: {
            type,
            sessionId: sessionId!,
            ruleId: getNonEmptyString(input.ruleId),
            ruleName: getNonEmptyString(input.ruleName),
            severity: severity as GovernanceSeverity,
            description: getNonEmptyString(input.description),
            provider: getNonEmptyString(input.provider),
            clinicId: getNonEmptyString(input.clinicId),
            userId: getNonEmptyString(input.userId),
            userName: getNonEmptyString(input.userName),
            ...buildValidatedContext(input),
        },
    };
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
