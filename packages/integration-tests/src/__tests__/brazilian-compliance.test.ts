/**
 * Brazilian Compliance Tests
 *
 * Tests RNDS (Registro Nacional da Saúde), ANVISA, and LGPD compliance:
 * - CPF validation
 * - ICD-10 preservation
 * - ANVISA drug codes
 * - Address format (CEP, state codes)
 * - Bundle RNDS validation
 */

import { FHIRToCanonicalConverter } from '@holi/fhir-canonical';
import { v4 as uuidv4 } from 'uuid';
import { createDiabeticPatientBundle } from '../fixtures/fhir-bundle-diabetic-patient';
import '../fhir-types';

describe('Brazilian Compliance (RNDS/ANVISA/LGPD)', () => {
  let converter: FHIRToCanonicalConverter;

  beforeEach(() => {
    converter = new FHIRToCanonicalConverter('BRASIL_EHR', 'https://saude.gov.br');
  });

  describe('CPF Validation', () => {
    it('should extract valid CPF from FHIR Patient', () => {
      const cpf = '12345678901';
      const fhirPatient: fhir4.Patient = {
        resourceType: 'Patient',
        id: uuidv4(),
        identifier: [
          {
            system: 'http://example.com/cpf',
            value: cpf,
          },
        ],
        name: [{ given: ['João'], family: 'Silva' }],
        birthDate: '1965-03-15',
        gender: 'male' as any,
      };

      const canonical = converter.convertPatient(fhirPatient);
      expect(canonical.cpf).toBe(cpf);
      expect(canonical.cpf).toMatch(/^\d{11}$/);
    });

    it('should preserve CPF through full bundle conversion', () => {
      const bundle = createDiabeticPatientBundle();
      const canonicalRecord = converter.convertBundle(bundle);

      expect(canonicalRecord.patient.cpf).toBe('12345678901');
      expect(canonicalRecord.patient.cpf).toMatch(/^\d{11}$/);
    });

    it('should handle missing CPF gracefully', () => {
      const fhirPatient: fhir4.Patient = {
        resourceType: 'Patient',
        id: uuidv4(),
        name: [{ given: ['Test'], family: 'Patient' }],
        birthDate: '1990-01-01',
        gender: 'male' as any,
        // No identifier (CPF)
      };

      const canonical = converter.convertPatient(fhirPatient);
      // CPF is optional in the schema
      expect(canonical.cpf).toBeUndefined();
      expect(canonical.firstName).toBe('Test');
    });
  });

  describe('ICD-10 Coding Preservation', () => {
    it('should preserve ICD-10 code E11.9 (Type 2 Diabetes)', () => {
      const fhirCondition: fhir4.Condition = {
        resourceType: 'Condition',
        id: uuidv4(),
        subject: { reference: 'Patient/test' },
        code: {
          coding: [
            {
              system: 'http://hl7.org/fhir/sid/icd-10-cm',
              code: 'E11.9',
              display: 'Type 2 diabetes mellitus without complications',
            },
          ],
        },
        clinicalStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }],
        },
      };

      const canonical = converter.convertCondition(fhirCondition);
      expect(canonical.icd10Code).toBe('E11.9');
    });

    it('should preserve ICD-10 code E87.6 (Hypokalemia)', () => {
      const fhirCondition: fhir4.Condition = {
        resourceType: 'Condition',
        id: uuidv4(),
        subject: { reference: 'Patient/test' },
        code: {
          coding: [
            {
              system: 'http://hl7.org/fhir/sid/icd-10-cm',
              code: 'E87.6',
              display: 'Hypokalemia',
            },
          ],
        },
        clinicalStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }],
        },
      };

      const canonical = converter.convertCondition(fhirCondition);
      expect(canonical.icd10Code).toBe('E87.6');
      expect(canonical.icd10Code).toMatch(/^[A-Z]\d{2}(\.\d{1,2})?$/);
    });

    it('should preserve ICD-10 code O80 (Pregnancy)', () => {
      const fhirCondition: fhir4.Condition = {
        resourceType: 'Condition',
        id: uuidv4(),
        subject: { reference: 'Patient/test' },
        code: {
          coding: [
            {
              system: 'http://hl7.org/fhir/sid/icd-10-cm',
              code: 'O80',
              display: 'Encounter for delivery of single live-born infant',
            },
          ],
        },
        clinicalStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }],
        },
      };

      const canonical = converter.convertCondition(fhirCondition);
      expect(canonical.icd10Code).toBe('O80');
    });

    it('should preserve ICD-10 through full bundle conversion', () => {
      const bundle = createDiabeticPatientBundle();
      const canonicalRecord = converter.convertBundle(bundle);

      const diabetesCondition = canonicalRecord.conditions.find(c => c.icd10Code === 'E11.9');
      expect(diabetesCondition).toBeDefined();
      expect(diabetesCondition?.icd10Code).toBe('E11.9');
    });
  });

  describe('ANVISA Medication Code Preservation', () => {
    it('should preserve RxNorm code for Metformin', () => {
      const fhirMed: fhir4.MedicationRequest = {
        resourceType: 'MedicationRequest',
        id: uuidv4(),
        subject: { reference: 'Patient/test' },
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: {
          coding: [
            {
              system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
              code: '860998',
              display: 'Metformin',
            },
          ],
        },
        authoredOn: new Date().toISOString(),
      };

      const canonical = converter.convertMedicationRequest(fhirMed);
      expect(canonical.medicationCode).toBe('860998');
      expect(canonical.medicationDisplay).toContain('Metformin');
    });

    it('should preserve RxNorm code for Losartan', () => {
      const fhirMed: fhir4.MedicationRequest = {
        resourceType: 'MedicationRequest',
        id: uuidv4(),
        subject: { reference: 'Patient/test' },
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: {
          coding: [
            {
              system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
              code: '83515',
              display: 'Losartan',
            },
          ],
        },
        authoredOn: new Date().toISOString(),
      };

      const canonical = converter.convertMedicationRequest(fhirMed);
      expect(canonical.medicationCode).toBe('83515');
    });

    it('should prefer ANVISA codes when available', () => {
      const fhirMed: fhir4.MedicationRequest = {
        resourceType: 'MedicationRequest',
        id: uuidv4(),
        subject: { reference: 'Patient/test' },
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: {
          coding: [
            {
              system: 'http://saude.gov.br/anvisa',
              code: 'ANVISA-860998',
              display: 'Metformin - ANVISA',
            },
            {
              system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
              code: '860998',
              display: 'Metformin - RxNorm',
            },
          ],
        },
        authoredOn: new Date().toISOString(),
      };

      const canonical = converter.convertMedicationRequest(fhirMed);
      // Should prefer ANVISA code if available
      expect(canonical.medicationCode).toBe('ANVISA-860998');
    });

    it('should preserve medications through full bundle', () => {
      const bundle = createDiabeticPatientBundle();
      const canonicalRecord = converter.convertBundle(bundle);

      expect(canonicalRecord.medications.length).toBeGreaterThan(0);
      const metformin = canonicalRecord.medications.find(m => m.medicationDisplay.includes('Metformin'));
      expect(metformin).toBeDefined();
      expect(metformin?.medicationCode).toBeDefined();
    });
  });

  describe('Address Format (CEP and State Codes)', () => {
    it('should format CEP as 8 digits', () => {
      const fhirPatient: fhir4.Patient = {
        resourceType: 'Patient',
        id: uuidv4(),
        name: [{ given: ['Test'], family: 'Patient' }],
        birthDate: '1990-01-01',
        gender: 'male' as any,
        address: [
          {
            line: ['Rua das Flores, 123'],
            city: 'São Paulo',
            state: 'SP',
            postalCode: '01234567', // Already 8 digits
            country: 'BR',
          },
        ],
      };

      const canonical = converter.convertPatient(fhirPatient);
      expect(canonical.address?.postalCode).toMatch(/^\d{8}$/);
      expect(canonical.address?.postalCode).toBe('01234567');
    });

    it('should pad CEP to 8 digits if shorter', () => {
      const fhirPatient: fhir4.Patient = {
        resourceType: 'Patient',
        id: uuidv4(),
        name: [{ given: ['Test'], family: 'Patient' }],
        birthDate: '1990-01-01',
        gender: 'male' as any,
        address: [
          {
            line: ['Rua Test'],
            city: 'Rio de Janeiro',
            state: 'RJ',
            postalCode: '12345', // Pad to 8
            country: 'BR',
          },
        ],
      };

      const canonical = converter.convertPatient(fhirPatient);
      expect(canonical.address?.postalCode).toMatch(/^\d{8}$/);
      expect(canonical.address?.postalCode?.length).toBe(8);
    });

    it('should validate state code as 2 characters (UF)', () => {
      const states = [
        { fhir: 'SP', expected: 'SP' },
        { fhir: 'RJ', expected: 'RJ' },
        { fhir: 'MG', expected: 'MG' },
        { fhir: 'BA', expected: 'BA' },
        { fhir: 'RS', expected: 'RS' },
      ];

      for (const state of states) {
        const fhirPatient: fhir4.Patient = {
          resourceType: 'Patient',
          id: uuidv4(),
          name: [{ given: ['Test'], family: 'Patient' }],
          birthDate: '1990-01-01',
          gender: 'male' as any,
          address: [
            {
              city: 'Test City',
              state: state.fhir,
              country: 'BR',
            },
          ],
        };

        const canonical = converter.convertPatient(fhirPatient);
        expect(canonical.address?.state).toMatch(/^[A-Z]{2}$/);
        expect(canonical.address?.state).toBe(state.expected);
      }
    });

    it('should preserve full address through bundle conversion', () => {
      const bundle = createDiabeticPatientBundle();
      const canonicalRecord = converter.convertBundle(bundle);

      const address = canonicalRecord.patient.address;
      expect(address?.street).toBe('Rua das Flores, 123');
      expect(address?.city).toBe('São Paulo');
      expect(address?.state).toBe('SP');
      expect(address?.postalCode).toBe('01234567');
      expect(address?.country).toBe('BR');
    });
  });

  describe('Bundle RNDS Validation', () => {
    it('should convert complete FHIR bundle to canonical record', () => {
      const bundle = createDiabeticPatientBundle();
      const canonicalRecord = converter.convertBundle(bundle);

      expect(canonicalRecord).toBeDefined();
      expect(canonicalRecord.id).toBeDefined();
      expect(canonicalRecord.patientId).toBeDefined();
      expect(canonicalRecord.patient).toBeDefined();
    });

    it('should extract patient from bundle', () => {
      const bundle = createDiabeticPatientBundle();
      const canonicalRecord = converter.convertBundle(bundle);

      expect(canonicalRecord.patient.firstName).toBe('João');
      expect(canonicalRecord.patient.lastName).toBe('Silva');
      expect(canonicalRecord.patient.cpf).toBe('12345678901');
    });

    it('should extract all observations from bundle', () => {
      const bundle = createDiabeticPatientBundle();
      const canonicalRecord = converter.convertBundle(bundle);

      // Bundle has HbA1c, Glucose, BP observations
      expect(canonicalRecord.observations.length).toBeGreaterThanOrEqual(3);
    });

    it('should extract conditions from bundle', () => {
      const bundle = createDiabeticPatientBundle();
      const canonicalRecord = converter.convertBundle(bundle);

      // Bundle has Type 2 Diabetes condition
      expect(canonicalRecord.conditions.length).toBeGreaterThan(0);
      const diabetes = canonicalRecord.conditions.find(c => c.icd10Code === 'E11.9');
      expect(diabetes).toBeDefined();
    });

    it('should extract medications from bundle', () => {
      const bundle = createDiabeticPatientBundle();
      const canonicalRecord = converter.convertBundle(bundle);

      // Bundle has Metformin and Losartan
      expect(canonicalRecord.medications.length).toBeGreaterThanOrEqual(2);
    });

    it('should preserve all data through full pipeline', () => {
      const bundle = createDiabeticPatientBundle();
      const canonicalRecord = converter.convertBundle(bundle);

      // Patient data preserved
      expect(canonicalRecord.patient.cpf).toBe('12345678901');
      expect(canonicalRecord.patient.address?.state).toBe('SP');

      // Lab results preserved
      const hba1c = canonicalRecord.observations.find(o => o.code === '4548-4' || o.loincCode === '4548-4');
      expect(hba1c?.value).toBe(7.2);

      // Conditions preserved with ICD-10
      const diabetes = canonicalRecord.conditions.find(c => c.icd10Code === 'E11.9');
      expect(diabetes).toBeDefined();

      // Medications preserved
      expect(canonicalRecord.medications.length).toBeGreaterThanOrEqual(2);

      // ELENA invariants
      expect(canonicalRecord.humanReviewRequired).toBe(true);
    });
  });

  describe('LGPD Data Protection', () => {
    it('should preserve sensitive fields with proper marking', () => {
      const fhirPatient: fhir4.Patient = {
        resourceType: 'Patient',
        id: uuidv4(),
        identifier: [
          {
            system: 'http://example.com/cpf',
            value: '12345678901',
          },
        ],
        name: [{ given: ['João'], family: 'Silva' }],
        birthDate: '1965-03-15',
        gender: 'male' as any,
        telecom: [
          {
            system: 'email',
            value: 'joao.silva@example.com',
          },
        ],
      };

      const canonical = converter.convertPatient(fhirPatient);

      // LGPD: sensitive fields should be present but marked for protection
      expect(canonical.cpf).toBe('12345678901');
      expect(canonical.email).toBe('joao.silva@example.com');
      expect(canonical.sourceAuthority).toBeDefined(); // Audit trail
      expect(canonical.importedAt).toBeDefined(); // Import timestamp
    });

    it('should handle phone number correctly', () => {
      const fhirPatient: fhir4.Patient = {
        resourceType: 'Patient',
        id: uuidv4(),
        name: [{ given: ['Test'], family: 'Patient' }],
        birthDate: '1990-01-01',
        gender: 'male' as any,
        telecom: [
          {
            system: 'phone',
            value: '+55 11 98765-4321',
          },
        ],
      };

      const canonical = converter.convertPatient(fhirPatient);
      expect(canonical.phone).toBe('+55 11 98765-4321');
    });
  });
});
