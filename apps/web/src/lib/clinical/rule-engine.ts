/**
 * Hybrid Rule Engine
 *
 * Combines two types of rules:
 * 1. COMPLIANCE RULES (TypeScript) - Legal/regulatory, cannot be changed without deployment
 * 2. BUSINESS RULES (JSON-Logic in DB) - Operational, can be changed via database
 *
 * Evaluation order:
 * 1. Compliance rules first (if any blocks, stop immediately)
 * 2. Business rules second (load from DB, evaluate with JSON-Logic)
 *
 * This hybrid approach ensures:
 * - Compliance is never accidentally disabled
 * - Operations can tune business logic without deployments
 * - Full audit trail for all rule evaluations
 */

import { prisma } from '@/lib/prisma';
import jsonLogic from 'json-logic-js';
import {
  COMPLIANCE_RULES,
  evaluateCompliance,
  type ComplianceContext,
  type ComplianceResult,
  ComplianceViolationError,
} from './compliance-rules';
import logger from '@/lib/logger';

// ═══════════════════════════════════════════════════════════════
// SECURITY: JSON-LOGIC OPERATION ALLOWLIST (H3 Fix)
// ═══════════════════════════════════════════════════════════════

/**
 * Allowed JSON-Logic operations for business rules.
 * SECURITY: This prevents injection of dangerous operations via database rules.
 *
 * Only safe, side-effect-free operations are allowed.
 * DO NOT add: 'log', 'method', 'throw' or any custom operations.
 */
const ALLOWED_JSON_LOGIC_OPERATIONS = new Set([
  // Comparison operators
  '==', '===', '!=', '!==', '>', '>=', '<', '<=',
  // Logic operators
  'and', 'or', '!', '!!', 'if',
  // Numeric operators
  '+', '-', '*', '/', '%', 'min', 'max',
  // Array operators
  'in', 'cat', 'substr', 'merge', 'map', 'filter', 'reduce', 'all', 'some', 'none',
  // Data access
  'var', 'missing', 'missing_some',
]);

/**
 * Recursively validate that a JSON-Logic rule only uses allowed operations.
 * SECURITY: Blocks dangerous operations that could be injected via database.
 *
 * @param logic The JSON-Logic object to validate
 * @returns true if all operations are allowed, false otherwise
 */
function validateJsonLogicOperations(logic: unknown): boolean {
  // Primitives are always safe
  if (logic === null || typeof logic !== 'object') {
    return true;
  }

  // Arrays: validate each element
  if (Array.isArray(logic)) {
    return logic.every((item) => validateJsonLogicOperations(item));
  }

  // Objects: check each key is an allowed operation
  const obj = logic as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    // Check if operation is allowed
    if (!ALLOWED_JSON_LOGIC_OPERATIONS.has(key)) {
      logger.warn({
        event: 'json_logic_disallowed_operation',
        operation: key,
        allowedOperations: Array.from(ALLOWED_JSON_LOGIC_OPERATIONS),
      });
      return false;
    }

    // Recursively validate the operation's arguments
    if (!validateJsonLogicOperations(obj[key])) {
      return false;
    }
  }

  return true;
}

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Context for rule evaluation
 * Extends ComplianceContext with business rule fields
 */
export interface RuleContext extends ComplianceContext {
  // Patient data
  patientAge?: number;
  riskScore?: number;
  primaryCondition?: string;
  diagnoses?: string[];

  // Signup/routing data
  isNewSignup?: boolean;
  daysSinceSignup?: number;

  // Vitals (for alert rules)
  vitals?: {
    systolicBp?: number;
    diastolicBp?: number;
    heartRate?: number;
    temperature?: number;
    oxygenSaturation?: number;
  };

  // Labs (for clinical rules)
  labs?: {
    a1c?: number;
    ldl?: number;
    creatinine?: number;
    eGFR?: number;
  };

  // Medications
  medicationCount?: number;
  hasHighRiskMedications?: boolean;

  // Extensible - any additional fields for custom rules
  [key: string]: unknown;
}

/**
 * Outcome from a single rule evaluation
 */
export interface RuleOutcome {
  ruleId: string;
  ruleName: string;
  category: string;
  outcome: string | boolean | null;
  source: 'compliance' | 'database';
  executionTimeMs: number;
}

/**
 * Complete result from rule engine evaluation
 */
export interface RuleEngineResult {
  /** Whether all rules passed (no blocks) */
  allowed: boolean;
  /** Rule that blocked (if not allowed) */
  blockedByRule?: string;
  /** User-facing message */
  userMessage?: string;
  /** All rule outcomes */
  outcomes: RuleOutcome[];
  /** Actions to take (non-blocking rule outputs) */
  actions: string[];
  /** Warnings from soft rules */
  warnings: string[];
  /** Total evaluation time */
  totalTimeMs: number;
}

// ═══════════════════════════════════════════════════════════════
// CACHE
// ═══════════════════════════════════════════════════════════════

/**
 * Business rules cache with TTL
 */
interface CachedRules {
  rules: Array<{
    ruleId: string;
    name: string;
    category: string;
    logic: unknown;
    priority: number;
    clinicId: string | null;
  }>;
  expiresAt: number;
}

const RULES_CACHE = new Map<string, CachedRules>();
const CACHE_TTL_MS = 60_000; // 1 minute

// ═══════════════════════════════════════════════════════════════
// MAIN ENGINE
// ═══════════════════════════════════════════════════════════════

/**
 * Evaluate all rules (compliance + business) for a given context
 *
 * @param context Full context for rule evaluation
 * @returns RuleEngineResult with outcomes and actions
 *
 * @example
 * const result = await evaluateRules({
 *   userId: 'dr_123',
 *   patientId: 'pat_456',
 *   accessType: 'ai-process',
 *   hasLgpdConsent: true,
 *   riskScore: 85,
 *   vitals: { systolicBp: 185 },
 * });
 *
 * if (!result.allowed) {
 *   throw new Error(result.userMessage);
 * }
 *
 * // Handle actions
 * for (const action of result.actions) {
 *   if (action === 'FLAG_HIGH_RISK') scheduleFollowUp(patientId);
 *   if (action === 'ALERT_CRITICAL_VITALS') notifyOnCall(patientId);
 * }
 */
export async function evaluateRules(context: RuleContext): Promise<RuleEngineResult> {
  const startTime = Date.now();
  const outcomes: RuleOutcome[] = [];
  const actions: string[] = [];
  const warnings: string[] = [];

  logger.info({
    event: 'rule_engine_start',
    userId: context.userId,
    patientId: context.patientId,
    accessType: context.accessType,
  });

  // ─────────────────────────────────────────────────────────────
  // 1. COMPLIANCE RULES (TypeScript - always run first)
  // ─────────────────────────────────────────────────────────────
  const complianceStart = Date.now();
  const complianceResult = evaluateCompliance(context);
  const complianceTimeMs = Date.now() - complianceStart;

  // Record compliance rule outcomes
  for (const ruleId of complianceResult.rulesEvaluated) {
    const rule = Object.values(COMPLIANCE_RULES).find((r) => r.id === ruleId);
    outcomes.push({
      ruleId,
      ruleName: rule?.rule || ruleId,
      category: rule?.auditCategory || 'compliance',
      outcome: complianceResult.allowed || complianceResult.blockedByRule !== ruleId,
      source: 'compliance',
      executionTimeMs: complianceTimeMs / complianceResult.rulesEvaluated.length,
    });
  }

  // Add compliance warnings
  warnings.push(...complianceResult.warnings);

  // If compliance blocks, stop immediately
  if (!complianceResult.allowed) {
    logger.warn({
      event: 'rule_engine_compliance_blocked',
      blockedBy: complianceResult.blockedByRule,
      userId: context.userId,
      patientId: context.patientId,
    });

    return {
      allowed: false,
      blockedByRule: complianceResult.blockedByRule,
      userMessage: complianceResult.userMessage,
      outcomes,
      actions,
      warnings,
      totalTimeMs: Date.now() - startTime,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 2. BUSINESS RULES (JSON-Logic from database)
  // ─────────────────────────────────────────────────────────────
  const businessRules = await getBusinessRules(context.clinicId);

  for (const rule of businessRules) {
    const ruleStart = Date.now();

    try {
      // SECURITY FIX (H3): Validate JSON-Logic operations before execution
      if (!validateJsonLogicOperations(rule.logic)) {
        logger.error({
          event: 'rule_engine_invalid_operations',
          ruleId: rule.ruleId,
          ruleName: rule.name,
          message: 'Rule contains disallowed JSON-Logic operations - skipping',
        });

        outcomes.push({
          ruleId: rule.ruleId,
          ruleName: rule.name,
          category: rule.category,
          outcome: null,
          source: 'database',
          executionTimeMs: Date.now() - ruleStart,
        });

        continue; // Skip malicious/invalid rules
      }

      // Evaluate JSON-Logic rule (now safe)
      const outcome = jsonLogic.apply(rule.logic, context);
      const ruleTimeMs = Date.now() - ruleStart;

      outcomes.push({
        ruleId: rule.ruleId,
        ruleName: rule.name,
        category: rule.category,
        outcome: outcome as string | boolean | null,
        source: 'database',
        executionTimeMs: ruleTimeMs,
      });

      // Collect non-default outcomes as actions
      if (outcome && outcome !== 'CONTINUE' && outcome !== false && outcome !== null) {
        actions.push(outcome as string);

        logger.info({
          event: 'rule_engine_action_triggered',
          ruleId: rule.ruleId,
          action: outcome,
          patientId: context.patientId,
        });
      }

      // Update rule evaluation count (fire and forget)
      updateRuleEvaluationCount(rule.ruleId).catch((err) => {
        logger.error({
          event: 'rule_engine_update_count_failed',
          ruleId: rule.ruleId,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    } catch (error) {
      // JSON-Logic evaluation error - log but don't block
      logger.error({
        event: 'rule_engine_evaluation_error',
        ruleId: rule.ruleId,
        error: error instanceof Error ? error.message : String(error),
      });

      outcomes.push({
        ruleId: rule.ruleId,
        ruleName: rule.name,
        category: rule.category,
        outcome: null,
        source: 'database',
        executionTimeMs: Date.now() - ruleStart,
      });
    }
  }

  const totalTimeMs = Date.now() - startTime;

  logger.info({
    event: 'rule_engine_complete',
    totalTimeMs,
    complianceRulesCount: complianceResult.rulesEvaluated.length,
    businessRulesCount: businessRules.length,
    actionsTriggered: actions.length,
    patientId: context.patientId,
  });

  return {
    allowed: true,
    outcomes,
    actions,
    warnings,
    totalTimeMs,
  };
}

// ═══════════════════════════════════════════════════════════════
// BUSINESS RULES LOADING
// ═══════════════════════════════════════════════════════════════

/**
 * Get business rules from database with caching
 * Prefers clinic-specific rules, falls back to global
 */
async function getBusinessRules(clinicId?: string): Promise<
  Array<{
    ruleId: string;
    name: string;
    category: string;
    logic: unknown;
    priority: number;
    clinicId: string | null;
  }>
> {
  const cacheKey = clinicId || 'global';

  // Check cache
  const cached = RULES_CACHE.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.rules;
  }

  try {
    // Load active rules from database
    const dbRules = await prisma.clinicalRule.findMany({
      where: {
        isActive: true,
        OR: clinicId
          ? [{ clinicId }, { clinicId: null }]
          : [{ clinicId: null }],
      },
      orderBy: [
        { priority: 'desc' }, // Higher priority first
        { ruleId: 'asc' },
      ],
      select: {
        ruleId: true,
        name: true,
        category: true,
        logic: true,
        priority: true,
        clinicId: true,
      },
    });

    // De-duplicate: clinic-specific rules override global
    const ruleMap = new Map<string, (typeof dbRules)[0]>();
    for (const rule of dbRules) {
      const existing = ruleMap.get(rule.ruleId);
      // Clinic-specific (non-null clinicId) takes precedence
      if (!existing || rule.clinicId !== null) {
        ruleMap.set(rule.ruleId, rule);
      }
    }

    const rules = Array.from(ruleMap.values());

    // Cache results
    RULES_CACHE.set(cacheKey, {
      rules,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return rules;
  } catch (error) {
    logger.error({
      event: 'rule_engine_load_rules_failed',
      clinicId,
      error: error instanceof Error ? error.message : String(error),
    });

    // Return empty on error - compliance rules still apply
    return [];
  }
}

/**
 * Update rule evaluation count (for analytics)
 */
async function updateRuleEvaluationCount(ruleId: string): Promise<void> {
  await prisma.clinicalRule.update({
    where: { ruleId },
    data: {
      evaluationCount: { increment: 1 },
      lastEvaluated: new Date(),
    },
  });
}

// ═══════════════════════════════════════════════════════════════
// RULE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Create or update a business rule
 *
 * NOTE: This is for admin use only. In production, use migrations
 * or a proper admin UI with audit logging.
 */
export async function upsertBusinessRule(input: {
  ruleId: string;
  name: string;
  category: string;
  logic: Record<string, unknown>;
  priority?: number;
  isActive?: boolean;
  description?: string;
  clinicId?: string;
  createdBy?: string;
}): Promise<void> {
  await prisma.clinicalRule.upsert({
    where: { ruleId: input.ruleId },
    create: {
      ruleId: input.ruleId,
      name: input.name,
      category: input.category,
      logic: input.logic,
      priority: input.priority ?? 0,
      isActive: input.isActive ?? true,
      description: input.description,
      clinicId: input.clinicId ?? null,
      createdBy: input.createdBy,
    },
    update: {
      name: input.name,
      logic: input.logic,
      priority: input.priority,
      isActive: input.isActive,
      description: input.description,
      version: { increment: 1 },
    },
  });

  // Invalidate cache
  RULES_CACHE.delete(input.clinicId || 'global');

  logger.info({
    event: 'rule_engine_rule_upserted',
    ruleId: input.ruleId,
    category: input.category,
    isActive: input.isActive,
    updatedBy: input.createdBy,
  });
}

/**
 * Disable a business rule
 */
export async function disableBusinessRule(
  ruleId: string,
  reason?: string,
  disabledBy?: string
): Promise<void> {
  await prisma.clinicalRule.update({
    where: { ruleId },
    data: {
      isActive: false,
      description: reason
        ? `[DISABLED: ${reason}] ${(await prisma.clinicalRule.findUnique({ where: { ruleId } }))?.description || ''}`
        : undefined,
    },
  });

  // Invalidate all caches (rule might be used globally)
  RULES_CACHE.clear();

  logger.warn({
    event: 'rule_engine_rule_disabled',
    ruleId,
    reason,
    disabledBy,
  });
}

/**
 * Clear the rules cache (useful for testing)
 */
export function clearRulesCache(): void {
  RULES_CACHE.clear();
}

// ═══════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Quick check if patient access is allowed (compliance only)
 * Use this for fast checks when full rule evaluation isn't needed
 */
export function quickComplianceCheck(context: ComplianceContext): ComplianceResult {
  return evaluateCompliance(context);
}

/**
 * Get all active business rules (for admin dashboard)
 */
export async function getAllActiveRules(clinicId?: string): Promise<
  Array<{
    ruleId: string;
    name: string;
    category: string;
    priority: number;
    evaluationCount: number;
    lastEvaluated: Date | null;
    isGlobal: boolean;
  }>
> {
  const rules = await prisma.clinicalRule.findMany({
    where: {
      isActive: true,
      OR: clinicId
        ? [{ clinicId }, { clinicId: null }]
        : [{ clinicId: null }],
    },
    orderBy: [{ category: 'asc' }, { priority: 'desc' }],
    select: {
      ruleId: true,
      name: true,
      category: true,
      priority: true,
      evaluationCount: true,
      lastEvaluated: true,
      clinicId: true,
    },
  });

  return rules.map((r) => ({
    ...r,
    isGlobal: r.clinicId === null,
  }));
}

/**
 * Validate JSON-Logic syntax before saving
 */
export function validateJsonLogic(logic: unknown): { valid: boolean; error?: string } {
  try {
    // Try to apply the logic with empty context
    // This will catch syntax errors in the JSON-Logic
    jsonLogic.apply(logic, {});
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid JSON-Logic syntax',
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// RE-EXPORT COMPLIANCE ERROR
// ═══════════════════════════════════════════════════════════════

export { ComplianceViolationError };
