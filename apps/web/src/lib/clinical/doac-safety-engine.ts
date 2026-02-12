import rulesData from '../../../../../data/clinical/sources/doac-rules.json';

export type PatientContext = {
  age?: number;
  weight?: number; // kg
  creatinineClearance?: number; // ml/min
  currentMedication?: string; // generic name, lowercase
  interactingMedications?: string[];
  labTimestamp?: Date; // for attestation check
};

export type SafetyResult = {
  severity: 'BLOCK' | 'FLAG' | 'PASS' | 'ATTESTATION_REQUIRED';
  rationale?: string;
  ruleId?: string;
  citationUrl?: string;
  missingFields?: string[];
};

type DoacRule = {
  ruleId: string;
  medication: string;
  condition: string;
  severity: string;
  rationale: string;
  provenance: {
    citationUrl: string;
  };
};

const rules = rulesData as DoacRule[];

export function evaluateDoacSafety(patient: PatientContext): SafetyResult {
  const { currentMedication, creatinineClearance, weight, age, interactingMedications } = patient;

  if (!currentMedication) {
    return { severity: 'PASS' }; // No DOAC, no risk
  }

  const medRules = rules.filter(r => r.medication === currentMedication.toLowerCase());

  for (const rule of medRules) {
    // 1. Check for missing data referenced in condition
    if (rule.condition.includes('creatinineClearance') && creatinineClearance === undefined) {
      return {
        severity: 'ATTESTATION_REQUIRED',
        rationale: `Missing Creatinine Clearance required for ${currentMedication} safety check.`,
        missingFields: ['creatinineClearance'],
        ruleId: rule.ruleId
      };
    }
    if (rule.condition.includes('weight') && weight === undefined) {
      return {
        severity: 'ATTESTATION_REQUIRED',
        rationale: `Missing weight required for ${currentMedication} safety check.`,
        missingFields: ['weight'],
        ruleId: rule.ruleId
      };
    }
    if (rule.condition.includes('age') && age === undefined) {
      return {
        severity: 'ATTESTATION_REQUIRED',
        rationale: `Missing age required for ${currentMedication} safety check.`,
        missingFields: ['age'],
        ruleId: rule.ruleId
      };
    }

    // 2. Evaluate Condition
    // NOTE: In a full system, we'd use a parser. For MVP/YAGNI, we implement the specific logic for the 20 rules.
    // We parse the condition string manually or use a safe evaluator.
    // Given "No premature abstractions", we will map the condition strings to logic.
    
    let conditionMet = false;

    // CrCl checks
    if (rule.condition.includes('creatinineClearance < 15')) {
      if (creatinineClearance !== undefined && creatinineClearance < 15) conditionMet = true;
    }
    else if (rule.condition.includes('creatinineClearance < 30')) {
      if (creatinineClearance !== undefined && creatinineClearance < 30) conditionMet = true;
    }
    else if (rule.condition.includes('creatinineClearance > 95')) {
      if (creatinineClearance !== undefined && creatinineClearance > 95) conditionMet = true;
    }
    
    // Weight checks
    else if (rule.condition.includes('weight <= 60')) {
      if (weight !== undefined && weight <= 60) conditionMet = true;
    }

    // Age + Weight checks (Apixaban)
    else if (rule.condition.includes('age >= 80 AND weight <= 60')) {
      if (age !== undefined && age >= 80 && weight !== undefined && weight <= 60) conditionMet = true;
    }

    // Interactions
    else if (rule.condition.includes('interactingMedication ==')) {
      const targetMed = rule.condition.split("'")[1]; // Extract 'ketoconazole'
      if (interactingMedications && targetMed && interactingMedications.includes(targetMed)) {
        conditionMet = true;
      }
    }

    if (conditionMet) {
      return {
        severity: rule.severity as SafetyResult['severity'],
        rationale: rule.rationale,
        ruleId: rule.ruleId,
        citationUrl: rule.provenance.citationUrl
      };
    }
  }

  return { severity: 'PASS' };
}
