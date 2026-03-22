/**
 * IngestionPipeline — Unit Tests
 *
 * Tests FHIR R4, CSV, and validation edge cases.
 * No network calls — all connectors mocked.
 */

import { IngestionPipeline } from '../ingestion.pipeline';
import type { DataSource } from '../../types';

// ─── Mock fetch globally ───────────────────────────────────────────────────────
const mockFetch = jest.fn();
global.fetch = mockFetch;

const baseFhirSource: DataSource = {
  id: 'src_test_fhir_001',
  name: 'Test FHIR Server',
  type: 'FHIR_R4',
  tenantId: 'tenant_test',
  isActive: true,
  createdAt: new Date(),
  config: {
    kind: 'FHIR_R4',
    baseUrl: 'https://hapi.fhir.org/baseR4',
    authType: 'NONE',
    resourceTypes: ['Observation'],
  },
};

const baseCsvSource: DataSource = {
  id: 'src_test_csv_001',
  name: 'Test Lab CSV',
  type: 'CSV',
  tenantId: 'tenant_test',
  patientId: 'patient_001',
  isActive: true,
  createdAt: new Date(),
  config: {
    kind: 'CSV',
    hasHeader: true,
    delimiter: ',',
    columnMapping: {
      test_name: 'testName',
      loinc: 'loincCode',
      result_value: 'value',
      result_unit: 'unit',
      reference_low: 'referenceRangeLow',
      reference_high: 'referenceRangeHigh',
      result_date: 'resultedAt',
    },
  },
};

describe('IngestionPipeline', () => {
  let pipeline: IngestionPipeline;

  beforeEach(() => {
    pipeline = new IngestionPipeline();
    jest.clearAllMocks();
  });

  // ─── FHIR Tests ─────────────────────────────────────────────────────────────

  describe('FHIR R4 connector', () => {
    it('should normalize a FHIR Observation bundle into CanonicalLabResult', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          resourceType: 'Bundle',
          entry: [
            {
              resource: {
                resourceType: 'Observation',
                id: 'obs_001',
                category: [{ coding: [{ code: 'laboratory' }] }],
                code: { coding: [{ code: '2160-0', display: 'Creatinine' }] },
                valueQuantity: { value: 0.9, unit: 'mg/dL' },
                effectiveDateTime: '2026-03-18T10:00:00Z',
                interpretation: [{ coding: [{ code: 'N' }] }],
              },
            },
          ],
        }),
        status: 200,
      });

      const result = await pipeline.run(baseFhirSource);

      expect(result.summary.totalFetched).toBe(1);
      expect(result.summary.totalValid).toBe(1);
      expect(result.validRecords[0].recordType).toBe('LAB_RESULT');

      const payload = result.validRecords[0].payload as any;
      expect(payload.kind).toBe('LAB_RESULT');
      expect(payload.testName).toBe('Creatinine');
      expect(payload.loincCode).toBe('2160-0');
      expect(payload.value).toBe(0.9);
      expect(payload.unit).toBe('mg/dL');
      expect(payload.interpretation).toBe('NORMAL');
    });

    it('should normalize FHIR vital signs to VITAL_SIGN records', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          resourceType: 'Bundle',
          entry: [
            {
              resource: {
                resourceType: 'Observation',
                category: [{ coding: [{ code: 'vital-signs' }] }],
                code: { coding: [{ code: '8867-4', display: 'Heart rate' }] },
                valueQuantity: { value: 72, unit: 'bpm' },
                effectiveDateTime: '2026-03-18T10:00:00Z',
              },
            },
          ],
        }),
        status: 200,
      });

      const result = await pipeline.run(baseFhirSource);

      expect(result.validRecords[0].recordType).toBe('VITAL_SIGN');
      const payload = result.validRecords[0].payload as any;
      expect(payload.vitalType).toBe('HEART_RATE');
      expect(payload.value).toBe(72);
    });

    it('should handle FHIR fetch failure gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const result = await pipeline.run(baseFhirSource);

      expect(result.job.status).toBe('FAILED');
      expect(result.summary.totalFetched).toBe(0);
      expect(result.job.errors[0].errorCode).toBe('FETCH_FAILED');
    });
  });

  // ─── CSV Tests ───────────────────────────────────────────────────────────────

  describe('CSV connector', () => {
    const validCsv = `test_name,loinc,result_value,result_unit,reference_low,reference_high,result_date
Hemoglobin,718-7,14.5,g/dL,12.0,17.5,2026-03-18
Platelets,777-3,250,10^3/uL,150,400,2026-03-18
WBC,6690-2,7.2,10^3/uL,4.5,11.0,2026-03-18`;

    it('should parse CSV and normalize to CanonicalLabResult records', async () => {
      const result = await pipeline.run(baseCsvSource, { fileContent: validCsv });

      expect(result.summary.totalFetched).toBe(3);
      expect(result.summary.totalValid).toBe(3);

      const hgb = result.validRecords[0].payload as any;
      expect(hgb.testName).toBe('Hemoglobin');
      expect(hgb.loincCode).toBe('718-7');
      expect(hgb.value).toBe(14.5);
      expect(hgb.unit).toBe('g/dL');
      expect(hgb.interpretation).toBe('NORMAL');
    });

    it('should flag records with missing value as INSUFFICIENT_DATA', async () => {
      const csvWithMissing = `test_name,loinc,result_value,result_unit,reference_low,reference_high,result_date
Hemoglobin,718-7,,g/dL,12.0,17.5,2026-03-18`;

      const result = await pipeline.run(baseCsvSource, { fileContent: csvWithMissing });

      expect(result.summary.totalInvalid).toBe(1);
      const errRecord = result.invalidRecords[0];
      expect(errRecord.validation.errors[0].code).toBe('INSUFFICIENT_DATA');
    });

    it('should throw error when fileContent is missing for CSV source', async () => {
      await expect(pipeline.run(baseCsvSource)).rejects.toThrow('requires fileContent');
    });
  });

  // ─── Dry Run Tests ────────────────────────────────────────────────────────────

  describe('dry run mode', () => {
    const validCsv = `test_name,loinc,result_value,result_unit,reference_low,reference_high,result_date
Creatinine,2160-0,1.1,mg/dL,0.6,1.2,2026-03-18`;

    it('should validate without returning records when dryRun=true', async () => {
      const result = await pipeline.run(baseCsvSource, {
        fileContent: validCsv,
        dryRun: true,
      });

      // Summary should still show counts
      expect(result.summary.totalFetched).toBe(1);
      expect(result.summary.totalValid).toBe(1);

      // But records arrays should be empty (no persistence)
      expect(result.records).toHaveLength(0);
      expect(result.validRecords).toHaveLength(0);
      expect(result.invalidRecords).toHaveLength(0);
    });
  });

  // ─── Provenance Tests ─────────────────────────────────────────────────────────

  describe('provenance chain', () => {
    const simpleCsv = `test_name,loinc,result_value,result_unit,reference_low,reference_high,result_date
TSH,11580-8,2.1,mIU/L,0.4,4.0,2026-03-18`;

    it('should populate provenance with hash and normalizer version', async () => {
      const result = await pipeline.run(baseCsvSource, { fileContent: simpleCsv });

      const record = result.validRecords[0];
      expect(record.provenance.rawDataHash).toBeTruthy();
      expect(record.provenance.rawDataHash.length).toBe(16); // truncated SHA256
      expect(record.provenance.normalizerVersion).toBe('1.0.0');
      expect(record.provenance.sourceSystem).toBe('Test Lab CSV');
    });
  });
});
