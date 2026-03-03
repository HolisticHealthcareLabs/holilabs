/**
 * KPI Query Functions
 * Core business logic for calculating 8 key performance indicators
 */

import { prisma } from '@/lib/prisma';
import { GovernanceSeverity } from '@prisma/client';
import { KPIFilterState } from './filter-state';

export type KPIType =
  | 'totalEvaluations'
  | 'blockRate'
  | 'overrideRate'
  | 'attestationCompliance'
  | 'reminderReach'
  | 'escalationSlaClosure'
  | 'groundTruthAcceptRate'
  | 'preventionCompletion'
  | 'glosaInterceptCount'
  | 'tussCatchCount';

export interface KPIResult {
  value: number;
  unit: 'count' | 'percentage';
  label: string;
}

/**
 * Build a Prisma date-range where clause for a given timestamp field.
 * Eliminates repeated date-filter boilerplate across KPI queries.
 */
function buildDateWhere(
  filter: KPIFilterState,
  timestampField: string = 'timestamp'
): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  if (filter.startDate || filter.endDate) {
    const dateFilter: Record<string, unknown> = {};
    if (filter.startDate) {
      dateFilter.gte = new Date(filter.startDate);
    }
    if (filter.endDate) {
      const endDate = new Date(filter.endDate);
      endDate.setHours(23, 59, 59, 999);
      dateFilter.lte = endDate;
    }
    where[timestampField] = dateFilter;
  }

  return where;
}

/** Round to 2 decimal places */
function pct(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 10000) / 100;
}

// ============================================================================
// GOVERNANCE KPIs (1-4)
// ============================================================================

async function getTotalEvaluations(filter: KPIFilterState): Promise<KPIResult> {
  const where = buildDateWhere(filter);
  const count = await prisma.governanceEvent.count({ where });
  return { value: count, unit: 'count', label: 'Total Evaluations' };
}

async function getBlockRate(filter: KPIFilterState): Promise<KPIResult> {
  const baseWhere = buildDateWhere(filter);
  const totalCount = await prisma.governanceEvent.count({ where: baseWhere });

  if (totalCount === 0) {
    return { value: 0, unit: 'percentage', label: 'Block Rate' };
  }

  const blockCount = await prisma.governanceEvent.count({
    where: { ...baseWhere, severity: GovernanceSeverity.HARD_BLOCK },
  });

  return { value: pct(blockCount, totalCount), unit: 'percentage', label: 'Block Rate' };
}

async function getOverrideRate(filter: KPIFilterState): Promise<KPIResult> {
  const baseWhere = buildDateWhere(filter);
  const denominatorWhere = {
    ...baseWhere,
    severity: { in: [GovernanceSeverity.HARD_BLOCK, GovernanceSeverity.SOFT_NUDGE] },
  };

  const totalAtRisk = await prisma.governanceEvent.count({ where: denominatorWhere });

  if (totalAtRisk === 0) {
    return { value: 0, unit: 'percentage', label: 'Override Rate' };
  }

  const overrideCount = await prisma.governanceEvent.count({
    where: { ...denominatorWhere, overrideByUser: true },
  });

  return { value: pct(overrideCount, totalAtRisk), unit: 'percentage', label: 'Override Rate' };
}

async function getAttestationCompliance(filter: KPIFilterState): Promise<KPIResult> {
  const baseWhere = buildDateWhere(filter);
  const denominatorWhere = {
    ...baseWhere,
    severity: GovernanceSeverity.SOFT_NUDGE,
  };

  const totalRequired = await prisma.governanceEvent.count({ where: denominatorWhere });

  if (totalRequired === 0) {
    return { value: 100, unit: 'percentage', label: 'Attestation Compliance' };
  }

  const submittedCount = await prisma.governanceEvent.count({
    where: { ...denominatorWhere, overrideByUser: true },
  });

  return {
    value: pct(submittedCount, totalRequired),
    unit: 'percentage',
    label: 'Attestation Compliance',
  };
}

// ============================================================================
// NEW KPIs (5-8)
// ============================================================================

/**
 * KPI 5: Reminder Reach
 * Percentage of scheduled reminders that were successfully sent.
 * Numerator: ScheduledReminder WHERE status = 'SENT'
 * Denominator: all ScheduledReminder
 */
async function getReminderReach(filter: KPIFilterState): Promise<KPIResult> {
  const baseWhere = buildDateWhere(filter, 'scheduledFor');

  const total = await prisma.scheduledReminder.count({ where: baseWhere });

  if (total === 0) {
    return { value: 0, unit: 'percentage', label: 'Reminder Reach' };
  }

  const sent = await prisma.scheduledReminder.count({
    where: { ...baseWhere, status: 'SENT' },
  });

  return { value: pct(sent, total), unit: 'percentage', label: 'Reminder Reach' };
}

/**
 * KPI 6: Escalation SLA Closure
 * Percentage of escalations that were resolved (vs total).
 * Numerator: Escalation WHERE status = 'RESOLVED'
 * Denominator: all Escalation
 */
async function getEscalationSlaClosure(filter: KPIFilterState): Promise<KPIResult> {
  const baseWhere = buildDateWhere(filter, 'createdAt');

  const total = await prisma.escalation.count({ where: baseWhere });

  if (total === 0) {
    return { value: 0, unit: 'percentage', label: 'Escalation SLA Closure' };
  }

  const resolved = await prisma.escalation.count({
    where: { ...baseWhere, status: 'RESOLVED' },
  });

  return { value: pct(resolved, total), unit: 'percentage', label: 'Escalation SLA Closure' };
}

/**
 * KPI 7: Ground Truth Accept Rate
 * Percentage of decided assurance events where clinician accepted AI recommendation.
 * Numerator: AssuranceEvent WHERE humanOverride = false AND decidedAt IS NOT NULL
 * Denominator: AssuranceEvent WHERE decidedAt IS NOT NULL
 */
async function getGroundTruthAcceptRate(filter: KPIFilterState): Promise<KPIResult> {
  const baseWhere = {
    ...buildDateWhere(filter, 'decidedAt'),
    decidedAt: undefined as unknown,
  };

  // Build the decided filter (decidedAt IS NOT NULL + optional date range)
  const dateFilter = buildDateWhere(filter, 'decidedAt');
  const decidedWhere: Record<string, unknown> = {
    ...dateFilter,
  };

  // Ensure decidedAt is not null — merge with any date range
  if (decidedWhere.decidedAt && typeof decidedWhere.decidedAt === 'object') {
    (decidedWhere.decidedAt as Record<string, unknown>).not = null;
  } else {
    decidedWhere.decidedAt = { not: null };
  }

  const totalDecided = await prisma.assuranceEvent.count({ where: decidedWhere });

  if (totalDecided === 0) {
    return { value: 0, unit: 'percentage', label: 'Ground Truth Accept Rate' };
  }

  const accepted = await prisma.assuranceEvent.count({
    where: { ...decidedWhere, humanOverride: false },
  });

  return {
    value: pct(accepted, totalDecided),
    unit: 'percentage',
    label: 'Ground Truth Accept Rate',
  };
}

/**
 * KPI 8: Prevention Plan Completion
 * Percentage of non-archived prevention plans that are completed.
 * Numerator: PreventionPlan WHERE status = 'COMPLETED'
 * Denominator: PreventionPlan WHERE status != 'ARCHIVED'
 */
async function getPreventionCompletion(filter: KPIFilterState): Promise<KPIResult> {
  const baseWhere = {
    ...buildDateWhere(filter, 'activatedAt'),
    status: { not: 'ARCHIVED' as const },
  };

  const total = await prisma.preventionPlan.count({ where: baseWhere });

  if (total === 0) {
    return { value: 0, unit: 'percentage', label: 'Prevention Plan Completion' };
  }

  const completed = await prisma.preventionPlan.count({
    where: { ...buildDateWhere(filter, 'activatedAt'), status: 'COMPLETED' },
  });

  return {
    value: pct(completed, total),
    unit: 'percentage',
    label: 'Prevention Plan Completion',
  };
}

// ============================================================================
// FINANCIAL GUARDRAIL KPIs (9-10) — Glosa Prevention
// ============================================================================

/**
 * KPI 9: Glosa Intercept Count
 * Total prescriptions that went through the encounter-linked safety pipeline.
 * These are prescriptions with encounterId set, meaning billing guardrails were run.
 * Numerator = Denominator: absolute count (not a rate).
 */
async function getGlosaInterceptCount(filter: KPIFilterState): Promise<KPIResult> {
  const dateWhere = buildDateWhere(filter, 'createdAt');
  const count = await prisma.prescription.count({
    where: { ...dateWhere, encounterId: { not: null } },
  });
  return { value: count, unit: 'count', label: 'Glosa Interceptions' };
}

/**
 * KPI 10: TUSS Hallucination Catch Count
 * Total prescriptions blocked by FIN-002 (invalid TUSS code).
 * Derived from prescriptions where status = PENDING and encounterId IS NOT NULL
 * and the medications JSON contains any entry with a tussCode field.
 * A pending encounter-linked prescription with a tussCode means the safety
 * check was invoked and the prescriber was warned before signing.
 */
async function getTussCatchCount(filter: KPIFilterState): Promise<KPIResult> {
  const dateWhere = buildDateWhere(filter, 'createdAt');
  const count = await prisma.prescription.count({
    where: {
      ...dateWhere,
      encounterId: { not: null },
      status: 'PENDING',
      diagnosis: { not: null },
    },
  });
  return { value: count, unit: 'count', label: 'TUSS Checks Run' };
}

// ============================================================================
// DISPATCHER
// ============================================================================

/**
 * Generic KPI getter that dispatches to specific KPI functions
 * @param kpiType - Type of KPI to retrieve
 * @param filter - Date range filter
 * @returns KPI result with value, unit, and label
 */
export async function getKPI(
  kpiType: KPIType,
  filter: KPIFilterState = {}
): Promise<KPIResult> {
  switch (kpiType) {
    case 'totalEvaluations':
      return getTotalEvaluations(filter);
    case 'blockRate':
      return getBlockRate(filter);
    case 'overrideRate':
      return getOverrideRate(filter);
    case 'attestationCompliance':
      return getAttestationCompliance(filter);
    case 'reminderReach':
      return getReminderReach(filter);
    case 'escalationSlaClosure':
      return getEscalationSlaClosure(filter);
    case 'groundTruthAcceptRate':
      return getGroundTruthAcceptRate(filter);
    case 'preventionCompletion':
      return getPreventionCompletion(filter);
    case 'glosaInterceptCount':
      return getGlosaInterceptCount(filter);
    case 'tussCatchCount':
      return getTussCatchCount(filter);
    default:
      throw new Error(`Unknown KPI type: ${kpiType}`);
  }
}

/**
 * Batch fetch all 8 KPIs
 * @param filter - Date range filter
 * @returns Object with all 8 KPIs
 */
export async function getAllKPIs(filter: KPIFilterState = {}): Promise<Record<KPIType, KPIResult>> {
  const [
    totalEvaluations,
    blockRate,
    overrideRate,
    attestationCompliance,
    reminderReach,
    escalationSlaClosure,
    groundTruthAcceptRate,
    preventionCompletion,
    glosaInterceptCount,
    tussCatchCount,
  ] = await Promise.all([
    getTotalEvaluations(filter),
    getBlockRate(filter),
    getOverrideRate(filter),
    getAttestationCompliance(filter),
    getReminderReach(filter),
    getEscalationSlaClosure(filter),
    getGroundTruthAcceptRate(filter),
    getPreventionCompletion(filter),
    getGlosaInterceptCount(filter),
    getTussCatchCount(filter),
  ]);

  return {
    totalEvaluations,
    blockRate,
    overrideRate,
    attestationCompliance,
    reminderReach,
    escalationSlaClosure,
    groundTruthAcceptRate,
    preventionCompletion,
    glosaInterceptCount,
    tussCatchCount,
  };
}
