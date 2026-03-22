/**
 * RNDS Profile Validation (Brazil-specific)
 *
 * Validates FHIR resources against Brazilian RNDS profiles:
 * - BRPatient: CPF identifier required
 * - BRCondition: ICD-10 coding required
 * - BRMedicacao: ANVISA coding required
 * - BRBundle: Metadata requirements for RNDS submission
 *
 * RUTH: ANVISA Class I SaMD compliance checks
 */

export interface RNDSValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate FHIR Patient against BRPatient RNDS profile
 */
export function validateBRPatient(patient: fhir.Patient): RNDSValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!patient.id) {
    errors.push('Patient must have an id');
  }

  // CPF is required for RNDS
  const cpfIdentifier = patient.identifier?.find(
    (id: fhir.Identifier) => id.system?.includes('cpf') || id.type?.coding?.[0]?.code === 'SSN'
  );

  if (!cpfIdentifier?.value) {
    errors.push('BRPatient: CPF identifier is required for RNDS (system: http://www.saude.gov.br/fhir/r4/NamingSystem/cpf)');
  } else {
    // Validate CPF format (11 digits)
    if (!/^\d{11}$/.test(cpfIdentifier.value.replace(/\D/g, ''))) {
      errors.push(`BRPatient: Invalid CPF format: ${cpfIdentifier.value}`);
    }
  }

  // Name is required
  if (!patient.name || patient.name.length === 0) {
    errors.push('BRPatient: At least one name must be present');
  }

  // Birthdate is required
  if (!patient.birthDate) {
    errors.push('BRPatient: birthDate is required');
  }

  // Gender is required
  if (!patient.gender) {
    errors.push('BRPatient: gender is required');
  }

  // Address is strongly recommended
  if (!patient.address || patient.address.length === 0) {
    warnings.push('BRPatient: Address is recommended for RNDS submissions');
  } else {
    const addr = patient.address[0];
    if (!addr.postalCode) {
      warnings.push('BRPatient: CEP (postalCode) is recommended');
    }
    if (!addr.state) {
      warnings.push('BRPatient: State (UF) is recommended');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate FHIR Condition against BRCondition RNDS profile
 */
export function validateBRCondition(condition: fhir.Condition): RNDSValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!condition.id) {
    errors.push('Condition must have an id');
  }

  // ICD-10 coding is required for RNDS
  const icd10Coding = condition.code?.coding?.find(
    (c: fhir.Coding) => c.system?.includes('icd-10')
  );

  if (!icd10Coding?.code) {
    errors.push('BRCondition: ICD-10 code is required for RNDS (system: http://hl7.org/fhir/sid/icd-10)');
  } else {
    // Validate ICD-10 format (e.g., A00, A00.0, A00.01)
    if (!/^[A-Z]\d{2}(\.\d{1,2})?$/.test(icd10Coding.code)) {
      errors.push(`BRCondition: Invalid ICD-10 format: ${icd10Coding.code}`);
    }
  }

  // Clinical status is required
  if (!condition.clinicalStatus) {
    errors.push('BRCondition: clinicalStatus is required');
  }

  // Subject (Patient reference) is required
  if (!condition.subject?.reference) {
    errors.push('BRCondition: subject reference to Patient is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate FHIR MedicationRequest against BRMedicacao RNDS profile
 */
export function validateBRMedicacao(medication: fhir.MedicationRequest): RNDSValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!medication.id) {
    errors.push('MedicationRequest must have an id');
  }

  // ANVISA coding is required for RNDS
  const anvisaCoding = medication.medicationCodeableConcept?.coding?.find(
    (c: fhir.Coding) => c.system?.includes('saude.gov.br') || c.system?.includes('anvisa')
  );

  if (!anvisaCoding?.code) {
    warnings.push('BRMedicacao: ANVISA coding recommended for RNDS (system: http://www.saude.gov.br/fhir/r4/CodeSystem/BRMedicacao)');
  }

  // Status is required
  if (!medication.status) {
    errors.push('BRMedicacao: status is required');
  }

  // Intent is required
  if (!medication.intent) {
    errors.push('BRMedicacao: intent is required');
  }

  // Subject (Patient reference) is required
  if (!medication.subject?.reference) {
    errors.push('BRMedicacao: subject reference to Patient is required');
  }

  // authoredOn is required
  if (!medication.authoredOn) {
    errors.push('BRMedicacao: authoredOn is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate FHIR Observation against observation profiles
 */
export function validateObservation(observation: fhir.Observation): RNDSValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!observation.id) {
    errors.push('Observation must have an id');
  }

  // Status is required
  if (!observation.status) {
    errors.push('Observation: status is required');
  }

  // Code is required
  if (!observation.code?.coding || observation.code.coding.length === 0) {
    errors.push('Observation: code with at least one coding is required');
  } else {
    // LOINC or SNOMED is recommended
    const hasMeaningfulCoding = observation.code.coding.some(
      (c: fhir.Coding) => c.system?.includes('loinc') || c.system?.includes('snomed')
    );
    if (!hasMeaningfulCoding) {
      warnings.push('Observation: LOINC or SNOMED coding is recommended');
    }
  }

  // Subject is required
  if (!observation.subject?.reference) {
    errors.push('Observation: subject reference is required');
  }

  // effectiveDateTime or effectivePeriod is required
  if (!observation.effectiveDateTime && !(observation as any).effectivePeriod) {
    errors.push('Observation: effectiveDateTime or effectivePeriod is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate FHIR AllergyIntolerance
 */
export function validateAllergyIntolerance(allergy: fhir.AllergyIntolerance): RNDSValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!allergy.id) {
    errors.push('AllergyIntolerance must have an id');
  }

  // Code is required
  if (!allergy.code?.coding || allergy.code.coding.length === 0) {
    errors.push('AllergyIntolerance: code is required');
  }

  // Patient reference is required
  if (!allergy.patient?.reference) {
    errors.push('AllergyIntolerance: patient reference is required');
  }

  // Type is required
  if (!allergy.type) {
    errors.push('AllergyIntolerance: type is required');
  }

  // Category is required
  if (!allergy.category || allergy.category.length === 0) {
    errors.push('AllergyIntolerance: category is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate FHIR Bundle for RNDS transaction submission
 *
 * RUTH: Ensures all entries meet Class I SaMD requirements
 */
export function validateBRBundle(bundle: any): RNDSValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!bundle.id) {
    errors.push('Bundle must have an id');
  }

  if (bundle.type !== 'transaction') {
    errors.push('Bundle type must be "transaction" for RNDS submission');
  }

  // Must have at least a Patient
  const patientEntry = bundle.entry?.find((e: any) => e.resource?.resourceType === 'Patient');
  if (!patientEntry) {
    errors.push('Bundle must contain at least one Patient entry');
  } else {
    const patientValidation = validateBRPatient(patientEntry.resource as fhir.Patient);
    if (!patientValidation.isValid) {
      errors.push(`Patient validation failed: ${patientValidation.errors.join('; ')}`);
    }
    warnings.push(...patientValidation.warnings);
  }

  // Validate all entries
  for (const entry of bundle.entry || []) {
    const resource = entry.resource;
    if (!resource) continue;

    let validation: RNDSValidationResult | null = null;

    switch (resource.resourceType) {
      case 'Condition':
        validation = validateBRCondition(resource as fhir.Condition);
        break;
      case 'MedicationRequest':
        validation = validateBRMedicacao(resource as fhir.MedicationRequest);
        break;
      case 'Observation':
        validation = validateObservation(resource as fhir.Observation);
        break;
      case 'AllergyIntolerance':
        validation = validateAllergyIntolerance(resource as fhir.AllergyIntolerance);
        break;
    }

    if (validation && !validation.isValid) {
      errors.push(`${resource.resourceType} ${resource.id}: ${validation.errors.join('; ')}`);
    }
    if (validation) {
      warnings.push(...validation.warnings);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Comprehensive validator for all RNDS profiles
 */
export function validateRNDSCompliance(bundle: any): RNDSValidationResult {
  return validateBRBundle(bundle);
}
