/**
 * FHIR R4 Connector
 *
 * Supports:
 *   - SMART on FHIR OAuth2 bearer token
 *   - Basic auth
 *   - Anonymous FHIR servers
 *   - Bundles and individual resources
 *
 * Maps FHIR resources → CanonicalHealthRecord payloads.
 */

import { BaseConnector } from './base.connector';
import type {
  CanonicalHealthRecord,
  CanonicalLabResult,
  CanonicalVitalSign,
  CanonicalDiagnosis,
  CanonicalMedication,
  CanonicalAllergy,
  CanonicalPatientDemographics,
  DataSource,
  FhirSourceConfig,
  ValidationResult,
} from '../types';
import { validateCanonical } from '../validators/canonical.validator';

// Lightweight FHIR R4 type stubs (no heavy fhir.js import needed for MVP)
interface FhirResource {
  resourceType: string;
  id?: string;
  [key: string]: unknown;
}

interface FhirBundle {
  resourceType: 'Bundle';
  entry?: Array<{ resource?: FhirResource }>;
}

export class FhirConnector extends BaseConnector {
  private config: FhirSourceConfig;

  constructor(source: DataSource) {
    super(source);
    if (source.config.kind !== 'FHIR_R4') {
      throw new Error('FhirConnector requires a FHIR_R4 source config');
    }
    this.config = source.config as FhirSourceConfig;
  }

  protected async fetchRaw(): Promise<FhirResource[]> {
    const headers: Record<string, string> = {
      'Accept': 'application/fhir+json',
      'Content-Type': 'application/fhir+json',
    };

    if (this.config.authType === 'BEARER' && this.config.credentials) {
      headers['Authorization'] = `Bearer ${this.config.credentials}`;
    } else if (this.config.authType === 'BASIC' && this.config.credentials) {
      headers['Authorization'] = `Basic ${this.config.credentials}`;
    }

    const resources: FhirResource[] = [];

    for (const resourceType of this.config.resourceTypes) {
      const url = this.config.patientId
        ? `${this.config.baseUrl}/${resourceType}?patient=${this.config.patientId}&_count=100`
        : `${this.config.baseUrl}/${resourceType}?_count=100`;

      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`FHIR fetch failed: ${response.status} ${response.statusText} for ${url}`);
      }

      const body = (await response.json()) as FhirBundle | FhirResource;

      if ((body as FhirBundle).resourceType === 'Bundle') {
        const bundle = body as FhirBundle;
        for (const entry of bundle.entry ?? []) {
          if (entry.resource) resources.push(entry.resource);
        }
      } else {
        resources.push(body as FhirResource);
      }
    }

    return resources;
  }

  protected normalize(raw: unknown, _index: number): CanonicalHealthRecord {
    const resource = raw as FhirResource;

    switch (resource.resourceType) {
      case 'Observation':
        return this.normalizeObservation(resource);
      case 'Condition':
        return this.normalizeCondition(resource);
      case 'MedicationRequest':
        return this.normalizeMedicationRequest(resource);
      case 'AllergyIntolerance':
        return this.normalizeAllergy(resource);
      case 'Patient':
        return this.normalizePatient(resource);
      default:
        throw new Error(`Unsupported FHIR resource type: ${resource.resourceType}`);
    }
  }

  // ─── FHIR Observation → Lab or Vital ──────────────────────────────────────

  private normalizeObservation(resource: FhirResource): CanonicalHealthRecord {
    const category = (resource.category as Array<{ coding?: Array<{ code?: string }> }>)?.[0]?.coding?.[0]?.code;
    const isVital = category === 'vital-signs';

    const coding = (resource.code as { coding?: Array<{ code?: string; display?: string }> })?.coding?.[0];
    const valueQuantity = resource.valueQuantity as { value?: number; unit?: string } | undefined;

    if (isVital) {
      const payload: CanonicalVitalSign = {
        kind: 'VITAL_SIGN',
        vitalType: this.loincToVitalType(coding?.code ?? ''),
        value: valueQuantity?.value ?? 0,
        unit: valueQuantity?.unit ?? '',
        loincCode: coding?.code,
        measuredAt: new Date((resource.effectiveDateTime as string) ?? Date.now()),
      };

      const base = this.buildBaseRecord(resource, 'VITAL_SIGN');
      const validation = validateCanonical(payload);
      return { ...base, payload, validation };
    }

    const payload: CanonicalLabResult = {
      kind: 'LAB_RESULT',
      testName: coding?.display ?? 'Unknown',
      loincCode: coding?.code,
      value: valueQuantity?.value ?? (resource.valueString as string) ?? '',
      unit: valueQuantity?.unit ?? '',
      resultedAt: new Date((resource.effectiveDateTime as string) ?? Date.now()),
      interpretation: this.fhirInterpretationToCanonical(
        (resource.interpretation as Array<{ coding?: Array<{ code?: string }> }>)?.[0]?.coding?.[0]?.code
      ),
    };

    const base = this.buildBaseRecord(resource, 'LAB_RESULT');
    const validation = validateCanonical(payload);
    return { ...base, payload, validation };
  }

  // ─── FHIR Condition → Diagnosis ───────────────────────────────────────────

  private normalizeCondition(resource: FhirResource): CanonicalHealthRecord {
    const coding = (resource.code as { coding?: Array<{ code?: string; display?: string }> })?.coding?.[0];
    const clinicalStatus = (resource.clinicalStatus as { coding?: Array<{ code?: string }> })?.coding?.[0]?.code?.toUpperCase();

    const payload: CanonicalDiagnosis = {
      kind: 'DIAGNOSIS',
      icd10Code: coding?.code ?? 'UNKNOWN',
      icd10Display: coding?.display ?? 'Unknown condition',
      clinicalStatus: (clinicalStatus as CanonicalDiagnosis['clinicalStatus']) ?? 'ACTIVE',
      onsetDate: resource.onsetDateTime ? new Date(resource.onsetDateTime as string) : undefined,
    };

    const base = this.buildBaseRecord(resource, 'DIAGNOSIS');
    const validation = validateCanonical(payload);
    return { ...base, payload, validation };
  }

  // ─── FHIR MedicationRequest → Medication ──────────────────────────────────

  private normalizeMedicationRequest(resource: FhirResource): CanonicalHealthRecord {
    const coding = (resource.medicationCodeableConcept as { coding?: Array<{ code?: string; display?: string }> })?.coding?.[0];
    const status = (resource.status as string)?.toUpperCase();
    const dosage = (resource.dosageInstruction as Array<{ text?: string; route?: { coding?: Array<{ display?: string }> }; doseAndRate?: Array<{ doseQuantity?: { value?: number; unit?: string } }> }>)?.[0];

    const payload: CanonicalMedication = {
      kind: 'MEDICATION',
      name: coding?.display ?? 'Unknown',
      rxNormCode: coding?.code,
      status: (status as CanonicalMedication['status']) ?? 'ACTIVE',
      dose: dosage?.doseAndRate?.[0]?.doseQuantity?.value?.toString(),
      doseUnit: dosage?.doseAndRate?.[0]?.doseQuantity?.unit,
      route: dosage?.route?.coding?.[0]?.display,
    };

    const base = this.buildBaseRecord(resource, 'MEDICATION');
    const validation = validateCanonical(payload);
    return { ...base, payload, validation };
  }

  // ─── FHIR AllergyIntolerance → Allergy ────────────────────────────────────

  private normalizeAllergy(resource: FhirResource): CanonicalHealthRecord {
    const coding = (resource.code as { coding?: Array<{ code?: string; display?: string }> })?.coding?.[0];
    const criticality = (resource.criticality as string)?.toUpperCase();

    const payload: CanonicalAllergy = {
      kind: 'ALLERGY',
      allergen: coding?.display ?? 'Unknown',
      snomedCode: coding?.code,
      type: (resource.type as CanonicalAllergy['type']) ?? 'OTHER',
      status: 'ACTIVE',
      severity: criticality === 'HIGH'
        ? 'SEVERE'
        : criticality === 'LOW'
          ? 'MILD'
          : 'MODERATE',
    };

    const base = this.buildBaseRecord(resource, 'ALLERGY');
    const validation = validateCanonical(payload);
    return { ...base, payload, validation };
  }

  // ─── FHIR Patient → Demographics ──────────────────────────────────────────

  private normalizePatient(resource: FhirResource): CanonicalHealthRecord {
    const name = (resource.name as Array<{ given?: string[]; family?: string }>)?.[0];
    const address = (resource.address as Array<{ line?: string[]; city?: string; state?: string; country?: string; postalCode?: string }>)?.[0];
    const phone = (resource.telecom as Array<{ system?: string; value?: string }>)?.find(t => t.system === 'phone')?.value;
    const email = (resource.telecom as Array<{ system?: string; value?: string }>)?.find(t => t.system === 'email')?.value;

    const payload: CanonicalPatientDemographics = {
      kind: 'PATIENT_DEMOGRAPHICS',
      firstName: name?.given?.[0],
      lastName: name?.family,
      birthDate: resource.birthDate ? new Date(resource.birthDate as string) : undefined,
      gender: this.fhirGenderToCanonical(resource.gender as string),
      phone,
      email,
      address: address ? {
        street: address.line?.[0],
        city: address.city,
        state: address.state,
        country: address.country,
        postalCode: address.postalCode,
      } : undefined,
    };

    const base = this.buildBaseRecord(resource, 'PATIENT_DEMOGRAPHICS');
    const validation = validateCanonical(payload);
    return { ...base, payload, validation };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private loincToVitalType(loincCode: string): CanonicalVitalSign['vitalType'] {
    const map: Record<string, CanonicalVitalSign['vitalType']> = {
      '8480-6': 'BLOOD_PRESSURE',
      '8867-4': 'HEART_RATE',
      '9279-1': 'RESPIRATORY_RATE',
      '8310-5': 'TEMPERATURE',
      '59408-5': 'SPO2',
      '29463-7': 'WEIGHT',
      '8302-2': 'HEIGHT',
      '39156-5': 'BMI',
      '15074-8': 'BLOOD_GLUCOSE',
    };
    return map[loincCode] ?? 'OTHER';
  }

  private fhirInterpretationToCanonical(code?: string): CanonicalLabResult['interpretation'] {
    if (!code) return 'INDETERMINATE';
    if (code === 'N') return 'NORMAL';
    if (['A', 'H', 'L'].includes(code)) return 'ABNORMAL';
    if (['HH', 'LL', 'AA'].includes(code)) return code === 'HH' ? 'CRITICAL_HIGH' : 'CRITICAL_LOW';
    return 'INDETERMINATE';
  }

  private fhirGenderToCanonical(gender?: string): CanonicalPatientDemographics['gender'] {
    const map: Record<string, CanonicalPatientDemographics['gender']> = {
      male: 'MALE',
      female: 'FEMALE',
      other: 'OTHER',
      unknown: 'UNKNOWN',
    };
    return map[gender?.toLowerCase() ?? ''] ?? 'UNKNOWN';
  }
}
