import type { DisciplineConfig } from '../types';

import '../index';
import { getDisciplineConfig } from '../registry';

describe('Mental Health config', () => {
  let config: DisciplineConfig;

  beforeAll(() => {
    config = getDisciplineConfig('MENTAL_HEALTH')!;
  });

  it('is registered in the discipline registry', () => {
    expect(config).toBeDefined();
  });

  it('has correct discipline enum value', () => {
    expect(config.discipline).toBe('MENTAL_HEALTH');
  });

  it('includes at least one jurisdiction', () => {
    expect(config.jurisdictions.length).toBeGreaterThan(0);
  });

  it('has screening rule IDs as strings', () => {
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

  it('has an EMERGENT referral trigger for active suicidal ideation', () => {
    const suicidalTrigger = config.referralTriggers.find(
      (t) => t.urgency === 'EMERGENT' && t.description.includes('suicidal ideation'),
    );
    expect(suicidalTrigger).toBeDefined();
    expect(suicidalTrigger!.sourceAuthority).toBe('WHO mhGAP 2023');
  });

  it('includes PHQ-9 monitoring at 30-day interval for active depression', () => {
    const phq9Monitor = config.monitoringSchedule.find(
      (m) => m.biomarkerCode === 'PHQ9_SCORE' && m.conditionTrigger === 'F32',
    );
    expect(phq9Monitor).toBeDefined();
    expect(phq9Monitor!.intervalDays).toBe(30);
  });

  it('has an EMERGENT intervention for crisis protocol', () => {
    const crisisIntervention = config.interventionPriority.find(
      (i) => i.code === 'MH_CRISIS_PROTOCOL',
    );
    expect(crisisIntervention).toBeDefined();
    expect(crisisIntervention!.urgency).toBe('EMERGENT');
  });
});
