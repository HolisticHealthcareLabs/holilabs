import {
  calculateASCVD,
  calculateLACE,
  calculateFINDRISC,
  calculateCompositeRisk,
} from '../risk-stratification.service';
import type {
  ASCVDInput,
  LACEInput,
  FINDRISCInput,
  CompositeRiskInput,
} from '../risk-stratification.service';

// ---------------------------------------------------------------------------
// ASCVD
// ---------------------------------------------------------------------------

describe('calculateASCVD', () => {
  const baseInput: ASCVDInput = {
    age: 55,
    sex: 'M',
    totalCholesterol: 220,
    hdlCholesterol: 50,
    systolicBP: 140,
    onBPTreatment: false,
    smoker: false,
    diabetic: false,
  };

  it('returns a risk between 0 and 1', () => {
    const result = calculateASCVD(baseInput);
    expect(result.tenYearRisk).toBeGreaterThanOrEqual(0);
    expect(result.tenYearRisk).toBeLessThanOrEqual(1);
  });

  it('returns LOW for age < 40', () => {
    const result = calculateASCVD({ ...baseInput, age: 35 });
    expect(result.riskCategory).toBe('LOW');
    expect(result.tenYearRisk).toBe(0);
  });

  it('returns LOW for age > 79', () => {
    const result = calculateASCVD({ ...baseInput, age: 85 });
    expect(result.riskCategory).toBe('LOW');
  });

  it('increases risk with smoking', () => {
    const nonSmoker = calculateASCVD(baseInput);
    const smoker = calculateASCVD({ ...baseInput, smoker: true });
    expect(smoker.tenYearRisk).toBeGreaterThan(nonSmoker.tenYearRisk);
  });

  it('increases risk with diabetes', () => {
    const nonDiabetic = calculateASCVD(baseInput);
    const diabetic = calculateASCVD({ ...baseInput, diabetic: true });
    expect(diabetic.tenYearRisk).toBeGreaterThan(nonDiabetic.tenYearRisk);
  });

  it('calculates for female patients', () => {
    const result = calculateASCVD({ ...baseInput, sex: 'F' });
    expect(result.tenYearRisk).toBeGreaterThanOrEqual(0);
    expect(result.tenYearRisk).toBeLessThanOrEqual(1);
  });

  it('includes provenance metadata', () => {
    const result = calculateASCVD(baseInput);
    expect(result.sourceAuthority).toContain('AHA/ACC');
    expect(result.citationUrl).toContain('doi.org');
  });
});

// ---------------------------------------------------------------------------
// LACE
// ---------------------------------------------------------------------------

describe('calculateLACE', () => {
  const baseInput: LACEInput = {
    lengthOfStayDays: 3,
    acuityOfAdmission: true,
    comorbidityScore: 2,
    edVisitsLast6Months: 1,
  };

  it('returns score between 0 and 19', () => {
    const result = calculateLACE(baseInput);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(19);
  });

  it('returns LOW for short stay, no acuity, no comorbidity', () => {
    const result = calculateLACE({
      lengthOfStayDays: 0,
      acuityOfAdmission: false,
      comorbidityScore: 0,
      edVisitsLast6Months: 0,
    });
    expect(result.riskCategory).toBe('LOW');
    expect(result.score).toBe(0);
  });

  it('returns HIGH for severe case', () => {
    const result = calculateLACE({
      lengthOfStayDays: 14,
      acuityOfAdmission: true,
      comorbidityScore: 4,
      edVisitsLast6Months: 4,
    });
    expect(result.riskCategory).toBe('HIGH');
  });

  it('includes readmission probability', () => {
    const result = calculateLACE(baseInput);
    expect(result.thirtyDayReadmissionProbability).toBeGreaterThan(0);
    expect(result.thirtyDayReadmissionProbability).toBeLessThan(1);
  });

  it('includes provenance', () => {
    const result = calculateLACE(baseInput);
    expect(result.sourceAuthority).toContain('van Walraven');
  });
});

// ---------------------------------------------------------------------------
// FINDRISC
// ---------------------------------------------------------------------------

describe('calculateFINDRISC', () => {
  const lowRiskInput: FINDRISCInput = {
    age: 35,
    bmi: 23,
    waistCircumferenceCm: 85,
    physicalActivityDaily: true,
    dailyVegetableConsumption: true,
    historyOfHighGlucose: false,
    onAntihypertensives: false,
    familyHistoryDiabetes: 'NONE',
  };

  it('returns LOW for young healthy patient', () => {
    const result = calculateFINDRISC(lowRiskInput);
    expect(result.riskCategory).toBe('LOW');
    expect(result.score).toBeLessThan(7);
    expect(result.tenYearRiskPercent).toBe(1);
  });

  it('returns VERY_HIGH for maximum risk factors', () => {
    const result = calculateFINDRISC({
      age: 70,
      bmi: 35,
      waistCircumferenceCm: 110,
      physicalActivityDaily: false,
      dailyVegetableConsumption: false,
      historyOfHighGlucose: true,
      onAntihypertensives: true,
      familyHistoryDiabetes: 'FIRST_DEGREE',
    });
    expect(result.riskCategory).toBe('VERY_HIGH');
    expect(result.tenYearRiskPercent).toBe(50);
  });

  it('adds points for family history', () => {
    const noHistory = calculateFINDRISC(lowRiskInput);
    const secondDegree = calculateFINDRISC({ ...lowRiskInput, familyHistoryDiabetes: 'SECOND_DEGREE' });
    const firstDegree = calculateFINDRISC({ ...lowRiskInput, familyHistoryDiabetes: 'FIRST_DEGREE' });

    expect(secondDegree.score).toBeGreaterThan(noHistory.score);
    expect(firstDegree.score).toBeGreaterThan(secondDegree.score);
  });

  it('includes provenance', () => {
    const result = calculateFINDRISC(lowRiskInput);
    expect(result.sourceAuthority).toContain('Lindström');
  });
});

// ---------------------------------------------------------------------------
// Composite VBC Risk
// ---------------------------------------------------------------------------

describe('calculateCompositeRisk', () => {
  it('returns LOW for minimal risk factors', () => {
    const input: CompositeRiskInput = {
      activeConditionCount: 1,
      medicationCount: 2,
      age: 40,
    };
    const result = calculateCompositeRisk(input);
    expect(result.tier).toBe('LOW');
    expect(result.score).toBeLessThan(20);
  });

  it('returns VERY_HIGH for maximum risk factors', () => {
    const input: CompositeRiskInput = {
      ascvd: {
        tenYearRisk: 0.35,
        riskCategory: 'HIGH',
        sourceAuthority: 'test',
        citationUrl: 'test',
      },
      lace: {
        score: 18,
        riskCategory: 'HIGH',
        thirtyDayReadmissionProbability: 0.30,
        sourceAuthority: 'test',
      },
      findrisc: {
        score: 24,
        riskCategory: 'VERY_HIGH',
        tenYearRiskPercent: 50,
        sourceAuthority: 'test',
      },
      activeConditionCount: 8,
      medicationCount: 12,
      age: 80,
      socialDeterminants: {
        housingInstability: true,
        foodInsecurity: true,
        transportationBarrier: true,
      },
    };
    const result = calculateCompositeRisk(input);
    expect(result.tier).toBe('VERY_HIGH');
    expect(result.score).toBeGreaterThanOrEqual(65);
  });

  it('includes component breakdown', () => {
    const input: CompositeRiskInput = {
      ascvd: {
        tenYearRisk: 0.10,
        riskCategory: 'INTERMEDIATE',
        sourceAuthority: 'test',
        citationUrl: 'test',
      },
      activeConditionCount: 3,
      medicationCount: 5,
      age: 60,
    };
    const result = calculateCompositeRisk(input);
    expect(result.components).toHaveProperty('ascvd');
    expect(result.components).toHaveProperty('comorbidity');
    expect(result.components).toHaveProperty('polypharmacy');
    expect(result.components).toHaveProperty('age');
  });

  it('adds social determinants when present', () => {
    const withoutSdoh: CompositeRiskInput = {
      activeConditionCount: 3,
      medicationCount: 5,
      age: 60,
    };
    const withSdoh: CompositeRiskInput = {
      ...withoutSdoh,
      socialDeterminants: {
        housingInstability: true,
        foodInsecurity: false,
        transportationBarrier: true,
      },
    };
    const r1 = calculateCompositeRisk(withoutSdoh);
    const r2 = calculateCompositeRisk(withSdoh);
    expect(r2.score).toBeGreaterThan(r1.score);
  });

  it('caps score at 100', () => {
    const input: CompositeRiskInput = {
      ascvd: {
        tenYearRisk: 1.0,
        riskCategory: 'HIGH',
        sourceAuthority: 'test',
        citationUrl: 'test',
      },
      lace: {
        score: 19,
        riskCategory: 'HIGH',
        thirtyDayReadmissionProbability: 0.35,
        sourceAuthority: 'test',
      },
      findrisc: {
        score: 26,
        riskCategory: 'VERY_HIGH',
        tenYearRiskPercent: 50,
        sourceAuthority: 'test',
      },
      activeConditionCount: 15,
      medicationCount: 20,
      age: 90,
      socialDeterminants: {
        housingInstability: true,
        foodInsecurity: true,
        transportationBarrier: true,
      },
    };
    const result = calculateCompositeRisk(input);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
