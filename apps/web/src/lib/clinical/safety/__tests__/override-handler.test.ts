/**
 * Override Handler Tests
 *
 * Validates that overrides require reason codes and log governance events
 */

import { handleOverride, validateOverride, getAvailableReasonCodes } from '../override-handler';
import { logger } from '@/lib/logger';

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('Override Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========== TEST 1: Override without reason code is rejected ==========
  test('OVR-001: Override without reason code throws error', () => {
    expect(() => {
      handleOverride({
        ruleId: 'DOAC-CrCl-001',
        severity: 'BLOCK',
        reasonCode: null,
        actor: 'dr-elena-123',
        patientId: 'patient-456',
      });
    }).toThrow('reasonCode is required');
  });

  // ========== TEST 2: Valid override emits governance event ==========
  test('OVR-002: Valid override emits OVERRIDE_SUBMITTED event', () => {
    const result = handleOverride({
      ruleId: 'DOAC-CrCl-001',
      severity: 'BLOCK',
      reasonCode: 'CLINICAL_JUDGMENT_PALLIATIVE_CARE',
      actor: 'dr-elena-123',
      patientId: 'patient-456',
      notes: 'Patient is in hospice care',
      traceId: 'trace-789',
    });

    expect(logger.info).toHaveBeenCalled();
    const logCall = (logger.info as jest.Mock).mock.calls[0][0];
    expect(logCall.event).toBe('OVERRIDE_SUBMITTED');
    expect(logCall.ruleId).toBe('DOAC-CrCl-001');
    expect(logCall.reasonCode).toBe('CLINICAL_JUDGMENT_PALLIATIVE_CARE');
    expect(logCall.actor).toBe('dr-elena-123');
    expect(result.eventId).toBeDefined();
  });

  // ========== TEST 3: Override requires documentation ==========
  test('OVR-003: CLINICAL_JUDGMENT_PALLIATIVE_CARE requires notes', () => {
    const validation = validateOverride({
      ruleId: 'DOAC-CrCl-001',
      severity: 'BLOCK',
      reasonCode: 'CLINICAL_JUDGMENT_PALLIATIVE_CARE',
      actor: 'dr-elena-123',
      patientId: 'patient-456',
      notes: undefined, // Missing notes
    });

    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.includes('requires documentation'))).toBe(true);
  });

  // ========== TEST 4: Override with valid reason code succeeds ==========
  test('OVR-004: Override with PATIENT_DECLINED_ALTERNATIVE succeeds', () => {
    const result = handleOverride({
      ruleId: 'DOAC-Weight-001',
      severity: 'FLAG',
      reasonCode: 'PATIENT_DECLINED_ALTERNATIVE',
      actor: 'dr-carlos-789',
      patientId: 'patient-101',
      notes: 'Patient explicitly declined warfarin due to dietary restrictions',
    });

    expect(result.eventId).toBeDefined();
    expect(logger.info).toHaveBeenCalled();
  });

  // ========== TEST 5: Invalid reason code rejected ==========
  test('OVR-005: Invalid reason code is rejected', () => {
    const validation = validateOverride({
      ruleId: 'DOAC-001',
      severity: 'BLOCK',
      reasonCode: 'INVALID_REASON' as any,
      actor: 'dr-test',
      patientId: 'patient-test',
    });

    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.includes('Invalid reasonCode'))).toBe(true);
  });

  // ========== TEST 6: Missing ruleId is rejected ==========
  test('OVR-006: Missing ruleId is rejected', () => {
    const validation = validateOverride({
      ruleId: '',
      severity: 'BLOCK',
      reasonCode: 'CLINICAL_JUDGMENT_PALLIATIVE_CARE',
      actor: 'dr-test',
      patientId: 'patient-test',
      notes: 'Some notes',
    });

    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.includes('ruleId is required'))).toBe(true);
  });

  // ========== TEST 7: Missing actor is rejected ==========
  test('OVR-007: Missing actor (clinician ID) is rejected', () => {
    const validation = validateOverride({
      ruleId: 'DOAC-001',
      severity: 'BLOCK',
      reasonCode: 'CLINICAL_JUDGMENT_PALLIATIVE_CARE',
      actor: '',
      patientId: 'patient-test',
      notes: 'Some notes',
    });

    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.includes('actor'))).toBe(true);
  });

  // ========== TEST 8: Missing patientId is rejected ==========
  test('OVR-008: Missing patientId is rejected', () => {
    const validation = validateOverride({
      ruleId: 'DOAC-001',
      severity: 'BLOCK',
      reasonCode: 'CLINICAL_JUDGMENT_PALLIATIVE_CARE',
      actor: 'dr-test',
      patientId: '',
      notes: 'Some notes',
    });

    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.includes('patientId'))).toBe(true);
  });

  // ========== TEST 9: Invalid severity is rejected ==========
  test('OVR-009: Invalid severity is rejected', () => {
    const validation = validateOverride({
      ruleId: 'DOAC-001',
      severity: 'INVALID' as any,
      reasonCode: 'CLINICAL_JUDGMENT_PALLIATIVE_CARE',
      actor: 'dr-test',
      patientId: 'patient-test',
      notes: 'Some notes',
    });

    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.includes('Invalid severity'))).toBe(true);
  });

  // ========== TEST 10: TIME_CRITICAL_EMERGENCY reason ==========
  test('OVR-010: TIME_CRITICAL_EMERGENCY can be used', () => {
    const result = handleOverride({
      ruleId: 'DOAC-CrCl-001',
      severity: 'BLOCK',
      reasonCode: 'TIME_CRITICAL_EMERGENCY',
      actor: 'dr-emergency',
      patientId: 'patient-er',
      notes: 'Patient in severe hemorrhagic shock requiring anticoagulation reversal',
    });

    expect(result.eventId).toBeDefined();
    expect(logger.info).toHaveBeenCalled();
  });

  // ========== TEST 11: CONTRAINDICATION_UNAVOIDABLE reason ==========
  test('OVR-011: CONTRAINDICATION_UNAVOIDABLE reason', () => {
    const result = handleOverride({
      ruleId: 'DOAC-Weight-001',
      severity: 'FLAG',
      reasonCode: 'CONTRAINDICATION_UNAVOIDABLE',
      actor: 'dr-cardiac',
      patientId: 'patient-cardiac',
      notes: 'Only available anticoagulant for this patient due to severe liver disease',
    });

    expect(result.eventId).toBeDefined();
  });

  // ========== TEST 12: DOCUMENTED_TOLERANCE reason ==========
  test('OVR-012: DOCUMENTED_TOLERANCE reason', () => {
    const result = handleOverride({
      ruleId: 'DOAC-Age-001',
      severity: 'FLAG',
      reasonCode: 'DOCUMENTED_TOLERANCE',
      actor: 'dr-continuity',
      patientId: 'patient-stable',
      notes: 'Patient has been on this DOAC safely for 3 years; no dose adjustment needed',
    });

    expect(result.eventId).toBeDefined();
  });

  // ========== TEST 13: Governance event includes metadata ==========
  test('OVR-013: Governance event includes complete metadata', () => {
    handleOverride({
      ruleId: 'DOAC-CrCl-001',
      severity: 'BLOCK',
      reasonCode: 'PATIENT_DECLINED_ALTERNATIVE',
      actor: 'dr-metadata-test',
      patientId: 'patient-metadata',
      notes: 'Patient declined alternative',
      traceId: 'trace-metadata-123',
    });

    const logCall = (logger.info as jest.Mock).mock.calls[0][0];
    expect(logCall.actor).toBe('dr-metadata-test');
    expect(logCall.resource).toBe('patient-metadata');
    expect(logCall.timestamp).toBeDefined();
    expect(logCall.traceId).toBe('trace-metadata-123');
    expect(logCall.metadata).toBeDefined();
    expect(logCall.metadata.clinicianId).toBe('dr-metadata-test');
  });
});

describe('Override Validation', () => {
  // ========== TEST 14: All valid severities accepted ==========
  test('OVR-014: All valid severities are accepted', () => {
    const validSeverities: Array<'BLOCK' | 'FLAG' | 'ATTESTATION_REQUIRED'> = [
      'BLOCK',
      'FLAG',
      'ATTESTATION_REQUIRED',
    ];

    validSeverities.forEach((severity) => {
      const validation = validateOverride({
        ruleId: 'DOAC-001',
        severity,
        reasonCode: 'CLINICAL_JUDGMENT_PALLIATIVE_CARE',
        actor: 'dr-test',
        patientId: 'patient-test',
        notes: 'Notes',
      });

      expect(validation.valid).toBe(true);
    });
  });

  // ========== TEST 15: Warnings for CMO review ==========
  test('OVR-015: Warnings generated for CMO review required reasons', () => {
    const validation = validateOverride({
      ruleId: 'DOAC-001',
      severity: 'BLOCK',
      reasonCode: 'CLINICAL_JUDGMENT_PALLIATIVE_CARE',
      actor: 'dr-test',
      patientId: 'patient-test',
      notes: 'Patient in palliative care',
    });

    expect(validation.valid).toBe(true);
    expect(validation.warnings).toBeDefined();
    expect(validation.warnings?.some(w => w.includes('Chief Medical Officer'))).toBe(true);
  });

  // ========== TEST 16: No warnings for DOCUMENTED_TOLERANCE ==========
  test('OVR-016: DOCUMENTED_TOLERANCE does not require CMO review', () => {
    const validation = validateOverride({
      ruleId: 'DOAC-001',
      severity: 'FLAG',
      reasonCode: 'DOCUMENTED_TOLERANCE',
      actor: 'dr-test',
      patientId: 'patient-test',
      notes: 'Prior use documented',
    });

    expect(validation.valid).toBe(true);
    // DOCUMENTED_TOLERANCE doesn't require CMO review
    if (validation.warnings) {
      expect(validation.warnings).not.toContain(
        expect.stringContaining('Chief Medical Officer')
      );
    }
  });
});

describe('Available Reason Codes', () => {
  // ========== TEST 17: Get all available reason codes ==========
  test('OVR-017: getAvailableReasonCodes returns all codes', () => {
    const codes = getAvailableReasonCodes();

    expect(codes.length).toBeGreaterThan(0);
    expect(codes).toContainEqual(
      expect.objectContaining({
        code: 'CLINICAL_JUDGMENT_PALLIATIVE_CARE',
        label: expect.any(String),
        description: expect.any(String),
      })
    );
  });

  // ========== TEST 18: All expected reason codes present ==========
  test('OVR-018: All expected reason codes are available', () => {
    const codes = getAvailableReasonCodes();
    const codeList = codes.map((c) => c.code);

    expect(codeList).toContain('CLINICAL_JUDGMENT_PALLIATIVE_CARE');
    expect(codeList).toContain('PATIENT_DECLINED_ALTERNATIVE');
    expect(codeList).toContain('CONTRAINDICATION_UNAVOIDABLE');
    expect(codeList).toContain('TIME_CRITICAL_EMERGENCY');
    expect(codeList).toContain('DOCUMENTED_TOLERANCE');
    expect(codeList).toContain('OTHER_DOCUMENTED');
  });
});
