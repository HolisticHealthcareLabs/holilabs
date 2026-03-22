/**
 * Fixture: Realistic FHIR Bundle for a pregnant patient
 * Maria Santos — female, 1995-07-22, Rio de Janeiro, Brazil
 *
 * Contains:
 *  - Patient with CPF
 *  - Pregnancy condition
 *  - Prenatal observation (weeks of gestation)
 *  - Blood pressure observation
 *  - Prenatal medication (prenatal vitamin)
 */

import { v4 as uuidv4 } from 'uuid';

export function createPregnantPatientBundle(): fhir4.Bundle {
  const patientId = uuidv4();
  const pregnancyConditionId = uuidv4();
  const gestationObsId = uuidv4();
  const bpObsId = uuidv4();
  const vitaminMedId = uuidv4();

  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

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
              value: '98765432109',
            },
          ],
          name: [
            {
              use: 'official',
              given: ['Maria'],
              family: 'Santos',
            },
          ],
          birthDate: '1995-07-22',
          gender: 'female',
          telecom: [
            {
              system: 'email',
              value: 'maria.santos@example.com',
            },
          ],
          address: [
            {
              use: 'home',
              type: 'physical',
              line: ['Avenida Paulista, 1000'],
              district: 'Bela Vista',
              city: 'Rio de Janeiro',
              state: 'RJ',
              postalCode: '20000000',
              country: 'BR',
            },
          ],
        },
      },
      {
        resource: {
          resourceType: 'Condition',
          id: pregnancyConditionId,
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
                code: 'O80',
                display: 'Encounter for delivery of single live-born infant',
              },
            ],
            text: 'Pregnancy',
          },
          subject: {
            reference: `Patient/${patientId}`,
          },
          recordedDate: threeMonthsAgo.toISOString(),
          onsetDateTime: threeMonthsAgo.toISOString(),
        },
      },
      {
        resource: {
          resourceType: 'Observation',
          id: gestationObsId,
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
                code: '11884-4',
                display: 'Gestational age in weeks',
              },
            ],
            text: 'Gestational Age',
          },
          subject: {
            reference: `Patient/${patientId}`,
          },
          effectiveDateTime: now.toISOString(),
          issued: now.toISOString(),
          valueQuantity: {
            value: 28,
            unit: 'weeks',
            system: 'http://unitsofmeasure.org',
            code: 'wk',
          },
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
                value: 128,
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
                value: 82,
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
          resourceType: 'MedicationRequest',
          id: vitaminMedId,
          status: 'active',
          intent: 'order',
          medicationCodeableConcept: {
            coding: [
              {
                system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
                code: '1191487',
                display: 'Prenatal vitamin',
              },
            ],
            text: 'Prenatal Vitamin with Iron',
          },
          subject: {
            reference: `Patient/${patientId}`,
          },
          authoredOn: threeMonthsAgo.toISOString(),
          dosageInstruction: [
            {
              text: 'One tablet daily',
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
            },
          ],
        },
      },
    ],
  };
}
