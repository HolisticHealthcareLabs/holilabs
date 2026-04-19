/**
 * VBC Population Health Service — STUBBED
 *
 * TEMPORARY: Returns 503-style empty responses until Prisma models
 * (patientAttribution, qualityMeasureResult, vBCOutcomeRecord, careGoal)
 * are added to the schema. Callers (API routes + MCP tools) surface this
 * as "Value-Based Care data not available" rather than crashing.
 *
 * Restore by running the VBC schema migration and reverting this stub.
 */

import type { PrismaClient } from '@prisma/client';

// ---------------------------------------------------------------------------
// Types — preserved so downstream imports continue to compile
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

export class VBCUnavailableError extends Error {
  readonly code = 'VBC_SCHEMA_PENDING';
  readonly httpStatus = 503;
  constructor() {
    super('Value-Based Care schema is pending migration; population metrics unavailable.');
    this.name = 'VBCUnavailableError';
  }
}

// ---------------------------------------------------------------------------
// Stubs
// ---------------------------------------------------------------------------

const EMPTY_RISK_DISTRIBUTION: RiskDistribution = {
  low: 0,
  moderate: 0,
  high: 0,
  veryHigh: 0,
  unclassified: 0,
};

const EMPTY_QUALITY_SUMMARY: QualitySummary = {
  totalMeasures: 0,
  meetingTarget: 0,
  belowTarget: 0,
  averageRate: 0,
  topGapMeasures: [],
};

const EMPTY_OUTCOME_SUMMARY: OutcomeSummary = {
  totalOutcomes: 0,
  byType: {},
  averageGoalProgress: 0,
  goalsAchieved: 0,
  goalsInProgress: 0,
};

export async function getPopulationDashboard(
  _prisma: PrismaClient,
  organizationId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<PopulationDashboard> {
  return {
    organizationId,
    periodStart,
    periodEnd,
    totalAttributed: 0,
    riskDistribution: EMPTY_RISK_DISTRIBUTION,
    qualitySummary: EMPTY_QUALITY_SUMMARY,
    outcomeSummary: EMPTY_OUTCOME_SUMMARY,
  };
}

export async function getRiskDistribution(
  _prisma: PrismaClient,
  _organizationId: string,
): Promise<RiskDistribution> {
  return EMPTY_RISK_DISTRIBUTION;
}
