/**
 * CanonicalHealthRecord → FHIR R4 Mapper
 *
 * Converts canonical health records to FHIR R4 Bundle for RNDS export
 *
 * INVARIANT RUTH: ANVISA Class I SaMD annotations
 * INVARIANT ELENA: Complete audit trail via Bundle meta
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  CanonicalHealthRecord,
  CanonicalPatient,
  CanonicalObservation,
  CanonicalCondition,
  CanonicalMedicationRequest,
  CanonicalAllergyIntolerance,
} from '../types';

/**
 * CanonicalToFHIRConverter
 * Converts canonical records to FHIR R4 Bundle for interoperability
 */
export class CanonicalToFHIRConverter {
  /**
   * Convert CanonicalPatient to FHIR Patient
   * Includes Brazil RNDS identifiers (CPF, CNES)
   */
  convertPatient(patient: CanonicalPatient): fhir.Patient {
    const identifier: fhir.Identifier[] = [];

    // Add CPF identifier (Brazil RNDS requirement)
    if (patient.cpf) {
      identifier.push({
        system: 'http://www.saude.gov.br/fhir/r4/NamingSystem/cpf',
        value: patient.cpf,
        type: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
              code: 'SSN',
              display: 'Social Security Number',
            },
          ],
        },
      });
    }

    // Add NPI if present (US)
    if (patient.npi) {
      identifier.push({
        system: 'http://hl7.org/fhir/sid/us-npi',
        value: patient.npi,
      });
    }

    const telecom: fhir.ContactPoint[] = [];
    if (patient.email) {
      telecom.push({
        system: 'email',
        value: patient.email,
        use: 'home',
      });
    }
    if (patient.phone) {
      telecom.push({
        system: 'phone',
        value: patient.phone,
        use: 'home',
      });
    }

    // Convert address to FHIR format
    const address: fhir.Address[] = [];
    if (patient.address) {
      const line: string[] = [];
      if (patient.address.street) line.push(patient.address.street);
      if (patient.address.number) line.push(patient.address.number);
      if (patient.address.complement) line.push(patient.address.complement);

      address.push({
        use: 'home',
        type: 'physical',
        line: line,
        city: patient.address.city,
        district: patient.address.neighborhood,
        state: patient.address.state,
        postalCode: patient.address.postalCode,
        country: patient.address.country,
      });
    }

    const fhirPatient: fhir.Patient = {
      resourceType: 'Patient',
      id: patient.id,
      meta: {
        lastUpdated: new Date().toISOString(),
        source: patient.sourceAuthority,
        profile: ['http://www.saude.gov.br/fhir/r4/StructureDefinition/BRPatient'], // RNDS profile
      },
      identifier,
      active: true,
      name: [
        {
          use: 'official',
          family: patient.lastName,
          given: [patient.firstName],
        },
      ],
      telecom,
      gender: patient.gender as fhir.Patient['gender'],
      birthDate: patient.dateOfBirth.split('T')[0], // Date only
      address,
    };

    return fhirPatient;
  }

  /**
   * Convert CanonicalObservation to FHIR Observation
   */
  convertObservation(observation: CanonicalObservation): fhir.Observation {
    const coding: fhir.Coding[] = [];

    // Add LOINC coding if available
    if (observation.loincCode) {
      coding.push({
        system: 'http://loinc.org',
        code: observation.loincCode,
        display: observation.display,
      });
    }

    // Add SNOMED coding if available
    if (observation.snomedCode) {
      coding.push({
        system: 'http://snomed.info/sct',
        code: observation.snomedCode,
      });
    }

    // Fallback coding
    if (coding.length === 0) {
      coding.push({
        system: 'http://example.com/codesystem/local',
        code: observation.code,
        display: observation.display,
      });
    }

    // Build value
    let value: any;
    if (observation.value !== undefined) {
      if (typeof observation.value === 'number') {
        value = {
          valueQuantity: {
            value: observation.value,
            unit: observation.unit,
            system: 'http://unitsofmeasure.org',
            code: observation.unit,
          } as fhir.Quantity,
        };
      } else if (typeof observation.value === 'string') {
        value = { valueString: observation.value };
      } else if (typeof observation.value === 'boolean') {
        value = { valueBoolean: observation.value };
      }
    }

    // Category
    const categoryCode = observation.category === 'lab' ? 'laboratory'
      : observation.category === 'vital-signs' ? 'vital-signs'
        : observation.category;

    const fhirObservation: fhir.Observation = {
      resourceType: 'Observation',
      id: observation.id,
      meta: {
        lastUpdated: new Date().toISOString(),
        source: observation.sourceAuthority,
      },
      status: observation.status as fhir.Observation['status'],
      category: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/observation-category',
              code: categoryCode,
            },
          ],
        },
      ],
      code: {
        coding,
        text: observation.display,
      },
      subject: {
        reference: `Patient/${observation.patientId}`,
      },
      effectiveDateTime: observation.effectiveDateTime,
      issued: observation.issued,
      ...value,
      referenceRange: observation.referenceRange ? [
        {
          text: observation.referenceRange,
        },
      ] : undefined,
      interpretation: observation.interpretation ? [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
              code: observation.interpretation,
            },
          ],
        },
      ] : undefined,
    };

    return fhirObservation;
  }

  /**
   * Convert CanonicalCondition to FHIR Condition
   * Uses ICD-10 coding for RNDS compliance
   */
  convertCondition(condition: CanonicalCondition): fhir.Condition {
    const fhirCondition: fhir.Condition = {
      resourceType: 'Condition',
      id: condition.id,
      meta: {
        lastUpdated: new Date().toISOString(),
        source: condition.sourceAuthority,
        profile: ['http://www.saude.gov.br/fhir/r4/StructureDefinition/BRCondition'], // RNDS profile
      },
      clinicalStatus: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
            code: condition.clinicalStatus,
          },
        ],
      },
      verificationStatus: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
            code: condition.verificationStatus,
          },
        ],
      },
      code: {
        coding: [
          {
            system: 'http://hl7.org/fhir/sid/icd-10',
            code: condition.icd10Code,
            display: condition.display,
          },
        ],
      },
      subject: {
        reference: `Patient/${condition.patientId}`,
      },
      recordedDate: condition.recordedDate,
    };

    return fhirCondition;
  }

  /**
   * Convert CanonicalMedicationRequest to FHIR MedicationRequest
   */
  convertMedicationRequest(medication: CanonicalMedicationRequest): fhir.MedicationRequest {
    const dosageInstruction: fhir.Dosage[] = [];

    if (medication.dosage) {
      dosageInstruction.push({
        route: medication.dosage.route ? {
          coding: [
            {
              system: 'http://snomed.info/sct',
              code: medication.dosage.route,
            },
          ],
        } : undefined,
        doseAndRate: [
          {
            doseQuantity: medication.dosage.dose ? {
              value: medication.dosage.dose,
              unit: medication.dosage.unit,
              system: 'http://unitsofmeasure.org',
              code: medication.dosage.unit,
            } : undefined,
          },
        ],
        timing: medication.dosage.frequency ? {
          repeat: {
            frequency: parseInt(medication.dosage.frequency.split('x')[0], 10) || 1,
          },
        } : undefined,
      });
    }

    const fhirMed: fhir.MedicationRequest = {
      resourceType: 'MedicationRequest',
      id: medication.id,
      meta: {
        lastUpdated: new Date().toISOString(),
        source: medication.sourceAuthority,
      },
      status: medication.status as fhir.MedicationRequest['status'],
      intent: medication.intent as fhir.MedicationRequest['intent'],
      medicationCodeableConcept: {
        coding: [
          {
            system: 'http://www.saude.gov.br/fhir/r4/CodeSystem/BRMedicacao', // ANVISA
            code: medication.medicationCode,
            display: medication.medicationDisplay,
          },
        ],
      },
      subject: {
        reference: `Patient/${medication.patientId}`,
      },
      authoredOn: medication.authoredOn,
      dosageInstruction: dosageInstruction.length > 0 ? dosageInstruction : undefined,
    };

    return fhirMed;
  }

  /**
   * Convert CanonicalAllergyIntolerance to FHIR AllergyIntolerance
   */
  convertAllergyIntolerance(allergy: CanonicalAllergyIntolerance): fhir.AllergyIntolerance {
    const fhirAllergy: fhir.AllergyIntolerance = {
      resourceType: 'AllergyIntolerance',
      id: allergy.id,
      meta: {
        lastUpdated: new Date().toISOString(),
        source: allergy.sourceAuthority,
      },
      clinicalStatus: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
            code: allergy.clinicalStatus,
          },
        ],
      },
      verificationStatus: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification',
            code: allergy.verificationStatus,
          },
        ],
      },
      type: allergy.type as fhir.AllergyIntolerance['type'],
      category: [allergy.category as any],
      criticality: allergy.criticality as fhir.AllergyIntolerance['criticality'],
      code: {
        coding: [
          {
            system: 'http://snomed.info/sct',
            code: allergy.substanceCode,
            display: allergy.substanceDisplay,
          },
        ],
      },
      patient: {
        reference: `Patient/${allergy.patientId}`,
      },
      recordedDate: allergy.recordedDate,
      reaction: allergy.manifestations ? [
        {
          manifestation: allergy.manifestations.map((m: string) => ({
            text: m,
          })),
        },
      ] : undefined,
    };

    return fhirAllergy;
  }

  /**
   * Convert CanonicalHealthRecord to FHIR Bundle
   * Returns a transaction bundle for RNDS submission
   *
   * RUTH: Includes ANVISA Class I SaMD metadata
   * ELENA: Complete audit trail
   */
  convertToBundle(record: CanonicalHealthRecord): fhir.Bundle {
    const entries: any[] = [];

    // Add Patient
    entries.push({
      resource: this.convertPatient(record.patient),
      request: {
        method: 'PUT',
        url: `Patient/${record.patient.id}`,
      },
    });

    // Add Observations
    for (const obs of record.observations) {
      entries.push({
        resource: this.convertObservation(obs),
        request: {
          method: 'POST',
          url: 'Observation',
        },
      });
    }

    // Add Conditions
    for (const cond of record.conditions) {
      entries.push({
        resource: this.convertCondition(cond),
        request: {
          method: 'POST',
          url: 'Condition',
        },
      });
    }

    // Add Medications
    for (const med of record.medications) {
      entries.push({
        resource: this.convertMedicationRequest(med),
        request: {
          method: 'POST',
          url: 'MedicationRequest',
        },
      });
    }

    // Add Allergies
    for (const allergy of record.allergies) {
      entries.push({
        resource: this.convertAllergyIntolerance(allergy),
        request: {
          method: 'POST',
          url: 'AllergyIntolerance',
        },
      });
    }

    const bundle: fhir.Bundle = {
      resourceType: 'Bundle',
      id: uuidv4(),
      meta: {
        lastUpdated: new Date().toISOString(),
        // RUTH: ANVISA Class I SaMD annotation
        profile: ['http://www.saude.gov.br/fhir/r4/StructureDefinition/BRBundle'],
        // ELENA: Source tracking for audit
        source: record.patient.sourceAuthority,
      },
      type: 'transaction',
      timestamp: new Date().toISOString(),
      entry: entries,
    } as any;

    return bundle;
  }
}
