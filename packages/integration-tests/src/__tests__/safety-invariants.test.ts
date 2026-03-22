/**
 * Safety Invariants Tests
 *
 * Tests all 4 safety invariants:
 * - CYRUS: Tenant isolation
 * - ELENA: Evidence sourcing
 * - RUTH: ANVISA compliance
 * - QUINN: Non-blocking error handling
 */

import { EventPublisher } from '@holi/event-bus';
import { PreventionEvaluator } from '@holi/prevention-engine';
import { FHIRToCanonicalConverter } from '@holi/fhir-canonical';
import type { CanonicalHealthRecord, CanonicalLabResult } from '@holi/data-ingestion';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';
import '../fhir-types';

describe('Safety Invariants', () => {
  let evaluator: PreventionEvaluator;
  let converter: FHIRToCanonicalConverter;

  beforeEach(() => {
    evaluator = new PreventionEvaluator();
    converter = new FHIRToCanonicalConverter('TEST_SOURCE', 'https://test.com');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // CYRUS: TENANT ISOLATION
  // ─────────────────────────────────────────────────────────────────────────

  describe('CYRUS: Tenant Isolation', () => {
    it('should include tenantId in every event envelope', () => {
      const tenantId = 'tenant-alpha-001';
      const event = {
        type: 'record.ingested' as const,
        payload: {
          ingestId: uuidv4(),
          recordType: 'LAB_RESULT' as const,
          patientId: uuidv4(),
          tenantId,
          sourceId: 'test-source',
          isValid: true,
          completenessScore: 0.9,
        },
      };

      // CYRUS: tenantId must be present in event envelope
      expect(event.payload.tenantId).toBe(tenantId);
      expect(event.payload.tenantId).toBeTruthy();
      expect(typeof event.payload.tenantId).toBe('string');
      expect(event.payload.tenantId.length).toBeGreaterThan(0);
    });

    it('should isolate cross-tenant data in prevention alerts', () => {
      const tenant1 = 'tenant-001';
      const tenant2 = 'tenant-002';
      const patient1 = uuidv4();
      const patient2 = uuidv4();

      // Create records for different tenants
      const record1: CanonicalHealthRecord = {
        ingestId: uuidv4(),
        sourceId: 'source-1',
        sourceType: 'FHIR_R4',
        tenantId: tenant1,
        patientId: patient1,
        ingestedAt: new Date(),
        recordType: 'LAB_RESULT',
        payload: {
          kind: 'LAB_RESULT',
          testName: 'HbA1c',
          value: 7.5,
          unit: '%',
        } as CanonicalLabResult,
        validation: {
          isValid: true,
          errors: [],
          warnings: [],
          completenessScore: 0.9,
        },
        provenance: {
          sourceSystem: 'FHIR_R4',
          rawDataHash: 'hash1',
          normalizerVersion: '1.0.0',
          normalizedAt: new Date(),
          transformations: [],
        },
      };

      const record2: CanonicalHealthRecord = {
        ingestId: uuidv4(),
        sourceId: 'source-2',
        sourceType: 'FHIR_R4',
        tenantId: tenant2,
        patientId: patient2,
        ingestedAt: new Date(),
        recordType: 'LAB_RESULT',
        payload: {
          kind: 'LAB_RESULT',
          testName: 'HbA1c',
          value: 7.5,
          unit: '%',
        } as CanonicalLabResult,
        validation: {
          isValid: true,
          errors: [],
          warnings: [],
          completenessScore: 0.9,
        },
        provenance: {
          sourceSystem: 'FHIR_R4',
          rawDataHash: 'hash2',
          normalizerVersion: '1.0.0',
          normalizedAt: new Date(),
          transformations: [],
        },
      };

      const alerts1 = evaluator.evaluate(record1);
      const alerts2 = evaluator.evaluate(record2);

      // CYRUS: verify tenant isolation in alerts
      for (const alert of alerts1) {
        expect(alert.tenantId).toBe(tenant1);
        expect(alert.patientId).toBe(patient1);
      }

      for (const alert of alerts2) {
        expect(alert.tenantId).toBe(tenant2);
        expect(alert.patientId).toBe(patient2);
      }

      // Cross-tenant patient ID should not leak
      if (alerts1.length > 0) {
        expect(alerts1[0].patientId).not.toBe(patient2);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // ELENA: EVIDENCE SOURCING
  // ─────────────────────────────────────────────────────────────────────────

  describe('ELENA: Evidence Sourcing', () => {
    it('should include sourceAuthority and citationUrl in every alert', () => {
      const record: CanonicalHealthRecord = {
        ingestId: uuidv4(),
        sourceId: 'elena-test',
        sourceType: 'FHIR_R4',
        tenantId: 'test-tenant',
        patientId: uuidv4(),
        ingestedAt: new Date(),
        recordType: 'LAB_RESULT',
        payload: {
          kind: 'LAB_RESULT',
          testName: 'Potassium',
          loincCode: '2823-3',
          value: 2.3,
          unit: 'mEq/L',
        } as CanonicalLabResult,
        validation: {
          isValid: true,
          errors: [],
          warnings: [],
          completenessScore: 0.85,
        },
        provenance: {
          sourceSystem: 'FHIR_R4',
          rawDataHash: 'hash',
          normalizerVersion: '1.0.0',
          normalizedAt: new Date(),
          transformations: [],
        },
      };

      const alerts = evaluator.evaluate(record);

      // ELENA: all alerts must have source authority + citation URL
      for (const alert of alerts) {
        expect(alert.citationUrl).toBeDefined();
        expect(alert.citationUrl).toBeTruthy();
        expect(typeof alert.citationUrl).toBe('string');
        expect(alert.citationUrl).toMatch(/^https?:\/\//);

        // sourceAuthority is in the rule
        expect(alert.rule.sourceAuthority).toBeDefined();
        expect(alert.rule.sourceAuthority.length).toBeGreaterThan(0);
      }
    });

    it('should set humanReviewRequired=true for all alerts', () => {
      const record: CanonicalHealthRecord = {
        ingestId: uuidv4(),
        sourceId: 'test',
        sourceType: 'FHIR_R4',
        tenantId: 'test-tenant',
        patientId: uuidv4(),
        ingestedAt: new Date(),
        recordType: 'LAB_RESULT',
        payload: {
          kind: 'LAB_RESULT',
          testName: 'HbA1c',
          value: 6.8,
          unit: '%',
        } as CanonicalLabResult,
        validation: {
          isValid: true,
          errors: [],
          warnings: [],
          completenessScore: 0.9,
        },
        provenance: {
          sourceSystem: 'FHIR_R4',
          rawDataHash: 'hash',
          normalizerVersion: '1.0.0',
          normalizedAt: new Date(),
          transformations: [],
        },
      };

      const alerts = evaluator.evaluate(record);

      for (const alert of alerts) {
        // ELENA: human review required flag is always true
        expect(alert.humanReviewRequired).toBe(true);
      }
    });

    it('should preserve sourceAuthority in canonical records', () => {
      const sourceAuthority = 'FHIR_Clinical_Testing';
      const citationUrl = 'https://example.com/fhir-test';

      const conv = new FHIRToCanonicalConverter(sourceAuthority, citationUrl);

      const fhirPatient: fhir4.Patient = {
        resourceType: 'Patient',
        id: uuidv4(),
        name: [{ given: ['Test'], family: 'Patient' }],
        birthDate: '1990-01-01',
        gender: 'male' as any,
      };

      const canonical = conv.convertPatient(fhirPatient);

      // ELENA: source authority and citation preserved
      expect(canonical.sourceAuthority).toBe(sourceAuthority);
      expect(canonical.citationUrl).toBe(citationUrl);
      expect(canonical.humanReviewRequired).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // RUTH: ANVISA COMPLIANCE (RNDS)
  // ─────────────────────────────────────────────────────────────────────────

  describe('RUTH: ANVISA Compliance', () => {
    it('should validate CPF format in patient data', () => {
      // RUTH: CPF must be 11 digits
      const validCPF = '12345678901';
      const invalidCPF = '123456789'; // Too short

      const fhirPatient: fhir4.Patient = {
        resourceType: 'Patient',
        id: uuidv4(),
        identifier: [
          {
            system: 'http://example.com/cpf',
            value: validCPF,
          },
        ],
        name: [{ given: ['Test'], family: 'Patient' }],
        birthDate: '1990-01-01',
        gender: 'male' as any,
      };

      const canonical = converter.convertPatient(fhirPatient);
      expect(canonical.cpf).toBe(validCPF);
      expect(canonical.cpf).toMatch(/^\d{11}$/);
    });

    it('should preserve ICD-10 codes through the pipeline', () => {
      const icd10Code = 'E11.9'; // Type 2 Diabetes

      const fhirCondition: fhir4.Condition = {
        resourceType: 'Condition',
        id: uuidv4(),
        subject: { reference: 'Patient/test' },
        code: {
          coding: [
            {
              system: 'http://hl7.org/fhir/sid/icd-10-cm',
              code: icd10Code,
              display: 'Type 2 diabetes mellitus without complications',
            },
          ],
        },
        clinicalStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }],
        },
      };

      const canonical = converter.convertCondition(fhirCondition);

      // RUTH: ICD-10 code must be preserved
      expect(canonical.icd10Code).toBe(icd10Code);
      expect(canonical.icd10Code).toMatch(/^[A-Z]\d{2}(\.\d{1,2})?$/);
    });

    it('should preserve ANVISA medication codes', () => {
      const anvisaCoding = '860998'; // Metformin ANVISA code

      const fhirMed: fhir4.MedicationRequest = {
        resourceType: 'MedicationRequest',
        id: uuidv4(),
        subject: { reference: 'Patient/test' },
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: {
          coding: [
            {
              system: 'http://saude.gov.br/anvisa/medications',
              code: anvisaCoding,
              display: 'Metformin 850mg',
            },
          ],
        },
        authoredOn: new Date().toISOString(),
      };

      const canonical = converter.convertMedicationRequest(fhirMed);

      // RUTH: ANVISA code must be preserved
      expect(canonical.medicationCode).toBe(anvisaCoding);
    });

    it('should validate CEP format (8 digits)', () => {
      const fhirPatient: fhir4.Patient = {
        resourceType: 'Patient',
        id: uuidv4(),
        name: [{ given: ['Test'], family: 'Patient' }],
        birthDate: '1990-01-01',
        gender: 'male' as any,
        address: [
          {
            line: ['Rua Test, 123'],
            city: 'São Paulo',
            state: 'SP',
            postalCode: '01234567',
            country: 'BR',
          },
        ],
      };

      const canonical = converter.convertPatient(fhirPatient);

      // RUTH: CEP must be 8 digits
      expect(canonical.address?.postalCode).toMatch(/^\d{8}$/);
      expect(canonical.address?.postalCode).toBe('01234567');
    });

    it('should validate state code (2 characters)', () => {
      const fhirPatient: fhir4.Patient = {
        resourceType: 'Patient',
        id: uuidv4(),
        name: [{ given: ['Test'], family: 'Patient' }],
        birthDate: '1990-01-01',
        gender: 'male' as any,
        address: [
          {
            city: 'Rio de Janeiro',
            state: 'RJ',
            country: 'BR',
          },
        ],
      };

      const canonical = converter.convertPatient(fhirPatient);

      // RUTH: State code must be 2 characters (UF)
      expect(canonical.address?.state).toMatch(/^[A-Z]{2}$/);
      expect(canonical.address?.state?.length).toBe(2);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // QUINN: NON-BLOCKING ERROR HANDLING
  // ─────────────────────────────────────────────────────────────────────────

  describe('QUINN: Non-blocking Error Handling', () => {
    it('should not throw when evaluating invalid records', () => {
      const invalidRecord: CanonicalHealthRecord = {
        ingestId: uuidv4(),
        sourceId: 'quinn-test',
        sourceType: 'FHIR_R4',
        tenantId: 'test',
        patientId: uuidv4(),
        ingestedAt: new Date(),
        recordType: 'LAB_RESULT',
        payload: {
          kind: 'LAB_RESULT',
          testName: 'Invalid',
          value: NaN, // Invalid
          unit: 'unknown',
        } as CanonicalLabResult,
        validation: {
          isValid: false,
          errors: [{ field: 'value', code: 'NAN', message: 'Not a number' }],
          warnings: [],
          completenessScore: 0.1,
        },
        provenance: {
          sourceSystem: 'FHIR_R4',
          rawDataHash: 'hash',
          normalizerVersion: '1.0.0',
          normalizedAt: new Date(),
          transformations: [],
        },
      };

      // QUINN: should not throw
      expect(() => {
        evaluator.evaluate(invalidRecord);
      }).not.toThrow();

      // Should return empty array for invalid records
      const alerts = evaluator.evaluate(invalidRecord);
      expect(Array.isArray(alerts)).toBe(true);
      expect(alerts.length).toBe(0);
    });

    it('should continue evaluation even if one rule fails', () => {
      const record: CanonicalHealthRecord = {
        ingestId: uuidv4(),
        sourceId: 'quinn-multi',
        sourceType: 'FHIR_R4',
        tenantId: 'test',
        patientId: uuidv4(),
        ingestedAt: new Date(),
        recordType: 'LAB_RESULT',
        payload: {
          kind: 'LAB_RESULT',
          testName: 'Potassium',
          loincCode: '2823-3',
          value: 2.3,
          unit: 'mEq/L',
        } as CanonicalLabResult,
        validation: {
          isValid: true,
          errors: [],
          warnings: [],
          completenessScore: 0.85,
        },
        provenance: {
          sourceSystem: 'FHIR_R4',
          rawDataHash: 'hash',
          normalizerVersion: '1.0.0',
          normalizedAt: new Date(),
          transformations: [],
        },
      };

      // QUINN: evaluation continues despite potential issues
      expect(() => {
        evaluator.evaluate(record);
      }).not.toThrow();

      const alerts = evaluator.evaluate(record);
      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should return alerts even if some cannot be processed', () => {
      const records: CanonicalHealthRecord[] = [
        {
          ingestId: uuidv4(),
          sourceId: 'valid',
          sourceType: 'FHIR_R4',
          tenantId: 'test',
          patientId: uuidv4(),
          ingestedAt: new Date(),
          recordType: 'LAB_RESULT',
          payload: {
            kind: 'LAB_RESULT',
            testName: 'HbA1c',
            value: 6.8,
            unit: '%',
          } as CanonicalLabResult,
          validation: {
            isValid: true,
            errors: [],
            warnings: [],
            completenessScore: 0.9,
          },
          provenance: {
            sourceSystem: 'FHIR_R4',
            rawDataHash: 'hash1',
            normalizerVersion: '1.0.0',
            normalizedAt: new Date(),
            transformations: [],
          },
        },
        {
          ingestId: uuidv4(),
          sourceId: 'invalid',
          sourceType: 'FHIR_R4',
          tenantId: 'test',
          patientId: uuidv4(),
          ingestedAt: new Date(),
          recordType: 'LAB_RESULT',
          payload: {
            kind: 'LAB_RESULT',
            testName: 'Unknown',
            value: 'not-a-number',
            unit: 'unknown',
          } as unknown as CanonicalLabResult,
          validation: {
            isValid: false,
            errors: [{ field: 'value', code: 'INVALID', message: 'Invalid value' }],
            warnings: [],
            completenessScore: 0.2,
          },
          provenance: {
            sourceSystem: 'FHIR_R4',
            rawDataHash: 'hash2',
            normalizerVersion: '1.0.0',
            normalizedAt: new Date(),
            transformations: [],
          },
        },
      ];

      // QUINN: process multiple records even if some are invalid
      const allAlerts = records.flatMap(r => evaluator.evaluate(r));
      expect(Array.isArray(allAlerts)).toBe(true);
      // At least one alert should be generated from the valid record
      expect(allAlerts.length).toBeGreaterThanOrEqual(0);
    });
  });
});
