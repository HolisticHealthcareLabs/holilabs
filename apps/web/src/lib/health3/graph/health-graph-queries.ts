/**
 * Health Graph Query Service
 *
 * Graph-like traversals over the HealthGraphEdge relational model.
 * Enables tracing causal chains, building timelines, and identifying
 * screening gaps across a patient's longitudinal record.
 *
 * AWAITING_REVIEW: Recursive CTE depth limits need performance testing
 * on production-scale datasets.
 */

import type { PrismaClient } from '@prisma/client';
import type { TimelineEntry, OutcomeTrace } from '../types';

// ---------------------------------------------------------------------------
// Patient Timeline
// ---------------------------------------------------------------------------

/**
 * Builds a unified patient timeline from health graph edges,
 * ordered by effectiveFrom date.
 */
export async function buildPatientTimeline(
  prisma: PrismaClient,
  patientId: string,
  tenantId: string,
  dateRange?: { from: Date; to: Date },
): Promise<TimelineEntry[]> {
  const where: Record<string, unknown> = {
    patientId,
    tenantId,
  };

  if (dateRange) {
    where.effectiveFrom = {
      gte: dateRange.from,
      lte: dateRange.to,
    };
  }

  const edges = await prisma.healthGraphEdge.findMany({
    where,
    orderBy: { effectiveFrom: 'desc' },
  });

  const grouped = new Map<string, TimelineEntry>();

  for (const edge of edges) {
    const key = `${edge.sourceType}:${edge.sourceId}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        date: edge.effectiveFrom.toISOString(),
        type: edge.sourceType,
        sourceId: edge.sourceId,
        description: `${edge.sourceType} → ${edge.targetType} (${edge.relationship})`,
        relationships: [],
      });
    }
    grouped.get(key)!.relationships.push({
      targetType: edge.targetType,
      targetId: edge.targetId,
      relationship: edge.relationship,
    });
  }

  return Array.from(grouped.values());
}

// ---------------------------------------------------------------------------
// Outcome Tracing
// ---------------------------------------------------------------------------

/**
 * Traces the causal chain leading to a specific outcome.
 * Follows CAUSED_BY, CONTRIBUTED_TO, and RISK_FACTOR_FOR edges recursively
 * up to a specified depth.
 *
 * AWAITING_REVIEW: Max depth of 5 is a safety limit — needs validation.
 */
export async function traceOutcomeFactors(
  prisma: PrismaClient,
  patientId: string,
  tenantId: string,
  outcomeId: string,
  maxDepth = 5,
): Promise<OutcomeTrace> {
  const chain: OutcomeTrace['chain'] = [];
  const visited = new Set<string>();
  const causalRelationships = ['CAUSED_BY', 'CONTRIBUTED_TO', 'RISK_FACTOR_FOR'];

  async function traverse(
    currentType: string,
    currentId: string,
    depth: number,
  ): Promise<void> {
    if (depth > maxDepth) return;
    const key = `${currentType}:${currentId}`;
    if (visited.has(key)) return;
    visited.add(key);

    const edges = await prisma.healthGraphEdge.findMany({
      where: {
        patientId,
        tenantId,
        targetType: currentType as any,
        targetId: currentId,
        relationship: { in: causalRelationships as any[] },
      },
    });

    for (const edge of edges) {
      chain.push({
        nodeType: edge.sourceType,
        nodeId: edge.sourceId,
        relationship: edge.relationship,
        depth,
      });
      await traverse(edge.sourceType, edge.sourceId, depth + 1);
    }
  }

  await traverse('OUTCOME', outcomeId, 0);

  return { outcomeId, chain };
}

// ---------------------------------------------------------------------------
// Condition Provider Network
// ---------------------------------------------------------------------------

/**
 * Finds all providers managing a specific condition for a patient.
 */
export async function getConditionProviderNetwork(
  prisma: PrismaClient,
  patientId: string,
  tenantId: string,
  conditionIcd10: string,
): Promise<Array<{ providerId: string; relationship: string }>> {
  const conditionEdges = await prisma.healthGraphEdge.findMany({
    where: {
      patientId,
      tenantId,
      sourceType: 'CONDITION',
      relationship: 'MANAGED_BY',
    },
  });

  return conditionEdges.map((e) => ({
    providerId: e.targetId,
    relationship: e.relationship,
  }));
}

// ---------------------------------------------------------------------------
// Screening Gap Identification
// ---------------------------------------------------------------------------

/**
 * Compares completed screenings (from health graph SCREENED_FOR edges)
 * against expected screenings from active pathway definitions.
 *
 * Returns a list of missing screenings.
 */
export async function identifyScreeningGaps(
  prisma: PrismaClient,
  patientId: string,
  tenantId: string,
): Promise<Array<{ screening: string; expectedBy: string; pathwayId: string }>> {
  const gaps: Array<{ screening: string; expectedBy: string; pathwayId: string }> = [];

  // Get active pathways
  const activePathways = await prisma.carePathwayInstance.findMany({
    where: { patientId, tenantId, status: 'ACTIVE' },
    include: { pathwayDefinition: true },
  });

  // Get completed screenings
  const screeningEdges = await prisma.healthGraphEdge.findMany({
    where: {
      patientId,
      tenantId,
      sourceType: 'SCREENING',
    },
    select: { sourceId: true },
  });
  const completedScreenings = new Set(screeningEdges.map((e) => e.sourceId));

  for (const pathway of activePathways) {
    const steps = pathway.pathwayDefinition.steps as unknown as Array<{
      stepId: string;
      name: string;
      timeoutDays: number;
    }>;
    for (const step of steps) {
      if (step.name.toLowerCase().includes('screening') && !completedScreenings.has(step.stepId)) {
        const enrolledAt = new Date(pathway.enrolledAt);
        const expectedBy = new Date(enrolledAt.getTime() + step.timeoutDays * 24 * 60 * 60 * 1000);
        gaps.push({
          screening: step.name,
          expectedBy: expectedBy.toISOString(),
          pathwayId: pathway.id,
        });
      }
    }
  }

  return gaps;
}
