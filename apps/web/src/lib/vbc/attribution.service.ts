/**
 * VBC Patient Attribution Service — STUBBED
 *
 * TEMPORARY: Returns 503-style empty responses until the PatientAttribution
 * Prisma model is added to the schema. Callers (API routes + MCP tools)
 * surface this as "Value-Based Care attribution not available" rather than
 * crashing on a missing Prisma delegate.
 *
 * Restore by adding the VBC attribution schema migration and reverting this
 * stub — see population-health.service.ts for the mirrored pattern.
 */

import type { PrismaClient } from '@prisma/client';
import { VBCUnavailableError } from './population-health.service';

// ---------------------------------------------------------------------------
// Types — preserved so downstream imports continue to compile
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
// Stubs
// ---------------------------------------------------------------------------

export async function createAttribution(
  _prisma: PrismaClient,
  _input: AttributionInput,
): Promise<unknown> {
  throw new VBCUnavailableError();
}

export async function listAttributions(
  _prisma: PrismaClient,
  _organizationId: string,
  _providerId?: string,
): Promise<unknown[]> {
  return [];
}

export async function getAttributionSummary(
  _prisma: PrismaClient,
  organizationId: string,
): Promise<AttributionSummary> {
  return {
    organizationId,
    totalAttributed: 0,
    byMethod: {},
    byRiskTier: {},
    activeCount: 0,
  };
}

export async function reconcileAttributions(
  _prisma: PrismaClient,
  _organizationId: string,
  _lookbackMonths = 12,
  _minVisits = 2,
): Promise<ReconciliationResult> {
  return {
    created: 0,
    deactivated: 0,
    unchanged: 0,
    errors: [],
  };
}
