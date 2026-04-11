import type { DisciplineConfig } from '../types';

import '../index';
import { getDisciplineConfig } from '../registry';

describe('Nephrology config', () => {
  let config: DisciplineConfig;

  beforeAll(() => {
    config = getDisciplineConfig('NEPHROLOGY')!;
  });

  it('is registered in the discipline registry', () => {
    expect(config).toBeDefined();
  });

  it('has correct discipline enum value', () => {
    expect(config.discipline).toBe('NEPHROLOGY');
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

  it('has KDIGO-based referral triggers for eGFR <30 and <15', () => {
    const urgentEgfr = config.referralTriggers.find(
      (t) => t.description.includes('eGFR <30') && t.urgency === 'URGENT',
    );
    const emergentEgfr = config.referralTriggers.find(
      (t) => t.description.includes('eGFR <15') && t.urgency === 'EMERGENT',
    );
    expect(urgentEgfr).toBeDefined();
    expect(emergentEgfr).toBeDefined();
    expect(urgentEgfr!.sourceAuthority).toBe('KDIGO 2024');
    expect(emergentEgfr!.sourceAuthority).toBe('KDIGO 2024');
  });

  it('includes eGFR monitoring at 90-day interval with CKD stage 3 trigger', () => {
    const egfrMonitor = config.monitoringSchedule.find(
      (m) => m.biomarkerCode === 'EGFR',
    );
    expect(egfrMonitor).toBeDefined();
    expect(egfrMonitor!.intervalDays).toBe(90);
    expect(egfrMonitor!.conditionTrigger).toBe('N18.3');
  });

  it('has requiredConditionIcd10 filter for CKD, diabetes, or hypertension', () => {
    const required = config.screeningFilters.requiredConditionIcd10;
    expect(required).toBeDefined();
    expect(required).toContain('N18');
    expect(required).toContain('E11');
    expect(required).toContain('I10');
  });
});
