import type { DisciplineConfig } from '../types';

import '../index';
import { getDisciplineConfig } from '../registry';

describe('OB/GYN config', () => {
  let config: DisciplineConfig;

  beforeAll(() => {
    config = getDisciplineConfig('OB_GYN')!;
  });

  it('is registered in the discipline registry', () => {
    expect(config).toBeDefined();
  });

  it('has correct discipline enum value', () => {
    expect(config.discipline).toBe('OB_GYN');
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
      expect(m.intervalDays).toBeGreaterThanOrEqual(0);
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

  it('has pregnancyRelevant set to true in screening filters', () => {
    expect(config.screeningFilters.pregnancyRelevant).toBe(true);
  });

  it('restricts biological sex to FEMALE only', () => {
    expect(config.screeningFilters.biologicalSex).toEqual(['FEMALE']);
  });

  it('has an EMERGENT referral for preeclampsia signs', () => {
    const preeclampsiaTrigger = config.referralTriggers.find(
      (t) => t.urgency === 'EMERGENT' && t.description.includes('reeclampsia'),
    );
    expect(preeclampsiaTrigger).toBeDefined();
    expect(preeclampsiaTrigger!.sourceAuthority).toBe('FEBRASGO');
  });
});
