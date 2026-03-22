/**
 * Fixture: Realistic FHIR Bundle for an emergency patient
 * Carlos Oliveira — male, 1980-05-10, Belo Horizonte, Brazil
 *
 * Contains:
 *  - Patient with CPF
 *  - Critical lab results (potassium 2.3 — triggers CRITICAL alert)
 *  - Emergency encounter
 *  - Acute diagnosis
 */

import { v4 as uuidv4 } from 'uuid';

export function createEmergencyPatientBundle(): fhir4.Bundle {
  const patientId = uuidv4();
  const potassiumObsId = uuidv4();
  const encounterID = uuidv4();
  const acuteDiagnosisId = uuidv4();

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

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
              value: '55544433322',
            },
          ],
          name: [
            {
              use: 'official',
              given: ['Carlos'],
              family: 'Oliveira',
            },
          ],
          birthDate: '1980-05-10',
          gender: 'male',
          telecom: [
            {
              system: 'phone',
              value: '+55 31 99876-5432',
            },
          ],
          address: [
            {
              use: 'home',
              type: 'physical',
              line: ['Rua Beta, 456'],
              district: 'Funcionarios',
              city: 'Belo Horizonte',
              state: 'MG',
              postalCode: '30140071',
              country: 'BR',
            },
          ],
        },
      },
      {
        resource: {
          resourceType: 'Encounter',
          id: encounterID,
          status: 'in-progress',
          class: {
            system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
            code: 'EMER',
            display: 'Emergency',
          },
          type: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/encounter-type',
                  code: 'EMERG',
                  display: 'Emergency',
                },
              ],
            },
          ],
          subject: {
            reference: `Patient/${patientId}`,
          },
          period: {
            start: oneHourAgo.toISOString(),
          },
          location: [
            {
              location: {
                display: 'Emergency Department',
              },
            },
          ],
        },
      },
      {
        resource: {
          resourceType: 'Observation',
          id: potassiumObsId,
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
                code: '2823-3',
                display: 'Potassium [Moles/volume] in Serum or Plasma',
              },
            ],
            text: 'Serum Potassium',
          },
          subject: {
            reference: `Patient/${patientId}`,
          },
          encounter: {
            reference: `Encounter/${encounterID}`,
          },
          effectiveDateTime: now.toISOString(),
          issued: now.toISOString(),
          valueQuantity: {
            value: 2.3,
            unit: 'mEq/L',
            system: 'http://unitsofmeasure.org',
            code: 'meq/L',
          },
          referenceRange: [
            {
              low: {
                value: 3.5,
                unit: 'mEq/L',
              },
              high: {
                value: 5.0,
                unit: 'mEq/L',
              },
            },
          ],
          interpretation: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
                  code: 'LL',
                  display: 'Critical Low',
                },
              ],
            },
          ],
        },
      },
      {
        resource: {
          resourceType: 'Condition',
          id: acuteDiagnosisId,
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
                code: 'provisional',
              },
            ],
          },
          code: {
            coding: [
              {
                system: 'http://hl7.org/fhir/sid/icd-10-cm',
                code: 'E87.6',
                display: 'Hypokalemia',
              },
            ],
            text: 'Critical Hypokalemia',
          },
          subject: {
            reference: `Patient/${patientId}`,
          },
          encounter: {
            reference: `Encounter/${encounterID}`,
          },
          recordedDate: now.toISOString(),
          severity: {
            coding: [
              {
                system: 'http://snomed.info/sct',
                code: '24484000',
                display: 'Severe',
              },
            ],
          },
        },
      },
    ],
  };
}
