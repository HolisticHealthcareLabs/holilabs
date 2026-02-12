/**
 * Override Aggregator
 * Ranks override reasons by frequency
 */

import { prisma } from '@/lib/prisma';
import { KPIFilterState } from './filter-state';

export interface OverrideReason {
  reasonCode: string;
  reasonLabel: string;
  count: number;
  percentage: number;
}

/**
 * Get override reasons ranked by count (descending)
 * Maps raw override reasons to standardized codes and labels
 * @param filter - Date range filter
 * @returns Array of override reasons ranked by frequency
 */
export async function getOverrideReasons(
  filter: KPIFilterState = {}
): Promise<OverrideReason[]> {
  const where: Record<string, unknown> = {
    overrideByUser: true,
    overrideReason: { not: null },
  };

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

  // Fetch all overrides with their reasons
  const overrides = await prisma.governanceEvent.findMany({
    where,
    select: {
      overrideReason: true,
    },
  });

  // Aggregate reasons by normalization
  const reasonMap = new Map<string, { code: string; label: string; count: number }>();

  for (const override of overrides) {
    const rawReason = override.overrideReason || 'Unknown';
    const { code, label } = normalizeOverrideReason(rawReason);

    const existing = reasonMap.get(code);
    if (existing) {
      existing.count += 1;
    } else {
      reasonMap.set(code, { code, label, count: 1 });
    }
  }

  // Convert to array and calculate percentages
  const totalOverrides = overrides.length;
  const results: OverrideReason[] = Array.from(reasonMap.values()).map((reason) => ({
    reasonCode: reason.code,
    reasonLabel: reason.label,
    count: reason.count,
    percentage:
      totalOverrides > 0
        ? Math.round((reason.count / totalOverrides) * 10000) / 100
        : 0,
  }));

  // Sort by count descending
  results.sort((a, b) => b.count - a.count);

  return results;
}

/**
 * Normalize override reasons to standard codes and labels
 * Maps various text representations to canonical forms
 * @param rawReason - Raw reason text from database
 * @returns Normalized code and label
 */
function normalizeOverrideReason(rawReason: string): { code: string; label: string } {
  const normalized = rawReason.toLowerCase().trim();

  // Clinical judgment and variants
  if (
    normalized.includes('clinical judgment') ||
    normalized.includes('clinical expertise') ||
    normalized.includes('clinical assessment')
  ) {
    return {
      code: 'CLINICAL_JUDGMENT',
      label: 'Clinical Judgment',
    };
  }

  // Palliative care
  if (normalized.includes('palliative') || normalized.includes('end-of-life')) {
    return {
      code: 'PALLIATIVE_CARE',
      label: 'Palliative Care',
    };
  }

  // Patient specific context
  if (
    normalized.includes('patient context') ||
    normalized.includes('patient preference') ||
    normalized.includes('individual circumstance') ||
    normalized.includes('specific patient')
  ) {
    return {
      code: 'PATIENT_CONTEXT',
      label: 'Patient-Specific Context',
    };
  }

  // Allergy or intolerance
  if (
    normalized.includes('allerg') ||
    normalized.includes('intolerance') ||
    normalized.includes('sensitivity')
  ) {
    return {
      code: 'ALLERGY_INTOLERANCE',
      label: 'Allergy/Intolerance',
    };
  }

  // Drug interaction risk but acceptable
  if (
    normalized.includes('acceptable interaction') ||
    normalized.includes('manageable interaction') ||
    normalized.includes('acceptable risk')
  ) {
    return {
      code: 'ACCEPTABLE_RISK',
      label: 'Acceptable Risk',
    };
  }

  // Lack of alternative
  if (
    normalized.includes('no alternative') ||
    normalized.includes('no suitable alternative') ||
    normalized.includes('alternative unavailable')
  ) {
    return {
      code: 'NO_ALTERNATIVE',
      label: 'No Suitable Alternative',
    };
  }

  // Research or off-label
  if (normalized.includes('research') || normalized.includes('off-label')) {
    return {
      code: 'RESEARCH_OFFLABEL',
      label: 'Research/Off-Label',
    };
  }

  // Prior approval
  if (normalized.includes('prior approval') || normalized.includes('pre-approved')) {
    return {
      code: 'PRIOR_APPROVAL',
      label: 'Prior Approval',
    };
  }

  // Default: use first 30 chars as code, full text as label
  return {
    code: normalized.substring(0, 30).toUpperCase().replace(/\s+/g, '_'),
    label: rawReason,
  };
}
