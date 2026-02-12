/**
 * Governance Events Tests
 *
 * Validates that audit events are logged correctly for compliance
 */

import {
  logDOACEvaluation,
  logAttestationRequired,
  logOverrideSubmitted,
  logPatientDataAccess,
  logSafetyRuleFired,
  getGovernanceMetadata,
} from '../governance-events';
import { logger } from '@/lib/logger';

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('Governance Events Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========== TEST 1: DOAC evaluation is logged ==========
  test('GOV-001: logDOACEvaluation logs event', () => {
    logDOACEvaluation({
      actor: 'dr-elena',
      patientId: 'patient-123',
      medication: 'rivaroxaban',
      severity: 'BLOCK',
      ruleId: 'DOAC-CrCl-001',
      traceId: 'trace-001',
    });

    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'DOAC_EVALUATION',
        actor: 'dr-elena',
        resource: 'patient-123',
        medication: 'rivaroxaban',
        severity: 'BLOCK',
        ruleId: 'DOAC-CrCl-001',
      })
    );
  });

  // ========== TEST 2: DOAC event includes timestamp ==========
  test('GOV-002: DOAC evaluation includes timestamp', () => {
    logDOACEvaluation({
      actor: 'dr-elena',
      patientId: 'patient-123',
      medication: 'apixaban',
      severity: 'PASS',
      ruleId: 'DOAC-Apixaban-PASS',
    });

    const logCall = (logger.info as jest.Mock).mock.calls[0][0];
    expect(logCall.timestamp).toBeDefined();
    expect(logCall.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO 8601 format
  });

  // ========== TEST 3: Attestation requirement is logged ==========
  test('GOV-003: logAttestationRequired logs event', () => {
    logAttestationRequired({
      actor: 'dr-carlos',
      patientId: 'patient-456',
      medication: 'dabigatran',
      reason: 'STALE_RENAL_LABS',
      staleSince: 80,
      traceId: 'trace-002',
    });

    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'ATTESTATION_REQUIRED',
        actor: 'dr-carlos',
        resource: 'patient-456',
        reason: 'STALE_RENAL_LABS',
        staleSince: 80,
      })
    );
  });

  // ========== TEST 4: Attestation event includes missing fields ==========
  test('GOV-004: Attestation event includes missing fields', () => {
    logAttestationRequired({
      actor: 'dr-carlos',
      patientId: 'patient-456',
      medication: 'rivaroxaban',
      reason: 'MISSING_WEIGHT',
      missingFields: ['weight', 'age'],
    });

    const logCall = (logger.info as jest.Mock).mock.calls[0][0];
    expect(logCall.missingFields).toEqual(['weight', 'age']);
  });

  // ========== TEST 5: Override submission is logged ==========
  test('GOV-005: logOverrideSubmitted logs event', () => {
    logOverrideSubmitted({
      actor: 'dr-elena',
      patientId: 'patient-789',
      ruleId: 'DOAC-CrCl-001',
      originalSeverity: 'BLOCK',
      reasonCode: 'CLINICAL_JUDGMENT_PALLIATIVE_CARE',
      notes: 'Patient in hospice',
      traceId: 'trace-003',
    });

    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'OVERRIDE_SUBMITTED',
        actor: 'dr-elena',
        resource: 'patient-789',
        ruleId: 'DOAC-CrCl-001',
        originalSeverity: 'BLOCK',
        reasonCode: 'CLINICAL_JUDGMENT_PALLIATIVE_CARE',
      })
    );
  });

  // ========== TEST 6: Override event includes metadata ==========
  test('GOV-006: Override event includes metadata', () => {
    logOverrideSubmitted({
      actor: 'dr-metadata',
      patientId: 'patient-metadata',
      ruleId: 'DOAC-001',
      originalSeverity: 'FLAG',
      reasonCode: 'PATIENT_DECLINED_ALTERNATIVE',
      notes: 'Patient notes',
    });

    const logCall = (logger.info as jest.Mock).mock.calls[0][0];
    expect(logCall.metadata).toEqual(
      expect.objectContaining({
        overriddenRule: 'DOAC-001',
        clinicianId: 'dr-metadata',
        patientId: 'patient-metadata',
        notes: 'Patient notes',
      })
    );
  });

  // ========== TEST 7: Patient data access is logged ==========
  test('GOV-007: logPatientDataAccess logs event', () => {
    logPatientDataAccess({
      actor: 'dr-access',
      patientId: 'patient-access',
      fields: ['creatinineClearance', 'weight'],
      purpose: 'DOAC safety evaluation',
      traceId: 'trace-004',
    });

    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'PATIENT_DATA_ACCESS',
        actor: 'dr-access',
        resource: 'patient-access',
        fields: ['creatinineClearance', 'weight'],
        purpose: 'DOAC safety evaluation',
      })
    );
  });

  // ========== TEST 8: Safety rule fired event is logged ==========
  test('GOV-008: logSafetyRuleFired logs event', () => {
    logSafetyRuleFired({
      actor: 'system',
      patientId: 'patient-rule',
      ruleId: 'DOAC-CrCl-001',
      ruleName: 'CrCl < 15 blocks rivaroxaban',
      severity: 'BLOCK',
      description: 'Renal function critically impaired',
    });

    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'SAFETY_RULE_FIRED',
        actor: 'system',
        resource: 'patient-rule',
        metadata: expect.objectContaining({
          ruleId: 'DOAC-CrCl-001',
          ruleName: 'CrCl < 15 blocks rivaroxaban',
          severity: 'BLOCK',
        }),
      })
    );
  });

  // ========== TEST 9: All events include legalBasis ==========
  test('GOV-009: All events include legalBasis for compliance', () => {
    logDOACEvaluation({
      actor: 'dr-test',
      patientId: 'patient-test',
      medication: 'rivaroxaban',
      severity: 'PASS',
      ruleId: 'DOAC-001',
    });

    const logCall = (logger.info as jest.Mock).mock.calls[0][0];
    expect(logCall.legalBasis).toBeDefined();
    expect(logCall.legalBasis).toBeTruthy();
  });

  // ========== TEST 10: Governance metadata construction ==========
  test('GOV-010: getGovernanceMetadata builds correct structure', () => {
    const metadata = getGovernanceMetadata({
      actor: 'dr-meta',
      patientId: 'patient-meta',
      traceId: 'trace-meta',
    });

    expect(metadata).toEqual({
      actor: 'dr-meta',
      resource: 'patient-meta',
      timestamp: expect.any(String),
      traceId: 'trace-meta',
    });

    expect(metadata.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  // ========== TEST 11: TraceId is optional ==========
  test('GOV-011: TraceId is optional in events', () => {
    logDOACEvaluation({
      actor: 'dr-notrace',
      patientId: 'patient-notrace',
      medication: 'apixaban',
      severity: 'PASS',
      ruleId: 'DOAC-001',
      // No traceId provided
    });

    const logCall = (logger.info as jest.Mock).mock.calls[0][0];
    expect(logCall.traceId).toBeUndefined();
  });

  // ========== TEST 12: Multiple data access fields ==========
  test('GOV-012: logPatientDataAccess with multiple fields', () => {
    logPatientDataAccess({
      actor: 'dr-multifield',
      patientId: 'patient-multifield',
      fields: ['creatinineClearance', 'weight', 'age', 'labTimestamp'],
      purpose: 'Comprehensive DOAC safety check',
    });

    const logCall = (logger.info as jest.Mock).mock.calls[0][0];
    expect(logCall.fields).toHaveLength(4);
    expect(logCall.fields).toContain('labTimestamp');
  });

  // ========== TEST 13: Governance event action field is human-readable ==========
  test('GOV-013: Event action field is human-readable', () => {
    logDOACEvaluation({
      actor: 'dr-readable',
      patientId: 'patient-readable',
      medication: 'rivaroxaban',
      severity: 'BLOCK',
      ruleId: 'DOAC-CrCl-001',
    });

    const logCall = (logger.info as jest.Mock).mock.calls[0][0];
    expect(logCall.action).toMatch(/rivaroxaban/);
    expect(logCall.action).toMatch(/BLOCK/);
  });

  // ========== TEST 14: Override reason code is preserved ==========
  test('GOV-014: Override reasonCode is preserved exactly', () => {
    const reasonCode = 'TIME_CRITICAL_EMERGENCY';

    logOverrideSubmitted({
      actor: 'dr-emergency',
      patientId: 'patient-emergency',
      ruleId: 'DOAC-001',
      originalSeverity: 'BLOCK',
      reasonCode: reasonCode as any,
      notes: 'Life-threatening emergency',
    });

    const logCall = (logger.info as jest.Mock).mock.calls[0][0];
    expect(logCall.reasonCode).toBe(reasonCode);
  });

  // ========== TEST 15: Attestation staleSince is numeric ==========
  test('GOV-015: Attestation staleSince is numeric', () => {
    logAttestationRequired({
      actor: 'dr-stale',
      patientId: 'patient-stale',
      medication: 'rivaroxaban',
      reason: 'STALE_RENAL_LABS',
      staleSince: 120,
    });

    const logCall = (logger.info as jest.Mock).mock.calls[0][0];
    expect(typeof logCall.staleSince).toBe('number');
    expect(logCall.staleSince).toBe(120);
  });
});
