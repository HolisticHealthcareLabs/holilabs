import {
  evaluateMeasureForPatient,
  evaluateMeasureForPopulation,
  identifyGaps,
} from '../quality-engine.service';
import type { PatientFacts } from '../quality-engine.service';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makePatient(overrides: Partial<PatientFacts> = {}): PatientFacts {
  return {
    patientId: 'p-1',
    age: 55,
    sex: 'M',
    diagnoses: ['E11.9'], // T2D
    medications: ['metformin'],
    labResults: [
      { code: '4548-4', value: 7.1, unit: '%', date: '2026-01-15' }, // HbA1c
    ],
    encounters: [
      { type: 'PRIMARY_CARE', date: '2026-01-01' },
    ],
    vitals: [
      { type: 'systolic_bp', value: 135, unit: 'mmHg', date: '2026-01-01' },
    ],
    ...overrides,
  };
}

// HbA1c < 8% for T2D patients
const numeratorRule = {
  and: [
    { some: [{ var: 'labResults' }, { and: [{ '===': [{ var: 'code' }, '4548-4'] }, { '<': [{ var: 'value' }, 8] }] }] },
  ],
};

// All patients with T2D diagnosis
const denominatorRule = {
  some: [{ var: 'diagnoses' }, { '===': [{ var: '' }, 'E11.9'] }],
};

// Exclude patients under 18
const exclusionRule = {
  '<': [{ var: 'age' }, 18],
};

// ---------------------------------------------------------------------------
// evaluateMeasureForPatient
// ---------------------------------------------------------------------------

describe('evaluateMeasureForPatient', () => {
  it('returns inNumerator=true when patient meets all criteria', () => {
    const result = evaluateMeasureForPatient(
      numeratorRule,
      denominatorRule,
      null,
      makePatient(),
    );
    expect(result.inDenominator).toBe(true);
    expect(result.inNumerator).toBe(true);
    expect(result.excluded).toBe(false);
  });

  it('returns inNumerator=false when patient fails numerator', () => {
    const patient = makePatient({
      labResults: [{ code: '4548-4', value: 9.5, unit: '%', date: '2026-01-15' }],
    });
    const result = evaluateMeasureForPatient(
      numeratorRule,
      denominatorRule,
      null,
      patient,
    );
    expect(result.inDenominator).toBe(true);
    expect(result.inNumerator).toBe(false);
  });

  it('returns inDenominator=false when patient not in denominator', () => {
    const patient = makePatient({ diagnoses: ['I10'] }); // Hypertension, not T2D
    const result = evaluateMeasureForPatient(
      numeratorRule,
      denominatorRule,
      null,
      patient,
    );
    expect(result.inDenominator).toBe(false);
    expect(result.inNumerator).toBe(false);
  });

  it('returns excluded=true for patients matching exclusion rule', () => {
    const patient = makePatient({ age: 16, diagnoses: ['E11.9'] });
    const result = evaluateMeasureForPatient(
      numeratorRule,
      denominatorRule,
      exclusionRule,
      patient,
    );
    expect(result.excluded).toBe(true);
    expect(result.inDenominator).toBe(false);
  });

  it('handles null exclusion rule', () => {
    const result = evaluateMeasureForPatient(
      numeratorRule,
      denominatorRule,
      null,
      makePatient(),
    );
    expect(result.excluded).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// identifyGaps
// ---------------------------------------------------------------------------

describe('identifyGaps', () => {
  it('returns empty array when patient meets all criteria', () => {
    const gaps = identifyGaps(numeratorRule, makePatient());
    expect(gaps).toEqual([]);
  });

  it('returns gap descriptions when patient fails criteria', () => {
    const patient = makePatient({
      labResults: [{ code: '4548-4', value: 9.5, unit: '%', date: '2026-01-15' }],
    });
    const gaps = identifyGaps(numeratorRule, patient);
    expect(gaps.length).toBeGreaterThan(0);
    expect(gaps[0]).toBeTruthy();
  });

  it('handles non-and rules', () => {
    const simpleRule = { '>': [{ var: 'age' }, 100] };
    const gaps = identifyGaps(simpleRule, makePatient());
    expect(gaps.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// evaluateMeasureForPopulation
// ---------------------------------------------------------------------------

describe('evaluateMeasureForPopulation', () => {
  it('aggregates correctly across population', () => {
    const population: PatientFacts[] = [
      makePatient({ patientId: 'p-1' }),  // T2D, HbA1c 7.1 → in numerator
      makePatient({
        patientId: 'p-2',
        labResults: [{ code: '4548-4', value: 9.5, unit: '%', date: '2026-01-15' }],
      }), // T2D, HbA1c 9.5 → in denominator, NOT in numerator
      makePatient({ patientId: 'p-3', diagnoses: ['I10'] }), // Not T2D → not in denominator
    ];

    const result = evaluateMeasureForPopulation(
      numeratorRule,
      denominatorRule,
      null,
      0.8,
      population,
    );

    expect(result.denominator).toBe(2);
    expect(result.numerator).toBe(1);
    expect(result.rate).toBe(0.5);
    expect(result.meetsTarget).toBe(false); // 0.5 < 0.8
    expect(result.gapPatientIds).toEqual(['p-2']);
    expect(result.exclusions).toBe(0);
  });

  it('handles exclusions in population count', () => {
    const population: PatientFacts[] = [
      makePatient({ patientId: 'p-1' }),
      makePatient({ patientId: 'p-2', age: 16, diagnoses: ['E11.9'] }),
    ];

    const result = evaluateMeasureForPopulation(
      numeratorRule,
      denominatorRule,
      exclusionRule,
      null,
      population,
    );

    expect(result.exclusions).toBe(1);
    expect(result.denominator).toBe(1);
    expect(result.numerator).toBe(1);
    expect(result.meetsTarget).toBe(true); // null target → always meets
  });

  it('returns rate 0 for empty denominator', () => {
    const population: PatientFacts[] = [
      makePatient({ patientId: 'p-1', diagnoses: ['I10'] }),
    ];

    const result = evaluateMeasureForPopulation(
      numeratorRule,
      denominatorRule,
      null,
      0.8,
      population,
    );

    expect(result.denominator).toBe(0);
    expect(result.rate).toBe(0);
  });

  it('returns per-patient results', () => {
    const population: PatientFacts[] = [
      makePatient({ patientId: 'p-1' }),
      makePatient({ patientId: 'p-2', diagnoses: ['I10'] }),
    ];

    const result = evaluateMeasureForPopulation(
      numeratorRule,
      denominatorRule,
      null,
      null,
      population,
    );

    expect(result.perPatient).toHaveLength(2);
    expect(result.perPatient[0].patientId).toBe('p-1');
    expect(result.perPatient[0].inNumerator).toBe(true);
    expect(result.perPatient[1].patientId).toBe('p-2');
    expect(result.perPatient[1].inDenominator).toBe(false);
  });

  it('meets target when rate >= targetRate', () => {
    const population: PatientFacts[] = [
      makePatient({ patientId: 'p-1' }),
    ];

    const result = evaluateMeasureForPopulation(
      numeratorRule,
      denominatorRule,
      null,
      0.8,
      population,
    );

    expect(result.rate).toBe(1);
    expect(result.meetsTarget).toBe(true);
  });
});
