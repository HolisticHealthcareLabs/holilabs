/**
 * Encounter Memory Generator Tests
 *
 * Validates markdown pointer index generation:
 * - Header warning present (ELENA: memory is a HINT)
 * - Observations grouped by domain with staleness tags
 * - Critical/abnormal interpretation flags
 * - NKDA for no allergies
 * - Non-active medications listed separately
 * - Ontology codes (LOINC, SNOMED, ICD-10, RxNorm) preserved
 * - No imputed values (EVI-004)
 */

import {
  generateEncounterMemory,
  type EncounterMemorySource,
  type PatientSummary,
  type MedicationEntry,
  type AllergyEntry,
  type ObservationEntry,
  type CarePlanGoal,
  type EncounterData,
} from '../encounter-memory';

function makeSource(overrides: Partial<EncounterMemorySource> = {}): EncounterMemorySource {
  return {
    patient: {
      id: 'p-1',
      ageBand: '45-50',
      gender: 'male',
      activeConditions: [
        { code: 'E11', display: 'Type 2 Diabetes', onsetDate: '2024-01-15' },
      ],
    },
    encounter: {
      encounterId: 'enc-1',
      patientId: 'p-1',
      status: 'IN_PROGRESS',
      startDate: '2026-04-01T10:00:00Z',
      reasonCode: 'R73.9',
      reasonDisplay: 'Hyperglycaemia',
    },
    medications: [
      {
        code: '860975',
        display: 'Metformin 500mg',
        dosage: '500mg',
        frequency: 'BID',
        status: 'active',
        prescribedDate: '2025-06-01',
      },
    ],
    allergies: [
      {
        code: '91936005',
        display: 'Penicillin',
        severity: 'high',
        reaction: 'Anaphylaxis',
      },
    ],
    observations: [
      {
        loincCode: '4548-4',
        display: 'HbA1c',
        value: '7.2',
        unit: '%',
        effectiveDate: new Date().toISOString(),
        domain: 'metabolic',
        referenceRange: '4.0-5.6%',
        interpretation: 'abnormal',
      },
    ],
    carePlanGoals: [
      {
        description: 'HbA1c below 7%',
        status: 'in-progress',
        targetDate: '2026-06-01',
      },
    ],
    ...overrides,
  };
}

describe('generateEncounterMemory', () => {
  it('produces valid EncounterMemory with all fields', () => {
    const result = generateEncounterMemory(makeSource());

    expect(result.encounterId).toBe('enc-1');
    expect(result.patientId).toBe('p-1');
    expect(result.generatedAt).toBeDefined();
    expect(result.stalenessTTLs).toBeDefined();
    expect(typeof result.content).toBe('string');
  });

  it('includes header warning about verification', () => {
    const result = generateEncounterMemory(makeSource());
    expect(result.content).toContain('VERIFY ALL VALUES AGAINST FHIR');
    expect(result.content).toContain('context cache, not a source of truth');
  });

  it('includes encounter context', () => {
    const result = generateEncounterMemory(makeSource());
    expect(result.content).toContain('enc-1');
    expect(result.content).toContain('IN_PROGRESS');
    expect(result.content).toContain('ICD-10:R73.9');
  });

  it('includes patient demographics with age band (not exact DOB)', () => {
    const result = generateEncounterMemory(makeSource());
    expect(result.content).toContain('45-50');
    expect(result.content).toContain('male');
  });

  it('includes active conditions with ICD-10 codes', () => {
    const result = generateEncounterMemory(makeSource());
    expect(result.content).toContain('Type 2 Diabetes');
    expect(result.content).toContain('ICD-10:E11');
  });

  it('includes allergies with SNOMED codes', () => {
    const result = generateEncounterMemory(makeSource());
    expect(result.content).toContain('Penicillin');
    expect(result.content).toContain('SNOMED:91936005');
    expect(result.content).toContain('Anaphylaxis');
    expect(result.content).toContain('[high]');
  });

  it('shows NKDA when no allergies', () => {
    const result = generateEncounterMemory(makeSource({ allergies: [] }));
    expect(result.content).toContain('NKDA');
  });

  it('includes active medications with RxNorm codes', () => {
    const result = generateEncounterMemory(makeSource());
    expect(result.content).toContain('Metformin 500mg');
    expect(result.content).toContain('RxNorm:860975');
    expect(result.content).toContain('BID');
  });

  it('shows "None active" when no active medications', () => {
    const result = generateEncounterMemory(makeSource({
      medications: [{
        code: '860975', display: 'Metformin', dosage: '500mg',
        frequency: 'BID', status: 'stopped', prescribedDate: '2025-01-01',
      }],
    }));
    expect(result.content).toContain('None active');
  });

  it('lists non-active medications separately', () => {
    const result = generateEncounterMemory(makeSource({
      medications: [
        {
          code: '860975', display: 'Metformin', dosage: '500mg',
          frequency: 'BID', status: 'active', prescribedDate: '2025-06-01',
        },
        {
          code: '312961', display: 'Glipizide', dosage: '5mg',
          frequency: 'QD', status: 'stopped', prescribedDate: '2025-01-01',
        },
      ],
    }));
    expect(result.content).toContain('Other Medications');
    expect(result.content).toContain('Glipizide');
    expect(result.content).toContain('[stopped]');
  });

  it('includes observations with LOINC codes grouped by domain', () => {
    const result = generateEncounterMemory(makeSource());
    expect(result.content).toContain('HbA1c');
    expect(result.content).toContain('LOINC:4548-4');
    expect(result.content).toContain('Metabolic');
  });

  it('flags abnormal observations', () => {
    const result = generateEncounterMemory(makeSource());
    expect(result.content).toContain('ABNORMAL');
  });

  it('flags critical observations', () => {
    const result = generateEncounterMemory(makeSource({
      observations: [{
        loincCode: '2160-0', display: 'Creatinine', value: '5.8', unit: 'mg/dL',
        effectiveDate: new Date().toISOString(), domain: 'renal',
        referenceRange: '0.7-1.3 mg/dL', interpretation: 'critical',
      }],
    }));
    expect(result.content).toContain('CRITICAL');
  });

  it('marks stale observations', () => {
    const staleDate = new Date(Date.now() - 200 * 60 * 60 * 1000).toISOString(); // 200h ago
    const result = generateEncounterMemory(makeSource({
      observations: [{
        loincCode: '4548-4', display: 'HbA1c', value: '7.2', unit: '%',
        effectiveDate: staleDate, domain: 'metabolic',
      }],
    }));
    // metabolic TTL is 168h, 200h > 168h → stale
    expect(result.content).toContain('STALE');
  });

  it('includes care plan goals', () => {
    const result = generateEncounterMemory(makeSource());
    expect(result.content).toContain('HbA1c below 7%');
    expect(result.content).toContain('in-progress');
    expect(result.content).toContain('target: 2026-06-01');
  });

  it('includes staleness TTLs in returned object', () => {
    const result = generateEncounterMemory(makeSource());
    expect(result.stalenessTTLs.cardiac_emergency).toBe(6);
    expect(result.stalenessTTLs.metabolic).toBe(168);
    expect(result.stalenessTTLs.medication).toBe(24);
  });
});
