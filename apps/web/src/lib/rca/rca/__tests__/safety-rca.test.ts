import {
  categorizeBone,
  triageForFullRCA,
  scoreActionStrength,
  performRCA,
} from '../safety-rca';
import type { SafetyEvent } from '../types';

function makeSafetyEvent(
  overrides: Partial<SafetyEvent> = {},
): SafetyEvent {
  return {
    eventId: 'EVT-001',
    patientId: 'PAT-001',
    eventType: 'ADVERSE_EVENT',
    severity: 'MODERATE',
    dateOccurred: new Date('2026-03-20'),
    description: 'Test safety event',
    involvedStaff: ['DR-001'],
    involvedSystems: ['EHR'],
    reportedBy: 'DR-001',
    ...overrides,
  };
}

describe('categorizeBone', () => {
  it('returns COMMUNICATION for handoff-related findings', () => {
    expect(categorizeBone('poor handoff communication')).toBe('COMMUNICATION');
  });

  it('returns REGULATORY for ANVISA-related findings', () => {
    expect(categorizeBone('ANVISA compliance gap')).toBe('REGULATORY');
  });

  it('returns EQUIPMENT for device-related findings', () => {
    expect(categorizeBone('device malfunction during procedure')).toBe('EQUIPMENT');
  });

  it('returns ENVIRONMENT for lighting-related findings', () => {
    expect(categorizeBone('poor lighting in procedure room')).toBe('ENVIRONMENT');
  });

  it('returns PEOPLE_STAFF for fatigue-related findings', () => {
    expect(categorizeBone('staff fatigue after 12-hour shift')).toBe('PEOPLE_STAFF');
  });

  it('returns PATIENT_FACTORS for allergy-related findings', () => {
    expect(categorizeBone('undocumented allergy to penicillin')).toBe('PATIENT_FACTORS');
  });

  it('returns INFRASTRUCTURE for network-related findings', () => {
    expect(categorizeBone('network downtime during admission')).toBe('INFRASTRUCTURE');
  });

  it('defaults to POLICIES_PROCEDURES when no keyword matches', () => {
    expect(categorizeBone('unclear organizational issue')).toBe('POLICIES_PROCEDURES');
  });
});

describe('triageForFullRCA', () => {
  it('returns true for SENTINEL events regardless of severity', () => {
    expect(triageForFullRCA(makeSafetyEvent({ eventType: 'SENTINEL', severity: 'LOW' }))).toBe(true);
  });

  it('returns true for ADVERSE_EVENT with HIGH severity', () => {
    expect(triageForFullRCA(makeSafetyEvent({ eventType: 'ADVERSE_EVENT', severity: 'HIGH' }))).toBe(true);
  });

  it('returns true for ADVERSE_EVENT with CRITICAL severity', () => {
    expect(triageForFullRCA(makeSafetyEvent({ eventType: 'ADVERSE_EVENT', severity: 'CRITICAL' }))).toBe(true);
  });

  it('returns false for ADVERSE_EVENT with MODERATE severity', () => {
    expect(triageForFullRCA(makeSafetyEvent({ eventType: 'ADVERSE_EVENT', severity: 'MODERATE' }))).toBe(false);
  });

  it('returns false for NEAR_MISS events', () => {
    expect(triageForFullRCA(makeSafetyEvent({ eventType: 'NEAR_MISS', severity: 'HIGH' }))).toBe(false);
  });
});

describe('scoreActionStrength', () => {
  it('returns ARCHITECTURAL for redesign actions', () => {
    expect(scoreActionStrength('redesign the workflow')).toBe('ARCHITECTURAL');
  });

  it('returns ARCHITECTURAL for automate actions', () => {
    expect(scoreActionStrength('automate the verification step')).toBe('ARCHITECTURAL');
  });

  it('returns PROCESS for checklist actions', () => {
    expect(scoreActionStrength('implement a pre-op checklist')).toBe('PROCESS');
  });

  it('returns ADMINISTRATIVE for policy actions', () => {
    expect(scoreActionStrength('update the departmental policy')).toBe('ADMINISTRATIVE');
  });

  it('returns TRAINING for education actions', () => {
    expect(scoreActionStrength('provide additional education sessions')).toBe('TRAINING');
  });

  it('defaults to TRAINING when no keyword matches', () => {
    expect(scoreActionStrength('improve general approach')).toBe('TRAINING');
  });
});

describe('performRCA', () => {
  it('returns a valid RCAResult with all fields populated', () => {
    const event = makeSafetyEvent({
      eventId: 'EVT-RCA-001',
      eventType: 'SENTINEL',
      severity: 'CRITICAL',
    });

    const findings = [
      'poor handoff communication between shifts',
      'device malfunction not reported',
      'ANVISA protocol not followed',
    ];

    const whyChain = [
      'Medication was administered to the wrong patient',
      'The nurse did not verify the patient wristband',
      'The verification checklist was not available at bedside',
      'Checklist supply was not restocked after policy change',
      'No automated reorder system exists for safety checklists',
    ];

    const result = performRCA(event, findings, whyChain);

    expect(result.eventId).toBe('EVT-RCA-001');
    expect(result.fishbone.eventId).toBe('EVT-RCA-001');
    expect(result.fishbone.findings).toHaveLength(3);
    expect(result.fishbone.createdAt).toBeInstanceOf(Date);

    expect(result.fishbone.findings[0].bone).toBe('COMMUNICATION');
    expect(result.fishbone.findings[0].contributionLevel).toBe('PRIMARY');
    expect(result.fishbone.findings[1].contributionLevel).toBe('CONTRIBUTING');
    expect(result.fishbone.findings[2].contributionLevel).toBe('CONTRIBUTING');

    expect(result.fiveWhys.eventId).toBe('EVT-RCA-001');
    expect(result.fiveWhys.steps).toHaveLength(5);
    expect(result.fiveWhys.steps[0].level).toBe(1);
    expect(result.fiveWhys.steps[0].isSystemic).toBe(false);
    expect(result.fiveWhys.steps[4].level).toBe(5);
    expect(result.fiveWhys.steps[4].isSystemic).toBe(true);
    expect(result.fiveWhys.rootCause).toBe(whyChain[4]);

    expect(result.correctiveActions).toHaveLength(1);
    expect(result.correctiveActions[0].status).toBe('PROPOSED');
    expect(result.correctiveActions[0].strength).toBeDefined();

    expect(result.rootCauses).toEqual([whyChain[4]]);
    expect(result.completedAt).toBeInstanceOf(Date);
    expect(result.reviewedBy).toBeUndefined();
  });

  it('handles empty why chain gracefully', () => {
    const event = makeSafetyEvent({ eventId: 'EVT-EMPTY' });
    const result = performRCA(event, ['unclear finding'], []);

    expect(result.fiveWhys.steps).toHaveLength(0);
    expect(result.fiveWhys.rootCause).toBe('Unknown');
    expect(result.rootCauses).toEqual(['Unknown']);
  });

  it('assigns MINOR contribution level to findings beyond the third', () => {
    const event = makeSafetyEvent();
    const findings = [
      'handoff failure',
      'device issue',
      'noise distraction',
      'staffing shortage',
    ];

    const result = performRCA(event, findings, ['single cause']);

    expect(result.fishbone.findings[0].contributionLevel).toBe('PRIMARY');
    expect(result.fishbone.findings[1].contributionLevel).toBe('CONTRIBUTING');
    expect(result.fishbone.findings[2].contributionLevel).toBe('CONTRIBUTING');
    expect(result.fishbone.findings[3].contributionLevel).toBe('MINOR');
  });
});
