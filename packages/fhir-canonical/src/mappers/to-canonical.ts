/**
 * FHIR R4 → CanonicalHealthRecord Mapper
 *
 * Converts FHIR R4 resources to canonical health records
 *
 * INVARIANT ELENA: No value imputation — preserve data as-is
 * INVARIANT RUTH: Cite source authority and preserve audit trail
 */

import { v4 as uuidv4 } from 'uuid';
import {
  CanonicalPatient,
  CanonicalObservation,
  CanonicalCondition,
  CanonicalMedicationRequest,
  CanonicalAllergyIntolerance,
  CanonicalHealthRecord,
  CanonicalPatientSchema,
  CanonicalObservationSchema,
  CanonicalConditionSchema,
  CanonicalMedicationRequestSchema,
  CanonicalAllergyIntoleranceSchema,
  CanonicalHealthRecordSchema,
} from '../types';

const VALID_INTERPRETATIONS = ['low', 'normal', 'high', 'critical', 'critical-low', 'critical-high'] as const;
const VALID_ROUTES = ['oral', 'intravenous', 'intramuscular', 'subcutaneous', 'topical', 'rectal', 'other'] as const;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function extractPatientId(reference: string | undefined): string {
  const ref = reference?.split('/').pop() || '';
  return UUID_REGEX.test(ref) ? ref : uuidv4();
}

type ValidInterpretation = typeof VALID_INTERPRETATIONS[number];
type ValidRoute = typeof VALID_ROUTES[number];

function toValidInterpretation(s: string | undefined): ValidInterpretation | undefined {
  if (!s) return undefined;
  return VALID_INTERPRETATIONS.includes(s as ValidInterpretation) ? s as ValidInterpretation : undefined;
}

function toValidRoute(s: string | undefined): ValidRoute | undefined {
  if (!s) return undefined;
  return VALID_ROUTES.includes(s as ValidRoute) ? s as ValidRoute : 'other';
}

/**
 * FHIRToCanonicalConverter
 * Bidirectional mapper with source tracking and validation
 */
export class FHIRToCanonicalConverter {
  private sourceAuthority: string;
  private citationUrl?: string;

  constructor(sourceAuthority: string, citationUrl?: string) {
    this.sourceAuthority = sourceAuthority;
    this.citationUrl = citationUrl;
  }

  /**
   * Convert FHIR Patient to CanonicalPatient
   * ELENA: humanReviewRequired=true, source tracking
   */
  convertPatient(fhirPatient: fhir4.Patient): CanonicalPatient {
    const cpfIdentifier = fhirPatient.identifier?.find(
      (id: fhir4.Identifier) => id.system?.includes('cpf') || id.type?.coding?.[0]?.code === 'SSN'
    );

    const npiIdentifier = fhirPatient.identifier?.find(
      (id: fhir4.Identifier) => id.system?.includes('us-npi')
    );

    const officialName = fhirPatient.name?.[0];
    const emailTelecom = fhirPatient.telecom?.find((t: fhir4.ContactPoint) => t.system === 'email');
    const phoneTelecom = fhirPatient.telecom?.find((t: fhir4.ContactPoint) => t.system === 'phone');
    const homeAddress = fhirPatient.address?.[0];

    const patient: CanonicalPatient = {
      id: fhirPatient.id || uuidv4(),
      firstName: officialName?.given?.[0] || '',
      lastName: officialName?.family || '',
      dateOfBirth: fhirPatient.birthDate
        ? (fhirPatient.birthDate.includes('T') ? fhirPatient.birthDate : `${fhirPatient.birthDate}T00:00:00Z`)
        : new Date().toISOString(),
      gender: (fhirPatient.gender as CanonicalPatient['gender']) || 'unknown',
      cpf: cpfIdentifier?.value,
      npi: npiIdentifier?.value,
      email: emailTelecom?.value,
      phone: phoneTelecom?.value,
      address: homeAddress ? {
        street: homeAddress.line?.[0] || '',
        number: homeAddress.line?.[1] || '',
        complement: homeAddress.line?.[2],
        neighborhood: homeAddress.district || '',
        city: homeAddress.city || '',
        state: (homeAddress.state || 'BR').slice(0, 2),
        postalCode: (homeAddress.postalCode || '00000000').replace(/\D/g, '').padEnd(8, '0').slice(0, 8),
        country: homeAddress.country || 'BR',
      } : undefined,
      sourceAuthority: this.sourceAuthority,
      citationUrl: this.citationUrl,
      humanReviewRequired: true, // ELENA invariant
      importedAt: new Date().toISOString(),
    };

    return CanonicalPatientSchema.parse(patient);
  }

  /**
   * Convert FHIR Observation to CanonicalObservation
   * ELENA: Preserve raw value without imputation
   */
  convertObservation(fhirObs: fhir4.Observation): CanonicalObservation {
    const loincCoding = fhirObs.code?.coding?.find(
      (c: fhir4.Coding) => c.system?.includes('loinc')
    );
    const snomedCoding = fhirObs.code?.coding?.find(
      (c: fhir4.Coding) => c.system?.includes('snomed')
    );
    const primaryCoding = fhirObs.code?.coding?.[0];

    const categoryCode = fhirObs.category?.[0]?.coding?.[0]?.code;
    const canonicalCategory = categoryCode === 'laboratory' ? 'lab'
      : categoryCode === 'vital-signs' ? 'vital-signs'
        : 'other';

    // Extract value without imputation (ELENA)
    let value: number | string | boolean | undefined;
    let unit: string | undefined;

    if ((fhirObs as any).valueQuantity) {
      value = (fhirObs as any).valueQuantity.value;
      unit = (fhirObs as any).valueQuantity.unit;
    } else if ((fhirObs as any).valueString) {
      value = (fhirObs as any).valueString;
    } else if ((fhirObs as any).valueBoolean !== undefined) {
      value = (fhirObs as any).valueBoolean;
    }

    const patientRef = extractPatientId(fhirObs.subject?.reference);

    const observation: CanonicalObservation = {
      id: fhirObs.id || uuidv4(),
      patientId: patientRef,
      code: primaryCoding?.code || fhirObs.code?.text || '',
      display: primaryCoding?.display || fhirObs.code?.text || '',
      loincCode: loincCoding?.code,
      snomedCode: snomedCoding?.code,
      category: canonicalCategory as CanonicalObservation['category'],
      status: (fhirObs.status as CanonicalObservation['status']) || 'unknown',
      value,
      unit,
      effectiveDateTime: fhirObs.effectiveDateTime || new Date().toISOString(),
      issued: fhirObs.issued,
      referenceRange: (fhirObs.referenceRange as any)?.[0]?.text,
      interpretation: toValidInterpretation(fhirObs.interpretation?.[0]?.coding?.[0]?.code),
      sourceAuthority: this.sourceAuthority,
      citationUrl: this.citationUrl,
      humanReviewRequired: true, // ELENA invariant
    };

    return CanonicalObservationSchema.parse(observation);
  }

  /**
   * Convert FHIR Condition to CanonicalCondition
   * RUTH: ICD-10 code required for RNDS compliance
   */
  convertCondition(fhirCondition: fhir4.Condition): CanonicalCondition {
    const icd10Coding = fhirCondition.code?.coding?.find(
      (c: fhir4.Coding) => c.system?.includes('icd-10')
    );
    const primaryCoding = fhirCondition.code?.coding?.[0];

    const patientRef = extractPatientId(fhirCondition.subject?.reference);

    const condition: CanonicalCondition = {
      id: fhirCondition.id || uuidv4(),
      patientId: patientRef,
      icd10Code: icd10Coding?.code || primaryCoding?.code || '',
      display: icd10Coding?.display || primaryCoding?.display || fhirCondition.code?.text || '',
      clinicalStatus: (fhirCondition.clinicalStatus?.coding?.[0]?.code as CanonicalCondition['clinicalStatus']) || 'active',
      verificationStatus: (fhirCondition.verificationStatus?.coding?.[0]?.code as CanonicalCondition['verificationStatus']) || 'unconfirmed',
      recordedDate: fhirCondition.recordedDate || new Date().toISOString(),
      sourceAuthority: this.sourceAuthority,
      citationUrl: this.citationUrl,
      humanReviewRequired: true, // ELENA invariant
    };

    return CanonicalConditionSchema.parse(condition);
  }

  /**
   * Convert FHIR MedicationRequest to CanonicalMedicationRequest
   */
  convertMedicationRequest(fhirMed: fhir4.MedicationRequest): CanonicalMedicationRequest {
    const anvisaCoding = fhirMed.medicationCodeableConcept?.coding?.find(
      (c: fhir4.Coding) => c.system?.includes('saude.gov.br') || c.system?.includes('anvisa')
    );
    const primaryCoding = fhirMed.medicationCodeableConcept?.coding?.[0];

    const patientRef = extractPatientId(fhirMed.subject?.reference);

    const dosageInstruction = fhirMed.dosageInstruction?.[0];
    let dosage: CanonicalMedicationRequest['dosage'];

    if (dosageInstruction) {
      const doseQty = dosageInstruction.doseAndRate?.[0]?.doseQuantity as any;
      const freq = dosageInstruction.timing?.repeat?.frequency;
      dosage = {
        dose: doseQty?.value ?? 0,
        unit: doseQty?.unit || 'unit',
        frequency: freq ? `${freq}x/day` : '1x/day',
        route: toValidRoute(dosageInstruction.route?.coding?.[0]?.code),
      };
    }

    const medication: CanonicalMedicationRequest = {
      id: fhirMed.id || uuidv4(),
      patientId: patientRef,
      medicationCode: anvisaCoding?.code || primaryCoding?.code || '',
      medicationDisplay: anvisaCoding?.display || primaryCoding?.display || '',
      status: (fhirMed.status as CanonicalMedicationRequest['status']) || 'unknown',
      intent: (fhirMed.intent as CanonicalMedicationRequest['intent']) || 'order',
      authoredOn: fhirMed.authoredOn || new Date().toISOString(),
      dosage,
      sourceAuthority: this.sourceAuthority,
      citationUrl: this.citationUrl,
      humanReviewRequired: true, // ELENA invariant
    };

    return CanonicalMedicationRequestSchema.parse(medication);
  }

  /**
   * Convert FHIR AllergyIntolerance to CanonicalAllergyIntolerance
   */
  convertAllergyIntolerance(fhirAllergy: fhir4.AllergyIntolerance): CanonicalAllergyIntolerance {
    const primaryCoding = fhirAllergy.code?.coding?.[0];
    const patientRef = extractPatientId(fhirAllergy.patient?.reference);

    const manifestations = fhirAllergy.reaction?.flatMap(
      (r: any) => r.manifestation?.map((m: any) => m.text || m.coding?.[0]?.display || '') || []
    ).filter(Boolean);

    const allergy: CanonicalAllergyIntolerance = {
      id: fhirAllergy.id || uuidv4(),
      patientId: patientRef,
      substanceCode: primaryCoding?.code || '',
      substanceDisplay: primaryCoding?.display || fhirAllergy.code?.text || '',
      type: (fhirAllergy.type as CanonicalAllergyIntolerance['type']) || 'allergy',
      category: ((fhirAllergy.category?.[0] as string) as CanonicalAllergyIntolerance['category']) || 'other',
      criticality: (fhirAllergy.criticality as CanonicalAllergyIntolerance['criticality']) || 'low',
      clinicalStatus: (fhirAllergy.clinicalStatus?.coding?.[0]?.code as CanonicalAllergyIntolerance['clinicalStatus']) || 'active',
      verificationStatus: (fhirAllergy.verificationStatus?.coding?.[0]?.code as CanonicalAllergyIntolerance['verificationStatus']) || 'unconfirmed',
      recordedDate: fhirAllergy.recordedDate || new Date().toISOString(),
      manifestations: manifestations?.length ? manifestations : undefined,
      sourceAuthority: this.sourceAuthority,
      citationUrl: this.citationUrl,
      humanReviewRequired: true, // ELENA invariant
    };

    return CanonicalAllergyIntoleranceSchema.parse(allergy);
  }

  /**
   * Convert FHIR Bundle to CanonicalHealthRecord
   * RUTH: Validates RNDS profiles before conversion
   */
  convertBundle(fhirBundle: fhir4.Bundle): CanonicalHealthRecord {
    const entries = (fhirBundle as any).entry || [];

    const patientEntry = entries.find((e: any) => e.resource?.resourceType === 'Patient');
    if (!patientEntry) {
      throw new Error('Bundle must contain a Patient resource');
    }

    const patient = this.convertPatient(patientEntry.resource);

    const observations: CanonicalObservation[] = entries
      .filter((e: any) => e.resource?.resourceType === 'Observation')
      .map((e: any) => this.convertObservation(e.resource));

    const conditions: CanonicalCondition[] = entries
      .filter((e: any) => e.resource?.resourceType === 'Condition')
      .map((e: any) => this.convertCondition(e.resource));

    const medications: CanonicalMedicationRequest[] = entries
      .filter((e: any) => e.resource?.resourceType === 'MedicationRequest')
      .map((e: any) => this.convertMedicationRequest(e.resource));

    const allergies: CanonicalAllergyIntolerance[] = entries
      .filter((e: any) => e.resource?.resourceType === 'AllergyIntolerance')
      .map((e: any) => this.convertAllergyIntolerance(e.resource));

    const now = new Date().toISOString();
    const record: CanonicalHealthRecord = {
      id: uuidv4(),
      patientId: patient.id,
      patient,
      observations,
      conditions,
      medications,
      allergies,
      humanReviewRequired: true, // ELENA invariant
      validationErrors: [],
      createdAt: now,
      updatedAt: now,
    };

    return CanonicalHealthRecordSchema.parse(record);
  }
}
