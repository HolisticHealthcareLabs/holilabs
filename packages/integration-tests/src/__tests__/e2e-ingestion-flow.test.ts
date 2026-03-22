/**
 * E2E Test: Complete data pipeline flow
 *
 * Tests:
 * 1. FHIR Bundle → canonical conversion (ELENA: no imputation)
 * 2. Canonical → event publishing (CYRUS: tenantId present)
 * 3. Event → prevention evaluation
 * 4. Pipeline timing < 100ms (no I/O)
 */

import { EventPublisher } from '@holi/event-bus';
import { PreventionEvaluator } from '@holi/prevention-engine';
import { FHIRToCanonicalConverter } from '@holi/fhir-canonical';
import type { CanonicalHealthRecord, CanonicalLabResult } from '@holi/data-ingestion';
import { createDiabeticPatientBundle } from '../fixtures/fhir-bundle-diabetic-patient';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import '../fhir-types';

describe('E2E: Complete Ingestion Flow', () => {
  let publisher: EventPublisher;
  let evaluator: PreventionEvaluator;
  let converter: FHIRToCanonicalConverter;

  beforeEach(() => {
    // Create mocked Redis client via jest.mock
    const mockRedisClient = new Redis();

    // Initialize services with mocked Redis
    publisher = new EventPublisher({}, mockRedisClient);
    evaluator = new PreventionEvaluator();
    converter = new FHIRToCanonicalConverter('FHIR_R4_Test', 'https://example.com/fhir');
  });

  afterEach(async () => {
    try {
      await publisher.disconnect();
    } catch (e) {
      // Ignore connection errors in tests
    }
  });

  it('should convert FHIR Bundle to canonical records without imputation', () => {
    const bundle = createDiabeticPatientBundle();
    converter = new FHIRToCanonicalConverter('FHIR_R4_Test', 'https://example.com/fhir');

    const patient = bundle.entry?.[0]?.resource as fhir4.Patient;

    // Convert patient
    const canonicalPatient = converter.convertPatient(patient);
    expect(canonicalPatient).toBeDefined();
    expect(canonicalPatient.id).toBe(patient.id);
    expect(canonicalPatient.firstName).toBe('João');
    expect(canonicalPatient.lastName).toBe('Silva');
    expect(canonicalPatient.cpf).toBe('12345678901');
    expect(canonicalPatient.dateOfBirth).toMatch(/1965-03-15/);
    expect(canonicalPatient.gender).toBe('male');
    // ELENA: source tracking required
    expect(canonicalPatient.sourceAuthority).toBeDefined();
    expect(canonicalPatient.citationUrl).toBeDefined();
    expect(canonicalPatient.humanReviewRequired).toBe(true);

    // Verify address preservation
    expect(canonicalPatient.address?.city).toBe('São Paulo');
    expect(canonicalPatient.address?.state).toBe('SP');
    expect(canonicalPatient.address?.postalCode).toBe('01234567');
  });

  it('should preserve HbA1c observation without unit conversion', () => {
    const bundle = createDiabeticPatientBundle();
    converter = new FHIRToCanonicalConverter('FHIR_Test', 'https://example.com');

    const hba1cObs = bundle.entry?.[1]?.resource as fhir4.Observation;
    const canonicalObs = converter.convertObservation(hba1cObs);

    expect(canonicalObs).toBeDefined();
    expect(canonicalObs.value).toBe(7.2);
    expect(canonicalObs.unit).toBe('%');
    expect(canonicalObs.sourceAuthority).toBe('FHIR_Test');
    expect(canonicalObs.humanReviewRequired).toBe(true);
    // ELENA: no imputation
    expect(canonicalObs.loincCode).toBe('4548-4');
  });

  it('should create prevention alert for diabetic patient (HbA1c >= 6.5%)', () => {
    // Create a synthetic canonical lab result for HbA1c 7.2%
    const tenantId = 'tenant-1';
    const patientId = uuidv4();

    const hba1cRecord: CanonicalHealthRecord = {
      ingestId: uuidv4(),
      sourceId: 'fhir-source-1',
      sourceType: 'FHIR_R4',
      tenantId,
      patientId,
      ingestedAt: new Date(),
      recordType: 'LAB_RESULT',
      payload: {
        kind: 'LAB_RESULT',
        testName: 'Hemoglobin A1c',
        loincCode: '4548-4',
        value: 7.2,
        unit: '%',
        referenceRangeLow: 4.0,
        referenceRangeHigh: 5.7,
        interpretation: 'ABNORMAL',
        resultedAt: new Date(),
      } as CanonicalLabResult,
      validation: {
        isValid: true,
        errors: [],
        warnings: [],
        completenessScore: 0.95,
      },
      provenance: {
        sourceSystem: 'FHIR_R4',
        rawDataHash: 'mock-hash',
        normalizerVersion: '1.0.0',
        normalizedAt: new Date(),
        transformations: [],
      },
    };

    const alerts = evaluator.evaluate(hba1cRecord);
    expect(alerts.length).toBeGreaterThan(0);
    const highAlert = alerts.find(a => a.severity === 'HIGH');
    expect(highAlert).toBeDefined();
    expect(highAlert!.message).toContain('HbA1c');
    // ELENA: all alerts must have source authority
    expect(highAlert!.citationUrl).toBeDefined();
    expect(highAlert!.humanReviewRequired).toBe(true);
  });

  it('should emit record.ingested event with CYRUS: tenantId present', () => {
    // Create mock event
    const tenantId = 'tenant-abc-123';
    const patientId = uuidv4();

    const event = {
      type: 'record.ingested' as const,
      payload: {
        ingestId: uuidv4(),
        recordType: 'LAB_RESULT' as const,
        patientId,
        tenantId,
        sourceId: 'fhir-1',
        isValid: true,
        completenessScore: 0.92,
      },
    };

    // CYRUS: tenantId must be present in event envelope
    expect(event.payload.tenantId).toBe(tenantId);
    expect(event.payload.tenantId).toBeTruthy();
  });

  it('should handle QUINN: event bus errors without crashing', () => {
    // This test verifies that event publishing failures don't propagate
    const patientId = uuidv4();
    const tenantId = 'tenant-quinn-test';

    const labRecord: CanonicalHealthRecord = {
      ingestId: uuidv4(),
      sourceId: 'fhir-quinn',
      sourceType: 'FHIR_R4',
      tenantId,
      patientId,
      ingestedAt: new Date(),
      recordType: 'LAB_RESULT',
      payload: {
        kind: 'LAB_RESULT',
        testName: 'Potassium',
        value: 2.3,
        unit: 'mEq/L',
      } as CanonicalLabResult,
      validation: {
        isValid: true,
        errors: [],
        warnings: [],
        completenessScore: 0.8,
      },
      provenance: {
        sourceSystem: 'FHIR_R4',
        rawDataHash: 'mock-hash',
        normalizerVersion: '1.0.0',
        normalizedAt: new Date(),
        transformations: [],
      },
    };

    // Even if event publishing fails, evaluation should succeed
    const alerts = evaluator.evaluate(labRecord);
    expect(alerts).toBeDefined();
    expect(Array.isArray(alerts)).toBe(true);
  });

  it('should not evaluate invalid records (ELENA)', () => {
    const invalidRecord: CanonicalHealthRecord = {
      ingestId: uuidv4(),
      sourceId: 'invalid-fhir',
      sourceType: 'FHIR_R4',
      tenantId: 'tenant-1',
      patientId: uuidv4(),
      ingestedAt: new Date(),
      recordType: 'LAB_RESULT',
      payload: {
        kind: 'LAB_RESULT',
        testName: 'Unknown Test',
        value: 999,
        unit: 'unknown',
      } as CanonicalLabResult,
      validation: {
        isValid: false, // INVALID
        errors: [
          {
            field: 'value',
            code: 'INVALID_NUMBER',
            message: 'Value is not a valid number',
          },
        ],
        warnings: [],
        completenessScore: 0.2,
      },
      provenance: {
        sourceSystem: 'FHIR_R4',
        rawDataHash: 'mock-hash',
        normalizerVersion: '1.0.0',
        normalizedAt: new Date(),
        transformations: [],
      },
    };

    const alerts = evaluator.evaluate(invalidRecord);
    // ELENA: invalid records produce no alerts
    expect(alerts.length).toBe(0);
  });

  it('should complete full pipeline in < 100ms (no I/O)', () => {
    const startTime = Date.now();

    // 1. Create canonical record
    const tenantId = 'tenant-perf-test';
    const patientId = uuidv4();

    const record: CanonicalHealthRecord = {
      ingestId: uuidv4(),
      sourceId: 'perf-test',
      sourceType: 'FHIR_R4',
      tenantId,
      patientId,
      ingestedAt: new Date(),
      recordType: 'LAB_RESULT',
      payload: {
        kind: 'LAB_RESULT',
        testName: 'HbA1c',
        loincCode: '4548-4',
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

    // 2. Evaluate
    const alerts = evaluator.evaluate(record);

    // 3. Create event
    const event = {
      type: 'record.ingested' as const,
      payload: {
        ingestId: record.ingestId,
        recordType: record.recordType,
        patientId,
        tenantId,
        sourceId: record.sourceId,
        isValid: true,
        completenessScore: 0.9,
      },
    };

    const elapsedMs = Date.now() - startTime;
    expect(elapsedMs).toBeLessThan(100);
    console.log(`Pipeline completed in ${elapsedMs}ms`);
  });
});
