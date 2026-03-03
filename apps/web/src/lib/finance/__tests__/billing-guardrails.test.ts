/**
 * Unit tests for Billing Guardrails (FIN-001, FIN-002, FIN-003)
 */

import { describe, test, expect } from '@jest/globals';
import {
  checkICD10Match,
  checkTUSSCode,
  checkQuantityLimit,
  DEFAULT_PAYER_MAX_QUANTITY,
} from '../billing-guardrails';

// ============================================================================
// FIN-001: ICD-10 Mismatch
// ============================================================================

describe('FIN-001: checkICD10Match', () => {
  test('returns null for correct indication (apixaban + I48)', () => {
    expect(checkICD10Match('apixaban', 'I48.0')).toBeNull();
  });

  test('returns null for correct indication (apixaban + I26)', () => {
    expect(checkICD10Match('apixaban', 'I26.9')).toBeNull();
  });

  test('returns null for correct indication (metformin + E11)', () => {
    expect(checkICD10Match('metformin', 'E11.9')).toBeNull();
  });

  test('fires AMBER for apixaban with diabetes ICD-10 (E11.x)', () => {
    const alert = checkICD10Match('apixaban', 'E11.9');
    expect(alert).not.toBeNull();
    expect(alert!.ruleId).toBe('FIN-001');
    expect(alert!.severity).toBe('warning');
    expect(alert!.summary).toContain('Indication mismatch');
    expect(alert!.summary).toContain('apixaban');
    expect(alert!.summary).toContain('E11.9');
  });

  test('fires AMBER for rivaroxaban with hypertension (I10) mismatch', () => {
    const alert = checkICD10Match('rivaroxaban', 'I10');
    // I10 is NOT in the rivaroxaban list (I48, I26, I82)
    expect(alert).not.toBeNull();
    expect(alert!.ruleId).toBe('FIN-001');
  });

  test('returns null when no ICD-10 code provided', () => {
    expect(checkICD10Match('apixaban', undefined)).toBeNull();
  });

  test('returns null for unmapped drug (unknown drug)', () => {
    expect(checkICD10Match('aspirin', 'Z99.9')).toBeNull();
  });

  test('case-insensitive drug name matching', () => {
    expect(checkICD10Match('Apixaban', 'I48.0')).toBeNull();
    const alert = checkICD10Match('APIXABAN', 'E11.0');
    expect(alert).not.toBeNull();
  });

  test('prefix matching — I48 matches I48.91', () => {
    expect(checkICD10Match('apixaban', 'I48.91')).toBeNull();
  });

  test('lisinopril correct for I10 (hypertension)', () => {
    expect(checkICD10Match('lisinopril', 'I10')).toBeNull();
  });

  test('lisinopril mismatch for E11 (diabetes)', () => {
    const alert = checkICD10Match('lisinopril', 'E11.9');
    expect(alert).not.toBeNull();
    expect(alert!.ruleId).toBe('FIN-001');
  });
});

// ============================================================================
// FIN-002: TUSS Code Hallucination
// ============================================================================

describe('FIN-002: checkTUSSCode', () => {
  test('returns null when no TUSS code provided', () => {
    expect(checkTUSSCode(undefined)).toBeNull();
  });

  test('fires RED for completely invalid TUSS code', () => {
    const alert = checkTUSSCode('00000000');
    expect(alert).not.toBeNull();
    expect(alert!.ruleId).toBe('FIN-002');
    expect(alert!.severity).toBe('critical');
    expect(alert!.indicator).toBe('critical');
    expect(alert!.summary).toContain('Invalid TUSS code');
    expect(alert!.summary).toContain('00000000');
  });

  test('fires RED for hallucinated code (random string)', () => {
    const alert = checkTUSSCode('FAKE-999');
    expect(alert).not.toBeNull();
    expect(alert!.ruleId).toBe('FIN-002');
    expect(alert!.severity).toBe('critical');
  });

  test('alert detail contains informative glosa message', () => {
    const alert = checkTUSSCode('00000000');
    expect(alert!.detail).toContain('glosa');
  });
});

// ============================================================================
// FIN-003: Quantity Limit Exceeded
// ============================================================================

describe('FIN-003: checkQuantityLimit', () => {
  test('returns null when no quantity provided', () => {
    expect(checkQuantityLimit(undefined)).toBeNull();
  });

  test('returns null for quantity at default limit (30)', () => {
    expect(checkQuantityLimit(30)).toBeNull();
  });

  test('returns null for quantity below limit (28)', () => {
    expect(checkQuantityLimit(28)).toBeNull();
  });

  test('fires AMBER for quantity 60 > payer max 30', () => {
    const alert = checkQuantityLimit(60);
    expect(alert).not.toBeNull();
    expect(alert!.ruleId).toBe('FIN-003');
    expect(alert!.severity).toBe('warning');
    expect(alert!.summary).toContain('Quantity exceeds reimbursable limit');
    expect(alert!.summary).toContain('60');
    expect(alert!.summary).toContain('30');
  });

  test('fires AMBER for quantity 31 > custom max 30', () => {
    const alert = checkQuantityLimit(31, 30);
    expect(alert).not.toBeNull();
    expect(alert!.ruleId).toBe('FIN-003');
  });

  test('returns null for custom payer max (90-day supply)', () => {
    expect(checkQuantityLimit(90, 90)).toBeNull();
  });

  test('DEFAULT_PAYER_MAX_QUANTITY is 30', () => {
    expect(DEFAULT_PAYER_MAX_QUANTITY).toBe(30);
  });

  test('alert includes quantity and limit in detail', () => {
    const alert = checkQuantityLimit(60, 30);
    expect(alert!.detail).toContain('60');
    expect(alert!.detail).toContain('30');
  });
});
