/**
 * RNDS Profile Validation Tests
 *
 * Validates FHIR resources against Brazilian RNDS requirements:
 * - CPF for patients
 * - ICD-10 for conditions
 * - ANVISA coding for medications
 * - RNDS compliance for bundles
 *
 * RUTH: ANVISA Class I SaMD compliance checks
 */

import {
  validateBRPatient,
  validateBRCondition,
  validateBRMedicacao,
  validateObservation,
  validateAllergyIntolerance,
  validateBRBundle,
  validateRNDSCompliance,
} from '../validators/rnds-profiles';

describe('RNDS Profile Validation', () => {
  describe('BRPatient validation', () => {
    it('should pass for valid Brazilian patient with CPF', () => {
      const validPatient: fhir.Patient = {
        resourceType: 'Patient',
        id: 'pat-1',
        identifier: [
          {
            system: 'http://www.saude.gov.br/fhir/r4/NamingSystem/cpf',
            value: '12345678901',
          },
        ],
        name: [{ family: 'Silva', given: ['João'] }],
        gender: 'male',
        birthDate: '1990-01-01',
        address: [
          {
            postalCode: '01234567',
            state: 'SP',
            city: 'São Paulo',
          },
        ],
      };

      const result = validateBRPatient(validPatient);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail if CPF is missing', () => {
      const invalidPatient: fhir.Patient = {
        resourceType: 'Patient',
        id: 'pat-1',
        name: [{ family: 'Silva', given: ['João'] }],
        gender: 'male',
        birthDate: '1990-01-01',
      };

      const result = validateBRPatient(invalidPatient);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('CPF'))).toBe(true);
    });

    it('should fail for invalid CPF format', () => {
      const invalidPatient: fhir.Patient = {
        resourceType: 'Patient',
        id: 'pat-1',
        identifier: [
          {
            system: 'http://www.saude.gov.br/fhir/r4/NamingSystem/cpf',
            value: 'invalid-cpf',
          },
        ],
        name: [{ family: 'Silva' }],
        gender: 'male',
        birthDate: '1990-01-01',
      };

      const result = validateBRPatient(invalidPatient);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid CPF format'))).toBe(true);
    });

    it('should warn if address is missing', () => {
      const patientWithoutAddress: fhir.Patient = {
        resourceType: 'Patient',
        id: 'pat-1',
        identifier: [
          {
            system: 'http://www.saude.gov.br/fhir/r4/NamingSystem/cpf',
            value: '12345678901',
          },
        ],
        name: [{ family: 'Silva' }],
        gender: 'male',
        birthDate: '1990-01-01',
      };

      const result = validateBRPatient(patientWithoutAddress);

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('Address'))).toBe(true);
    });
  });

  describe('BRCondition validation', () => {
    it('should pass for condition with valid ICD-10', () => {
      const validCondition: fhir.Condition = {
        resourceType: 'Condition',
        id: 'cond-1',
        code: {
          coding: [
            {
              system: 'http://hl7.org/fhir/sid/icd-10',
              code: 'E11.9',
              display: 'Type 2 diabetes',
            },
          ],
        },
        clinicalStatus: { coding: [{ code: 'active' }] },
        subject: { reference: 'Patient/pat-1' },
      };

      const result = validateBRCondition(validCondition);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail if ICD-10 is missing', () => {
      const invalidCondition: fhir.Condition = {
        resourceType: 'Condition',
        id: 'cond-1',
        code: { text: 'Some condition' },
        clinicalStatus: { coding: [{ code: 'active' }] },
        subject: { reference: 'Patient/pat-1' },
      };

      const result = validateBRCondition(invalidCondition);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('ICD-10'))).toBe(true);
    });

    it('should fail for invalid ICD-10 format', () => {
      const invalidCondition: fhir.Condition = {
        resourceType: 'Condition',
        id: 'cond-1',
        code: {
          coding: [
            {
              system: 'http://hl7.org/fhir/sid/icd-10',
              code: 'INVALID',
            },
          ],
        },
        clinicalStatus: { coding: [{ code: 'active' }] },
        subject: { reference: 'Patient/pat-1' },
      };

      const result = validateBRCondition(invalidCondition);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid ICD-10 format'))).toBe(true);
    });

    it('should validate ICD-10 with decimals', () => {
      const conditionWithDecimals: fhir.Condition = {
        resourceType: 'Condition',
        id: 'cond-1',
        code: {
          coding: [
            {
              system: 'http://hl7.org/fhir/sid/icd-10',
              code: 'A00.0',
            },
          ],
        },
        clinicalStatus: { coding: [{ code: 'active' }] },
        subject: { reference: 'Patient/pat-1' },
      };

      const result = validateBRCondition(conditionWithDecimals);

      expect(result.isValid).toBe(true);
    });
  });

  describe('BRMedicacao validation', () => {
    it('should pass for medication with ANVISA code', () => {
      const validMed: fhir.MedicationRequest = {
        resourceType: 'MedicationRequest',
        id: 'med-1',
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: {
          coding: [
            {
              system: 'http://www.saude.gov.br/fhir/r4/CodeSystem/BRMedicacao',
              code: '5590102',
            },
          ],
        },
        subject: { reference: 'Patient/pat-1' },
        authoredOn: '2025-03-20',
      };

      const result = validateBRMedicacao(validMed);

      expect(result.isValid).toBe(true);
    });

    it('should warn if ANVISA code is missing', () => {
      const medWithoutANVISA: fhir.MedicationRequest = {
        resourceType: 'MedicationRequest',
        id: 'med-1',
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: {
          coding: [
            {
              system: 'http://example.com/code',
              code: '123',
            },
          ],
        },
        subject: { reference: 'Patient/pat-1' },
        authoredOn: '2025-03-20',
      };

      const result = validateBRMedicacao(medWithoutANVISA);

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('ANVISA'))).toBe(true);
    });
  });

  describe('Observation validation', () => {
    it('should pass for observation with LOINC code', () => {
      const validObs: fhir.Observation = {
        resourceType: 'Observation',
        id: 'obs-1',
        status: 'final',
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: '2345-7',
            },
          ],
        },
        subject: { reference: 'Patient/pat-1' },
        effectiveDateTime: '2025-03-20T10:00:00Z',
      };

      const result = validateObservation(validObs);

      expect(result.isValid).toBe(true);
    });

    it('should fail if status is missing', () => {
      const invalidObs = {
        resourceType: 'Observation',
        id: 'obs-1',
        code: { text: 'Observation' },
        subject: { reference: 'Patient/pat-1' },
        effectiveDateTime: '2025-03-20T10:00:00Z',
      } as fhir.Observation;

      const result = validateObservation(invalidObs);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('status'))).toBe(true);
    });
  });

  describe('BRBundle validation', () => {
    it('should pass for complete RNDS transaction bundle', () => {
      const validBundle = {
        resourceType: 'Bundle',
        id: 'bundle-1',
        type: 'transaction',
        entry: [
          {
            resource: {
              resourceType: 'Patient',
              id: 'pat-1',
              identifier: [
                {
                  system: 'http://www.saude.gov.br/fhir/r4/NamingSystem/cpf',
                  value: '12345678901',
                },
              ],
              name: [{ family: 'Silva', given: ['João'] }],
              gender: 'male',
              birthDate: '1990-01-01',
            },
          },
          {
            resource: {
              resourceType: 'Condition',
              id: 'cond-1',
              code: {
                coding: [
                  {
                    system: 'http://hl7.org/fhir/sid/icd-10',
                    code: 'E11.9',
                  },
                ],
              },
              clinicalStatus: { coding: [{ code: 'active' }] },
              subject: { reference: 'Patient/pat-1' },
            },
          },
        ],
      };

      const result = validateBRBundle(validBundle);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail if bundle type is not transaction', () => {
      const invalidBundle = {
        resourceType: 'Bundle',
        id: 'bundle-1',
        type: 'collection',
        entry: [],
      };

      const result = validateBRBundle(invalidBundle);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('transaction'))).toBe(true);
    });

    it('should fail if bundle has no Patient', () => {
      const bundleWithoutPatient = {
        resourceType: 'Bundle',
        id: 'bundle-1',
        type: 'transaction',
        entry: [
          {
            resource: {
              resourceType: 'Condition',
              id: 'cond-1',
              code: { text: 'Condition' },
            },
          },
        ],
      };

      const result = validateBRBundle(bundleWithoutPatient);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Patient'))).toBe(true);
    });
  });

  describe('Comprehensive RNDS compliance', () => {
    it('should validate comprehensive compliance', () => {
      const bundle = {
        resourceType: 'Bundle',
        id: 'bundle-1',
        type: 'transaction',
        entry: [
          {
            resource: {
              resourceType: 'Patient',
              id: 'pat-1',
              identifier: [
                {
                  system: 'http://www.saude.gov.br/fhir/r4/NamingSystem/cpf',
                  value: '12345678901',
                },
              ],
              name: [{ family: 'Silva' }],
              gender: 'male',
              birthDate: '1990-01-01',
            },
          },
        ],
      };

      const result = validateRNDSCompliance(bundle);

      expect(result.isValid).toBe(true);
    });
  });
});
