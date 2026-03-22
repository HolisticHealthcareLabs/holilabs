/**
 * Family History Escalation Tests
 *
 * ELENA: All escalation rules must have sourceAuthority + citationUrl
 * CYRUS: No PHI in escalated alert payloads
 */

import { randomUUID } from 'crypto';
import { PreventionEvaluator } from '../evaluator';
import { ruleRegistry } from '../rule-registry';
import type { PreventionAlert, PatientHistory, ClinicalRule } from '../types';
import type { CanonicalHealthRecord } from '@holi/data-ingestion';

function makeLabRecord(overrides: Partial<CanonicalHealthRecord> = {}): CanonicalHealthRecord {
  return {
    ingestId: randomUUID(),
    sourceId: 'test-source',
    sourceType: 'MANUAL',
    tenantId: 'tenant-001',
    patientId: 'patient-001',
    ingestedAt: new Date(),
    recordType: 'LAB_RESULT',
    payload: {
      kind: 'LAB_RESULT',
      testName: 'HbA1c',
      loincCode: '4548-4',
      value: 6.0,
      unit: '%',
    },
    validation: { isValid: true, errors: [], warnings: [], completenessScore: 1 },
    provenance: {
      sourceSystem: 'test',
      rawDataHash: 'abc123',
      normalizerVersion: '1.0.0',
      normalizedAt: new Date(),
      transformations: [],
    },
    ...overrides,
  } as CanonicalHealthRecord;
}

function makeAlert(rule: ClinicalRule, record: CanonicalHealthRecord): PreventionAlert {
  return {
    alertId: randomUUID(),
    patientId: record.patientId ?? 'UNKNOWN',
    tenantId: record.tenantId,
    rule,
    severity: rule.severity,
    message: rule.message,
    actionRequired: rule.actionRequired,
    citationUrl: rule.citationUrl,
    triggeredAt: new Date(),
    recordType: record.recordType,
    sourceRecordId: record.ingestId,
    humanReviewRequired: true,
  };
}

describe('Family History Escalation', () => {
  const evaluator = new PreventionEvaluator();

  describe('rule loading', () => {
    it('loads all 10 family history escalation rules without ELENA violations', () => {
      const escalationRules = ruleRegistry.getAllRules().filter(
        r => r.category === 'FAMILY_HISTORY_ESCALATION'
      );
      expect(escalationRules).toHaveLength(10);
      for (const rule of escalationRules) {
        expect(rule.sourceAuthority).toBeTruthy();
        expect(rule.citationUrl).toMatch(/^https?:\/\/.+/);
        expect(rule.escalatesRule).toBeTruthy();
        expect(rule.escalatedSeverity).toBeTruthy();
      }
    });
  });

  describe('evaluateWithFamilyHistory', () => {
    it('escalates HbA1c prediabetes alert to HIGH when family Hx diabetes present', () => {
      const record = makeLabRecord();
      const prediabetesRule = ruleRegistry.getRule('LAB_HBA1C_PREDIABETES')!;
      const existingAlerts = [makeAlert(prediabetesRule, record)];

      const history: PatientHistory = {
        patientId: 'patient-001',
        tenantId: 'tenant-001',
        familyHistory: [
          {
            relationship: 'father',
            conditions: [{ icdCode: 'E11.9', display: 'Type 2 diabetes mellitus, without complications' }],
          },
        ],
      };

      const result = evaluator.evaluateWithFamilyHistory(record, history, existingAlerts);
      expect(result.length).toBe(2);

      const escalated = result.find(a => a.rule.ruleId === 'FH_DIABETES_ESCALATION');
      expect(escalated).toBeDefined();
      expect(escalated!.severity).toBe('HIGH');
      expect(escalated!.message).toContain('family history of diabetes');
    });

    it('does NOT escalate when family Hx does not match', () => {
      const record = makeLabRecord();
      const prediabetesRule = ruleRegistry.getRule('LAB_HBA1C_PREDIABETES')!;
      const existingAlerts = [makeAlert(prediabetesRule, record)];

      const history: PatientHistory = {
        patientId: 'patient-001',
        tenantId: 'tenant-001',
        familyHistory: [
          {
            relationship: 'mother',
            conditions: [{ icdCode: 'J45', display: 'Asthma' }],
          },
        ],
      };

      const result = evaluator.evaluateWithFamilyHistory(record, history, existingAlerts);
      expect(result.length).toBe(1);
      expect(result[0].rule.ruleId).toBe('LAB_HBA1C_PREDIABETES');
    });

    it('preserves original alert when escalation adds a new one', () => {
      const record = makeLabRecord();
      const prediabetesRule = ruleRegistry.getRule('LAB_HBA1C_PREDIABETES')!;
      const originalAlert = makeAlert(prediabetesRule, record);
      const existingAlerts = [originalAlert];

      const history: PatientHistory = {
        patientId: 'patient-001',
        tenantId: 'tenant-001',
        familyHistory: [
          {
            relationship: 'father',
            conditions: [{ icdCode: 'E11', display: 'Type 2 diabetes' }],
          },
        ],
      };

      const result = evaluator.evaluateWithFamilyHistory(record, history, existingAlerts);
      expect(result).toContainEqual(originalAlert);
      expect(result.length).toBe(2);
    });

    it('returns original alerts unchanged when no family history provided', () => {
      const record = makeLabRecord();
      const prediabetesRule = ruleRegistry.getRule('LAB_HBA1C_PREDIABETES')!;
      const existingAlerts = [makeAlert(prediabetesRule, record)];

      const history: PatientHistory = {
        patientId: 'patient-001',
        tenantId: 'tenant-001',
      };

      const result = evaluator.evaluateWithFamilyHistory(record, history, existingAlerts);
      expect(result).toEqual(existingAlerts);
    });

    it('returns original alerts unchanged when family history is empty', () => {
      const record = makeLabRecord();
      const prediabetesRule = ruleRegistry.getRule('LAB_HBA1C_PREDIABETES')!;
      const existingAlerts = [makeAlert(prediabetesRule, record)];

      const history: PatientHistory = {
        patientId: 'patient-001',
        tenantId: 'tenant-001',
        familyHistory: [],
      };

      const result = evaluator.evaluateWithFamilyHistory(record, history, existingAlerts);
      expect(result).toEqual(existingAlerts);
    });
  });
});
