/**
 * Clinical Scoring Engine — Unit Tests
 *
 * Tests PHQ-9, GAD-7, FINDRISC, SCORE2, Framingham scoring functions.
 * Covers test spec IDs: UNIT-PHQ9-001 through UNIT-FRAMINGHAM-003
 *
 * ELENA invariants enforced:
 *   - Missing answers → INSUFFICIENT_DATA (never imputed)
 *   - Every result has sourceAuthority + citationUrl
 *
 * @see sprint5-assets/test-specs.json — unit test specifications
 * @see sprint5-assets/code-scaffolds/rule-engine-scoring.scaffold.ts — reference implementation
 */

// TODO: holilabsv2 — update import path to actual scoring engine location
import {
  scorePHQ9,
  scoreGAD7,
  scoreFINDRISC,
  scoreSCORE2,
  scoreFramingham,
  InsufficientDataError,
} from '@/lib/prevention/scoring-engine';
// If using the scaffold directly during development:
// import { scorePHQ9, ... } from '../sprint5-assets/code-scaffolds/rule-engine-scoring.scaffold';

import { expectELENACompliant, expectSaMDSafe } from './setup';

// ─── PHQ-9 (Depression) ──────────────────────────────────────────────────────

describe('PHQ-9 Scoring', () => {
  const allZeros: Record<string, number> = {};
  const allThrees: Record<string, number> = {};
  for (let i = 1; i <= 9; i++) {
    allZeros[`phq9_q${i}`] = 0;
    allThrees[`phq9_q${i}`] = 3;
  }

  test('UNIT-PHQ9-001: All zeros → Minimal (score 0)', () => {
    const result = scorePHQ9(allZeros);
    expect(result.score).toBe(0);
    expect(result.severity).toBe('Minimal');
    expect(result.severityColor).toBe('clinical-safe');
    expect(result.insufficientData).toBe(false);
    expectELENACompliant(result);
  });

  test('UNIT-PHQ9-002: All 3s → Severe (score 27)', () => {
    const result = scorePHQ9(allThrees);
    expect(result.score).toBe(27);
    expect(result.severity).toBe('Severe');
    expect(result.severityColor).toBe('clinical-emergency');
    expectELENACompliant(result);
  });

  test('UNIT-PHQ9-003: Missing Q5 → INSUFFICIENT_DATA', () => {
    const partial = { ...allZeros };
    delete partial['phq9_q5'];
    expect(() => scorePHQ9(partial)).toThrow(InsufficientDataError);
    try {
      scorePHQ9(partial);
    } catch (e) {
      expect((e as InsufficientDataError).missingQuestions).toContain('phq9_q5');
    }
  });

  test('UNIT-PHQ9-004: Q9 ≥ 1 triggers suicidal ideation rule MH-002', () => {
    const answers = { ...allZeros, phq9_q9: 1 };
    const result = scorePHQ9(answers);
    expect(result.score).toBe(1); // Minimal overall
    expect(result.triggeredRules).toContain('MH-002');
  });

  test('UNIT-PHQ9-004b: Q9 = 2 also triggers MH-002', () => {
    const answers = { ...allZeros, phq9_q9: 2 };
    const result = scorePHQ9(answers);
    expect(result.triggeredRules).toContain('MH-002');
  });

  test('UNIT-PHQ9-005: Boundary 9→10 (Mild→Moderate)', () => {
    // Score 9 = Mild
    const score9 = { phq9_q1: 1, phq9_q2: 1, phq9_q3: 1, phq9_q4: 1, phq9_q5: 1, phq9_q6: 1, phq9_q7: 1, phq9_q8: 1, phq9_q9: 1 };
    expect(scorePHQ9(score9).severity).toBe('Mild');

    // Score 10 = Moderate
    const score10 = { ...score9, phq9_q1: 2 };
    expect(scorePHQ9(score10).severity).toBe('Moderate');
    expect(scorePHQ9(score10).triggeredRules).toContain('MH-001');
  });

  test('PHQ-9: Score 15 = Moderately Severe', () => {
    const answers: Record<string, number> = {};
    for (let i = 1; i <= 6; i++) answers[`phq9_q${i}`] = 2;
    for (let i = 7; i <= 9; i++) answers[`phq9_q${i}`] = 1;
    const result = scorePHQ9(answers);
    expect(result.score).toBe(15);
    expect(result.severity).toBe('Moderately Severe');
  });

  test('PHQ-9: Negative value → error', () => {
    const bad = { ...allZeros, phq9_q1: -1 };
    expect(() => scorePHQ9(bad)).toThrow();
  });

  test('PHQ-9: Value > 3 → error', () => {
    const bad = { ...allZeros, phq9_q1: 4 };
    expect(() => scorePHQ9(bad)).toThrow();
  });

  test('PHQ-9: interpretation text is SaMD-safe', () => {
    const result = scorePHQ9(allThrees);
    expectSaMDSafe(result.interpretation['en']);
    expectSaMDSafe(result.interpretation['pt-BR']);
  });

  test('PHQ-9: sourceAuthority is Kroenke', () => {
    const result = scorePHQ9(allZeros);
    expect(result.sourceAuthority).toContain('Kroenke');
    expect(result.citationUrl).toContain('pubmed');
  });
});

// ─── GAD-7 (Anxiety) ─────────────────────────────────────────────────────────

describe('GAD-7 Scoring', () => {
  const allZeros: Record<string, number> = {};
  const allThrees: Record<string, number> = {};
  for (let i = 1; i <= 7; i++) {
    allZeros[`gad7_q${i}`] = 0;
    allThrees[`gad7_q${i}`] = 3;
  }

  test('UNIT-GAD7-001: All zeros → Minimal (score 0)', () => {
    const result = scoreGAD7(allZeros);
    expect(result.score).toBe(0);
    expect(result.severity).toBe('Minimal');
    expectELENACompliant(result);
  });

  test('UNIT-GAD7-002: All 3s → Severe (score 21)', () => {
    const result = scoreGAD7(allThrees);
    expect(result.score).toBe(21);
    expect(result.severity).toBe('Severe');
  });

  test('UNIT-GAD7-003: Missing responses → INSUFFICIENT_DATA', () => {
    const partial = { gad7_q1: 1, gad7_q2: 2 }; // Only 2 of 7
    expect(() => scoreGAD7(partial)).toThrow(InsufficientDataError);
  });

  test('GAD-7: Boundary 4→5 (Minimal→Mild)', () => {
    const score4: Record<string, number> = { gad7_q1: 1, gad7_q2: 1, gad7_q3: 1, gad7_q4: 1, gad7_q5: 0, gad7_q6: 0, gad7_q7: 0 };
    expect(scoreGAD7(score4).severity).toBe('Minimal');
    const score5 = { ...score4, gad7_q5: 1 };
    expect(scoreGAD7(score5).severity).toBe('Mild');
  });

  test('GAD-7: Boundary 9→10 (Mild→Moderate)', () => {
    const score9: Record<string, number> = {};
    for (let i = 1; i <= 7; i++) score9[`gad7_q${i}`] = i <= 2 ? 2 : 1;
    expect(scoreGAD7(score9).severity).toBe('Mild');

    const score10 = { ...score9, gad7_q3: 2 };
    const r10 = scoreGAD7(score10);
    expect(r10.severity).toBe('Moderate');
    expect(r10.triggeredRules).toContain('MH-003');
  });

  test('GAD-7: Boundary 14→15 (Moderate→Severe)', () => {
    const score14: Record<string, number> = { gad7_q1: 2, gad7_q2: 2, gad7_q3: 2, gad7_q4: 2, gad7_q5: 2, gad7_q6: 2, gad7_q7: 2 };
    expect(scoreGAD7(score14).severity).toBe('Moderate');
    const score15 = { ...score14, gad7_q1: 3 };
    expect(scoreGAD7(score15).severity).toBe('Severe');
  });
});

// ─── FINDRISC (Diabetes Risk) ────────────────────────────────────────────────

describe('FINDRISC Scoring', () => {
  test('UNIT-FINDRISC-001: All lowest → Low risk (score 0)', () => {
    const answers = {
      findrisc_q1: 0, findrisc_q2: 0, findrisc_q3: 0, findrisc_q4: 0,
      findrisc_q5: 0, findrisc_q6: 0, findrisc_q7: 0, findrisc_q8: 0,
    };
    const result = scoreFINDRISC(answers);
    expect(result.score).toBe(0);
    expect(result.severity).toBe('Low');
    expect(result.severityColor).toBe('clinical-safe');
    expectELENACompliant(result);
  });

  test('UNIT-FINDRISC-002: Max score → Very high risk (score 26)', () => {
    const answers = {
      findrisc_q1: 4, findrisc_q2: 3, findrisc_q3: 4, findrisc_q4: 2,
      findrisc_q5: 1, findrisc_q6: 2, findrisc_q7: 5, findrisc_q8: 5,
    };
    const result = scoreFINDRISC(answers);
    expect(result.score).toBe(26);
    expect(result.severity).toBe('Very high');
    expect(result.severityColor).toBe('clinical-emergency');
  });

  test('UNIT-FINDRISC-003: Score 15 triggers DM-001', () => {
    // Build a combination that totals exactly 15
    const answers = {
      findrisc_q1: 3, findrisc_q2: 1, findrisc_q3: 3, findrisc_q4: 2,
      findrisc_q5: 0, findrisc_q6: 0, findrisc_q7: 0, findrisc_q8: 5,
    };
    // 3+1+3+2+0+0+0+5 = 14 — adjust to get 15
    answers.findrisc_q5 = 1; // Now 15
    const result = scoreFINDRISC(answers);
    expect(result.score).toBe(15);
    expect(result.triggeredRules).toContain('DM-001');
  });

  test('FINDRISC: Missing question → INSUFFICIENT_DATA', () => {
    const partial = { findrisc_q1: 0, findrisc_q2: 0 }; // Missing 6 questions
    expect(() => scoreFINDRISC(partial)).toThrow(InsufficientDataError);
  });

  test('FINDRISC: Weighted scoring (q7 high glucose = 5 points)', () => {
    const base = {
      findrisc_q1: 0, findrisc_q2: 0, findrisc_q3: 0, findrisc_q4: 0,
      findrisc_q5: 0, findrisc_q6: 0, findrisc_q7: 0, findrisc_q8: 0,
    };
    // Just q7 = 5 should give score of 5
    const withQ7 = { ...base, findrisc_q7: 5 };
    expect(scoreFINDRISC(withQ7).score).toBe(5);
  });
});

// ─── SCORE2 (Cardiovascular Risk) ────────────────────────────────────────────

describe('SCORE2 Scoring', () => {
  test('UNIT-SCORE2-001: Low-risk region, young, favorable → Low', () => {
    const result = scoreSCORE2({
      age: 42, sex: 'female', smoking: false,
      systolicBP: 120, totalCholesterol: 5.0, hdlCholesterol: 1.5,
      region: 'low',
    });
    expect(result.score).toBeLessThan(2.5);
    expect(result.severity).toBe('Low');
    expectELENACompliant(result);
  });

  test('UNIT-SCORE2-002: High risk triggers CVD-001', () => {
    const result = scoreSCORE2({
      age: 60, sex: 'male', smoking: true,
      systolicBP: 170, totalCholesterol: 7.0, hdlCholesterol: 0.9,
      region: 'low',
    });
    expect(result.score).toBeGreaterThanOrEqual(7.5);
    expect(result.triggeredRules).toContain('CVD-001');
  });

  test('SCORE2: Age out of range (35) → error', () => {
    expect(() =>
      scoreSCORE2({ age: 35, sex: 'male', smoking: false, systolicBP: 120, totalCholesterol: 5, hdlCholesterol: 1.5, region: 'low' })
    ).toThrow('validated for ages 40-69');
  });

  test('SCORE2: Region adjustment — high risk > low risk for same inputs', () => {
    const inputs = { age: 55, sex: 'male' as const, smoking: true, systolicBP: 150, totalCholesterol: 6, hdlCholesterol: 1.0 };
    const low = scoreSCORE2({ ...inputs, region: 'low' });
    const high = scoreSCORE2({ ...inputs, region: 'high' });
    expect(high.score).toBeGreaterThan(low.score);
  });
});

// ─── Framingham (Cardiovascular Risk) ────────────────────────────────────────

describe('Framingham Scoring', () => {
  test('UNIT-FRAMINGHAM-001: Male, low risk profile', () => {
    const result = scoreFramingham({
      age: 45, sex: 'male', totalCholesterol: 200, hdlCholesterol: 50,
      systolicBP: 120, bpTreated: false, smoking: false, diabetes: false,
    });
    expect(result.score).toBeLessThan(10);
    expectELENACompliant(result);
  });

  test('UNIT-FRAMINGHAM-002: Female, high risk', () => {
    const result = scoreFramingham({
      age: 65, sex: 'female', totalCholesterol: 280, hdlCholesterol: 35,
      systolicBP: 160, bpTreated: true, smoking: true, diabetes: true,
    });
    expect(result.score).toBeGreaterThan(20);
    expect(result.triggeredRules).toContain('CVD-001');
  });

  test('UNIT-FRAMINGHAM-003: Age 29 → error (below valid range)', () => {
    expect(() =>
      scoreFramingham({ age: 29, sex: 'male', totalCholesterol: 200, hdlCholesterol: 50, systolicBP: 120, bpTreated: false, smoking: false, diabetes: false })
    ).toThrow('validated for ages 30-79');
  });

  test('Framingham: Male vs female different coefficients', () => {
    const shared = { age: 55, totalCholesterol: 240, hdlCholesterol: 40, systolicBP: 140, bpTreated: false, smoking: false, diabetes: false };
    const male = scoreFramingham({ ...shared, sex: 'male' });
    const female = scoreFramingham({ ...shared, sex: 'female' });
    // Male typically has higher risk at same inputs
    expect(male.score).not.toBe(female.score);
  });

  test('Framingham: BP treated vs untreated uses different coefficients', () => {
    const base = { age: 55, sex: 'male' as const, totalCholesterol: 240, hdlCholesterol: 40, systolicBP: 150, smoking: false, diabetes: false };
    const untreated = scoreFramingham({ ...base, bpTreated: false });
    const treated = scoreFramingham({ ...base, bpTreated: true });
    // Treated BP at same level implies worse control → slightly higher risk
    expect(treated.score).toBeGreaterThan(untreated.score);
  });
});

// ─── Cross-cutting ELENA invariants ──────────────────────────────────────────

describe('ELENA Invariants — All Instruments', () => {
  test('Every scoring function returns sourceAuthority', () => {
    const phq = scorePHQ9({ phq9_q1: 0, phq9_q2: 0, phq9_q3: 0, phq9_q4: 0, phq9_q5: 0, phq9_q6: 0, phq9_q7: 0, phq9_q8: 0, phq9_q9: 0 });
    const gad = scoreGAD7({ gad7_q1: 0, gad7_q2: 0, gad7_q3: 0, gad7_q4: 0, gad7_q5: 0, gad7_q6: 0, gad7_q7: 0 });
    const frs = scoreFINDRISC({ findrisc_q1: 0, findrisc_q2: 0, findrisc_q3: 0, findrisc_q4: 0, findrisc_q5: 0, findrisc_q6: 0, findrisc_q7: 0, findrisc_q8: 0 });

    [phq, gad, frs].forEach(r => {
      expect(r.sourceAuthority).toBeTruthy();
      expect(r.citationUrl).toMatch(/^https?:\/\//);
      expect(r.evidenceGrade).toMatch(/^[ABC]$/);
    });
  });

  test('All interpretation texts are trilingual', () => {
    const result = scorePHQ9({ phq9_q1: 2, phq9_q2: 2, phq9_q3: 2, phq9_q4: 2, phq9_q5: 2, phq9_q6: 2, phq9_q7: 2, phq9_q8: 2, phq9_q9: 2 });
    expect(result.interpretation['en']).toBeTruthy();
    expect(result.interpretation['pt-BR']).toBeTruthy();
    expect(result.interpretation['es']).toBeTruthy();
  });

  test('No scoring function imputes missing as zero', () => {
    // PHQ-9 with undefined
    const partial: Record<string, number> = { phq9_q1: 0 };
    expect(() => scorePHQ9(partial)).toThrow(InsufficientDataError);
    // GAD-7 with undefined
    expect(() => scoreGAD7({ gad7_q1: 0 })).toThrow(InsufficientDataError);
    // FINDRISC with undefined
    expect(() => scoreFINDRISC({ findrisc_q1: 0 })).toThrow(InsufficientDataError);
  });
});
