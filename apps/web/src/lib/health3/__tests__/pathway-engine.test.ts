import {
  resolveNextStep,
  evaluateEntryCriteria,
  checkStepTimeout,
  OptimisticLockError,
} from '../pathways/pathway-engine';
import type { PathwayStepDefinition, StepHistoryEntry } from '../types';
import type { PatientPathwayFacts } from '../pathways/pathway-engine';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeFacts = (overrides: Partial<PatientPathwayFacts> = {}): PatientPathwayFacts => ({
  patientId: 'p-1',
  age: 55,
  diagnoses: ['E11.9'],
  medications: ['metformin'],
  latestLabResults: { 'HbA1c': 7.1 },
  encounterCount: 5,
  lastEncounterDate: '2026-03-01',
  ...overrides,
});

const screeningStep: PathwayStepDefinition = {
  stepId: 'step-screening',
  name: 'Initial Screening',
  description: 'Baseline screening',
  entryCriteria: { '>=': [{ var: 'age' }, 40] },
  timeoutDays: 30,
  branches: [
    {
      condition: { some: [{ var: 'diagnoses' }, { '===': [{ var: '' }, 'E11.9'] }] },
      targetStepId: 'step-treatment',
      label: 'Diabetes confirmed',
    },
    {
      condition: { '===': [{ var: 'encounterCount' }, 0] },
      targetStepId: 'step-reschedule',
      label: 'No encounters yet',
    },
  ],
};

const treatmentStep: PathwayStepDefinition = {
  stepId: 'step-treatment',
  name: 'Treatment Initiation',
  description: 'Start treatment',
  entryCriteria: {
    some: [{ var: 'diagnoses' }, { '===': [{ var: '' }, 'E11.9'] }],
  },
  timeoutDays: 90,
  isTerminal: false,
};

// ---------------------------------------------------------------------------
// resolveNextStep
// ---------------------------------------------------------------------------

describe('resolveNextStep', () => {
  it('returns first matching branch', () => {
    const result = resolveNextStep(screeningStep, makeFacts());
    expect(result).not.toBeNull();
    expect(result!.nextStepId).toBe('step-treatment');
    expect(result!.branchLabel).toBe('Diabetes confirmed');
  });

  it('returns null when no branch matches', () => {
    const facts = makeFacts({ diagnoses: ['I10'], encounterCount: 5 });
    const result = resolveNextStep(screeningStep, facts);
    expect(result).toBeNull();
  });

  it('returns null for step with no branches', () => {
    const result = resolveNextStep(treatmentStep, makeFacts());
    expect(result).toBeNull();
  });

  it('evaluates branches in order (first match wins)', () => {
    const facts = makeFacts({ diagnoses: ['E11.9'], encounterCount: 0 });
    const result = resolveNextStep(screeningStep, facts);
    expect(result!.nextStepId).toBe('step-treatment'); // First branch matches
  });
});

// ---------------------------------------------------------------------------
// evaluateEntryCriteria
// ---------------------------------------------------------------------------

describe('evaluateEntryCriteria', () => {
  it('returns true when criteria are met', () => {
    expect(evaluateEntryCriteria(screeningStep, makeFacts())).toBe(true);
  });

  it('returns false when criteria are not met', () => {
    expect(evaluateEntryCriteria(screeningStep, makeFacts({ age: 30 }))).toBe(false);
  });

  it('evaluates complex criteria (diagnosis check)', () => {
    expect(evaluateEntryCriteria(treatmentStep, makeFacts())).toBe(true);
    expect(evaluateEntryCriteria(treatmentStep, makeFacts({ diagnoses: ['I10'] }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// checkStepTimeout
// ---------------------------------------------------------------------------

describe('checkStepTimeout', () => {
  it('returns false when step is within timeout', () => {
    const history: StepHistoryEntry[] = [
      { stepId: 'step-1', enteredAt: new Date().toISOString(), deviations: [] },
    ];
    expect(checkStepTimeout(history, 'step-1', 30)).toBe(false);
  });

  it('returns true when step has exceeded timeout', () => {
    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    const history: StepHistoryEntry[] = [
      { stepId: 'step-1', enteredAt: thirtyOneDaysAgo.toISOString(), deviations: [] },
    ];
    expect(checkStepTimeout(history, 'step-1', 30)).toBe(true);
  });

  it('returns false when step is already completed', () => {
    const history: StepHistoryEntry[] = [
      {
        stepId: 'step-1',
        enteredAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        completedAt: new Date().toISOString(),
        deviations: [],
      },
    ];
    expect(checkStepTimeout(history, 'step-1', 30)).toBe(false);
  });

  it('returns false when step not found in history', () => {
    const history: StepHistoryEntry[] = [
      { stepId: 'step-other', enteredAt: new Date().toISOString(), deviations: [] },
    ];
    expect(checkStepTimeout(history, 'step-missing', 30)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// OptimisticLockError
// ---------------------------------------------------------------------------

describe('OptimisticLockError', () => {
  it('has correct name and message', () => {
    const error = new OptimisticLockError('inst-1');
    expect(error.name).toBe('OptimisticLockError');
    expect(error.message).toContain('inst-1');
    expect(error.message).toContain('retry');
  });
});
