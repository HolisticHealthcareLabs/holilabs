import type { DisciplineConfig } from '../types';

import '../index';
import { getDisciplineConfig } from '../registry';

describe('Pulmonology config', () => {
  let config: DisciplineConfig;

  beforeAll(() => {
    config = getDisciplineConfig('PULMONOLOGY')!;
  });

  it('is registered in the discipline registry', () => {
    expect(config).toBeDefined();
  });

  it('has correct discipline enum value', () => {
    expect(config.discipline).toBe('PULMONOLOGY');
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

  it('has GOLD-based referral trigger for FEV1 <50% predicted', () => {
    const goldTrigger = config.referralTriggers.find(
      (t) => t.description.includes('FEV1 <50%'),
    );
    expect(goldTrigger).toBeDefined();
    expect(goldTrigger!.urgency).toBe('URGENT');
    expect(goldTrigger!.sourceAuthority).toBe('GOLD 2024');
  });

  it('includes spirometry monitoring at 365-day interval', () => {
    const spiroMonitor = config.monitoringSchedule.find(
      (m) => m.biomarkerCode === 'SPIROMETRY_FEV1',
    );
    expect(spiroMonitor).toBeDefined();
    expect(spiroMonitor!.intervalDays).toBe(365);
    expect(spiroMonitor!.sourceAuthority).toBe('GOLD 2024');
  });

  it('has GINA-sourced risk weight for asthma exacerbations', () => {
    const asthmaWeight = config.riskWeights['asthma_exacerbations_ge2_year'];
    expect(asthmaWeight).toBeDefined();
    expect(asthmaWeight.sourceAuthority).toBe('GINA 2024');
    expect(asthmaWeight.evidenceTier).toBe('TIER_1_GUIDELINE');
  });
});
