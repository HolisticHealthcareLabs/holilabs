import tussData from '../../../../../data/master/tuss.json';

export interface TUSSCode {
  code: string;
  description: string;
  category: string;
  baseRateBOB: number;
  baseRateBRL: number | null;
  applicableSeverities: string[];
  actuarialWeight: number;
}

export interface CostEstimate {
  totalWeightedRisk: number;
  estimatedCostBRL: number;
  estimatedCostBOB: number;
  codeCount: number;
}

const codeMap = new Map<string, TUSSCode>();
for (const entry of tussData.codes) {
  codeMap.set(entry.code, entry as TUSSCode);
}

export function getTUSSByCode(code: string): TUSSCode | undefined {
  return codeMap.get(code);
}

export function getTUSSBySeverity(severity: string): TUSSCode[] {
  return tussData.codes.filter(
    (c: { applicableSeverities: string[] }) => c.applicableSeverities.includes(severity)
  ) as TUSSCode[];
}

export function formatRate(code: TUSSCode): string {
  if (code.baseRateBRL && code.baseRateBRL > 0) {
    return `R$ ${code.baseRateBRL.toLocaleString('pt-BR')}`;
  }
  if (code.baseRateBOB > 0) {
    return `Bs. ${code.baseRateBOB.toLocaleString('es-BO')}`;
  }
  return '—';
}

export function getAllCodes(): TUSSCode[] {
  return tussData.codes as TUSSCode[];
}

/**
 * Get the actuarial weight for a TUSS code (0-1 scale).
 * Higher weight = greater cost impact on insurance policy pricing.
 * Returns 0 for unknown codes.
 */
export function getActuarialWeight(code: string): number {
  return getTUSSByCode(code)?.actuarialWeight ?? 0;
}

/**
 * Estimate the claim cost impact for a set of TUSS codes at a given severity.
 *
 * Uses actuarialWeight to produce a weighted cost projection:
 * - Sums base rates adjusted by actuarial weight
 * - Higher severity codes contribute more to the projection
 */
export function estimateClaimCost(codes: string[], severity: string): CostEstimate {
  let totalWeightedRisk = 0;
  let totalCostBRL = 0;
  let totalCostBOB = 0;
  let matched = 0;

  // Severity multiplier: BLOCK events cost insurers more
  const severityMultiplier: Record<string, number> = {
    BLOCK: 2.5,
    FLAG: 1.5,
    ATTESTATION_REQUIRED: 1.2,
    PASS: 1.0,
  };
  const multiplier = severityMultiplier[severity] ?? 1.0;

  for (const code of codes) {
    const tuss = getTUSSByCode(code);
    if (!tuss) continue;
    matched++;

    totalWeightedRisk += tuss.actuarialWeight * multiplier;

    if (tuss.baseRateBRL && tuss.baseRateBRL > 0) {
      totalCostBRL += tuss.baseRateBRL * tuss.actuarialWeight * multiplier;
    }
    if (tuss.baseRateBOB > 0) {
      totalCostBOB += tuss.baseRateBOB * tuss.actuarialWeight * multiplier;
    }
  }

  return {
    totalWeightedRisk: Math.round(totalWeightedRisk * 100) / 100,
    estimatedCostBRL: Math.round(totalCostBRL),
    estimatedCostBOB: Math.round(totalCostBOB),
    codeCount: matched,
  };
}
