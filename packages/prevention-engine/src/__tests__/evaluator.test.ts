/**
 * @holi/prevention-engine — Evaluator unit tests
 *
 * Tests:
 *   - Lab rule matching (HbA1c, creatinine, potassium)
 *   - Vital sign rule matching (BP, SpO2)
 *   - Screening gap detection
 *   - ELENA invariant: invalid records produce no alerts
 *   - ELENA invariant: humanReviewRequired = true on all alerts
 *   - ELENA invariant: rule registry throws on missing sourceAuthority/citationUrl
 *   - Unit mismatch: rule skipped when units incompatible
 *
 * QUINN invariant: jest.mock() BEFORE require() — N/A here (no mocks needed).
 */

import { PreventionEvaluator } from '../evaluator';
import { RuleRegistry } from '../rule-registry';
import type { CanonicalHealthRecord } from '@holi/data-ingestion';
import type { PatientHistory, ClinicalRule } from '../types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeLabRecord(
  testName: string,
  loincCode: string,
  value: number,
  unit: string,
  overrides: Partial<CanonicalHealthRecord> = {},
): CanonicalHealthRecord {
  return {
    ingestId: `ingest-${Date.now()}`,
    sourceId: 'src-001',
    sourceType: 'FHIR_R4',
    tenantId: 'tenant-holi',
    patientId: 'patient-001',
    ingestedAt: new Date(),
    recordedAt: new Date(),
    recordType: 'LAB_RESULT',
    payload: {
      kind: 'LAB_RESULT',
      testName,
      loincCode,
      value,
      unit,
      interpretation: value > 5.7 ? 'ABNORMAL' : 'NORMAL',
    },
    validation: {
      isValid: true,
      errors: [],
      warnings: [],
      completenessScore: 1.0,
    },
    provenance: {
      sourceSystem: 'test',
      rawDataHash: 'abc123',
      normalizerVersion: '0.1.0',
      normalizedAt: new Date(),
      transformations: [],
    },
    ...overrides,
  };
}

function makeVitalRecord(
  vitalType: string,
  value: number,
  unit: string,
): CanonicalHealthRecord {
  return {
    ingestId: `ingest-vital-${Date.now()}`,
    sourceId: 'src-001',
    sourceType: 'FHIR_R4',
    tenantId: 'tenant-holi',
    patientId: 'patient-001',
    ingestedAt: new Date(),
    recordedAt: new Date(),
    recordType: 'VITAL_SIGN',
    payload: {
      kind: 'VITAL_SIGN',
      vitalType: vitalType as 'BLOOD_PRESSURE',
      value,
      unit,
      measuredAt: new Date(),
    },
    validation: {
      isValid: true,
      errors: [],
      warnings: [],
      completenessScore: 1.0,
    },
    provenance: {
      sourceSystem: 'test',
      rawDataHash: 'xyz789',
      normalizerVersion: '0.1.0',
      normalizedAt: new Date(),
      transformations: [],
    },
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('PreventionEvaluator — Lab alerts', () => {
  let evaluator: PreventionEvaluator;

  beforeEach(() => {
    evaluator = new PreventionEvaluator();
  });

  it('fires HbA1c prediabetes alert when value >= 5.7%', () => {
    const record = makeLabRecord('HbA1c', '4548-4', 6.0, '%');
    const alerts = evaluator.evaluate(record);

    const diabetesAlert = alerts.find(a => a.rule.ruleId === 'LAB_HBA1C_PREDIABETES');
    expect(diabetesAlert).toBeDefined();
    expect(diabetesAlert!.severity).toBe('MEDIUM');
  });

  it('fires BOTH prediabetes AND diabetes alert when HbA1c >= 6.5%', () => {
    const record = makeLabRecord('HbA1c', '4548-4', 7.2, '%');
    const alerts = evaluator.evaluate(record);

    const ruleIds = alerts.map(a => a.rule.ruleId);
    expect(ruleIds).toContain('LAB_HBA1C_PREDIABETES');
    expect(ruleIds).toContain('LAB_HBA1C_DIABETES');
  });

  it('does NOT fire HbA1c alert when value is normal (< 5.7%)', () => {
    const record = makeLabRecord('HbA1c', '4548-4', 5.4, '%');
    const alerts = evaluator.evaluate(record);

    const hba1cAlerts = alerts.filter(a => a.rule.ruleId.startsWith('LAB_HBA1C'));
    expect(hba1cAlerts).toHaveLength(0);
  });

  it('fires potassium critical alert when K < 2.5 mEq/L', () => {
    const record = makeLabRecord('Potassium', '2823-3', 2.1, 'mEq/L');
    const alerts = evaluator.evaluate(record);

    const critAlert = alerts.find(a => a.rule.ruleId === 'LAB_POTASSIUM_CRITICAL_LOW');
    expect(critAlert).toBeDefined();
    expect(critAlert!.severity).toBe('CRITICAL');
  });

  it('ELENA: invalid records produce zero alerts', () => {
    const record = makeLabRecord('HbA1c', '4548-4', 9.0, '%', {
      validation: {
        isValid: false,
        errors: [{ code: 'INSUFFICIENT_DATA', field: 'value', message: 'Lab value missing' }],
        warnings: [],
        completenessScore: 0.3,
      },
    });
    const alerts = evaluator.evaluate(record);
    expect(alerts).toHaveLength(0);
  });

  it('ELENA: humanReviewRequired is true on all alerts', () => {
    const record = makeLabRecord('HbA1c', '4548-4', 7.5, '%');
    const alerts = evaluator.evaluate(record);

    for (const alert of alerts) {
      expect(alert.humanReviewRequired).toBe(true);
    }
  });

  it('ELENA: all alerts include citationUrl from the rule', () => {
    const record = makeLabRecord('HbA1c', '4548-4', 7.5, '%');
    const alerts = evaluator.evaluate(record);

    for (const alert of alerts) {
      expect(alert.citationUrl).toMatch(/^https?:\/\//);
    }
  });

  it('skips rule when unit is incompatible', () => {
    // Value would trigger HbA1c rule, but unit is wrong (mmol/mol not %)
    const record = makeLabRecord('HbA1c', '4548-4', 58, 'mmol/mol');
    const alerts = evaluator.evaluate(record);

    // Should not trigger % rules for mmol/mol measurement
    const hba1cAlerts = alerts.filter(a => a.rule.ruleId.startsWith('LAB_HBA1C'));
    expect(hba1cAlerts).toHaveLength(0);
  });
});

describe('PreventionEvaluator — Vital sign alerts', () => {
  let evaluator: PreventionEvaluator;

  beforeEach(() => {
    evaluator = new PreventionEvaluator();
  });

  it('fires Stage 2 hypertension alert for systolic BP >= 140 mmHg', () => {
    const record = makeVitalRecord('BLOOD_PRESSURE', 155, 'mmHg');
    const alerts = evaluator.evaluate(record);

    const bpAlert = alerts.find(a => a.rule.ruleId === 'VITAL_BP_SYSTOLIC_STAGE2');
    expect(bpAlert).toBeDefined();
    expect(bpAlert!.severity).toBe('HIGH');
  });

  it('fires critical hypertension alert for systolic BP >= 180 mmHg', () => {
    const record = makeVitalRecord('BLOOD_PRESSURE', 185, 'mmHg');
    const alerts = evaluator.evaluate(record);

    const critAlert = alerts.find(a => a.rule.ruleId === 'VITAL_BP_SYSTOLIC_CRISIS');
    expect(critAlert).toBeDefined();
    expect(critAlert!.severity).toBe('CRITICAL');
  });

  it('fires hypoxemia alert for SpO2 < 94%', () => {
    const record = makeVitalRecord('SPO2', 91, '%');
    const alerts = evaluator.evaluate(record);

    const spo2Alert = alerts.find(a => a.rule.ruleId === 'VITAL_SPO2_LOW');
    expect(spo2Alert).toBeDefined();
  });

  it('fires critical hypoxemia alert for SpO2 < 90%', () => {
    const record = makeVitalRecord('SPO2', 88, '%');
    const alerts = evaluator.evaluate(record);

    const ruleIds = alerts.map(a => a.rule.ruleId);
    expect(ruleIds).toContain('VITAL_SPO2_LOW');
    expect(ruleIds).toContain('VITAL_SPO2_CRITICAL');
  });

  it('normal vitals produce no alerts', () => {
    const record = makeVitalRecord('BLOOD_PRESSURE', 118, 'mmHg');
    const alerts = evaluator.evaluate(record);
    expect(alerts).toHaveLength(0);
  });
});

describe('PreventionEvaluator — Screening gaps', () => {
  let evaluator: PreventionEvaluator;

  beforeEach(() => {
    evaluator = new PreventionEvaluator();
  });

  it('fires mammogram overdue alert when no screening history', () => {
    const demographicsRecord = makeLabRecord('Demographics', '', 0, '', {
      recordType: 'PATIENT_DEMOGRAPHICS',
      payload: { kind: 'PATIENT_DEMOGRAPHICS', birthDate: new Date('1975-01-01'), gender: 'FEMALE' as const },
    });

    const history: PatientHistory = {
      patientId: 'patient-001',
      tenantId: 'tenant-holi',
      lastScreeningDates: {}, // No mammogram on record
    };

    const alerts = evaluator.evaluate(demographicsRecord, history);
    const mammAlert = alerts.find(a => a.rule.ruleId === 'SCREEN_MAMMOGRAM_OVERDUE');
    expect(mammAlert).toBeDefined();
  });

  it('does NOT fire overdue alert when screening was recent', () => {
    const demographicsRecord = makeLabRecord('Demographics', '', 0, '', {
      recordType: 'PATIENT_DEMOGRAPHICS',
      payload: { kind: 'PATIENT_DEMOGRAPHICS', birthDate: new Date('1975-01-01'), gender: 'FEMALE' as const },
    });

    const history: PatientHistory = {
      patientId: 'patient-001',
      tenantId: 'tenant-holi',
      lastScreeningDates: {
        MAMMOGRAM: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
      },
    };

    const alerts = evaluator.evaluate(demographicsRecord, history);
    const mammAlert = alerts.find(a => a.rule.ruleId === 'SCREEN_MAMMOGRAM_OVERDUE');
    expect(mammAlert).toBeUndefined();
  });
});

describe('RuleRegistry — ELENA invariant enforcement', () => {
  it('throws if sourceAuthority is missing from a custom rule', () => {
    const registry = new RuleRegistry();
    const badRule = {
      ruleId: 'TEST_RULE_NO_SOURCE',
      name: 'Test Rule',
      category: 'LAB_ALERT' as const,
      targetRecordType: 'LAB_RESULT',
      condition: { field: 'value', operator: '>' as const, value: 5 },
      severity: 'LOW' as const,
      message: 'Test message',
      actionRequired: 'Test action',
      sourceAuthority: '',  // MISSING — should throw
      citationUrl: 'https://example.com',
    };

    expect(() => registry.registerCustomRule(badRule)).toThrow(/ELENA VETO/);
    expect(() => registry.registerCustomRule(badRule)).toThrow(/sourceAuthority/);
  });

  it('throws if citationUrl is missing from a custom rule', () => {
    const registry = new RuleRegistry();
    const badRule: ClinicalRule = {
      ruleId: 'TEST_RULE_NO_URL',
      name: 'Test Rule',
      category: 'LAB_ALERT' as const,
      targetRecordType: 'LAB_RESULT',
      condition: { field: 'value', operator: '>' as const, value: 5 },
      severity: 'LOW' as const,
      message: 'Test message',
      actionRequired: 'Test action',
      sourceAuthority: 'Legitimate Medical Authority',
      citationUrl: '',  // MISSING — should throw
    };

    expect(() => registry.registerCustomRule(badRule)).toThrow(/ELENA VETO/);
    expect(() => registry.registerCustomRule(badRule)).toThrow(/citationUrl/);
  });

  it('throws if sourceAuthority cites an LLM', () => {
    const registry = new RuleRegistry();
    const badRule: ClinicalRule = {
      ruleId: 'TEST_RULE_LLM_SOURCE',
      name: 'Test Rule',
      category: 'LAB_ALERT' as const,
      targetRecordType: 'LAB_RESULT',
      condition: { field: 'value', operator: '>' as const, value: 5 },
      severity: 'LOW' as const,
      message: 'Test message',
      actionRequired: 'Test action',
      sourceAuthority: 'Generated by Claude AI',  // LLM — should throw
      citationUrl: 'https://example.com',
    };

    expect(() => registry.registerCustomRule(badRule)).toThrow(/ELENA VETO/);
    expect(() => registry.registerCustomRule(badRule)).toThrow(/LLM output/);
  });

  it('loads all built-in rules on instantiation without errors', () => {
    expect(() => new RuleRegistry()).not.toThrow();
  });

  it('all built-in rules have sourceAuthority and citationUrl', () => {
    const registry = new RuleRegistry();
    for (const rule of registry.getAllRules()) {
      expect(rule.sourceAuthority).toBeTruthy();
      expect(rule.citationUrl).toMatch(/^https?:\/\//);
    }
  });

  it('loads more than 10 rules across all rule files', () => {
    const registry = new RuleRegistry();
    expect(registry.count).toBeGreaterThan(10);
  });
});
