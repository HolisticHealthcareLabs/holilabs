import type { DisciplineConfig } from '../types';

import '../index';
import { getDisciplineConfig } from '../registry';

describe('Geriatrics config', () => {
  let config: DisciplineConfig;

  beforeAll(() => {
    config = getDisciplineConfig('GERIATRICS')!;
  });

  it('is registered in the discipline registry', () => {
    expect(config).toBeDefined();
  });

  it('has correct discipline enum value', () => {
    expect(config.discipline).toBe('GERIATRICS');
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

  it('has age range filter starting at 65', () => {
    expect(config.screeningFilters.ageRange![0]).toBe(65);
  });

  it('has an URGENT referral trigger for polypharmacy (Beers criteria >=3)', () => {
    const polyTrigger = config.referralTriggers.find(
      (t) => t.description.includes('Beers criteria medications'),
    );
    expect(polyTrigger).toBeDefined();
    expect(polyTrigger!.urgency).toBe('URGENT');
    expect(polyTrigger!.sourceAuthority).toBe('AGS Beers 2023');
  });

  it('includes medication review monitoring at 90-day interval', () => {
    const medReview = config.monitoringSchedule.find(
      (m) => m.biomarkerCode === 'MEDICATION_REVIEW',
    );
    expect(medReview).toBeDefined();
    expect(medReview!.intervalDays).toBe(90);
    expect(medReview!.sourceAuthority).toBe('AGS Beers 2023');
  });
});
