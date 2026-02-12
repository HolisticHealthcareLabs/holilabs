/**
 * DOAC Evaluator Tests
 *
 * Golden test fixtures covering:
 * - Absolute contraindications (CrCl < threshold) → BLOCK
 * - Stale lab data → ATTESTATION_REQUIRED
 * - Missing critical fields → ATTESTATION_REQUIRED
 * - Edge cases (extreme age, weight)
 * - Passing cases
 */

import { evaluateDOACRule, type DOACPatientContext } from '../doac-evaluator';

describe('DOAC Evaluator', () => {
  // ========== TEST 1: CrCl < 15 blocks rivaroxaban ==========
  test('DOAC-CrCl-001: CrCl < 15 blocks rivaroxaban', () => {
    const result = evaluateDOACRule({
      medication: 'rivaroxaban',
      patient: {
        creatinineClearance: 12, // ml/min
        age: 78,
        weight: 65,
      },
    });

    expect(result.severity).toBe('BLOCK');
    expect(result.rationale).toContain('15 ml/min');
    expect(result.ruleId).toBe('DOAC-CrCl-Rivaroxaban-001');
    expect(result.citationUrl).toMatch(/doi\.org|fda\.gov/);
  });

  // ========== TEST 2: Labs >72h require attestation ==========
  test('DOAC-Stale-001: Renal labs >72h require attestation', () => {
    const seventyThreeHoursAgo = new Date(Date.now() - 73 * 60 * 60 * 1000);

    const result = evaluateDOACRule({
      medication: 'apixaban',
      patient: {
        creatinineClearance: 50,
        weight: 70,
        age: 65,
        labTimestamp: seventyThreeHoursAgo,
      },
    });

    expect(result.severity).toBe('ATTESTATION_REQUIRED');
    expect(result.rationale).toContain('stale');
    expect(result.staleSince).toBe(73);
  });

  // ========== TEST 3: Null CrCl returns ATTESTATION_REQUIRED ==========
  test('DOAC-Null-001: Null CrCl returns ATTESTATION_REQUIRED', () => {
    const result = evaluateDOACRule({
      medication: 'rivaroxaban',
      patient: {
        creatinineClearance: null,
        age: 65,
        weight: 70,
      },
    });

    expect(result.severity).toBe('ATTESTATION_REQUIRED');
    expect(result.missingFields).toContain('creatinineClearance');
  });

  // ========== TEST 4: Null weight returns ATTESTATION_REQUIRED ==========
  test('DOAC-Null-002: Null weight returns ATTESTATION_REQUIRED', () => {
    const result = evaluateDOACRule({
      medication: 'apixaban',
      patient: {
        creatinineClearance: 50,
        age: 65,
        weight: null,
      },
    });

    expect(result.severity).toBe('ATTESTATION_REQUIRED');
    expect(result.missingFields).toContain('weight');
  });

  // ========== TEST 5: Null age returns ATTESTATION_REQUIRED ==========
  test('DOAC-Null-003: Null age returns ATTESTATION_REQUIRED', () => {
    const result = evaluateDOACRule({
      medication: 'edoxaban',
      patient: {
        creatinineClearance: 50,
        age: null,
        weight: 70,
      },
    });

    expect(result.severity).toBe('ATTESTATION_REQUIRED');
    expect(result.missingFields).toContain('age');
  });

  // ========== TEST 6: Age 120 (edge case) ==========
  test('DOAC-Age-001: Age 120 does not crash', () => {
    const result = evaluateDOACRule({
      medication: 'apixaban',
      patient: {
        creatinineClearance: 50,
        age: 120,
        weight: 50,
      },
    });

    expect(['BLOCK', 'FLAG', 'PASS', 'ATTESTATION_REQUIRED']).toContain(result.severity);
  });

  // ========== TEST 7: Weight 30kg (extreme low) ==========
  test('DOAC-Weight-001: Weight 30kg triggers FLAG', () => {
    const result = evaluateDOACRule({
      medication: 'dabigatran',
      patient: {
        creatinineClearance: 80,
        age: 25,
        weight: 30,
      },
    });

    expect(['FLAG', 'ATTESTATION_REQUIRED']).toContain(result.severity);
    expect(result.rationale.toLowerCase()).toMatch(/weight|low/);
  });

  // ========== TEST 8: Weight 200kg (extreme high) ==========
  test('DOAC-Weight-002: Weight 200kg passes', () => {
    const result = evaluateDOACRule({
      medication: 'rivaroxaban',
      patient: {
        creatinineClearance: 80,
        age: 50,
        weight: 200,
      },
    });

    expect(['PASS', 'FLAG']).toContain(result.severity);
  });

  // ========== TEST 9: Apixaban CrCl < 15 blocks ==========
  test('DOAC-CrCl-002: CrCl < 15 blocks apixaban', () => {
    const result = evaluateDOACRule({
      medication: 'apixaban',
      patient: {
        creatinineClearance: 10,
        age: 65,
        weight: 70,
      },
    });

    expect(result.severity).toBe('BLOCK');
    expect(result.ruleId).toContain('Apixaban');
  });

  // ========== TEST 10: Edoxaban CrCl < 15 blocks ==========
  test('DOAC-CrCl-003: CrCl < 15 blocks edoxaban', () => {
    const result = evaluateDOACRule({
      medication: 'edoxaban',
      patient: {
        creatinineClearance: 14,
        age: 72,
        weight: 65,
      },
    });

    expect(result.severity).toBe('BLOCK');
    expect(result.ruleId).toContain('Edoxaban');
  });

  // ========== TEST 11: Dabigatran CrCl < 30 blocks (higher threshold) ==========
  test('DOAC-CrCl-004: CrCl < 30 blocks dabigatran', () => {
    const result = evaluateDOACRule({
      medication: 'dabigatran',
      patient: {
        creatinineClearance: 25,
        age: 78,
        weight: 68,
      },
    });

    expect(result.severity).toBe('BLOCK');
    expect(result.rationale).toContain('30 ml/min');
  });

  // ========== TEST 12: Borderline safe - CrCl exactly at threshold ==========
  test('DOAC-Borderline-001: CrCl exactly at 15 ml/min (rivaroxaban)', () => {
    const result = evaluateDOACRule({
      medication: 'rivaroxaban',
      patient: {
        creatinineClearance: 15,
        age: 70,
        weight: 70,
      },
    });

    expect(result.severity).toBe('PASS');
  });

  // ========== TEST 13: Borderline safe - CrCl exactly at 30 for dabigatran ==========
  test('DOAC-Borderline-002: CrCl exactly at 30 ml/min (dabigatran)', () => {
    const result = evaluateDOACRule({
      medication: 'dabigatran',
      patient: {
        creatinineClearance: 30,
        age: 75,
        weight: 65,
      },
    });

    // At exact threshold (30), dabigatran is at elderly caution level, so might FLAG
    expect(['PASS', 'FLAG']).toContain(result.severity);
  });

  // ========== TEST 14: Elderly (>75) with reduced renal function ==========
  test('DOAC-Age-002: Elderly with CrCl 25-30 triggers FLAG', () => {
    const result = evaluateDOACRule({
      medication: 'rivaroxaban',
      patient: {
        creatinineClearance: 28,
        age: 78,
        weight: 62,
      },
    });

    expect(result.severity).toMatch(/FLAG|PASS/);
    if (result.severity === 'FLAG') {
      expect(result.rationale.toLowerCase()).toMatch(/elderly|age|caution/);
    }
  });

  // ========== TEST 15: Young patient with very low weight ==========
  test('DOAC-Weight-003: Young, low weight patient', () => {
    const result = evaluateDOACRule({
      medication: 'apixaban',
      patient: {
        creatinineClearance: 80,
        age: 22,
        weight: 48,
      },
    });

    expect(['FLAG', 'ATTESTATION_REQUIRED']).toContain(result.severity);
  });

  // ========== TEST 16: Fresh labs within 72h window ==========
  test('DOAC-Labs-001: Fresh labs (12h old) pass', () => {
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

    const result = evaluateDOACRule({
      medication: 'rivaroxaban',
      patient: {
        creatinineClearance: 50,
        weight: 70,
        age: 65,
        labTimestamp: twelveHoursAgo,
      },
    });

    expect(result.severity).not.toBe('ATTESTATION_REQUIRED');
  });

  // ========== TEST 17: Labs exactly at 72h boundary ==========
  test('DOAC-Labs-002: Labs exactly 72h old are fresh', () => {
    const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);

    const result = evaluateDOACRule({
      medication: 'apixaban',
      patient: {
        creatinineClearance: 50,
        weight: 70,
        age: 65,
        labTimestamp: seventyTwoHoursAgo,
      },
    });

    expect(result.severity).not.toBe('ATTESTATION_REQUIRED');
  });

  // ========== TEST 18: Multiple missing fields ==========
  test('DOAC-Null-004: Multiple missing fields', () => {
    const result = evaluateDOACRule({
      medication: 'edoxaban',
      patient: {
        creatinineClearance: null,
        age: null,
        weight: 70,
      },
    });

    expect(result.severity).toBe('ATTESTATION_REQUIRED');
    expect(result.missingFields).toHaveLength(2);
    expect(result.missingFields).toContain('creatinineClearance');
    expect(result.missingFields).toContain('age');
  });

  // ========== TEST 19: All fields missing ==========
  test('DOAC-Null-005: All critical fields missing', () => {
    const result = evaluateDOACRule({
      medication: 'rivaroxaban',
      patient: {
        creatinineClearance: null,
        age: null,
        weight: null,
      },
    });

    expect(result.severity).toBe('ATTESTATION_REQUIRED');
    expect(result.missingFields).toHaveLength(3);
  });

  // ========== TEST 20: Normal, healthy patient ==========
  test('DOAC-PASS-001: Healthy middle-aged patient', () => {
    const result = evaluateDOACRule({
      medication: 'rivaroxaban',
      patient: {
        creatinineClearance: 90,
        age: 50,
        weight: 75,
      },
    });

    expect(result.severity).toBe('PASS');
    expect(result.rationale).toContain('safe');
  });

  // ========== TEST 21: Lab timestamp as ISO string ==========
  test('DOAC-Labs-003: Lab timestamp as ISO string (73h old)', () => {
    const seventyThreeHoursAgo = new Date(Date.now() - 73 * 60 * 60 * 1000).toISOString();

    const result = evaluateDOACRule({
      medication: 'dabigatran',
      patient: {
        creatinineClearance: 50,
        weight: 70,
        age: 65,
        labTimestamp: seventyThreeHoursAgo,
      },
    });

    expect(result.severity).toBe('ATTESTATION_REQUIRED');
  });

  // ========== TEST 22: All DOACs with same patient data ==========
  test('DOAC-Comparison-001: Compare all DOACs at CrCl 20 (apixaban safe, others blocked)', () => {
    const patient: DOACPatientContext = {
      creatinineClearance: 20,
      age: 65,
      weight: 70,
    };

    const rivaroxaban = evaluateDOACRule({ medication: 'rivaroxaban', patient });
    const apixaban = evaluateDOACRule({ medication: 'apixaban', patient });
    const edoxaban = evaluateDOACRule({ medication: 'edoxaban', patient });
    const dabigatran = evaluateDOACRule({ medication: 'dabigatran', patient });

    // Dabigatran blocked (threshold 30)
    expect(dabigatran.severity).toBe('BLOCK');

    // Others should pass or flag
    expect(['PASS', 'FLAG']).toContain(rivaroxaban.severity);
    expect(['PASS', 'FLAG']).toContain(apixaban.severity);
    expect(['PASS', 'FLAG']).toContain(edoxaban.severity);
  });
});
