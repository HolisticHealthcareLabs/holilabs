/**
 * FHIR R4 Resource Mappers
 *
 * Bidirectional mapping for FHIR R4 clinical resources:
 * - Observation (lab results, vital signs)
 * - Condition (diagnoses, problems)
 * - MedicationStatement (medication history)
 * - Procedure (procedures, surgeries)
 *
 * Used for FHIR aggressive pull on patient onboarding
 */

import type { Medication, LabResult, Diagnosis } from '@prisma/client';

// TODO: Add ProcedureRecord model to schema when needed
// Temporary interface until ProcedureRecord model is added to Prisma schema
interface ProcedureRecordData {
  patientId: string;
  procedureName: string;
  snomedCode?: string;
  status?: string;
  performedAt?: Date;
  performedBy?: string;
  location?: string;
  indication?: string;
  notes?: string;
}

// ============================================================================
// FHIR OBSERVATION RESOURCE
// ============================================================================

export interface FHIRObservation {
  resourceType: 'Observation';
  id?: string;
  status: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled' | 'entered-in-error' | 'unknown';
  category?: Array<{
    coding?: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
    text?: string;
  }>;
  code: {
    coding?: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
    text?: string;
  };
  subject: {
    reference: string;
    display?: string;
  };
  effectiveDateTime?: string;
  effectivePeriod?: {
    start?: string;
    end?: string;
  };
  issued?: string;
  valueQuantity?: {
    value: number;
    unit?: string;
    system?: string;
    code?: string;
  };
  valueString?: string;
  valueBoolean?: boolean;
  valueInteger?: number;
  valueCodeableConcept?: {
    coding?: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
    text?: string;
  };
  interpretation?: Array<{
    coding?: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
    text?: string;
  }>;
  note?: Array<{
    text: string;
    time?: string;
  }>;
  referenceRange?: Array<{
    low?: {
      value: number;
      unit?: string;
    };
    high?: {
      value: number;
      unit?: string;
    };
    text?: string;
  }>;
}

/**
 * Convert FHIR Observation to internal LabResult
 */
export function fromFHIRObservation(observation: FHIRObservation, patientId: string): Partial<LabResult> {
  const labResult: Partial<LabResult> = {
    patientId,
    testName: observation.code.text || observation.code.coding?.[0]?.display || 'Unknown Test',
    status: mapObservationStatus(observation.status),
  };

  // Extract value
  if (observation.valueQuantity) {
    labResult.value = observation.valueQuantity.value.toString();
    labResult.unit = observation.valueQuantity.unit || undefined;
  } else if (observation.valueString) {
    labResult.value = observation.valueString;
  } else if (observation.valueBoolean !== undefined) {
    labResult.value = observation.valueBoolean.toString();
  } else if (observation.valueInteger !== undefined) {
    labResult.value = observation.valueInteger.toString();
  }

  // Extract reference range (stored as text string, not separate low/high)
  if (observation.referenceRange && observation.referenceRange.length > 0) {
    const range = observation.referenceRange[0];
    // Build reference range string from low/high values or use text
    if (range.low && range.high) {
      labResult.referenceRange = `${range.low.value}-${range.high.value} ${range.low.unit || ''}`.trim();
    } else if (range.text) {
      labResult.referenceRange = range.text;
    }
  }

  // Extract date
  if (observation.effectiveDateTime) {
    labResult.sampleCollectedAt = new Date(observation.effectiveDateTime);
  } else if (observation.effectivePeriod?.start) {
    labResult.sampleCollectedAt = new Date(observation.effectivePeriod.start);
  }

  // Extract notes
  if (observation.note && observation.note.length > 0) {
    labResult.notes = observation.note.map(n => n.text).join('\n');
  }

  // Extract category (test type)
  if (observation.category && observation.category.length > 0) {
    const categoryCode = observation.category[0].coding?.[0]?.code;
    const categoryDisplay = observation.category[0].coding?.[0]?.display;
    if (categoryDisplay) {
      labResult.category = categoryDisplay;
    } else if (categoryCode) {
      labResult.category = categoryCode.toUpperCase();
    }
  }

  // Extract interpretation (abnormal flag)
  if (observation.interpretation && observation.interpretation.length > 0) {
    const interpCode = observation.interpretation[0].coding?.[0]?.code;
    labResult.isAbnormal = interpCode ? !['N', 'normal'].includes(interpCode.toLowerCase()) : false;
  }

  return labResult;
}

/**
 * Map FHIR observation status to LabResultStatus enum
 * Valid values: PRELIMINARY, FINAL, CORRECTED, CANCELLED
 */
function mapObservationStatus(fhirStatus: string): 'PRELIMINARY' | 'FINAL' | 'CORRECTED' | 'CANCELLED' {
  const statusMap: Record<string, 'PRELIMINARY' | 'FINAL' | 'CORRECTED' | 'CANCELLED'> = {
    'final': 'FINAL',
    'amended': 'CORRECTED',
    'corrected': 'CORRECTED',
    'preliminary': 'PRELIMINARY',
    'registered': 'PRELIMINARY',
    'cancelled': 'CANCELLED',
    'entered-in-error': 'CANCELLED',
  };
  return statusMap[fhirStatus] || 'PRELIMINARY';
}

// ============================================================================
// FHIR CONDITION RESOURCE
// ============================================================================

export interface FHIRCondition {
  resourceType: 'Condition';
  id?: string;
  clinicalStatus?: {
    coding?: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
    text?: string;
  };
  verificationStatus?: {
    coding?: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
    text?: string;
  };
  category?: Array<{
    coding?: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
    text?: string;
  }>;
  severity?: {
    coding?: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
    text?: string;
  };
  code: {
    coding?: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
    text?: string;
  };
  subject: {
    reference: string;
    display?: string;
  };
  onsetDateTime?: string;
  onsetPeriod?: {
    start?: string;
    end?: string;
  };
  recordedDate?: string;
  note?: Array<{
    text: string;
    time?: string;
  }>;
}

/**
 * Convert FHIR Condition to internal Diagnosis
 */
export function fromFHIRCondition(condition: FHIRCondition, patientId: string): Partial<Diagnosis> {
  const diagnosis: Partial<Diagnosis> = {
    patientId,
    description: condition.code.text || condition.code.coding?.[0]?.display || 'Unknown Diagnosis',
  };

  // Extract ICD-10 code
  const icdCoding = condition.code.coding?.find(c =>
    c.system?.includes('icd-10') || c.system?.includes('icd10')
  );
  if (icdCoding) {
    diagnosis.icd10Code = icdCoding.code;
  }

  // Extract SNOMED code
  const snomedCoding = condition.code.coding?.find(c =>
    c.system?.includes('snomed')
  );
  if (snomedCoding) {
    diagnosis.snomedCode = snomedCoding.code;
  }

  // Extract status
  if (condition.clinicalStatus) {
    const statusCode = condition.clinicalStatus.coding?.[0]?.code;
    diagnosis.status = statusCode === 'active' ? 'ACTIVE' : 'RESOLVED';
  }

  // Extract severity
  if (condition.severity) {
    diagnosis.severity = condition.severity.coding?.[0]?.display || condition.severity.text;
  }

  // Extract onset date
  if (condition.onsetDateTime) {
    diagnosis.onsetDate = new Date(condition.onsetDateTime);
  } else if (condition.onsetPeriod?.start) {
    diagnosis.onsetDate = new Date(condition.onsetPeriod.start);
  }

  // Extract diagnosis date (recorded date)
  if (condition.recordedDate) {
    diagnosis.diagnosedAt = new Date(condition.recordedDate);
  }

  // Extract notes
  if (condition.note && condition.note.length > 0) {
    diagnosis.notes = condition.note.map(n => n.text).join('\n');
  }

  // TODO: Add 'type' field to Diagnosis schema if needed for category classification
  // For now, category information is stored in notes if present
  if (condition.category && condition.category.length > 0) {
    const categoryDisplay = condition.category[0].coding?.[0]?.display;
    if (categoryDisplay && diagnosis.notes) {
      diagnosis.notes += `\nCategory: ${categoryDisplay}`;
    } else if (categoryDisplay) {
      diagnosis.notes = `Category: ${categoryDisplay}`;
    }
  }

  return diagnosis;
}

// ============================================================================
// FHIR MEDICATIONSTATEMENT RESOURCE
// ============================================================================

export interface FHIRMedicationStatement {
  resourceType: 'MedicationStatement';
  id?: string;
  status: 'active' | 'completed' | 'entered-in-error' | 'intended' | 'stopped' | 'on-hold' | 'unknown' | 'not-taken';
  medicationCodeableConcept?: {
    coding?: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
    text?: string;
  };
  medicationReference?: {
    reference: string;
    display?: string;
  };
  subject: {
    reference: string;
    display?: string;
  };
  effectiveDateTime?: string;
  effectivePeriod?: {
    start?: string;
    end?: string;
  };
  dateAsserted?: string;
  dosage?: Array<{
    text?: string;
    timing?: {
      repeat?: {
        frequency?: number;
        period?: number;
        periodUnit?: 'h' | 'd' | 'wk' | 'mo';
      };
    };
    route?: {
      coding?: Array<{
        system: string;
        code: string;
        display?: string;
      }>;
      text?: string;
    };
    doseAndRate?: Array<{
      doseQuantity?: {
        value: number;
        unit?: string;
      };
    }>;
  }>;
  note?: Array<{
    text: string;
    time?: string;
  }>;
}

/**
 * Convert FHIR MedicationStatement to internal Medication
 */
export function fromFHIRMedicationStatement(medStatement: FHIRMedicationStatement, patientId: string): Partial<Medication> {
  const medication: Partial<Medication> = {
    patientId,
    name: medStatement.medicationCodeableConcept?.text ||
          medStatement.medicationCodeableConcept?.coding?.[0]?.display ||
          medStatement.medicationReference?.display ||
          'Unknown Medication',
    isActive: medStatement.status === 'active',
  };

  // Extract dosage information
  if (medStatement.dosage && medStatement.dosage.length > 0) {
    const dosage = medStatement.dosage[0];

    // Dose amount
    if (dosage.doseAndRate && dosage.doseAndRate.length > 0) {
      const dose = dosage.doseAndRate[0].doseQuantity;
      if (dose) {
        medication.dose = `${dose.value} ${dose.unit || ''}`.trim();
      }
    }

    // Frequency/timing
    if (dosage.timing?.repeat) {
      const repeat = dosage.timing.repeat;
      const frequency = repeat.frequency || 1;
      const period = repeat.period || 1;
      const periodUnit = repeat.periodUnit || 'd';

      const unitMap: Record<string, string> = {
        'h': 'hours',
        'd': 'day',
        'wk': 'week',
        'mo': 'month',
      };

      medication.frequency = `${frequency} time${frequency > 1 ? 's' : ''} per ${period} ${unitMap[periodUnit] || periodUnit}`;
    } else if (dosage.text) {
      medication.frequency = dosage.text;
    }

    // Route
    if (dosage.route) {
      medication.route = dosage.route.text || dosage.route.coding?.[0]?.display;
    }
  }

  // Extract start date
  if (medStatement.effectiveDateTime) {
    medication.startDate = new Date(medStatement.effectiveDateTime);
  } else if (medStatement.effectivePeriod?.start) {
    medication.startDate = new Date(medStatement.effectivePeriod.start);
  } else if (medStatement.dateAsserted) {
    medication.startDate = new Date(medStatement.dateAsserted);
  }

  // Extract end date
  if (medStatement.effectivePeriod?.end) {
    medication.endDate = new Date(medStatement.effectivePeriod.end);
  }

  // Extract notes
  if (medStatement.note && medStatement.note.length > 0) {
    medication.notes = medStatement.note.map(n => n.text).join('\n');
  }

  return medication;
}

// ============================================================================
// FHIR PROCEDURE RESOURCE
// ============================================================================

export interface FHIRProcedure {
  resourceType: 'Procedure';
  id?: string;
  status: 'preparation' | 'in-progress' | 'not-done' | 'on-hold' | 'stopped' | 'completed' | 'entered-in-error' | 'unknown';
  code: {
    coding?: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
    text?: string;
  };
  subject: {
    reference: string;
    display?: string;
  };
  performedDateTime?: string;
  performedPeriod?: {
    start?: string;
    end?: string;
  };
  performer?: Array<{
    actor: {
      reference?: string;
      display?: string;
    };
    function?: {
      coding?: Array<{
        system: string;
        code: string;
        display?: string;
      }>;
      text?: string;
    };
  }>;
  location?: {
    reference?: string;
    display?: string;
  };
  reasonCode?: Array<{
    coding?: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
    text?: string;
  }>;
  note?: Array<{
    text: string;
    time?: string;
  }>;
}

/**
 * Convert FHIR Procedure to internal ProcedureRecord
 */
export function fromFHIRProcedure(procedure: FHIRProcedure, patientId: string): Partial<ProcedureRecordData> {
  const procedureRecord: Partial<ProcedureRecordData> = {
    patientId,
    procedureName: procedure.code.text || procedure.code.coding?.[0]?.display || 'Unknown Procedure',
  };

  // Extract procedure code
  const snomedCoding = procedure.code.coding?.find(c => c.system?.includes('snomed'));
  if (snomedCoding) {
    procedureRecord.snomedCode = snomedCoding.code;
  }

  // Extract status
  procedureRecord.status = procedure.status === 'completed' ? 'COMPLETED' : 'SCHEDULED';

  // Extract performed date
  if (procedure.performedDateTime) {
    procedureRecord.performedAt = new Date(procedure.performedDateTime);
  } else if (procedure.performedPeriod?.start) {
    procedureRecord.performedAt = new Date(procedure.performedPeriod.start);
  }

  // Extract performer
  if (procedure.performer && procedure.performer.length > 0) {
    procedureRecord.performedBy = procedure.performer[0].actor.display;
  }

  // Extract location
  if (procedure.location) {
    procedureRecord.location = procedure.location.display;
  }

  // Extract reason
  if (procedure.reasonCode && procedure.reasonCode.length > 0) {
    procedureRecord.indication = procedure.reasonCode.map(r => r.text || r.coding?.[0]?.display).filter(Boolean).join(', ');
  }

  // Extract notes
  if (procedure.note && procedure.note.length > 0) {
    procedureRecord.notes = procedure.note.map(n => n.text).join('\n');
  }

  return procedureRecord;
}

// ============================================================================
// FHIR BUNDLE FOR BATCH OPERATIONS
// ============================================================================

export interface FHIRBundle {
  resourceType: 'Bundle';
  type: 'collection' | 'searchset' | 'batch' | 'transaction';
  total?: number;
  entry?: Array<{
    fullUrl?: string;
    resource?: FHIRObservation | FHIRCondition | FHIRMedicationStatement | FHIRProcedure | any;
  }>;
}
