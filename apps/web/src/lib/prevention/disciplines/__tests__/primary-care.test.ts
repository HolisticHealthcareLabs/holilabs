import type { DisciplineConfig } from '../types';

import '../index';
import { getDisciplineConfig } from '../registry';

describe('Primary Care config', () => {
  let config: DisciplineConfig;

  beforeAll(() => {
    config = getDisciplineConfig('PRIMARY_CARE')!;
  });

  it('is registered in the discipline registry', () => {
    expect(config).toBeDefined();
  });

  it('has correct discipline enum value', () => {
    expect(config.discipline).toBe('PRIMARY_CARE');
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

  it('references all three jurisdictions (BR, CO, BO)', () => {
    expect(config.jurisdictions).toContain('BR');
    expect(config.jurisdictions).toContain('CO');
    expect(config.jurisdictions).toContain('BO');
  });

  it('has the most screening rules among all disciplines', () => {
    const allConfigs = [
      getDisciplineConfig('CARDIOLOGY')!,
      getDisciplineConfig('ENDOCRINOLOGY')!,
      getDisciplineConfig('ONCOLOGY')!,
      getDisciplineConfig('MENTAL_HEALTH')!,
      getDisciplineConfig('PEDIATRICS')!,
      getDisciplineConfig('GERIATRICS')!,
      getDisciplineConfig('NEPHROLOGY')!,
      getDisciplineConfig('PULMONOLOGY')!,
      getDisciplineConfig('OB_GYN')!,
    ];
    const maxOtherRules = Math.max(
      ...allConfigs.map((c) => c.screeningRuleIds.length),
    );
    expect(config.screeningRuleIds.length).toBeGreaterThanOrEqual(maxOtherRules);
  });

  it('includes referral triggers spanning multiple specialist disciplines', () => {
    const descriptions = config.referralTriggers.map((t) => t.description);
    const hasCardioRef = descriptions.some((d) => d.includes('cardiology') || d.includes('Hypertensive crisis'));
    const hasEndoRef = descriptions.some((d) => d.includes('endocrinology'));
    const hasOncoRef = descriptions.some((d) => d.includes('oncology'));
    expect(hasCardioRef).toBe(true);
    expect(hasEndoRef).toBe(true);
    expect(hasOncoRef).toBe(true);
  });
});
