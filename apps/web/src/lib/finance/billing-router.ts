/**
 * BillingRouter — Tri-Country Billing Intelligence Service
 *
 * The "unicorn move": given a SNOMED concept + country + insurer, instantly
 * return the correct billing code, payer rate, and prior-auth requirements.
 *
 * Architecture:
 *   SNOMED → SnomedCrosswalk (DB) → ProcedureCode
 *   ProcedureCode + Insurer → FeeScheduleLine (payer rate)
 *   ProcedureCode + Insurer → PriorAuthRule (pre-auth requirements)
 *
 * Fallback: if DB tables are empty, lookupRate() falls back to the existing
 * getTUSSByCode() from tuss-lookup.ts — zero-downtime migration.
 */

import { PrismaClient, BillingSystem } from '@prisma/client';
import { getTUSSByCode } from './tuss-lookup';

// ─── Types ────────────────────────────────────────────────────────────────────

export type BillingCountry = 'BR' | 'AR' | 'BO';

export interface CrosswalkResult {
  snomedConceptId: string;
  billingCode: string;
  billingSystem: BillingSystem;
  country: BillingCountry;
  shortDescription: string;
  actuarialWeight: number;
  mappingType: string;
  confidence: number;
}

export interface RateLookupResult {
  billingCode: string;
  billingSystem: BillingSystem;
  negotiatedRate: number;
  currency: string;
  confidence: string;
  isCovered: boolean;
  coverageLimit: number | null;
  copayFlat: number | null;
  copayPercent: number | null;
  usedFallback: boolean;
}

export interface PriorAuthResult {
  required: boolean;
  windowDays: number | null;
  urgentWindowHours: number | null;
  requiredDocuments: string[];
  requiredDiagnoses: string[];
  notes: string | null;
}

export interface ClinicianNetworkStatus {
  isInNetwork: boolean;
  networkTier: string | null;
}

export interface ClaimRoute {
  /** SNOMED input */
  snomedConceptId: string;
  country: BillingCountry;

  /** Resolved billing code (null if crosswalk not found) */
  billingCode: string | null;
  billingSystem: BillingSystem | null;
  procedureDescription: string | null;
  actuarialWeight: number;

  /** Payer rate information */
  rate: RateLookupResult | null;

  /** Prior auth requirements */
  priorAuth: PriorAuthResult;

  /** Clinician network (if clinicianId provided) */
  clinicianNetwork: ClinicianNetworkStatus | null;

  /** Routing metadata */
  routingConfidence: number; // 0.0–1.0
  usedFallback: boolean;
  resolvedAt: string; // ISO-8601
}

// ─── BillingRouter ────────────────────────────────────────────────────────────

export class BillingRouter {
  constructor(private readonly db: PrismaClient) {}

  /**
   * Resolve a SNOMED concept to a national billing code for a given country.
   * O(1) via indexed DB lookup on (snomedConceptId, country).
   */
  async crosswalkCode(
    snomedConceptId: string,
    country: BillingCountry
  ): Promise<CrosswalkResult | null> {
    const crosswalk = await this.db.snomedCrosswalk.findFirst({
      where: {
        snomedConceptId,
        country,
        procedureCode: { isActive: true },
      },
      orderBy: { confidence: 'desc' },
      include: {
        procedureCode: {
          select: {
            code: true,
            system: true,
            shortDescription: true,
            actuarialWeight: true,
          },
        },
      },
    });

    if (!crosswalk) return null;

    return {
      snomedConceptId,
      billingCode: crosswalk.procedureCode.code,
      billingSystem: crosswalk.procedureCode.system,
      country,
      shortDescription: crosswalk.procedureCode.shortDescription,
      actuarialWeight: Number(crosswalk.procedureCode.actuarialWeight),
      mappingType: crosswalk.mappingType,
      confidence: Number(crosswalk.confidence),
    };
  }

  /**
   * Look up the negotiated or reference rate for a billing code + insurer.
   *
   * Fallback chain:
   * 1. FeeScheduleLine in DB (most accurate — contracted or reference rate)
   * 2. ProcedureCode.referenceRate* (reference rate stored on the code itself)
   * 3. getTUSSByCode() from tuss-lookup.ts (legacy — backward compatible)
   */
  async lookupRate(
    billingCode: string,
    system: BillingSystem,
    insurerId: string
  ): Promise<RateLookupResult | null> {
    // Find active fee schedule for this insurer
    const feeSchedule = await this.db.feeSchedule.findFirst({
      where: { insurerId, billingSystem: system, isActive: true },
      orderBy: { effectiveDate: 'desc' },
    });

    if (feeSchedule) {
      const line = await this.db.feeScheduleLine.findFirst({
        where: {
          feeScheduleId: feeSchedule.id,
          procedureCode: { code: billingCode, system, isActive: true },
        },
        include: { procedureCode: true },
      });

      if (line) {
        return {
          billingCode,
          billingSystem: system,
          negotiatedRate: Number(line.negotiatedRate),
          currency: feeSchedule.currency,
          confidence: line.confidence,
          isCovered: line.isCovered,
          coverageLimit: line.coverageLimit ? Number(line.coverageLimit) : null,
          copayFlat: line.copayFlat ? Number(line.copayFlat) : null,
          copayPercent: line.copayPercent ? Number(line.copayPercent) : null,
          usedFallback: false,
        };
      }
    }

    // Fallback 1: reference rate on ProcedureCode row
    const procedureCode = await this.db.procedureCode.findFirst({
      where: { code: billingCode, system, isActive: true },
    });

    if (procedureCode) {
      const insurer = await this.db.insurer.findUnique({
        where: { id: insurerId },
        select: { country: true },
      });
      const country = insurer?.country ?? 'BR';

      const rate =
        country === 'BR' ? procedureCode.referenceRateBRL :
        country === 'AR' ? procedureCode.referenceRateARS :
        procedureCode.referenceRateBOB;

      if (rate !== null && rate !== undefined) {
        const currency = country === 'BR' ? 'BRL' : country === 'AR' ? 'ARS' : 'BOB';
        return {
          billingCode,
          billingSystem: system,
          negotiatedRate: Number(rate),
          currency,
          confidence: 'REFERENCE',
          isCovered: true,
          coverageLimit: null,
          copayFlat: null,
          copayPercent: null,
          usedFallback: true,
        };
      }
    }

    // Fallback 2: legacy tuss-lookup.ts (Brazil only, TUSS codes)
    if (system === BillingSystem.TUSS) {
      const tussCode = getTUSSByCode(billingCode);
      if (tussCode) {
        const rate = tussCode.baseRateBRL ?? tussCode.baseRateBOB;
        const currency = tussCode.baseRateBRL ? 'BRL' : 'BOB';
        return {
          billingCode,
          billingSystem: system,
          negotiatedRate: rate,
          currency,
          confidence: 'ESTIMATED',
          isCovered: true,
          coverageLimit: null,
          copayFlat: null,
          copayPercent: null,
          usedFallback: true,
        };
      }
    }

    return null;
  }

  /**
   * Check if a billing code requires prior authorization for a given insurer.
   * Returns { required: false } if no rule found (default = not required).
   */
  async requiresPriorAuth(
    billingCode: string,
    system: BillingSystem,
    insurerId: string
  ): Promise<PriorAuthResult> {
    const rule = await this.db.priorAuthRule.findFirst({
      where: {
        insurerId,
        procedureCode: { code: billingCode, system, isActive: true },
        OR: [
          { expirationDate: null },
          { expirationDate: { gte: new Date() } },
        ],
      },
      orderBy: { effectiveDate: 'desc' },
    });

    if (!rule) {
      return {
        required: false,
        windowDays: null,
        urgentWindowHours: null,
        requiredDocuments: [],
        requiredDiagnoses: [],
        notes: null,
      };
    }

    return {
      required: rule.required,
      windowDays: rule.windowDays,
      urgentWindowHours: rule.urgentWindowHours,
      requiredDocuments: rule.requiredDocuments,
      requiredDiagnoses: rule.requiredDiagnoses,
      notes: rule.notes,
    };
  }

  /**
   * Full claim routing: SNOMED + country + insurer → everything the clinician needs.
   *
   * Returns a ClaimRoute with:
   * - Resolved billing code (from SNOMED crosswalk)
   * - Payer rate (from fee schedule or fallback)
   * - Prior auth requirements
   * - Clinician network status (if clinicianId provided)
   * - routingConfidence: 0–1 composite score
   * - usedFallback: true if any part used legacy/reference data
   */
  async routeClaim(params: {
    snomedConceptId: string;
    country: BillingCountry;
    insurerId: string;
    clinicianId?: string;
    patientAgeYears?: number;
  }): Promise<ClaimRoute> {
    const { snomedConceptId, country, insurerId, clinicianId } = params;

    // Step 1: Crosswalk SNOMED → billing code
    const crosswalk = await this.crosswalkCode(snomedConceptId, country);

    if (!crosswalk) {
      // Graceful degradation — no crosswalk found
      return {
        snomedConceptId,
        country,
        billingCode: null,
        billingSystem: null,
        procedureDescription: null,
        actuarialWeight: 0,
        rate: null,
        priorAuth: { required: false, windowDays: null, urgentWindowHours: null, requiredDocuments: [], requiredDiagnoses: [], notes: null },
        clinicianNetwork: null,
        routingConfidence: 0,
        usedFallback: true,
        resolvedAt: new Date().toISOString(),
      };
    }

    // Step 2: Rate lookup
    const rate = await this.lookupRate(crosswalk.billingCode, crosswalk.billingSystem, insurerId);

    // Step 3: Prior auth
    const priorAuth = await this.requiresPriorAuth(crosswalk.billingCode, crosswalk.billingSystem, insurerId);

    // Step 4: Clinician network status
    let clinicianNetwork: ClinicianNetworkStatus | null = null;
    if (clinicianId) {
      const network = await this.db.clinicianNetwork.findUnique({
        where: { userId_insurerId: { userId: clinicianId, insurerId } },
        select: { isInNetwork: true, networkTier: true },
      });
      clinicianNetwork = network
        ? { isInNetwork: network.isInNetwork, networkTier: network.networkTier }
        : { isInNetwork: false, networkTier: null };
    }

    // Step 5: Compute routing confidence
    // Base: crosswalk confidence (0–1)
    // Penalty: -0.1 if rate used fallback, -0.05 if insurer not found
    let confidence = crosswalk.confidence;
    const usedFallback = rate?.usedFallback ?? true;
    if (usedFallback) confidence = Math.max(0, confidence - 0.1);
    if (!rate) confidence = Math.max(0, confidence - 0.1);

    return {
      snomedConceptId,
      country,
      billingCode: crosswalk.billingCode,
      billingSystem: crosswalk.billingSystem,
      procedureDescription: crosswalk.shortDescription,
      actuarialWeight: crosswalk.actuarialWeight,
      rate: rate ?? null,
      priorAuth,
      clinicianNetwork,
      routingConfidence: Math.round(confidence * 100) / 100,
      usedFallback,
      resolvedAt: new Date().toISOString(),
    };
  }
}

// ─── Singleton factory ────────────────────────────────────────────────────────

let _instance: BillingRouter | null = null;

/**
 * Returns a singleton BillingRouter for use in Next.js API routes.
 * Pass prisma from @/lib/prisma (the shared singleton).
 */
export function getBillingRouter(prisma: PrismaClient): BillingRouter {
  if (!_instance) {
    _instance = new BillingRouter(prisma);
  }
  return _instance;
}
