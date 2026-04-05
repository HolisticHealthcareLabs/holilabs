import type { DisciplineConfig } from '../types';

import '../index';
import { getDisciplineConfig } from '../registry';

describe('Endocrinology config', () => {
  let config: DisciplineConfig;

  beforeAll(() => {
    config = getDisciplineConfig('ENDOCRINOLOGY')!;
  });

  it('is registered in the discipline registry', () => {
    expect(config).toBeDefined();
  });

  it('has correct discipline enum value', () => {
    expect(config.discipline).toBe('ENDOCRINOLOGY');
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

  it('includes HBA1C monitoring at 90-day interval', () => {
    const hba1cMonitor = config.monitoringSchedule.find(
      (m) => m.biomarkerCode === 'HBA1C',
    );
    expect(hba1cMonitor).toBeDefined();
    expect(hba1cMonitor!.intervalDays).toBe(90);
    expect(hba1cMonitor!.sourceAuthority).toBe('SBD 2024');
  });

  it('includes diabetes-related screening rules', () => {
    const diabetesRules = config.screeningRuleIds.filter((id) =>
      id.toLowerCase().includes('diabetes'),
    );
    expect(diabetesRules.length).toBeGreaterThanOrEqual(1);
  });

  it('has an EMERGENT referral for severe hypoglycemia', () => {
    const hypoTrigger = config.referralTriggers.find(
      (t) => t.urgency === 'EMERGENT' && t.description.includes('hypoglycemia'),
    );
    expect(hypoTrigger).toBeDefined();
    expect(hypoTrigger!.sourceAuthority).toBe('ADA Standards of Care 2025');
  });
});
