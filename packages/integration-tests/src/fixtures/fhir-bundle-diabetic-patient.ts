/**
 * Fixture: Realistic FHIR Bundle for a diabetic patient
 * João Silva — male, 1965-03-15, São Paulo, Brazil
 *
 * Contains:
 *  - Patient with CPF
 *  - HbA1c observation (7.2% — triggers diabetes alert)
 *  - Fasting glucose (145 mg/dL — triggers alert)
 *  - Blood pressure (142/88 — Stage 2 hypertension)
 *  - Type 2 Diabetes condition (ICD-10: E11.9)
 *  - Metformin medication
 *  - Losartan medication
 */

import { v4 as uuidv4 } from 'uuid';

export function createDiabeticPatientBundle(): fhir4.Bundle {
  const patientId = uuidv4();
  const hba1cObsId = uuidv4();
  const glucoseObsId = uuidv4();
  const bpObsId = uuidv4();
  const diabetesConditionId = uuidv4();
  const metforminMedId = uuidv4();
  const losartanMedId = uuidv4();

  const now = new Date();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  return {
    resourceType: 'Bundle',
    id: uuidv4(),
    type: 'transaction',
    entry: [
      {
        resource: {
          resourceType: 'Patient',
          id: patientId,
          identifier: [
            {
              system: 'http://example.com/cpf',
              value: '12345678901',
            },
          ],
          name: [
            {
              use: 'official',
              given: ['João'],
              family: 'Silva',
            },
          ],
          birthDate: '1965-03-15',
          gender: 'male',
          telecom: [
            {
              system: 'email',
              value: 'joao.silva@example.com',
            },
            {
              system: 'phone',
              value: '+55 11 98765-4321',
            },
          ],
          address: [
            {
              use: 'home',
              type: 'physical',
              line: ['Rua das Flores, 123', 'Apto 456'],
              district: 'Vila Mariana',
              city: 'São Paulo',
              state: 'SP',
              postalCode: '01234567',
              country: 'BR',
            },
          ],
        },
      },
      {
        resource: {
          resourceType: 'Observation',
          id: hba1cObsId,
          status: 'final',
          category: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                  code: 'laboratory',
                  display: 'Laboratory',
                },
              ],
            },
          ],
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '4548-4',
                display: 'Hemoglobin A1c',
              },
            ],
            text: 'HbA1c',
          },
          subject: {
            reference: `Patient/${patientId}`,
          },
          effectiveDateTime: twoWeeksAgo.toISOString(),
          issued: now.toISOString(),
          valueQuantity: {
            value: 7.2,
            unit: '%',
            system: 'http://unitsofmeasure.org',
            code: '%',
          },
          referenceRange: [
            {
              low: {
                value: 4.0,
                unit: '%',
              },
              high: {
                value: 5.7,
                unit: '%',
              },
            },
          ],
          interpretation: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
                  code: 'H',
                  display: 'High',
                },
              ],
            },
          ],
        },
      },
      {
        resource: {
          resourceType: 'Observation',
          id: glucoseObsId,
          status: 'final',
          category: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                  code: 'laboratory',
                  display: 'Laboratory',
                },
              ],
            },
          ],
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '2345-7',
                display: 'Glucose [Mass/volume] in Serum or Plasma',
              },
            ],
            text: 'Fasting Glucose',
          },
          subject: {
            reference: `Patient/${patientId}`,
          },
          effectiveDateTime: twoWeeksAgo.toISOString(),
          issued: now.toISOString(),
          valueQuantity: {
            value: 145,
            unit: 'mg/dL',
            system: 'http://unitsofmeasure.org',
            code: 'mg/dL',
          },
          referenceRange: [
            {
              low: {
                value: 70,
                unit: 'mg/dL',
              },
              high: {
                value: 100,
                unit: 'mg/dL',
              },
            },
          ],
          interpretation: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
                  code: 'H',
                  display: 'High',
                },
              ],
            },
          ],
        },
      },
      {
        resource: {
          resourceType: 'Observation',
          id: bpObsId,
          status: 'final',
          category: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                  code: 'vital-signs',
                  display: 'Vital Signs',
                },
              ],
            },
          ],
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '85354-9',
                display: 'Blood Pressure panel',
              },
            ],
            text: 'Blood Pressure',
          },
          subject: {
            reference: `Patient/${patientId}`,
          },
          effectiveDateTime: now.toISOString(),
          issued: now.toISOString(),
          component: [
            {
              code: {
                coding: [
                  {
                    system: 'http://loinc.org',
                    code: '8480-6',
                    display: 'Systolic blood pressure',
                  },
                ],
              },
              valueQuantity: {
                value: 142,
                unit: 'mmHg',
                system: 'http://unitsofmeasure.org',
                code: 'mm[Hg]',
              },
            },
            {
              code: {
                coding: [
                  {
                    system: 'http://loinc.org',
                    code: '8462-4',
                    display: 'Diastolic blood pressure',
                  },
                ],
              },
              valueQuantity: {
                value: 88,
                unit: 'mmHg',
                system: 'http://unitsofmeasure.org',
                code: 'mm[Hg]',
              },
            },
          ],
        },
      },
      {
        resource: {
          resourceType: 'Condition',
          id: diabetesConditionId,
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
                system: 'http://hl7.org/fhir/sid/icd-10-cm',
                code: 'E11.9',
                display: 'Type 2 diabetes mellitus without complications',
              },
            ],
            text: 'Type 2 Diabetes',
          },
          subject: {
            reference: `Patient/${patientId}`,
          },
          recordedDate: twoMonthsAgo.toISOString(),
          onsetDateTime: '2020-01-15T00:00:00Z',
        },
      },
      {
        resource: {
          resourceType: 'MedicationRequest',
          id: metforminMedId,
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
            text: 'Metformin 850 mg',
          },
          subject: {
            reference: `Patient/${patientId}`,
          },
          authoredOn: twoMonthsAgo.toISOString(),
          dosageInstruction: [
            {
              text: '850 mg twice daily',
              timing: {
                repeat: {
                  frequency: 2,
                  period: 1,
                  periodUnit: 'd',
                },
              },
              route: {
                coding: [
                  {
                    system: 'http://terminology.hl7.org/CodeSystem/v4-0-route-termination-method',
                    code: 'PO',
                    display: 'Oral',
                  },
                ],
              },
              doseAndRate: [
                {
                  doseQuantity: {
                    value: 850,
                    unit: 'mg',
                    system: 'http://unitsofmeasure.org',
                    code: 'mg',
                  },
                },
              ],
            },
          ],
        },
      },
      {
        resource: {
          resourceType: 'MedicationRequest',
          id: losartanMedId,
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
            text: 'Losartan 50 mg',
          },
          subject: {
            reference: `Patient/${patientId}`,
          },
          authoredOn: twoMonthsAgo.toISOString(),
          dosageInstruction: [
            {
              text: '50 mg once daily',
              timing: {
                repeat: {
                  frequency: 1,
                  period: 1,
                  periodUnit: 'd',
                },
              },
              route: {
                coding: [
                  {
                    system: 'http://terminology.hl7.org/CodeSystem/v4-0-route-termination-method',
                    code: 'PO',
                    display: 'Oral',
                  },
                ],
              },
              doseAndRate: [
                {
                  doseQuantity: {
                    value: 50,
                    unit: 'mg',
                    system: 'http://unitsofmeasure.org',
                    code: 'mg',
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  };
}
