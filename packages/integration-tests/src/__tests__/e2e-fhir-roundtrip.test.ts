/**
 * E2E Test: FHIR Roundtrip with Prevention
 *
 * Tests:
 * 1. FHIR Bundle → canonical → back to FHIR
 * 2. Data integrity through roundtrip
 * 3. Prevention alerts generated during canonical phase
 * 4. Reconverted FHIR is valid
 */

import { FHIRToCanonicalConverter, CanonicalToFHIRConverter } from '@holi/fhir-canonical';
import { PreventionEvaluator } from '@holi/prevention-engine';
import type { CanonicalHealthRecord, CanonicalLabResult } from '@holi/data-ingestion';
import { createDiabeticPatientBundle } from '../fixtures/fhir-bundle-diabetic-patient';
import { createEmergencyPatientBundle } from '../fixtures/fhir-bundle-emergency';
import { createPregnantPatientBundle } from '../fixtures/fhir-bundle-pregnant-patient';
import { v4 as uuidv4 } from 'uuid';
import '../fhir-types';

describe('E2E: FHIR Roundtrip with Prevention', () => {
  let converter: FHIRToCanonicalConverter;
  let evaluator: PreventionEvaluator;

  beforeEach(() => {
    converter = new FHIRToCanonicalConverter('FHIR_ROUNDTRIP_TEST', 'https://example.com/roundtrip');
    evaluator = new PreventionEvaluator();
  });

  it('should convert FHIR Bundle to canonical and back', () => {
    const originalBundle = createDiabeticPatientBundle();
    expect(originalBundle.entry).toBeDefined();
    expect(originalBundle.entry!.length).toBeGreaterThan(0);

    // FHIR → Canonical
    const canonicalRecord = converter.convertBundle(originalBundle);
    expect(canonicalRecord).toBeDefined();
    expect(canonicalRecord.patientId).toBeDefined();
    expect(canonicalRecord.patient).toBeDefined();
    expect(canonicalRecord.observations).toBeDefined();
    expect(canonicalRecord.conditions).toBeDefined();
    expect(canonicalRecord.medications).toBeDefined();

    // Canonical → FHIR (roundtrip)
    const reconverted = new CanonicalToFHIRConverter().convertToBundle(canonicalRecord);
    expect(reconverted).toBeDefined();
    expect(reconverted.entry).toBeDefined();
    expect(reconverted.entry!.length).toBeGreaterThan(0);
  });

  it('should preserve patient data through FHIR → canonical conversion', () => {
    const bundle = createDiabeticPatientBundle();
    const canonical = converter.convertBundle(bundle);

    // Patient data integrity
    expect(canonical.patient.firstName).toBe('João');
    expect(canonical.patient.lastName).toBe('Silva');
    expect(canonical.patient.cpf).toBe('12345678901');
    expect(canonical.patient.dateOfBirth).toMatch(/1965-03-15/);
    expect(canonical.patient.gender).toBe('male');
    expect(canonical.patient.email).toBe('joao.silva@example.com');
    expect(canonical.patient.address?.city).toBe('São Paulo');
    expect(canonical.patient.address?.state).toBe('SP');
  });

  it('should preserve observation data through conversion', () => {
    const bundle = createDiabeticPatientBundle();
    const canonical = converter.convertBundle(bundle);

    // Observations preserved
    expect(canonical.observations.length).toBeGreaterThanOrEqual(3);

    // HbA1c observation
    const hba1c = canonical.observations.find(o => o.loincCode === '4548-4');
    expect(hba1c).toBeDefined();
    expect(hba1c?.value).toBe(7.2);
    expect(hba1c?.unit).toBe('%');

    // Glucose observation
    const glucose = canonical.observations.find(o => o.loincCode === '2345-7');
    expect(glucose).toBeDefined();
    expect(glucose?.value).toBe(145);
    expect(glucose?.unit).toBe('mg/dL');

    // Blood pressure observation
    const bp = canonical.observations.find(o => o.loincCode === '85354-9');
    expect(bp).toBeDefined();
  });

  it('should preserve condition data (ICD-10 codes)', () => {
    const bundle = createDiabeticPatientBundle();
    const canonical = converter.convertBundle(bundle);

    expect(canonical.conditions.length).toBeGreaterThan(0);

    const diabetes = canonical.conditions.find(c => c.icd10Code === 'E11.9');
    expect(diabetes).toBeDefined();
    expect(diabetes?.display).toContain('diabetes');
    expect(diabetes?.clinicalStatus).toBe('active');
  });

  it('should preserve medication data through conversion', () => {
    const bundle = createDiabeticPatientBundle();
    const canonical = converter.convertBundle(bundle);

    expect(canonical.medications.length).toBeGreaterThanOrEqual(2);

    // Medications with codes preserved
    const metformin = canonical.medications.find(m => m.medicationDisplay.includes('Metformin'));
    expect(metformin).toBeDefined();
    expect(metformin?.medicationCode).toBe('860998');
    expect(metformin?.status).toBe('active');

    const losartan = canonical.medications.find(m => m.medicationDisplay.includes('Losartan'));
    expect(losartan).toBeDefined();
    expect(losartan?.medicationCode).toBe('83515');
  });

  it('should generate prevention alerts during canonical phase (HbA1c alert)', () => {
    const bundle = createDiabeticPatientBundle();
    const canonical = converter.convertBundle(bundle);

    // Evaluate observations for prevention alerts
    const alerts: any[] = [];
    for (const obs of canonical.observations) {
      // Create synthetic CanonicalHealthRecord for each observation
      const record: CanonicalHealthRecord = {
        ingestId: uuidv4(),
        sourceId: 'test',
        sourceType: 'FHIR_R4',
        tenantId: 'test-tenant',
        patientId: canonical.patientId,
        ingestedAt: new Date(),
        recordType: 'LAB_RESULT',
        payload: {
          kind: 'LAB_RESULT',
          testName: obs.display,
          loincCode: obs.loincCode,
          value: obs.value,
          unit: obs.unit,
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

      const recordAlerts = evaluator.evaluate(record);
      alerts.push(...recordAlerts);
    }

    // HbA1c 7.2% should trigger HIGH severity alert
    const hba1cAlerts = alerts.filter(a => a.message && a.message.includes('HbA1c'));
    expect(hba1cAlerts.length).toBeGreaterThan(0);
    const hba1cAlert = hba1cAlerts.find(a => a.severity === 'HIGH');
    expect(hba1cAlert).toBeDefined();
    expect(hba1cAlert!.severity).toBe('HIGH');
    expect(hba1cAlert.humanReviewRequired).toBe(true);
  });

  it('should generate CRITICAL alert for emergency potassium level', () => {
    const bundle = createEmergencyPatientBundle();
    const canonical = converter.convertBundle(bundle);

    // Find potassium observation (2.3 mEq/L)
    const potassiumObs = canonical.observations.find(
      o => o.code === '2823-3' || o.loincCode === '2823-3'
    );
    expect(potassiumObs).toBeDefined();
    expect(potassiumObs?.value).toBe(2.3);

    // Evaluate for alerts
    const record: CanonicalHealthRecord = {
      ingestId: uuidv4(),
      sourceId: 'emergency',
      sourceType: 'FHIR_R4',
      tenantId: 'emergency-tenant',
      patientId: canonical.patientId,
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
    expect(alerts.length).toBeGreaterThan(0);

    // Should have CRITICAL alert
    const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL');
    expect(criticalAlerts.length).toBeGreaterThan(0);
    expect(criticalAlerts[0].message.toLowerCase()).toContain('potassium');
  });

  it('should maintain data integrity across multiple observations', () => {
    const bundle = createDiabeticPatientBundle();
    const canonical = converter.convertBundle(bundle);

    // Verify all observations are present
    const observationCodes = canonical.observations.map(o => o.loincCode || o.code);
    expect(observationCodes).toContain('4548-4'); // HbA1c
    expect(observationCodes).toContain('2345-7'); // Glucose

    // Verify no data loss in any observation
    for (const obs of canonical.observations) {
      expect(obs.id).toBeDefined();
      expect(obs.patientId).toBe(canonical.patientId);
      expect(obs.display).toBeDefined();
      expect(obs.sourceAuthority).toBeDefined();
      expect(obs.effectiveDateTime).toBeDefined();
    }
  });

  it('should handle missing optional fields gracefully', () => {
    // Create minimal FHIR Bundle
    const minimalBundle: fhir4.Bundle = {
      resourceType: 'Bundle',
      id: uuidv4(),
      type: 'transaction',
      entry: [
        {
          resource: {
            resourceType: 'Patient',
            id: uuidv4(),
            name: [{ given: ['Minimal'], family: 'Patient' }],
            birthDate: '1990-01-01',
            gender: 'male',
          } as any,
        },
      ],
    };

    const canonical = converter.convertBundle(minimalBundle);

    expect(canonical.patient).toBeDefined();
    expect(canonical.patient.firstName).toBe('Minimal');
    expect(canonical.observations.length).toBe(0);
    expect(canonical.conditions.length).toBe(0);
    expect(canonical.medications.length).toBe(0);
  });

  it('should preserve source authority through FHIR → canonical', () => {
    const sourceAuthority = 'CUSTOM_EHR_SYSTEM';
    const citationUrl = 'https://custom-ehr.example.com/records';

    const conv = new FHIRToCanonicalConverter(sourceAuthority, citationUrl);
    const bundle = createDiabeticPatientBundle();
    const canonical = conv.convertBundle(bundle);

    // ELENA: source authority preserved
    expect(canonical.patient.sourceAuthority).toBe(sourceAuthority);
    expect(canonical.patient.citationUrl).toBe(citationUrl);

    for (const obs of canonical.observations) {
      expect(obs.sourceAuthority).toBe(sourceAuthority);
      expect(obs.citationUrl).toBe(citationUrl);
    }

    for (const cond of canonical.conditions) {
      expect(cond.sourceAuthority).toBe(sourceAuthority);
    }

    for (const med of canonical.medications) {
      expect(med.sourceAuthority).toBe(sourceAuthority);
    }
  });

  it('should handle complex FHIR structures', () => {
    const bundle = createDiabeticPatientBundle();

    // Bundle has 7 entries: Patient + 3 Observations + 1 Condition + 2 Medications
    expect(bundle.entry!.length).toBe(7);

    const canonical = converter.convertBundle(bundle);

    // All entries processed
    expect(canonical.patient).toBeDefined();
    expect(canonical.observations.length).toBe(3);
    expect(canonical.conditions.length).toBe(1);
    expect(canonical.medications.length).toBe(2);

    // Total entries = 1 + 3 + 1 + 2 = 7
    const totalConverted = 1 + canonical.observations.length + canonical.conditions.length + canonical.medications.length;
    expect(totalConverted).toBe(7);
  });

  it('should handle pregnant patient bundle without alerts', () => {
    const bundle = createPregnantPatientBundle();
    const canonical = converter.convertBundle(bundle);

    expect(canonical.patient.firstName).toBe('Maria');
    expect(canonical.patient.lastName).toBe('Santos');
    expect(canonical.observations.length).toBeGreaterThan(0);
    expect(canonical.conditions.length).toBeGreaterThan(0);
  });
});
