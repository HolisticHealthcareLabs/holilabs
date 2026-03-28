/**
 * VBC Patient Attribution Service
 *
 * Assigns patients to providers/organizations for quality measure evaluation
 * and financial accountability. Supports multiple attribution methods:
 * - PRIMARY_CARE: Most visits to a PCP in lookback period
 * - SPECIALIST_EPISODE: Assigned during an episode of care
 * - CONTRACTUAL: Explicit payer-defined assignment
 * - VOLUNTARY: Patient self-selects provider
 *
 * AWAITING_REVIEW: Lookback period and visit-count thresholds need
 * alignment with ANS (Agência Nacional de Saúde Suplementar) standards.
 */

import type { PrismaClient } from '@prisma/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AttributionInput {
  patientId: string;
  providerId: string;
  organizationId: string;
  method: 'PRIMARY_CARE' | 'SPECIALIST_EPISODE' | 'CONTRACTUAL' | 'VOLUNTARY';
  effectiveFrom: Date;
  effectiveUntil?: Date;
  payerContractId?: string;
  riskTier?: string;
  riskScore?: number;
}

export interface AttributionSummary {
  organizationId: string;
  totalAttributed: number;
  byMethod: Record<string, number>;
  byRiskTier: Record<string, number>;
  activeCount: number;
}

export interface ReconciliationResult {
  created: number;
  deactivated: number;
  unchanged: number;
  errors: string[];
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/**
 * Creates or updates a patient attribution record.
 * Uses the unique constraint (patientId, providerId, organizationId, effectiveFrom).
 */
export async function createAttribution(
  prisma: PrismaClient,
  input: AttributionInput,
): Promise<unknown> {
  return prisma.patientAttribution.create({
    data: {
      patientId: input.patientId,
      providerId: input.providerId,
      organizationId: input.organizationId,
      method: input.method,
      effectiveFrom: input.effectiveFrom,
      effectiveUntil: input.effectiveUntil,
      payerContractId: input.payerContractId,
      riskTier: input.riskTier,
      riskScore: input.riskScore,
      isActive: true,
    },
  });
}

/**
 * Lists active attributions for an organization, optionally filtered by provider.
 */
export async function listAttributions(
  prisma: PrismaClient,
  organizationId: string,
  providerId?: string,
): Promise<unknown[]> {
  return prisma.patientAttribution.findMany({
    where: {
      organizationId,
      isActive: true,
      ...(providerId ? { providerId } : {}),
    },
    orderBy: { effectiveFrom: 'desc' },
  });
}

/**
 * Produces an attribution summary for an organization.
 */
export async function getAttributionSummary(
  prisma: PrismaClient,
  organizationId: string,
): Promise<AttributionSummary> {
  const all = await prisma.patientAttribution.findMany({
    where: { organizationId },
    select: { method: true, riskTier: true, isActive: true },
  });

  const byMethod: Record<string, number> = {};
  const byRiskTier: Record<string, number> = {};
  let activeCount = 0;

  for (const attr of all) {
    byMethod[attr.method] = (byMethod[attr.method] || 0) + 1;
    const tier = attr.riskTier || 'UNCLASSIFIED';
    byRiskTier[tier] = (byRiskTier[tier] || 0) + 1;
    if (attr.isActive) activeCount++;
  }

  return {
    organizationId,
    totalAttributed: all.length,
    byMethod,
    byRiskTier,
    activeCount,
  };
}

// ---------------------------------------------------------------------------
// Reconciliation
// ---------------------------------------------------------------------------

/**
 * Reconciles attributions by deactivating expired records and creating
 * new attributions based on the most-visits algorithm.
 *
 * PRIMARY_CARE method: Counts encounters per provider in the lookback period.
 * The provider with the most encounters becomes the attributed PCP.
 *
 * AWAITING_REVIEW: Lookback period (12 months) and minimum visit threshold (2)
 * are configurable but need ANS alignment.
 */
export async function reconcileAttributions(
  prisma: PrismaClient,
  organizationId: string,
  lookbackMonths = 12,
  minVisits = 2,
): Promise<ReconciliationResult> {
  const now = new Date();
  const lookbackStart = new Date(now);
  lookbackStart.setMonth(lookbackStart.getMonth() - lookbackMonths);

  const result: ReconciliationResult = {
    created: 0,
    deactivated: 0,
    unchanged: 0,
    errors: [],
  };

  // Deactivate expired attributions
  const expired = await prisma.patientAttribution.updateMany({
    where: {
      organizationId,
      isActive: true,
      effectiveUntil: { lt: now },
    },
    data: { isActive: false },
  });
  result.deactivated = expired.count;

  // Find patients with encounters in the lookback period but no active attribution
  const encounters = await prisma.clinicalEncounter.findMany({
    where: {
      provider: { workspaceMembers: { some: { workspace: { id: organizationId } } } } as any,
      startedAt: { gte: lookbackStart },
    },
    select: {
      patientId: true,
      providerId: true,
    },
  });

  // Group encounters by patient → provider with most visits
  const patientProviderCounts = new Map<string, Map<string, number>>();
  for (const enc of encounters) {
    if (!patientProviderCounts.has(enc.patientId)) {
      patientProviderCounts.set(enc.patientId, new Map());
    }
    const providerMap = patientProviderCounts.get(enc.patientId)!;
    providerMap.set(enc.providerId, (providerMap.get(enc.providerId) || 0) + 1);
  }

  // Create attributions for patients meeting the minimum visit threshold
  for (const [patientId, providerMap] of patientProviderCounts) {
    const topProvider = [...providerMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .find(([, count]) => count >= minVisits);

    if (!topProvider) {
      result.unchanged++;
      continue;
    }

    const [providerId] = topProvider;

    // Check if active attribution already exists
    const existing = await prisma.patientAttribution.findFirst({
      where: {
        patientId,
        providerId,
        organizationId,
        isActive: true,
      },
    });

    if (existing) {
      result.unchanged++;
      continue;
    }

    try {
      await prisma.patientAttribution.create({
        data: {
          patientId,
          providerId,
          organizationId,
          method: 'PRIMARY_CARE',
          effectiveFrom: now,
          isActive: true,
        },
      });
      result.created++;
    } catch (err) {
      result.errors.push(`Failed to create attribution for patient ${patientId}: ${(err as Error).message}`);
    }
  }

  return result;
}
