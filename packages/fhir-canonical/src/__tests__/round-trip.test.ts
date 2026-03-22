/**
 * Round-Trip Test: FHIR → Canonical → FHIR
 *
 * Validates that conversions are semantically equivalent and preserve data integrity
 * ELENA: No data loss or imputation during round-trip
 */

import { FHIRToCanonicalConverter } from '../mappers/to-canonical';
import { CanonicalToFHIRConverter } from '../mappers/to-fhir';

// Valid UUIDs for test data (Zod schemas require uuid format)
const PATIENT_UUID = '550e8400-e29b-41d4-a716-446655440001';
const OBS_UUID = '550e8400-e29b-41d4-a716-446655440002';
const COND_UUID = '550e8400-e29b-41d4-a716-446655440003';
const MED_UUID = '550e8400-e29b-41d4-a716-446655440004';
const ALLERGY_UUID = '550e8400-e29b-41d4-a716-446655440005';
const BUNDLE_PAT_UUID = '550e8400-e29b-41d4-a716-446655440010';
const BUNDLE_COND_UUID = '550e8400-e29b-41d4-a716-446655440011';

describe('Round-Trip Conversion: FHIR ↔ Canonical ↔ FHIR', () => {
  const fhirToCanonical = new FHIRToCanonicalConverter('test-source', 'http://test.example.com');
  const canonicalToFhir = new CanonicalToFHIRConverter();

  describe('Patient round-trip', () => {
    it('should preserve patient data through FHIR → Canonical → FHIR', () => {
      const originalFhirPatient: fhir.Patient = {
        resourceType: 'Patient',
        id: PATIENT_UUID,
        identifier: [
          {
            system: 'http://www.saude.gov.br/fhir/r4/NamingSystem/cpf',
            value: '12345678901',
          },
        ],
        name: [
          {
            family: 'Silva',
            given: ['João'],
          },
        ],
        gender: 'male',
        birthDate: '1990-01-01T00:00:00Z',
        address: [
          {
            city: 'São Paulo',
            state: 'SP',
            postalCode: '01234567',
          },
        ],
      };

      const canonical = fhirToCanonical.convertPatient(originalFhirPatient);
      const reconvertedFhir = canonicalToFhir.convertPatient(canonical);

      expect(reconvertedFhir.id).toBe(originalFhirPatient.id);
      expect(reconvertedFhir.gender).toBe(originalFhirPatient.gender);
      expect(reconvertedFhir.name?.[0]?.family).toBe(originalFhirPatient.name?.[0]?.family);
      expect(reconvertedFhir.name?.[0]?.given?.[0]).toBe(originalFhirPatient.name?.[0]?.given?.[0]);

      const cpfId = reconvertedFhir.identifier?.find((id: fhir.Identifier) =>
        id.system?.includes('cpf')
      );
      expect(cpfId?.value).toBe('12345678901');
    });
  });

  describe('Observation round-trip', () => {
    it('should preserve observation data (lab result)', () => {
      const originalObservation: fhir.Observation = {
        resourceType: 'Observation',
        id: OBS_UUID,
        status: 'final',
        category: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                code: 'laboratory',
              },
            ],
          },
        ],
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: '2345-7',
              display: 'Glucose',
            },
          ],
        },
        subject: {
          reference: `Patient/${PATIENT_UUID}`,
        },
        effectiveDateTime: '2025-03-20T10:00:00Z',
        valueQuantity: {
          value: 100,
          unit: 'mg/dL',
        },
      };

      const canonical = fhirToCanonical.convertObservation(originalObservation);
      const reconvertedFhir = canonicalToFhir.convertObservation(canonical);

      expect(reconvertedFhir.id).toBe(originalObservation.id);
      expect(reconvertedFhir.status).toBe(originalObservation.status);
      expect(reconvertedFhir.code?.coding?.[0]?.code).toBe('2345-7');
      expect(reconvertedFhir.subject?.reference).toBe(`Patient/${PATIENT_UUID}`);

      const valueQty = (reconvertedFhir as any).valueQuantity;
      expect(valueQty?.value).toBe(100);
      expect(valueQty?.unit).toBe('mg/dL');
    });
  });

  describe('Condition round-trip', () => {
    it('should preserve ICD-10 coding through round-trip', () => {
      const originalCondition: fhir.Condition = {
        resourceType: 'Condition',
        id: COND_UUID,
        clinicalStatus: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
              code: 'active',
            },
          ],
        },
        verificationStatus: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
              code: 'confirmed',
            },
          ],
        },
        code: {
          coding: [
            {
              system: 'http://hl7.org/fhir/sid/icd-10',
              code: 'E11.9',
              display: 'Type 2 diabetes mellitus without complications',
            },
          ],
        },
        subject: {
          reference: `Patient/${PATIENT_UUID}`,
        },
        recordedDate: '2025-01-15T00:00:00Z',
      };

      const canonical = fhirToCanonical.convertCondition(originalCondition);
      const reconvertedFhir = canonicalToFhir.convertCondition(canonical);

      expect(reconvertedFhir.code?.coding?.[0]?.code).toBe('E11.9');
      expect(reconvertedFhir.id).toBe(originalCondition.id);
      expect(reconvertedFhir.clinicalStatus?.coding?.[0]?.code).toBe('active');
    });
  });

  describe('MedicationRequest round-trip', () => {
    it('should preserve medication data with dosage', () => {
      const originalMed: fhir.MedicationRequest = {
        resourceType: 'MedicationRequest',
        id: MED_UUID,
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: {
          coding: [
            {
              system: 'http://www.saude.gov.br/fhir/r4/CodeSystem/BRMedicacao',
              code: '5590102',
              display: 'dipirona sódica',
            },
          ],
        },
        subject: {
          reference: `Patient/${PATIENT_UUID}`,
        },
        authoredOn: '2025-03-20T00:00:00Z',
        dosageInstruction: [
          {
            doseAndRate: [
              {
                doseQuantity: {
                  value: 500,
                  unit: 'mg',
                },
              },
            ],
            timing: {
              repeat: {
                frequency: 3,
              },
            },
          },
        ],
      };

      const canonical = fhirToCanonical.convertMedicationRequest(originalMed);
      const reconvertedFhir = canonicalToFhir.convertMedicationRequest(canonical);

      expect(reconvertedFhir.id).toBe(originalMed.id);
      expect(reconvertedFhir.status).toBe('active');
      expect(reconvertedFhir.medicationCodeableConcept?.coding?.[0]?.code).toBe('5590102');

      const dosage = reconvertedFhir.dosageInstruction?.[0];
      expect(dosage?.doseAndRate?.[0]?.doseQuantity?.value).toBe(500);
      expect(dosage?.doseAndRate?.[0]?.doseQuantity?.unit).toBe('mg');
    });
  });

  describe('AllergyIntolerance round-trip', () => {
    it('should preserve allergy data through round-trip', () => {
      const originalAllergy: fhir.AllergyIntolerance = {
        resourceType: 'AllergyIntolerance',
        id: ALLERGY_UUID,
        clinicalStatus: {
          coding: [{ code: 'active' }],
        },
        verificationStatus: {
          coding: [{ code: 'confirmed' }],
        },
        type: 'allergy',
        category: ['medication'],
        criticality: 'high',
        code: {
          coding: [
            {
              system: 'http://snomed.info/sct',
              code: '372687004',
              display: 'Penicillin',
            },
          ],
        },
        patient: {
          reference: `Patient/${PATIENT_UUID}`,
        },
        recordedDate: '2024-01-10T00:00:00Z',
        reaction: [
          {
            manifestation: [{ text: 'anaphylaxis' }],
          },
        ],
      };

      const canonical = fhirToCanonical.convertAllergyIntolerance(originalAllergy);
      const reconvertedFhir = canonicalToFhir.convertAllergyIntolerance(canonical);

      expect(reconvertedFhir.id).toBe(originalAllergy.id);
      expect(reconvertedFhir.type).toBe('allergy');
      expect(reconvertedFhir.criticality).toBe('high');
      expect(reconvertedFhir.code?.coding?.[0]?.code).toBe('372687004');
      expect(reconvertedFhir.reaction?.[0]?.manifestation?.[0]?.text).toBe('anaphylaxis');
    });
  });

  describe('Bundle round-trip', () => {
    it('should handle complete FHIR Bundle → Canonical → Bundle', () => {
      const bundle: fhir.Bundle = {
        resourceType: 'Bundle',
        id: 'bundle-1',
        type: 'transaction',
        entry: [
          {
            resource: {
              resourceType: 'Patient',
              id: BUNDLE_PAT_UUID,
              identifier: [
                {
                  system: 'http://www.saude.gov.br/fhir/r4/NamingSystem/cpf',
                  value: '12345678901',
                },
              ],
              name: [{ family: 'Silva', given: ['João'] }],
              gender: 'male',
              birthDate: '1990-01-01T00:00:00Z',
            } as any,
          },
          {
            resource: {
              resourceType: 'Condition',
              id: BUNDLE_COND_UUID,
              clinicalStatus: { coding: [{ code: 'active' }] },
              verificationStatus: { coding: [{ code: 'confirmed' }] },
              code: {
                coding: [
                  {
                    system: 'http://hl7.org/fhir/sid/icd-10',
                    code: 'E11.9',
                  },
                ],
              },
              subject: { reference: `Patient/${BUNDLE_PAT_UUID}` },
              recordedDate: '2025-01-15T00:00:00Z',
            } as any,
          },
        ],
      };

      const canonical = fhirToCanonical.convertBundle(bundle);
      const reconvertedBundle = canonicalToFhir.convertToBundle(canonical);

      expect(reconvertedBundle.resourceType).toBe('Bundle');
      expect((reconvertedBundle as any).type).toBe('transaction');
      expect(reconvertedBundle.entry?.length).toBeGreaterThan(0);

      const patEntry = reconvertedBundle.entry?.find((e: any) => e.resource?.resourceType === 'Patient');
      expect(patEntry?.resource?.id).toBe(BUNDLE_PAT_UUID);

      const condEntry = reconvertedBundle.entry?.find((e: any) => e.resource?.resourceType === 'Condition');
      expect((condEntry?.resource as fhir.Condition)?.code?.coding?.[0]?.code).toBe('E11.9');
    });
  });
});
