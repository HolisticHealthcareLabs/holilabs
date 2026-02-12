/**
 * KPI Query Functions
 * Core business logic for calculating 4 key performance indicators
 */

import { prisma } from '@/lib/prisma';
import { GovernanceSeverity } from '@prisma/client';
import { KPIFilterState } from './filter-state';

export type KPIType =
  | 'totalEvaluations'
  | 'blockRate'
  | 'overrideRate'
  | 'attestationCompliance';

export interface KPIResult {
  value: number;
  unit: 'count' | 'percentage';
  label: string;
}

/**
 * KPI 1: Total Evaluations
 * Count all governance events (treated as rule evaluations)
 * Numerator: COUNT(*) FROM GovernanceEvent
 */
async function getTotalEvaluations(filter: KPIFilterState): Promise<KPIResult> {
  const where: Record<string, unknown> = {};

  if (filter.startDate) {
    where.timestamp = { gte: new Date(filter.startDate) };
  }

  if (filter.endDate) {
    const endDate = new Date(filter.endDate);
    endDate.setHours(23, 59, 59, 999);
    if (where.timestamp && typeof where.timestamp === 'object') {
      (where.timestamp as Record<string, unknown>).lte = endDate;
    } else {
      where.timestamp = { lte: endDate };
    }
  }

  const count = await prisma.governanceEvent.count({ where });

  return {
    value: count,
    unit: 'count',
    label: 'Total Evaluations',
  };
}

/**
 * KPI 2: Block Rate
 * Percentage of evaluations that resulted in blocks
 * Numerator: COUNT(*) WHERE severity = 'HARD_BLOCK'
 * Denominator: COUNT(*) FROM GovernanceEvent
 * Unit: percentage
 */
async function getBlockRate(filter: KPIFilterState): Promise<KPIResult> {
  const baseWhere: Record<string, unknown> = {};

  if (filter.startDate) {
    baseWhere.timestamp = { gte: new Date(filter.startDate) };
  }

  if (filter.endDate) {
    const endDate = new Date(filter.endDate);
    endDate.setHours(23, 59, 59, 999);
    if (baseWhere.timestamp && typeof baseWhere.timestamp === 'object') {
      (baseWhere.timestamp as Record<string, unknown>).lte = endDate;
    } else {
      baseWhere.timestamp = { lte: endDate };
    }
  }

  const totalCount = await prisma.governanceEvent.count({ where: baseWhere });

  if (totalCount === 0) {
    return {
      value: 0,
      unit: 'percentage',
      label: 'Block Rate',
    };
  }

  const blockWhere = {
    ...baseWhere,
    severity: GovernanceSeverity.HARD_BLOCK,
  };

  const blockCount = await prisma.governanceEvent.count({ where: blockWhere });

  const percentage = (blockCount / totalCount) * 100;

  return {
    value: Math.round(percentage * 100) / 100, // Round to 2 decimal places
    unit: 'percentage',
    label: 'Block Rate',
  };
}

/**
 * KPI 3: Override Rate
 * Percentage of overrides among blocked/flagged items
 * Numerator: COUNT(*) WHERE overrideByUser = true
 * Denominator: COUNT(*) WHERE severity IN ('HARD_BLOCK', 'SOFT_NUDGE')
 * Unit: percentage
 */
async function getOverrideRate(filter: KPIFilterState): Promise<KPIResult> {
  const baseWhere: Record<string, unknown> = {};

  if (filter.startDate) {
    baseWhere.timestamp = { gte: new Date(filter.startDate) };
  }

  if (filter.endDate) {
    const endDate = new Date(filter.endDate);
    endDate.setHours(23, 59, 59, 999);
    if (baseWhere.timestamp && typeof baseWhere.timestamp === 'object') {
      (baseWhere.timestamp as Record<string, unknown>).lte = endDate;
    } else {
      baseWhere.timestamp = { lte: endDate };
    }
  }

  // Denominator: severity in HARD_BLOCK or SOFT_NUDGE
  const denominatorWhere = {
    ...baseWhere,
    severity: { in: [GovernanceSeverity.HARD_BLOCK, GovernanceSeverity.SOFT_NUDGE] },
  };

  const totalAtRisk = await prisma.governanceEvent.count({
    where: denominatorWhere,
  });

  if (totalAtRisk === 0) {
    return {
      value: 0,
      unit: 'percentage',
      label: 'Override Rate',
    };
  }

  // Numerator: overrideByUser = true
  const overrideWhere = {
    ...denominatorWhere,
    overrideByUser: true,
  };

  const overrideCount = await prisma.governanceEvent.count({
    where: overrideWhere,
  });

  const percentage = (overrideCount / totalAtRisk) * 100;

  return {
    value: Math.round(percentage * 100) / 100,
    unit: 'percentage',
    label: 'Override Rate',
  };
}

/**
 * KPI 4: Attestation Compliance
 * This measures cases where SOFT_NUDGE events were handled (vs ignored)
 * We treat SOFT_NUDGE as "ATTESTATION_REQUIRED" and overrideByUser=true as attestation submitted
 * Numerator: COUNT(*) WHERE severity = 'SOFT_NUDGE' AND overrideByUser = true
 * Denominator: COUNT(*) WHERE severity = 'SOFT_NUDGE'
 * Unit: percentage
 */
async function getAttestationCompliance(filter: KPIFilterState): Promise<KPIResult> {
  const baseWhere: Record<string, unknown> = {};

  if (filter.startDate) {
    baseWhere.timestamp = { gte: new Date(filter.startDate) };
  }

  if (filter.endDate) {
    const endDate = new Date(filter.endDate);
    endDate.setHours(23, 59, 59, 999);
    if (baseWhere.timestamp && typeof baseWhere.timestamp === 'object') {
      (baseWhere.timestamp as Record<string, unknown>).lte = endDate;
    } else {
      baseWhere.timestamp = { lte: endDate };
    }
  }

  // Denominator: all SOFT_NUDGE events
  const denominatorWhere = {
    ...baseWhere,
    severity: GovernanceSeverity.SOFT_NUDGE,
  };

  const totalRequired = await prisma.governanceEvent.count({
    where: denominatorWhere,
  });

  if (totalRequired === 0) {
    return {
      value: 100,
      unit: 'percentage',
      label: 'Attestation Compliance',
    };
  }

  // Numerator: SOFT_NUDGE with override
  const submittedWhere = {
    ...denominatorWhere,
    overrideByUser: true,
  };

  const submittedCount = await prisma.governanceEvent.count({
    where: submittedWhere,
  });

  const percentage = (submittedCount / totalRequired) * 100;

  return {
    value: Math.round(percentage * 100) / 100,
    unit: 'percentage',
    label: 'Attestation Compliance',
  };
}

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
    default:
      throw new Error(`Unknown KPI type: ${kpiType}`);
  }
}

/**
 * Batch fetch all 4 KPIs
 * @param filter - Date range filter
 * @returns Object with all 4 KPIs
 */
export async function getAllKPIs(filter: KPIFilterState = {}): Promise<Record<KPIType, KPIResult>> {
  const [totalEvaluations, blockRate, overrideRate, attestationCompliance] =
    await Promise.all([
      getTotalEvaluations(filter),
      getBlockRate(filter),
      getOverrideRate(filter),
      getAttestationCompliance(filter),
    ]);

  return {
    totalEvaluations,
    blockRate,
    overrideRate,
    attestationCompliance,
  };
}
