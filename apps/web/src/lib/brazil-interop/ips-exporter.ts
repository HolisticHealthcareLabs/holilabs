/**
 * IPS (International Patient Summary) Exporter
 *
 * Generates FHIR R4 compliant International Patient Summary bundles for global
 * health data portability.
 *
 * IPS is an ISO/HL7 standard (ISO 27269) for minimal essential patient summaries
 * used for unplanned, cross-border care and emergency situations.
 *
 * Required Sections:
 * - Allergies and Intolerances
 * - Medication Summary
 * - Problem List
 *
 * Optional Sections (included if data available):
 * - Immunizations
 * - History of Procedures
 * - Medical Devices
 * - Diagnostic Results
 * - Vital Signs
 *
 * @see https://international-patient-summary.net/
 * @see http://hl7.org/fhir/uv/ips/
 */

import type { PrismaClient } from '@prisma/client';

// ============================================================================
// FHIR R4 TYPE DEFINITIONS (Subset needed for IPS)
// ============================================================================

export interface FHIRCodeableConcept {
  coding?: Array<{
    system: string;
    code: string;
    display?: string;
  }>;
  text?: string;
}

export interface FHIRReference {
  reference: string;
  display?: string;
}

export interface FHIRIdentifier {
  system?: string;
  value: string;
  type?: FHIRCodeableConcept;
}

export interface FHIRPatient {
  resourceType: 'Patient';
  id: string;
  identifier?: FHIRIdentifier[];
  name?: Array<{
    family: string;
    given: string[];
  }>;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
}

export interface FHIRAllergyIntolerance {
  resourceType: 'AllergyIntolerance';
  id: string;
  clinicalStatus?: FHIRCodeableConcept;
  verificationStatus?: FHIRCodeableConcept;
  type?: 'allergy' | 'intolerance';
  category?: ('food' | 'medication' | 'environment' | 'biologic')[];
  criticality?: 'low' | 'high' | 'unable-to-assess';
  code: FHIRCodeableConcept;
  patient: FHIRReference;
  onsetDateTime?: string;
  reaction?: Array<{
    manifestation: FHIRCodeableConcept[];
    severity?: 'mild' | 'moderate' | 'severe';
  }>;
}

export interface FHIRMedicationStatement {
  resourceType: 'MedicationStatement';
  id: string;
  status: 'active' | 'completed' | 'entered-in-error' | 'intended' | 'stopped' | 'on-hold' | 'unknown' | 'not-taken';
  medicationCodeableConcept: FHIRCodeableConcept;
  subject: FHIRReference;
  effectiveDateTime?: string;
  effectivePeriod?: {
    start?: string;
    end?: string;
  };
  dosage?: Array<{
    text?: string;
    timing?: {
      repeat?: {
        frequency?: number;
        period?: number;
        periodUnit?: string;
      };
    };
  }>;
}

export interface FHIRCondition {
  resourceType: 'Condition';
  id: string;
  clinicalStatus?: FHIRCodeableConcept;
  verificationStatus?: FHIRCodeableConcept;
  category?: FHIRCodeableConcept[];
  code: FHIRCodeableConcept;
  subject: FHIRReference;
  onsetDateTime?: string;
}

export interface FHIRImmunization {
  resourceType: 'Immunization';
  id: string;
  status: 'completed' | 'entered-in-error' | 'not-done';
  vaccineCode: FHIRCodeableConcept;
  patient: FHIRReference;
  occurrenceDateTime: string;
  protocolApplied?: Array<{
    doseNumberPositiveInt?: number;
  }>;
}

export interface FHIRProcedure {
  resourceType: 'Procedure';
  id: string;
  status: 'preparation' | 'in-progress' | 'not-done' | 'on-hold' | 'stopped' | 'completed' | 'entered-in-error' | 'unknown';
  code: FHIRCodeableConcept;
  subject: FHIRReference;
  performedDateTime?: string;
}

export interface FHIRComposition {
  resourceType: 'Composition';
  id: string;
  status: 'preliminary' | 'final' | 'amended' | 'entered-in-error';
  type: FHIRCodeableConcept;
  subject: FHIRReference;
  date: string;
  author: FHIRReference[];
  title: string;
  section: Array<{
    title: string;
    code?: FHIRCodeableConcept;
    text?: {
      status: 'generated' | 'extensions' | 'additional' | 'empty';
      div: string;
    };
    entry?: FHIRReference[];
  }>;
}

export interface FHIRBundle {
  resourceType: 'Bundle';
  type: 'document';
  timestamp: string;
  identifier?: FHIRIdentifier;
  entry: Array<{
    fullUrl: string;
    resource: FHIRPatient | FHIRComposition | FHIRAllergyIntolerance | FHIRMedicationStatement | FHIRCondition | FHIRImmunization | FHIRProcedure;
  }>;
}

// ============================================================================
// IPS GENERATION
// ============================================================================

/**
 * Exports an International Patient Summary for a given patient
 *
 * @param prisma - Prisma client instance
 * @param patientId - Patient ID
 * @returns FHIR R4 Bundle containing IPS document
 *
 * @example
 * ```typescript
 * const ips = await exportPatientIPS(prisma, 'clxyz123');
 *
 * // Send to another healthcare system
 * await fetch('https://hospital.example.com/fhir/Bundle', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/fhir+json' },
 *   body: JSON.stringify(ips)
 * });
 * ```
 */
export async function exportPatientIPS(
  prisma: PrismaClient,
  patientId: string
): Promise<FHIRBundle> {
  // Fetch patient data
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      allergies: {
        where: { isActive: true }
      }
    }
  });

  if (!patient) {
    throw new Error(`Patient ${patientId} not found`);
  }

  const timestamp = new Date().toISOString();
  const baseUrl = 'https://api.holilabs.com/fhir'; // TODO: Make configurable

  // Build FHIR Patient resource
  const fhirPatient: FHIRPatient = {
    resourceType: 'Patient',
    id: patient.id,
    identifier: [],
    name: [{
      family: patient.lastName,
      given: [patient.firstName]
    }],
    gender: mapGender(patient.gender),
    birthDate: patient.dateOfBirth.toISOString().split('T')[0]
  };

  // Add CNS identifier if available
  if (patient.cns) {
    fhirPatient.identifier!.push({
      system: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cns',
      value: patient.cns,
      type: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
          code: 'NI',
          display: 'National unique individual identifier'
        }]
      }
    });
  }

  // Add CPF identifier if available
  if (patient.cpf) {
    fhirPatient.identifier!.push({
      system: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf',
      value: patient.cpf
    });
  }

  // Build FHIR Allergies
  const allergies: FHIRAllergyIntolerance[] = patient.allergies.map(allergy => ({
    resourceType: 'AllergyIntolerance',
    id: allergy.id,
    clinicalStatus: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
        code: allergy.isActive ? 'active' : 'resolved'
      }]
    },
    verificationStatus: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification',
        code: mapAllergyVerificationStatus(allergy.verificationStatus)
      }]
    },
    type: mapAllergyType(allergy.allergyType),
    category: [mapAllergyCategory(allergy.allergyType)],
    criticality: mapAllergySeverity(allergy.severity),
    code: {
      text: allergy.allergen
    },
    patient: {
      reference: `Patient/${patient.id}`
    },
    onsetDateTime: allergy.onsetDate?.toISOString(),
    reaction: allergy.reactions.length > 0 ? [{
      manifestation: allergy.reactions.map(r => ({
        text: r
      })),
      severity: mapReactionSeverity(allergy.severity)
    }] : undefined
  }));

  // Build FHIR Medications
  // TODO: Restore when medications relation is available
  const medications: FHIRMedicationStatement[] = [];

  // Build FHIR Conditions (Problems)
  // TODO: Restore when diagnoses relation is available
  const conditions: FHIRCondition[] = [];

  // Build FHIR Immunizations
  // TODO: Restore when immunizations relation is available
  const immunizations: FHIRImmunization[] = [];

  // Build FHIR Procedures
  // TODO: Restore when procedures relation is available
  const procedures: FHIRProcedure[] = [];

  // Build Composition (IPS Document structure)
  const composition: FHIRComposition = {
    resourceType: 'Composition',
    id: `ips-${patient.id}-${Date.now()}`,
    status: 'final',
    type: {
      coding: [{
        system: 'http://loinc.org',
        code: '60591-5',
        display: 'Patient summary Document'
      }]
    },
    subject: {
      reference: `Patient/${patient.id}`,
      display: `${patient.firstName} ${patient.lastName}`
    },
    date: timestamp,
    author: [{
      reference: 'Organization/holilabs',
      display: 'Holi Labs'
    }],
    title: 'International Patient Summary',
    section: [
      {
        title: 'Allergies and Intolerances',
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '48765-2',
            display: 'Allergies and adverse reactions Document'
          }]
        },
        entry: allergies.map(a => ({
          reference: `AllergyIntolerance/${a.id}`
        }))
      },
      {
        title: 'Medication Summary',
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '10160-0',
            display: 'History of Medication use Narrative'
          }]
        },
        entry: medications.map(m => ({
          reference: `MedicationStatement/${m.id}`
        }))
      },
      {
        title: 'Problem List',
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '11450-4',
            display: 'Problem list - Reported'
          }]
        },
        entry: conditions.map(c => ({
          reference: `Condition/${c.id}`
        }))
      },
      {
        title: 'Immunizations',
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '11369-6',
            display: 'History of Immunization Narrative'
          }]
        },
        entry: immunizations.map(i => ({
          reference: `Immunization/${i.id}`
        }))
      },
      {
        title: 'History of Procedures',
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '47519-4',
            display: 'History of Procedures Document'
          }]
        },
        entry: procedures.map(p => ({
          reference: `Procedure/${p.id}`
        }))
      }
    ]
  };

  // Build Bundle
  const bundle: FHIRBundle = {
    resourceType: 'Bundle',
    type: 'document',
    timestamp,
    identifier: {
      system: 'urn:ietf:rfc:3986',
      value: `urn:uuid:${crypto.randomUUID()}`
    },
    entry: [
      {
        fullUrl: `${baseUrl}/Composition/${composition.id}`,
        resource: composition
      },
      {
        fullUrl: `${baseUrl}/Patient/${fhirPatient.id}`,
        resource: fhirPatient
      },
      ...allergies.map(a => ({
        fullUrl: `${baseUrl}/AllergyIntolerance/${a.id}`,
        resource: a
      })),
      ...medications.map(m => ({
        fullUrl: `${baseUrl}/MedicationStatement/${m.id}`,
        resource: m
      })),
      ...conditions.map(c => ({
        fullUrl: `${baseUrl}/Condition/${c.id}`,
        resource: c
      })),
      ...immunizations.map(i => ({
        fullUrl: `${baseUrl}/Immunization/${i.id}`,
        resource: i
      })),
      ...procedures.map(p => ({
        fullUrl: `${baseUrl}/Procedure/${p.id}`,
        resource: p
      }))
    ]
  };

  return bundle;
}

// ============================================================================
// MAPPING FUNCTIONS (Internal DB → FHIR)
// ============================================================================

function mapGender(gender: string | null): 'male' | 'female' | 'other' | 'unknown' {
  if (!gender) return 'unknown';
  const normalized = gender.toLowerCase();
  if (normalized === 'male' || normalized === 'm') return 'male';
  if (normalized === 'female' || normalized === 'f') return 'female';
  if (normalized === 'other') return 'other';
  return 'unknown';
}

function mapAllergyVerificationStatus(status: string): string {
  const statusMap: Record<string, string> = {
    CONFIRMED: 'confirmed',
    UNVERIFIED: 'unconfirmed',
    SUSPECTED: 'unconfirmed',
    REFUTED: 'refuted'
  };
  return statusMap[status] || 'unconfirmed';
}

function mapAllergyType(allergyType: string): 'allergy' | 'intolerance' {
  return allergyType === 'INTOLERANCE' ? 'intolerance' : 'allergy';
}

function mapAllergyCategory(allergyType: string): 'food' | 'medication' | 'environment' | 'biologic' {
  const categoryMap: Record<string, 'food' | 'medication' | 'environment' | 'biologic'> = {
    MEDICATION: 'medication',
    FOOD: 'food',
    ENVIRONMENTAL: 'environment',
    INSECT: 'environment',
    LATEX: 'environment',
    OTHER: 'environment'
  };
  return categoryMap[allergyType] || 'environment';
}

function mapAllergySeverity(severity: string): 'low' | 'high' | 'unable-to-assess' {
  const severityMap: Record<string, 'low' | 'high' | 'unable-to-assess'> = {
    MILD: 'low',
    MODERATE: 'high',
    SEVERE: 'high',
    UNKNOWN: 'unable-to-assess'
  };
  return severityMap[severity] || 'unable-to-assess';
}

function mapReactionSeverity(severity: string): 'mild' | 'moderate' | 'severe' {
  const severityMap: Record<string, 'mild' | 'moderate' | 'severe'> = {
    MILD: 'mild',
    MODERATE: 'moderate',
    SEVERE: 'severe',
    UNKNOWN: 'moderate'
  };
  return severityMap[severity] || 'moderate';
}

function mapMedicationStatus(status: string): 'active' | 'completed' | 'stopped' {
  const statusMap: Record<string, 'active' | 'completed' | 'stopped'> = {
    ACTIVE: 'active',
    COMPLETED: 'completed',
    DISCONTINUED: 'stopped',
    PAUSED: 'stopped'
  };
  return (statusMap[status] || 'active') as 'active' | 'completed' | 'stopped';
}

function mapDiagnosisStatus(status: string): string {
  const statusMap: Record<string, string> = {
    ACTIVE: 'active',
    RESOLVED: 'resolved',
    INACTIVE: 'inactive'
  };
  return statusMap[status] || 'active';
}

function mapDiagnosisVerificationStatus(status: string): string {
  const statusMap: Record<string, string> = {
    CONFIRMED: 'confirmed',
    PROVISIONAL: 'provisional',
    DIFFERENTIAL: 'differential',
    REFUTED: 'refuted'
  };
  return statusMap[status] || 'unconfirmed';
}

function mapImmunizationStatus(status: string): 'completed' | 'entered-in-error' | 'not-done' {
  const statusMap: Record<string, 'completed' | 'entered-in-error' | 'not-done'> = {
    COMPLETED: 'completed',
    DECLINED: 'not-done',
    CANCELLED: 'not-done'
  };
  return statusMap[status] || 'completed';
}
