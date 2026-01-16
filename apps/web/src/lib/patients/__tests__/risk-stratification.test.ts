import { describe, it, expect } from '@jest/globals';
import { deriveSeedRiskScores } from '@/lib/patients/risk-stratification';
import { RiskScoreType } from '@prisma/client';

describe('deriveSeedRiskScores', () => {
  it('produces High ASCVD risk when HTN + T2D + smoker in middle age', () => {
    const scores = deriveSeedRiskScores({
      ageYears: 55,
      sexAtBirth: 'M',
      hasHypertension: true,
      hasType2Diabetes: true,
      tobaccoUse: true,
      bmi: 32,
      systolicBP: 155,
      diastolicBP: 98,
    });

    const ascvd = scores.find(s => s.riskType === RiskScoreType.ASCVD);
    expect(ascvd).toBeDefined();
    expect(ascvd?.category).toBe('High');
    expect(typeof ascvd?.score).toBe('number');
    expect(ascvd?.score).toBeGreaterThanOrEqual(0);
    expect(ascvd?.score).toBeLessThanOrEqual(1);
  });

  it('produces Very High diabetes risk when diabetes is present', () => {
    const scores = deriveSeedRiskScores({
      ageYears: 45,
      sexAtBirth: 'F',
      hasHypertension: false,
      hasType2Diabetes: true,
      tobaccoUse: false,
    });

    const diabetes = scores.find(s => s.riskType === RiskScoreType.DIABETES);
    expect(diabetes).toBeDefined();
    expect(diabetes?.category).toBe('Very High');
  });

  it('is stable and deterministic for the same input', () => {
    const input = {
      ageYears: 38,
      sexAtBirth: 'U' as const,
      hasHypertension: false,
      hasType2Diabetes: false,
      tobaccoUse: false,
      bmi: 24.2,
      systolicBP: 118,
      diastolicBP: 76,
    };

    const a = deriveSeedRiskScores(input);
    const b = deriveSeedRiskScores(input);
    expect(a).toEqual(b);
  });
});


