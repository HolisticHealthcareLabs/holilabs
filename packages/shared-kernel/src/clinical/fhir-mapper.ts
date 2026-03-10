/**
 * FHIR R4 Bundle Mapper
 *
 * Translates internal Cortex clinical state into a strictly cross-referenced
 * FHIR R4 transaction Bundle. Resources are linked via urn:uuid: fullUrl
 * references. LATAM-specific identifiers (CRM, CPF) are injected into the
 * appropriate resource identity blocks.
 *
 * Owner: ARCHIE (kernel guardian)
 * Co-sign: GORDON (CBHPM/TUSS billing system URIs), RUTH (audit surface)
 */

import { randomUUID } from 'crypto';

// ---------------------------------------------------------------------------
// FHIR R4 type subset (minimal, strongly typed for our use case)
// ---------------------------------------------------------------------------

interface FhirCoding {
  system: string;
  code: string;
  display?: string;
}

interface FhirCodeableConcept {
  coding: FhirCoding[];
  text?: string;
}

interface FhirIdentifier {
  system: string;
  value: string;
}

interface FhirReference {
  reference: string;
  display?: string;
}

interface FhirMoney {
  value: number;
  currency: string;
}

interface FhirResource {
  resourceType: string;
  id: string;
  [key: string]: unknown;
}

interface FhirBundleEntry {
  fullUrl: string;
  resource: FhirResource;
  request: {
    method: 'POST' | 'PUT';
    url: string;
  };
}

export interface FhirBundle {
  resourceType: 'Bundle';
  type: 'transaction';
  timestamp: string;
  entry: FhirBundleEntry[];
}

// ---------------------------------------------------------------------------
// Input contract: what the API route sends to the mapper
// ---------------------------------------------------------------------------

export interface DiagnosisInput {
  code: string;
  name: string;
  type: 'primary' | 'secondary' | 'complication';
}

export interface BillingCodeInput {
  code: string;
  name: string;
  system: 'CBHPM' | 'TUSS';
  estimatedValueBRL: number;
}

export interface FhirExportPayload {
  patientId: string;
  providerId: string;
  soapNote: string;
  diagnoses: DiagnosisInput[];
  billingCodes: BillingCodeInput[];
}

// ---------------------------------------------------------------------------
// Constants: LATAM billing system URIs
// ---------------------------------------------------------------------------

const BILLING_SYSTEM_URIS: Record<'CBHPM' | 'TUSS', string> = {
  CBHPM: 'https://www.amb.org.br/cbhpm',
  TUSS: 'urn:oid:2.16.840.1.113883.2.3.1',
};

const LOINC_SYSTEM = 'http://loinc.org';
const ICD10_SYSTEM = 'http://hl7.org/fhir/sid/icd-10';
const CRM_SYSTEM = 'https://portal.cfm.org.br/crm';
const CPF_SYSTEM = 'https://receita.fazenda.gov.br/cpf';
const ENCOUNTER_CLASS_SYSTEM = 'http://terminology.hl7.org/CodeSystem/v3-ActCode';

// ---------------------------------------------------------------------------
// Diagnosis type to FHIR clinicalStatus / category mapping
// ---------------------------------------------------------------------------

const DIAGNOSIS_CATEGORY_MAP: Record<DiagnosisInput['type'], FhirCoding> = {
  primary: {
    system: 'http://terminology.hl7.org/CodeSystem/condition-category',
    code: 'encounter-diagnosis',
    display: 'Encounter Diagnosis',
  },
  secondary: {
    system: 'http://terminology.hl7.org/CodeSystem/condition-category',
    code: 'encounter-diagnosis',
    display: 'Encounter Diagnosis',
  },
  complication: {
    system: 'http://terminology.hl7.org/CodeSystem/condition-category',
    code: 'encounter-diagnosis',
    display: 'Encounter Diagnosis',
  },
};

// ---------------------------------------------------------------------------
// Core mapper function
// ---------------------------------------------------------------------------

export function buildFhirBundle(payload: FhirExportPayload): FhirBundle {
  const now = new Date().toISOString();

  const patientUuid = randomUUID();
  const practitionerUuid = randomUUID();
  const encounterUuid = randomUUID();

  const entries: FhirBundleEntry[] = [];

  // 1. Patient (stub with CPF identifier)
  entries.push({
    fullUrl: `urn:uuid:${patientUuid}`,
    resource: {
      resourceType: 'Patient',
      id: patientUuid,
      identifier: [
        {
          system: CPF_SYSTEM,
          value: payload.patientId,
        },
      ],
    },
    request: { method: 'POST', url: 'Patient' },
  });

  // 2. Practitioner (stub with CRM identifier)
  entries.push({
    fullUrl: `urn:uuid:${practitionerUuid}`,
    resource: {
      resourceType: 'Practitioner',
      id: practitionerUuid,
      identifier: [
        {
          system: CRM_SYSTEM,
          value: payload.providerId,
        },
      ],
    },
    request: { method: 'POST', url: 'Practitioner' },
  });

  // 3. Encounter
  entries.push({
    fullUrl: `urn:uuid:${encounterUuid}`,
    resource: {
      resourceType: 'Encounter',
      id: encounterUuid,
      status: 'finished',
      class: {
        system: ENCOUNTER_CLASS_SYSTEM,
        code: 'AMB',
        display: 'ambulatory',
      },
      subject: { reference: `urn:uuid:${patientUuid}` } as FhirReference,
      participant: [
        {
          individual: { reference: `urn:uuid:${practitionerUuid}` } as FhirReference,
        },
      ],
      period: {
        start: now,
        end: now,
      },
    },
    request: { method: 'POST', url: 'Encounter' },
  });

  // 4. DocumentReference (SOAP note)
  const documentUuid = randomUUID();
  const soapBase64 = Buffer.from(payload.soapNote, 'utf-8').toString('base64');

  entries.push({
    fullUrl: `urn:uuid:${documentUuid}`,
    resource: {
      resourceType: 'DocumentReference',
      id: documentUuid,
      status: 'current',
      type: {
        coding: [
          {
            system: LOINC_SYSTEM,
            code: '11506-3',
            display: 'Progress note',
          },
        ],
      } as FhirCodeableConcept,
      subject: { reference: `urn:uuid:${patientUuid}` } as FhirReference,
      author: [
        { reference: `urn:uuid:${practitionerUuid}` } as FhirReference,
      ],
      date: now,
      content: [
        {
          attachment: {
            contentType: 'text/plain',
            language: 'pt-BR',
            data: soapBase64,
            title: 'SOAP Note',
          },
        },
      ],
      context: {
        encounter: [
          { reference: `urn:uuid:${encounterUuid}` } as FhirReference,
        ],
      },
    },
    request: { method: 'POST', url: 'DocumentReference' },
  });

  // 5. Condition resources (one per diagnosis)
  for (const dx of payload.diagnoses) {
    const conditionUuid = randomUUID();
    entries.push({
      fullUrl: `urn:uuid:${conditionUuid}`,
      resource: {
        resourceType: 'Condition',
        id: conditionUuid,
        clinicalStatus: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
              code: 'active',
            },
          ],
        } as FhirCodeableConcept,
        category: [
          { coding: [DIAGNOSIS_CATEGORY_MAP[dx.type]] } as FhirCodeableConcept,
        ],
        code: {
          coding: [
            {
              system: ICD10_SYSTEM,
              code: dx.code,
              display: dx.name,
            },
          ],
          text: dx.name,
        } as FhirCodeableConcept,
        subject: { reference: `urn:uuid:${patientUuid}` } as FhirReference,
        encounter: { reference: `urn:uuid:${encounterUuid}` } as FhirReference,
        recordedDate: now,
      },
      request: { method: 'POST', url: 'Condition' },
    });
  }

  // 6. ChargeItem resources (one per billing code)
  for (const billing of payload.billingCodes) {
    const chargeUuid = randomUUID();
    entries.push({
      fullUrl: `urn:uuid:${chargeUuid}`,
      resource: {
        resourceType: 'ChargeItem',
        id: chargeUuid,
        status: 'billable',
        code: {
          coding: [
            {
              system: BILLING_SYSTEM_URIS[billing.system],
              code: billing.code,
              display: billing.name,
            },
          ],
          text: `${billing.system}: ${billing.code}`,
        } as FhirCodeableConcept,
        subject: { reference: `urn:uuid:${patientUuid}` } as FhirReference,
        context: { reference: `urn:uuid:${encounterUuid}` } as FhirReference,
        performingOrganization: undefined,
        performer: [
          {
            actor: { reference: `urn:uuid:${practitionerUuid}` } as FhirReference,
          },
        ],
        priceOverride: {
          value: billing.estimatedValueBRL,
          currency: 'BRL',
        } as FhirMoney,
        occurrenceDateTime: now,
      },
      request: { method: 'POST', url: 'ChargeItem' },
    });
  }

  return {
    resourceType: 'Bundle',
    type: 'transaction',
    timestamp: now,
    entry: entries,
  };
}
