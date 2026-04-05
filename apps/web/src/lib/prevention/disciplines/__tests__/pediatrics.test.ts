import type { DisciplineConfig } from '../types';

import '../index';
import { getDisciplineConfig } from '../registry';

describe('Pediatrics config', () => {
  let config: DisciplineConfig;

  beforeAll(() => {
    config = getDisciplineConfig('PEDIATRICS')!;
  });

  it('is registered in the discipline registry', () => {
    expect(config).toBeDefined();
  });

  it('has correct discipline enum value', () => {
    expect(config.discipline).toBe('PEDIATRICS');
  });

  it('includes at least one jurisdiction', () => {
    expect(config.jurisdictions.length).toBeGreaterThan(0);
  });

  it('has screening rule IDs that are strings', () => {
    expect(config.screeningRuleIds.length).toBeGreaterThan(0);
    config.screeningRuleIds.forEach((id) => expect(typeof id).toBe('string'));
  });

  it('has risk weights with sourceAuthority', () => {
    Object.values(config.riskWeights).forEach((w) => {
      expect(w.sourceAuthority).toBeTruthy();
      expect(['TIER_1_GUIDELINE', 'TIER_2_CONSENSUS', 'PENDING_CLINICAL_REVIEW']).toContain(
        w.evidenceTier,
      );
    });
  });

  it('has intervention priorities ordered by urgency', () => {
    expect(config.interventionPriority.length).toBeGreaterThan(0);
    config.interventionPriority.forEach((i) => {
      expect(['EMERGENT', 'URGENT', 'ROUTINE', 'PREVENTIVE']).toContain(i.urgency);
      expect(i.sourceAuthority).toBeTruthy();
    });
  });

  it('has monitoring schedule with valid intervals', () => {
    config.monitoringSchedule.forEach((m) => {
      expect(m.intervalDays).toBeGreaterThan(0);
      expect(m.sourceAuthority).toBeTruthy();
    });
  });

  it('has referral triggers with JSON-Logic conditions', () => {
    config.referralTriggers.forEach((t) => {
      expect(t.condition).toBeDefined();
      expect(typeof t.condition).toBe('object');
      expect(['EMERGENT', 'URGENT', 'ROUTINE']).toContain(t.urgency);
    });
  });

  it('has age range filter restricted to 0-18', () => {
    expect(config.screeningFilters.ageRange).toEqual([0, 18]);
  });

  it('includes vaccination-related screening rules', () => {
    const vaccineRules = config.screeningRuleIds.filter(
      (id) => id.includes('Vaccine'),
    );
    expect(vaccineRules.length).toBeGreaterThanOrEqual(1);
  });

  it('has an URGENT intervention for catch-up vaccination', () => {
    const catchUpVax = config.interventionPriority.find(
      (i) => i.code === 'PED_CATCH_UP_VACCINATION',
    );
    expect(catchUpVax).toBeDefined();
    expect(catchUpVax!.urgency).toBe('URGENT');
    expect(catchUpVax!.sourceAuthority).toBe('MS/PNI');
  });
});
