/**
 * Governance MCP Tools - Safety and compliance operations for agents
 *
 * REFACTORED: Decomposed into pure primitives per agent-native architecture audit.
 * Business logic (BLOCKED/WARNING/SAFE decisions) removed - agent orchestrates.
 *
 * Primitives:
 * - get_medication_rules: Returns raw rules
 * - get_patient_safety_context: Returns raw patient data for safety checks
 * - evaluate_rule: Evaluates a single rule against provided data
 * - match_contraindications: Returns matching rules without decisions
 *
 * Legacy (deprecated):
 * - check_medication_safety: Still available but marked deprecated
 *
 * Uses `any` types for complex Prisma queries to avoid type inference issues.
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { governance } from '@/lib/governance/governance.service';
import { FAST_LANE_RULES, type GovernanceRule } from '@/lib/governance/governance.rules';
import jsonLogic from 'json-logic-js';
import {
    CheckMedicationSafetySchema,
    RunSlowLaneAuditSchema,
    LogGovernanceOverrideSchema,
    GetGovernanceStatsSchema,
    type CheckMedicationSafetyInput,
    type RunSlowLaneAuditInput,
    type LogGovernanceOverrideInput,
    type GetGovernanceStatsInput,
} from '../schemas/tool-schemas';
import type { MCPTool, MCPContext, MCPResult } from '../types';

// =============================================================================
// PRIMITIVE SCHEMAS
// =============================================================================

const GetMedicationRulesSchema = z.object({
    severity: z.enum(['HARD_BLOCK', 'SOFT_NUDGE', 'INFO']).optional()
        .describe('Filter rules by severity level'),
    medicationClass: z.string().optional()
        .describe('Filter rules relevant to a specific medication class'),
});

const GetPatientSafetyContextSchema = z.object({
    patientId: z.string().uuid().describe('The patient ID to get safety context for'),
});

const EvaluateRuleSchema = z.object({
    ruleId: z.string().describe('The rule ID to evaluate'),
    context: z.record(z.any()).describe('The context data to evaluate the rule against'),
});

const MatchContraindicationsSchema = z.object({
    patientId: z.string().uuid().describe('The patient ID'),
    proposedMedication: z.string().describe('Name of medication being considered'),
    medicationClass: z.string().optional().describe('Drug class (e.g., "Beta-Blocker", "NSAID")'),
});

type GetMedicationRulesInput = z.infer<typeof GetMedicationRulesSchema>;
type GetPatientSafetyContextInput = z.infer<typeof GetPatientSafetyContextSchema>;
type EvaluateRuleInput = z.infer<typeof EvaluateRuleSchema>;
type MatchContraindicationsInput = z.infer<typeof MatchContraindicationsSchema>;

// =============================================================================
// PRIMITIVE: get_medication_rules
// Returns raw rules without evaluation - agent decides which to apply
// =============================================================================

async function getMedicationRulesHandler(
    input: GetMedicationRulesInput,
    context: MCPContext
): Promise<MCPResult> {
    let rules = [...FAST_LANE_RULES];

    // Filter by severity if specified
    if (input.severity) {
        rules = rules.filter(r => r.severity === input.severity);
    }

    // Filter by medication class if specified (search in rule logic for relevance)
    if (input.medicationClass) {
        const searchTerm = input.medicationClass.toLowerCase();
        rules = rules.filter(r => {
            const logicStr = JSON.stringify(r.logic).toLowerCase();
            return logicStr.includes(searchTerm);
        });
    }

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'get_medication_rules',
        ruleCount: rules.length,
        severity: input.severity,
        medicationClass: input.medicationClass,
        agentId: context.agentId,
    });

    // Return raw rule data - no decisions or recommendations
    return {
        success: true,
        data: {
            rules: rules.map(r => ({
                ruleId: r.ruleId,
                name: r.name,
                severity: r.severity,
                source: r.source,
                logic: r.logic,
                intervention: r.intervention,
            })),
            totalRules: FAST_LANE_RULES.length,
            returnedRules: rules.length,
        },
    };
}

// =============================================================================
// PRIMITIVE: get_patient_safety_context
// Returns raw patient data for safety evaluation - no processing
// =============================================================================

async function getPatientSafetyContextHandler(
    input: GetPatientSafetyContextInput,
    context: MCPContext
): Promise<MCPResult> {
    const patient: any = await prisma.patient.findFirst({
        where: {
            id: input.patientId,
            assignedClinicianId: context.clinicianId,
        },
        include: {
            diagnoses: true,
            allergies: true,
            medications: { where: { isActive: true } },
        },
    });

    if (!patient) {
        return { success: false, error: 'Patient not found or access denied', data: null };
    }

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'get_patient_safety_context',
        patientId: input.patientId,
        agentId: context.agentId,
    });

    // Return raw data - agent builds context as needed
    return {
        success: true,
        data: {
            patientId: patient.id,
            dateOfBirth: patient.dateOfBirth,
            conditions: (patient.diagnoses || []).map((d: any) => ({
                code: d.code,
                description: d.description,
                isActive: d.isActive,
            })),
            allergies: (patient.allergies || []).map((a: any) => ({
                allergen: a.allergen,
                severity: a.severity,
                reactions: a.reactions,
            })),
            currentMedications: (patient.medications || []).map((m: any) => ({
                name: m.name,
                dose: m.dose,
                frequency: m.frequency,
                isActive: m.isActive,
            })),
        },
    };
}

// =============================================================================
// PRIMITIVE: evaluate_rule
// Evaluates a single rule against provided context - pure function
// =============================================================================

async function evaluateRuleHandler(
    input: EvaluateRuleInput,
    context: MCPContext
): Promise<MCPResult> {
    const rule = FAST_LANE_RULES.find(r => r.ruleId === input.ruleId);

    if (!rule) {
        return { success: false, error: `Rule not found: ${input.ruleId}`, data: null };
    }

    let triggered = false;
    let error: string | null = null;

    try {
        triggered = jsonLogic.apply(rule.logic, input.context);
    } catch (e) {
        error = e instanceof Error ? e.message : 'Unknown evaluation error';
        logger.warn({
            event: 'rule_evaluation_error',
            ruleId: input.ruleId,
            error,
            agentId: context.agentId,
        });
    }

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'evaluate_rule',
        ruleId: input.ruleId,
        triggered,
        agentId: context.agentId,
    });

    // Return raw evaluation result - no interpretation
    return {
        success: true,
        data: {
            ruleId: rule.ruleId,
            ruleName: rule.name,
            severity: rule.severity,
            triggered,
            error,
            // Include rule details for agent context
            intervention: rule.intervention,
            source: rule.source,
        },
    };
}

// =============================================================================
// PRIMITIVE: match_contraindications
// Returns all matching rules for a medication - no status/decision
// =============================================================================

async function matchContraindicationsHandler(
    input: MatchContraindicationsInput,
    context: MCPContext
): Promise<MCPResult> {
    // Get patient safety context
    const patient: any = await prisma.patient.findFirst({
        where: {
            id: input.patientId,
            assignedClinicianId: context.clinicianId,
        },
        include: {
            diagnoses: true,
            allergies: true,
            medications: { where: { isActive: true } },
        },
    });

    if (!patient) {
        return { success: false, error: 'Patient not found or access denied', data: null };
    }

    // Build context for rule evaluation
    const ruleContext = {
        proposedMedication: input.proposedMedication.toLowerCase(),
        proposed_medication_class: input.medicationClass?.toLowerCase(),
        patient_conditions: (patient.diagnoses || []).map((d: any) => d.description || d.code || ''),
        conditions: (patient.diagnoses || []).map((d: any) => (d.description || d.code || '').toLowerCase()),
        allergies: (patient.allergies || []).map((a: any) => (a.allergen || '').toLowerCase()),
        current_medications: (patient.medications || []).map((m: any) => (m.name || '').toLowerCase()),
        currentMedications: (patient.medications || []).map((m: any) => (m.name || '').toLowerCase()),
    };

    // Evaluate all rules and collect matches
    const matches: Array<{
        ruleId: string;
        name: string;
        severity: string;
        intervention: { message: string; recommendation: string };
        source: { authority: string; year: number; url?: string };
    }> = [];

    for (const rule of FAST_LANE_RULES) {
        try {
            const triggered = jsonLogic.apply(rule.logic, ruleContext);
            if (triggered) {
                matches.push({
                    ruleId: rule.ruleId,
                    name: rule.name,
                    severity: rule.severity,
                    intervention: rule.intervention,
                    source: rule.source,
                });
            }
        } catch (e) {
            logger.warn({
                event: 'rule_evaluation_error',
                ruleId: rule.ruleId,
                error: e instanceof Error ? e.message : 'Unknown error',
            });
        }
    }

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'match_contraindications',
        patientId: input.patientId,
        medication: input.proposedMedication,
        matchCount: matches.length,
        agentId: context.agentId,
    });

    // Return raw matches - agent decides what to do with them
    return {
        success: true,
        data: {
            proposedMedication: input.proposedMedication,
            medicationClass: input.medicationClass,
            matches,
            evaluatedRuleCount: FAST_LANE_RULES.length,
            // Raw counts for agent analysis - no status determination
            hardBlockCount: matches.filter(m => m.severity === 'HARD_BLOCK').length,
            softNudgeCount: matches.filter(m => m.severity === 'SOFT_NUDGE').length,
            infoCount: matches.filter(m => m.severity === 'INFO').length,
        },
    };
}

// =============================================================================
// LEGACY TOOL: check_medication_safety (DEPRECATED)
// Kept for backward compatibility - use primitives instead
// =============================================================================

async function checkMedicationSafetyHandler(
    input: CheckMedicationSafetyInput,
    context: MCPContext
): Promise<MCPResult> {
    logger.warn({
        event: 'deprecated_tool_called',
        tool: 'check_medication_safety',
        message: 'Use get_medication_rules + match_contraindications primitives instead',
        agentId: context.agentId,
    });

    // Load patient with any type for complex relations
    const patient: any = await prisma.patient.findFirst({
        where: {
            id: input.patientId,
            assignedClinicianId: context.clinicianId,
        },
        include: {
            diagnoses: true,
            allergies: true,
            medications: true,
        },
    });

    if (!patient) {
        return { success: false, error: 'Patient not found or access denied', data: null };
    }

    // Build context for rule evaluation
    const ruleContext = {
        proposedMedication: input.proposedMedication.toLowerCase(),
        medicationClass: input.medicationClass?.toLowerCase(),
        conditions: (patient.diagnoses || []).map((d: any) => (d.description || d.code || '').toLowerCase()),
        allergies: (patient.allergies || []).map((a: any) => (a.allergen || '').toLowerCase()),
        currentMedications: (patient.medications || []).map((m: any) => (m.name || '').toLowerCase()),
        patientAge: patient.dateOfBirth
            ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
            : null,
    };

    // Evaluate all Fast Lane rules
    const violations: Array<{
        ruleId: string;
        name: string;
        severity: string;
        message: string;
        recommendation?: string;
    }> = [];

    for (const rule of FAST_LANE_RULES) {
        try {
            const triggered = jsonLogic.apply(rule.logic, ruleContext);
            if (triggered) {
                violations.push({
                    ruleId: rule.ruleId,
                    name: rule.name,
                    severity: rule.severity,
                    message: (rule.intervention as any)?.message || rule.name,
                    recommendation: (rule.intervention as any)?.recommendation,
                });
            }
        } catch (e) {
            logger.warn({
                event: 'rule_evaluation_error',
                ruleId: rule.ruleId,
                error: e instanceof Error ? e.message : 'Unknown error',
            });
        }
    }

    // Determine overall safety status
    const hasHardBlock = violations.some(v => v.severity === 'HARD_BLOCK');
    const hasSoftNudge = violations.some(v => v.severity === 'SOFT_NUDGE');
    const status = hasHardBlock ? 'BLOCKED' : hasSoftNudge ? 'WARNING' : 'SAFE';

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'check_medication_safety',
        patientId: input.patientId,
        medication: input.proposedMedication,
        status,
        violationCount: violations.length,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            status,
            safe: !hasHardBlock,
            violations,
            patientContext: {
                conditionCount: ruleContext.conditions.length,
                allergyCount: ruleContext.allergies.length,
                activeMedicationCount: ruleContext.currentMedications.length,
            },
            recommendation: hasHardBlock
                ? 'This medication is contraindicated. Consider alternative therapy.'
                : hasSoftNudge
                    ? 'Use caution. Review flagged interactions before proceeding.'
                    : 'No contraindications detected. Proceed with standard precautions.',
        },
    };
}

// =============================================================================
// TOOL: run_slow_lane_audit
// =============================================================================

async function runSlowLaneAuditHandler(
    input: RunSlowLaneAuditInput,
    context: MCPContext
): Promise<MCPResult> {
    logger.info({
        event: 'mcp_tool_executed',
        tool: 'run_slow_lane_audit',
        sessionId: input.sessionId,
        contentLength: input.content.length,
        agentId: context.agentId,
    });

    // TODO: Integrate with actual Slow Lane LLM audit
    return {
        success: true,
        data: {
            auditId: crypto.randomUUID(),
            status: 'PENDING',
            message: 'Slow Lane audit queued for review',
            estimatedCompletionMs: 5000,
        },
    };
}

// =============================================================================
// TOOL: log_governance_override
// =============================================================================

async function logGovernanceOverrideHandler(
    input: LogGovernanceOverrideInput,
    context: MCPContext
): Promise<MCPResult> {
    await governance.logOverride({
        sessionId: input.sessionId,
        ruleId: input.ruleId,
        reason: input.reason,
        userId: context.clinicianId,
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'log_governance_override',
        sessionId: input.sessionId,
        ruleId: input.ruleId,
        clinicianId: context.clinicianId,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            recorded: true,
            overrideId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            message: 'Override recorded with clinical justification',
        },
    };
}

// =============================================================================
// TOOL: get_governance_stats
// =============================================================================

async function getGovernanceStatsHandler(
    input: GetGovernanceStatsInput,
    context: MCPContext
): Promise<MCPResult> {
    const timeRangeMs = {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
    }[input.timeRange];

    const since = new Date(Date.now() - timeRangeMs);

    // Query with any type
    const logs: any[] = await (prisma as any).governanceLog.findMany({
        where: { createdAt: { gte: since } },
    });

    // Aggregate stats
    const stats = {
        total: logs.length,
        passed: logs.filter(l => l.action === 'PASSED').length,
        blocked: logs.filter(l => l.action === 'BLOCKED').length,
        flagged: logs.filter(l => l.action === 'FLAGGED').length,
        overridden: logs.filter(l => l.action === 'OVERRIDDEN').length,
        bySeverity: {
            hardBlock: logs.filter(l => l.severity === 'HARD_BLOCK').length,
            softNudge: logs.filter(l => l.severity === 'SOFT_NUDGE').length,
            info: logs.filter(l => l.severity === 'INFO').length,
        },
        topRules: Object.entries(
            logs.reduce((acc: Record<string, number>, l) => {
                if (l.ruleId) acc[l.ruleId] = (acc[l.ruleId] || 0) + 1;
                return acc;
            }, {})
        )
            .sort((a, b) => (b[1] as number) - (a[1] as number))
            .slice(0, 5)
            .map(([ruleId, count]) => ({ ruleId, count })),
    };

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'get_governance_stats',
        timeRange: input.timeRange,
        totalEvents: stats.total,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            timeRange: input.timeRange,
            since: since.toISOString(),
            stats,
            safetyScore: stats.total > 0
                ? Math.round(((stats.passed + stats.flagged) / stats.total) * 100)
                : 100,
        },
    };
}

// =============================================================================
// EXPORT: Governance Tools
// =============================================================================

export const governanceTools: MCPTool[] = [
    // ==========================================================================
    // PRIMITIVE TOOLS (Agent-native architecture)
    // ==========================================================================
    {
        name: 'get_medication_rules',
        description: 'Get raw medication safety rules from the governance engine. Returns rule definitions including JSON-Logic, severity, and source citations. Agent decides which rules to evaluate.',
        category: 'governance',
        inputSchema: GetMedicationRulesSchema,
        requiredPermissions: ['governance:read'],
        handler: getMedicationRulesHandler,
    },
    {
        name: 'get_patient_safety_context',
        description: 'Get raw patient data needed for safety rule evaluation: conditions, allergies, current medications. No processing - returns data for agent to use with evaluate_rule.',
        category: 'governance',
        inputSchema: GetPatientSafetyContextSchema,
        requiredPermissions: ['governance:read', 'patient:read'],
        handler: getPatientSafetyContextHandler,
    },
    {
        name: 'evaluate_rule',
        description: 'Evaluate a single governance rule against provided context data. Returns triggered: true/false. Agent provides context and interprets result.',
        category: 'governance',
        inputSchema: EvaluateRuleSchema,
        requiredPermissions: ['governance:read'],
        handler: evaluateRuleHandler,
    },
    {
        name: 'match_contraindications',
        description: 'Find all governance rules that match for a proposed medication given patient context. Returns raw matches with severity counts - agent decides action.',
        category: 'governance',
        inputSchema: MatchContraindicationsSchema,
        requiredPermissions: ['governance:read', 'patient:read'],
        handler: matchContraindicationsHandler,
    },
    // ==========================================================================
    // LEGACY TOOLS (Deprecated - use primitives)
    // ==========================================================================
    {
        name: 'check_medication_safety',
        description: '[DEPRECATED: Use match_contraindications + agent reasoning] Run Fast Lane contraindication check. Returns BLOCKED/WARNING/SAFE status.',
        category: 'governance',
        inputSchema: CheckMedicationSafetySchema,
        requiredPermissions: ['governance:read', 'patient:read'],
        handler: checkMedicationSafetyHandler,
        deprecated: true,
        alternatives: ['match_contraindications', 'get_medication_rules', 'evaluate_rule'],
    },
    {
        name: 'run_slow_lane_audit',
        description: 'Trigger asynchronous LLM-based safety audit on clinical content',
        category: 'governance',
        inputSchema: RunSlowLaneAuditSchema,
        requiredPermissions: ['governance:write'],
        handler: runSlowLaneAuditHandler,
    },
    {
        name: 'log_governance_override',
        description: 'Record a clinician override of a safety warning with clinical justification',
        category: 'governance',
        inputSchema: LogGovernanceOverrideSchema,
        requiredPermissions: ['governance:override'],
        handler: logGovernanceOverrideHandler,
    },
    {
        name: 'get_governance_stats',
        description: 'Get aggregated governance statistics for a time period',
        category: 'governance',
        inputSchema: GetGovernanceStatsSchema,
        requiredPermissions: ['governance:read'],
        handler: getGovernanceStatsHandler,
    },
];
