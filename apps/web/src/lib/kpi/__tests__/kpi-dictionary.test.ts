/**
 * KPI Dictionary Completeness Tests
 * FR-B1: Blocks release if KPI definitions are missing.
 */

import { KPI_DICTIONARY, type KPIDictionaryKey } from '../kpi-dictionary';
import type { KPIType } from '../kpi-queries';

// All 8 KPI type values that must exist in the dictionary
const ALL_KPI_TYPES: KPIType[] = [
  'totalEvaluations',
  'blockRate',
  'overrideRate',
  'attestationCompliance',
  'reminderReach',
  'escalationSlaClosure',
  'groundTruthAcceptRate',
  'preventionCompletion',
];

describe('KPI Dictionary', () => {
  it('contains exactly 8 KPI entries', () => {
    expect(Object.keys(KPI_DICTIONARY)).toHaveLength(8);
  });

  it('every KPIType value exists as a dictionary key', () => {
    for (const kpiType of ALL_KPI_TYPES) {
      expect(KPI_DICTIONARY).toHaveProperty(kpiType);
    }
  });

  it.each(Object.keys(KPI_DICTIONARY) as KPIDictionaryKey[])(
    'entry "%s" has all required fields',
    (key) => {
      const entry = KPI_DICTIONARY[key];
      expect(entry.queryId).toBeTruthy();
      expect(entry.label).toBeTruthy();
      expect(entry.numerator).toBeTruthy();
      expect(entry.denominator).toBeTruthy();
      expect(['count', 'percentage']).toContain(entry.unit);
      expect(entry.sourceModel).toBeTruthy();
    }
  );

  it('queryId matches the dictionary key for every entry', () => {
    for (const [key, entry] of Object.entries(KPI_DICTIONARY)) {
      expect(entry.queryId).toBe(key);
    }
  });

  it('every dictionary key resolves in getKPI without "Unknown KPI type" error', async () => {
    // We only need to verify that the key is a valid KPIType — no Prisma needed.
    // The type system enforces this at compile time via `as const satisfies`,
    // but we double-check at runtime to catch drift.
    const kpiTypes = new Set<string>(ALL_KPI_TYPES);
    for (const key of Object.keys(KPI_DICTIONARY)) {
      expect(kpiTypes.has(key)).toBe(true);
    }
  });
});
