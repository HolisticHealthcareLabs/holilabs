/**
 * VBC Population Health Service
 *
 * Aggregated population-level metrics for value-based care dashboards.
 * Queries attribution, quality measure results, and outcomes to produce
 * composite views for organization administrators and clinicians.
 *
 * AWAITING_REVIEW: Metric definitions and normalization factors need
 * alignment with ANS performance indicators.
 */

import type { PrismaClient } from '@prisma/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PopulationDashboard {
  organizationId: string;
  periodStart: Date;
  periodEnd: Date;
  totalAttributed: number;
  riskDistribution: RiskDistribution;
  qualitySummary: QualitySummary;
  outcomeSummary: OutcomeSummary;
}

export interface RiskDistribution {
  low: number;
  moderate: number;
  high: number;
  veryHigh: number;
  unclassified: number;
}

export interface QualitySummary {
  totalMeasures: number;
  meetingTarget: number;
  belowTarget: number;
  averageRate: number;
  topGapMeasures: Array<{
    measureCode: string;
    measureName: string;
    rate: number;
    targetRate: number;
    gapCount: number;
  }>;
}

export interface OutcomeSummary {
  totalOutcomes: number;
  byType: Record<string, number>;
  averageGoalProgress: number;
  goalsAchieved: number;
  goalsInProgress: number;
}

// ---------------------------------------------------------------------------
// Dashboard Query
// ---------------------------------------------------------------------------

/**
 * Produces a comprehensive population health dashboard for an organization
 * within a given period.
 */
export async function getPopulationDashboard(
  prisma: PrismaClient,
  organizationId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<PopulationDashboard> {
  const [riskDist, qualitySummary, outcomeSummary, attributedCount] =
    await Promise.all([
      getRiskDistribution(prisma, organizationId),
      getQualitySummary(prisma, organizationId, periodStart, periodEnd),
      getOutcomeSummary(prisma, organizationId, periodStart, periodEnd),
      prisma.patientAttribution.count({
        where: { organizationId, isActive: true },
      }),
    ]);

  return {
    organizationId,
    periodStart,
    periodEnd,
    totalAttributed: attributedCount,
    riskDistribution: riskDist,
    qualitySummary,
    outcomeSummary,
  };
}

// ---------------------------------------------------------------------------
// Risk Distribution
// ---------------------------------------------------------------------------

/**
 * Counts active attributed patients by risk tier.
 */
export async function getRiskDistribution(
  prisma: PrismaClient,
  organizationId: string,
): Promise<RiskDistribution> {
  const attributions = await prisma.patientAttribution.findMany({
    where: { organizationId, isActive: true },
    select: { riskTier: true },
  });

  const dist: RiskDistribution = {
    low: 0,
    moderate: 0,
    high: 0,
    veryHigh: 0,
    unclassified: 0,
  };

  for (const attr of attributions) {
    switch (attr.riskTier?.toUpperCase()) {
      case 'LOW':
        dist.low++;
        break;
      case 'MODERATE':
        dist.moderate++;
        break;
      case 'HIGH':
        dist.high++;
        break;
      case 'VERY_HIGH':
        dist.veryHigh++;
        break;
      default:
        dist.unclassified++;
    }
  }

  return dist;
}

// ---------------------------------------------------------------------------
// Quality Summary
// ---------------------------------------------------------------------------

/**
 * Summarizes quality measure performance for an organization in the period.
 */
async function getQualitySummary(
  prisma: PrismaClient,
  organizationId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<QualitySummary> {
  const results = await prisma.qualityMeasureResult.findMany({
    where: {
      organizationId,
      periodStart: { gte: periodStart },
      periodEnd: { lte: periodEnd },
    },
    include: { measure: { select: { code: true, name: true, targetRate: true } } },
    orderBy: { rate: 'asc' },
  });

  if (results.length === 0) {
    return {
      totalMeasures: 0,
      meetingTarget: 0,
      belowTarget: 0,
      averageRate: 0,
      topGapMeasures: [],
    };
  }

  const meetingTarget = results.filter((r) => r.meetsTarget).length;
  const averageRate =
    results.reduce((sum, r) => sum + r.rate, 0) / results.length;

  const topGapMeasures = results
    .filter((r) => !r.meetsTarget)
    .slice(0, 5)
    .map((r) => ({
      measureCode: r.measure.code,
      measureName: r.measure.name,
      rate: r.rate,
      targetRate: r.measure.targetRate ?? 0,
      gapCount: r.gapPatientIds.length,
    }));

  return {
    totalMeasures: results.length,
    meetingTarget,
    belowTarget: results.length - meetingTarget,
    averageRate: Math.round(averageRate * 10000) / 10000,
    topGapMeasures,
  };
}

// ---------------------------------------------------------------------------
// Outcome Summary
// ---------------------------------------------------------------------------

/**
 * Summarizes VBC outcomes and goal progress for an organization in the period.
 */
async function getOutcomeSummary(
  prisma: PrismaClient,
  organizationId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<OutcomeSummary> {
  const outcomes = await prisma.vBCOutcomeRecord.findMany({
    where: {
      organizationId,
      recordedAt: { gte: periodStart, lte: periodEnd },
    },
    select: { outcomeType: true },
  });

  const byType: Record<string, number> = {};
  for (const o of outcomes) {
    byType[o.outcomeType] = (byType[o.outcomeType] || 0) + 1;
  }

  // Goal progress: find goals linked to care teams in this org
  const goals = await prisma.careGoal.findMany({
    where: {
      careTeam: { owningOrgId: organizationId },
      createdAt: { gte: periodStart, lte: periodEnd },
    },
    select: {
      status: true,
      targetValue: true,
      currentValue: true,
    },
  });

  let totalProgress = 0;
  let progressCount = 0;
  let achieved = 0;
  let inProgress = 0;

  for (const g of goals) {
    if (g.status === 'ACHIEVED') achieved++;
    if (g.status === 'IN_PROGRESS') inProgress++;

    if (g.targetValue && g.currentValue && g.targetValue > 0) {
      totalProgress += Math.min(1, g.currentValue / g.targetValue);
      progressCount++;
    }
  }

  return {
    totalOutcomes: outcomes.length,
    byType,
    averageGoalProgress: progressCount > 0
      ? Math.round((totalProgress / progressCount) * 10000) / 10000
      : 0,
    goalsAchieved: achieved,
    goalsInProgress: inProgress,
  };
}
