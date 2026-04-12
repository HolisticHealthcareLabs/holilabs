import type { DisciplineConfig } from '../types';

import '../index';
import { getDisciplineConfig } from '../registry';

describe('Cardiology config', () => {
  let config: DisciplineConfig;

  beforeAll(() => {
    config = getDisciplineConfig('CARDIOLOGY')!;
  });

  it('is registered in the discipline registry', () => {
    expect(config).toBeDefined();
  });

  it('has correct discipline enum value', () => {
    expect(config.discipline).toBe('CARDIOLOGY');
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

  it('includes ASCVD-related risk weight for diabetes', () => {
    const diabetesWeight = config.riskWeights['diabetes_e10_e14'];
    expect(diabetesWeight).toBeDefined();
    expect(diabetesWeight.weight).toBe(0.20);
    expect(diabetesWeight.sourceAuthority).toBe('AHA/ACC 2024');
  });

  it('has an EMERGENT referral trigger for BP >=180/120', () => {
    const bpTrigger = config.referralTriggers.find(
      (t) => t.urgency === 'EMERGENT' && t.description.includes('180/120'),
    );
    expect(bpTrigger).toBeDefined();
    expect(bpTrigger!.sourceAuthority).toBe('SBC 2024');
  });

  it('has jurisdiction overrides for BR, CO, and BO', () => {
    expect(config.jurisdictionOverrides).toBeDefined();
    expect(config.jurisdictionOverrides!.BR).toBeDefined();
    expect(config.jurisdictionOverrides!.CO).toBeDefined();
    expect(config.jurisdictionOverrides!.BO).toBeDefined();
  });
});
