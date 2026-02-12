/**
 * Attestation Gate Tests
 *
 * Validates that missing or stale critical data triggers attestation requirements
 */

import { checkAttestation, checkLabFreshness, validateCriticalField, getFailingCriticalFields } from '../attestation-gate';

describe('Attestation Gate', () => {
  // ========== TEST 1: Missing CrCl requires attestation ==========
  test('ATT-001: Missing creatinineClearance requires attestation', () => {
    const result = checkAttestation({
      medication: 'rivaroxaban',
      patient: {
        creatinineClearance: null,
        weight: 70,
        age: 65,
      },
    });

    expect(result.required).toBe(true);
    expect(result.missingFields).toContain('Serum creatinine / CrCl');
  });

  // ========== TEST 2: Missing weight requires attestation ==========
  test('ATT-002: Missing weight requires attestation', () => {
    const result = checkAttestation({
      patient: {
        creatinineClearance: 50,
        weight: null,
        age: 65,
      },
    });

    expect(result.required).toBe(true);
    expect(result.missingFields).toContain('Patient weight');
  });

  // ========== TEST 3: Missing age requires attestation ==========
  test('ATT-003: Missing age requires attestation', () => {
    const result = checkAttestation({
      patient: {
        creatinineClearance: 50,
        weight: 70,
        age: null,
      },
    });

    expect(result.required).toBe(true);
    expect(result.missingFields).toContain('Patient age');
  });

  // ========== TEST 4: Stale labs require attestation ==========
  test('ATT-004: Labs >72h old require attestation', () => {
    const eightyHoursAgo = new Date(Date.now() - 80 * 60 * 60 * 1000);

    const result = checkAttestation({
      patient: {
        creatinineClearance: 50,
        weight: 70,
        age: 65,
        labTimestamp: eightyHoursAgo,
      },
    });

    expect(result.required).toBe(true);
    expect(result.reason).toBe('STALE_RENAL_LABS');
    expect(result.staleSince).toBe(80);
    expect(result.threshold).toBe(72);
  });

  // ========== TEST 5: Fresh labs (exactly 72h) don't require attestation ==========
  test('ATT-005: Labs exactly 72h old are acceptable', () => {
    const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);

    const result = checkAttestation({
      patient: {
        creatinineClearance: 50,
        weight: 70,
        age: 65,
        labTimestamp: seventyTwoHoursAgo,
      },
    });

    expect(result.required).toBe(false);
  });

  // ========== TEST 6: Fresh labs (24h) don't require attestation ==========
  test('ATT-006: Labs 24h old don\'t require attestation', () => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const result = checkAttestation({
      patient: {
        creatinineClearance: 50,
        weight: 70,
        age: 65,
        labTimestamp: oneDayAgo,
      },
    });

    expect(result.required).toBe(false);
  });

  // ========== TEST 7: All data present and fresh ==========
  test('ATT-007: Complete valid data passes', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    const result = checkAttestation({
      medication: 'apixaban',
      patient: {
        creatinineClearance: 60,
        weight: 75,
        age: 70,
        labTimestamp: threeDaysAgo,
      },
    });

    expect(result.required).toBe(false);
  });

  // ========== TEST 8: Zero CrCl is invalid ==========
  test('ATT-008: CrCl = 0 is invalid', () => {
    const result = checkAttestation({
      patient: {
        creatinineClearance: 0,
        weight: 70,
        age: 65,
      },
    });

    expect(result.required).toBe(true);
  });

  // ========== TEST 9: Negative weight is invalid ==========
  test('ATT-009: Negative weight is invalid', () => {
    const result = checkAttestation({
      patient: {
        creatinineClearance: 50,
        weight: -10,
        age: 65,
      },
    });

    expect(result.required).toBe(true);
    expect(result.missingFields).toContain('Patient weight');
  });

  // ========== TEST 10: Weight > 300kg is invalid ==========
  test('ATT-010: Weight > 300kg is invalid', () => {
    const result = checkAttestation({
      patient: {
        creatinineClearance: 50,
        weight: 350,
        age: 65,
      },
    });

    expect(result.required).toBe(true);
  });

  // ========== TEST 11: Age = 0 is invalid ==========
  test('ATT-011: Age = 0 is invalid', () => {
    const result = checkAttestation({
      patient: {
        creatinineClearance: 50,
        weight: 70,
        age: 0,
      },
    });

    expect(result.required).toBe(true);
  });

  // ========== TEST 12: Age > 130 is invalid ==========
  test('ATT-012: Age > 130 is invalid', () => {
    const result = checkAttestation({
      patient: {
        creatinineClearance: 50,
        weight: 70,
        age: 150,
      },
    });

    expect(result.required).toBe(true);
  });

  // ========== TEST 13: Stale labs with ISO string timestamp ==========
  test('ATT-013: Stale labs as ISO string', () => {
    const seventyThreeHoursAgo = new Date(Date.now() - 73 * 60 * 60 * 1000).toISOString();

    const result = checkAttestation({
      patient: {
        creatinineClearance: 50,
        weight: 70,
        age: 65,
        labTimestamp: seventyThreeHoursAgo,
      },
    });

    expect(result.required).toBe(true);
    expect(result.reason).toBe('STALE_RENAL_LABS');
  });

  // ========== TEST 14: Multiple missing fields ==========
  test('ATT-014: Multiple missing fields', () => {
    const result = checkAttestation({
      patient: {
        creatinineClearance: null,
        weight: null,
        age: 65,
      },
    });

    expect(result.required).toBe(true);
    expect(result.missingFields).toHaveLength(2);
  });

  // ========== TEST 15: Undefined vs null handling ==========
  test('ATT-015: Undefined CrCl treated same as null', () => {
    const result = checkAttestation({
      patient: {
        creatinineClearance: undefined,
        weight: 70,
        age: 65,
      },
    });

    expect(result.required).toBe(true);
  });
});

describe('Lab Freshness Checker', () => {
  // ========== TEST 16: Null timestamp is stale ==========
  test('ATT-016: Null timestamp is stale', () => {
    const result = checkLabFreshness(null);

    expect(result.isStale).toBe(true);
    expect(result.ageHours).toBe(Infinity);
  });

  // ========== TEST 17: Undefined timestamp is stale ==========
  test('ATT-017: Undefined timestamp is stale', () => {
    const result = checkLabFreshness(undefined);

    expect(result.isStale).toBe(true);
  });

  // ========== TEST 18: Old labs are stale ==========
  test('ATT-018: 100h old labs are stale', () => {
    const oneHundredHoursAgo = new Date(Date.now() - 100 * 60 * 60 * 1000);

    const result = checkLabFreshness(oneHundredHoursAgo);

    expect(result.isStale).toBe(true);
    expect(result.ageHours).toBe(100);
  });

  // ========== TEST 19: Fresh labs are not stale ==========
  test('ATT-019: 12h old labs are fresh', () => {
    const twelvHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

    const result = checkLabFreshness(twelvHoursAgo);

    expect(result.isStale).toBe(false);
  });

  // ========== TEST 20: Labs with ISO string timestamp ==========
  test('ATT-020: Lab freshness with ISO string', () => {
    const eightyHoursAgo = new Date(Date.now() - 80 * 60 * 60 * 1000).toISOString();

    const result = checkLabFreshness(eightyHoursAgo);

    expect(result.isStale).toBe(true);
    expect(result.ageHours).toBe(80);
  });
});

describe('Critical Field Validation', () => {
  // ========== TEST 21: Validate CrCl ==========
  test('ATT-021: validateCriticalField for CrCl', () => {
    expect(validateCriticalField('creatinineClearance', 50)).toBe(true);
    expect(validateCriticalField('creatinineClearance', null)).toBe(false);
    expect(validateCriticalField('creatinineClearance', 0)).toBe(false);
    expect(validateCriticalField('creatinineClearance', -1)).toBe(false);
  });

  // ========== TEST 22: Validate weight ==========
  test('ATT-022: validateCriticalField for weight', () => {
    expect(validateCriticalField('weight', 70)).toBe(true);
    expect(validateCriticalField('weight', 30)).toBe(true);
    expect(validateCriticalField('weight', 200)).toBe(true);
    expect(validateCriticalField('weight', 25)).toBe(false); // < 30
    expect(validateCriticalField('weight', 301)).toBe(false); // > 300
    expect(validateCriticalField('weight', null)).toBe(false);
  });

  // ========== TEST 23: Validate age ==========
  test('ATT-023: validateCriticalField for age', () => {
    expect(validateCriticalField('age', 65)).toBe(true);
    expect(validateCriticalField('age', 1)).toBe(true);
    expect(validateCriticalField('age', 130)).toBe(true);
    expect(validateCriticalField('age', 0)).toBe(false);
    expect(validateCriticalField('age', 131)).toBe(false);
    expect(validateCriticalField('age', null)).toBe(false);
  });

  // ========== TEST 24: Unknown field passes validation ==========
  test('ATT-024: Unknown fields don\'t require validation', () => {
    expect(validateCriticalField('unknownField', null)).toBe(true);
  });
});

describe('Failing Fields Extraction', () => {
  // ========== TEST 25: Get failing critical fields ==========
  test('ATT-025: getFailingCriticalFields', () => {
    const patient = {
      creatinineClearance: null,
      weight: 70,
      age: null,
    };

    const failing = getFailingCriticalFields(patient);

    expect(failing).toHaveLength(2);
    expect(failing).toContain('creatinineClearance');
    expect(failing).toContain('age');
  });

  // ========== TEST 26: No failing fields ==========
  test('ATT-026: No failing fields returns empty array', () => {
    const patient = {
      creatinineClearance: 50,
      weight: 70,
      age: 65,
    };

    const failing = getFailingCriticalFields(patient);

    expect(failing).toHaveLength(0);
  });

  // ========== TEST 27: All fields failing ==========
  test('ATT-027: All fields failing', () => {
    const patient = {
      creatinineClearance: null,
      weight: null,
      age: -5,
    };

    const failing = getFailingCriticalFields(patient);

    expect(failing).toHaveLength(3);
  });
});
