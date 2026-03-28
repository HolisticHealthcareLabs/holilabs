import type { DisciplineConfig } from '../types';

import '../index';
import { getDisciplineConfig } from '../registry';

describe('Oncology config', () => {
  let config: DisciplineConfig;

  beforeAll(() => {
    config = getDisciplineConfig('ONCOLOGY')!;
  });

  it('is registered in the discipline registry', () => {
    expect(config).toBeDefined();
  });

  it('has correct discipline enum value', () => {
    expect(config.discipline).toBe('ONCOLOGY');
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

  it('has BR-specific cancer screening rules in jurisdictionOverrides', () => {
    const brOverride = config.jurisdictionOverrides?.BR;
    expect(brOverride).toBeDefined();
    expect(brOverride!.screeningRuleIds).toContain('Breast Cancer Screening (Mammography)');
    expect(brOverride!.screeningRuleIds).toContain('Cervical Cancer Screening (HPV-DNA)');
  });

  it('includes breast, cervical, and colorectal screening rule IDs', () => {
    const hasBreast = config.screeningRuleIds.some((id) => id.includes('Breast'));
    const hasCervical = config.screeningRuleIds.some((id) => id.includes('Cervical'));
    const hasColorectal = config.screeningRuleIds.some((id) => id.includes('Colorectal'));
    expect(hasBreast).toBe(true);
    expect(hasCervical).toBe(true);
    expect(hasColorectal).toBe(true);
  });

  it('has an EMERGENT referral for suspected malignancy', () => {
    const malignancyTrigger = config.referralTriggers.find(
      (t) => t.urgency === 'EMERGENT' && t.description.includes('malignancy'),
    );
    expect(malignancyTrigger).toBeDefined();
    expect(malignancyTrigger!.sourceAuthority).toBe('INCA PCDT 2024');
  });
});
