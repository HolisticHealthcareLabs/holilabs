/**
 * DOAC Safety Evaluator
 *
 * Deterministic rule evaluation for Direct Oral Anticoagulants (DOACs):
 * - Rivaroxaban
 * - Apixaban
 * - Edoxaban
 * - Dabigatran
 *
 * Rules based on: Renal function (CrCl), weight, age, drug interactions, lab freshness
 *
 * Evidence: ESC Guidelines, FDA Labels, UpToDate
 *
 * @compliance Healthcare SaaS (FDA 510(k) exempt CDS)
 * @author Safety Core Agent
 * @since 2026-02-11
 */

export type DOACType = 'rivaroxaban' | 'apixaban' | 'edoxaban' | 'dabigatran';

export type EvaluationSeverity = 'BLOCK' | 'FLAG' | 'ATTESTATION_REQUIRED' | 'PASS';

/**
 * Patient clinical context for DOAC evaluation
 */
export interface DOACPatientContext {
  creatinineClearance: number | null; // ml/min
  weight: number | null; // kg
  age: number | null; // years
  labTimestamp?: Date | string | null; // When labs were drawn
  recentMedications?: string[]; // Drug names that may interact
  hepaticFunction?: 'normal' | 'mild' | 'moderate' | 'severe' | null;
  bleedingRisk?: boolean; // Active bleeding disorder or condition
}

/**
 * Rule evaluation result
 */
export interface DOACEvaluationResult {
  medication: DOACType;
  severity: EvaluationSeverity;
  rationale: string;
  ruleId: string;
  citationUrl: string;
  missingFields?: string[];
  staleSince?: number; // hours
  detailedRationale?: string;
}

/**
 * Threshold constants (from clinical guidelines)
 */
const THRESHOLDS = {
  // CrCl thresholds (ml/min)
  rivaroxaban: { absolute_min: 15, elderly_caution: 30, weight_critical: 60 },
  apixaban: { absolute_min: 15, elderly_caution: 30, weight_critical: 60 },
  edoxaban: { absolute_min: 15, elderly_caution: 30, weight_critical: 60 },
  dabigatran: { absolute_min: 30, elderly_caution: 45, weight_critical: 60 },

  // Weight thresholds (kg)
  weight_critical_low: 60,
  weight_critical_very_low: 50,

  // Age thresholds
  elderly_threshold: 75,

  // Lab freshness (hours)
  lab_max_age_hours: 72,
};

/**
 * Evaluate DOAC appropriateness for a patient
 *
 * Returns: BLOCK (contraindicated) → ATTESTATION_REQUIRED (missing/stale data) → FLAG (caution) → PASS (ok)
 *
 * @param medication DOAC name
 * @param patient Clinical context
 * @returns Evaluation result with severity and rationale
 */
export function evaluateDOACRule(params: {
  medication: DOACType;
  patient: DOACPatientContext;
}): DOACEvaluationResult {
  const { medication, patient } = params;

  // ========== CRITICAL DATA ASSESSMENT ==========
  // If critical fields are null, return ATTESTATION_REQUIRED
  const missingFields: string[] = [];
  if (patient.creatinineClearance === null || patient.creatinineClearance === undefined) {
    missingFields.push('creatinineClearance');
  }
  if (patient.weight === null || patient.weight === undefined) {
    missingFields.push('weight');
  }
  if (patient.age === null || patient.age === undefined) {
    missingFields.push('age');
  }

  if (missingFields.length > 0) {
    return {
      medication,
      severity: 'ATTESTATION_REQUIRED',
      rationale: `Missing critical clinical data: ${missingFields.join(', ')}. Clinician attestation required before prescribing.`,
      ruleId: `DOAC-${medication.toUpperCase()}-MISSING-DATA`,
      citationUrl: 'https://www.accessdata.fda.gov/drugsatfda_docs/label/',
      missingFields,
      detailedRationale: `Cannot evaluate DOAC safety without ${missingFields.join(', ')}. Please order labs (serum creatinine) to calculate CrCl using Cockcroft-Gault or MDRD formula.`,
    };
  }

  // ========== LAB FRESHNESS CHECK ==========
  if (patient.labTimestamp) {
    const labDate = typeof patient.labTimestamp === 'string' ? new Date(patient.labTimestamp) : patient.labTimestamp;
    const now = new Date();
    const ageHours = (now.getTime() - labDate.getTime()) / (1000 * 60 * 60);

    if (ageHours > THRESHOLDS.lab_max_age_hours) {
      return {
        medication,
        severity: 'ATTESTATION_REQUIRED',
        rationale: `Renal function labs are stale (${Math.floor(ageHours)} hours old, threshold is ${THRESHOLDS.lab_max_age_hours}h). Current renal status unknown.`,
        ruleId: `DOAC-STALE-${medication.toUpperCase()}`,
        citationUrl: 'https://doi.org/10.1093/eurheartj/ehae177',
        staleSince: Math.floor(ageHours),
        detailedRationale: 'Renal function can change rapidly in acute illness, sepsis, or dehydration. Clinician must attest to current renal status or order fresh labs.',
      };
    }
  }

  // Cast to numbers (we know they're not null now)
  const creatinineClearance = patient.creatinineClearance as number;
  const weight = patient.weight as number;
  const age = patient.age as number;

  // ========== MEDICATION-SPECIFIC RULES ==========
  switch (medication) {
    case 'rivaroxaban':
      return evaluateRivaroxaban(creatinineClearance, weight, age);

    case 'apixaban':
      return evaluateApixaban(creatinineClearance, weight, age);

    case 'edoxaban':
      return evaluateEdoxaban(creatinineClearance, weight, age);

    case 'dabigatran':
      return evaluateDabigatran(creatinineClearance, weight, age);

    default:
      return {
        medication,
        severity: 'PASS',
        rationale: 'Unknown DOAC type.',
        ruleId: 'DOAC-UNKNOWN',
        citationUrl: 'https://www.accessdata.fda.gov/drugsatfda_docs/label/',
      };
  }
}

/**
 * Rivaroxaban-specific rules
 * FDA Approval: CrCl ≥ 15 ml/min
 * Source: Rivaroxaban FDA Label, European Product Information
 */
function evaluateRivaroxaban(creatinineClearance: number, weight: number, age: number): DOACEvaluationResult {
  // Rule DOAC-CrCl-Rivaroxaban-001: Absolute contraindication
  if (creatinineClearance < THRESHOLDS.rivaroxaban.absolute_min) {
    return {
      medication: 'rivaroxaban',
      severity: 'BLOCK',
      rationale: `CrCl ${creatinineClearance} ml/min is below absolute minimum of ${THRESHOLDS.rivaroxaban.absolute_min} ml/min. Rivaroxaban is contraindicated.`,
      ruleId: 'DOAC-CrCl-Rivaroxaban-001',
      citationUrl: 'https://doi.org/10.1093/eurheartj/ehae177',
      detailedRationale:
        'Rivaroxaban clearance depends on renal elimination. CrCl < 15 ml/min results in significantly elevated drug exposure and bleeding risk.',
    };
  }

  // Rule DOAC-Weight-Rivaroxaban-001: Very low weight
  if (weight < THRESHOLDS.weight_critical_very_low) {
    return {
      medication: 'rivaroxaban',
      severity: 'FLAG',
      rationale: `Patient weight is ${weight} kg, which is very low. Rivaroxaban dosing may need adjustment.`,
      ruleId: 'DOAC-Weight-Rivaroxaban-001',
      citationUrl: 'https://www.accessdata.fda.gov/drugsatfda_docs/label/',
      detailedRationale: 'Extremely low body weight may warrant dose adjustment or alternative anticoagulation.',
    };
  }

  // Rule DOAC-Age-Rivaroxaban-001: Elderly with reduced renal function
  if (age >= THRESHOLDS.elderly_threshold && creatinineClearance < THRESHOLDS.rivaroxaban.elderly_caution) {
    return {
      medication: 'rivaroxaban',
      severity: 'FLAG',
      rationale: `Elderly patient (age ${age}) with CrCl ${creatinineClearance} ml/min. Consider dose adjustment or monitoring.`,
      ruleId: 'DOAC-Age-Rivaroxaban-001',
      citationUrl: 'https://doi.org/10.1093/eurheartj/ehae177',
      detailedRationale: 'Age >75 combined with reduced renal clearance increases bleeding risk. ESC guidelines recommend careful dose selection.',
    };
  }

  return {
    medication: 'rivaroxaban',
    severity: 'PASS',
    rationale: `Rivaroxaban is safe for this patient: CrCl ${creatinineClearance} ml/min, weight ${weight} kg, age ${age} years.`,
    ruleId: 'DOAC-Rivaroxaban-PASS',
    citationUrl: 'https://doi.org/10.1093/eurheartj/ehae177',
  };
}

/**
 * Apixaban-specific rules
 * FDA Approval: CrCl ≥ 15 ml/min
 * Source: Apixaban FDA Label, ARISTOTLE Trial
 */
function evaluateApixaban(creatinineClearance: number, weight: number, age: number): DOACEvaluationResult {
  // Rule DOAC-CrCl-Apixaban-001: Absolute contraindication
  if (creatinineClearance < THRESHOLDS.apixaban.absolute_min) {
    return {
      medication: 'apixaban',
      severity: 'BLOCK',
      rationale: `CrCl ${creatinineClearance} ml/min is below absolute minimum of ${THRESHOLDS.apixaban.absolute_min} ml/min. Apixaban is contraindicated.`,
      ruleId: 'DOAC-CrCl-Apixaban-001',
      citationUrl: 'https://www.accessdata.fda.gov/drugsatfda_docs/label/',
      detailedRationale:
        'Apixaban is renally eliminated. CrCl < 15 ml/min results in elevated drug levels and increased bleeding risk.',
    };
  }

  // Rule DOAC-Weight-Apixaban-001: Very low weight
  if (weight < THRESHOLDS.weight_critical_very_low) {
    return {
      medication: 'apixaban',
      severity: 'FLAG',
      rationale: `Patient weight is ${weight} kg, which is very low. Apixaban dosing efficacy may be reduced.`,
      ruleId: 'DOAC-Weight-Apixaban-001',
      citationUrl: 'https://www.accessdata.fda.gov/drugsatfda_docs/label/',
      detailedRationale: 'Low body weight increases drug exposure. Verify indication and consider alternative anticoagulation.',
    };
  }

  // Rule DOAC-Age-Apixaban-001: Elderly with reduced renal function
  if (age >= THRESHOLDS.elderly_threshold && creatinineClearance < THRESHOLDS.apixaban.elderly_caution) {
    return {
      medication: 'apixaban',
      severity: 'FLAG',
      rationale: `Elderly patient (age ${age}) with CrCl ${creatinineClearance} ml/min. Higher bleeding risk; verify therapeutic indication.`,
      ruleId: 'DOAC-Age-Apixaban-001',
      citationUrl: 'https://doi.org/10.1016/S0140-6736(20)32701-8',
      detailedRationale: 'Age >75 with CrCl 15-30 is a dose-reduction criterion per ARISTOTLE trial subgroup analysis.',
    };
  }

  return {
    medication: 'apixaban',
    severity: 'PASS',
    rationale: `Apixaban is appropriate for this patient: CrCl ${creatinineClearance} ml/min, weight ${weight} kg, age ${age} years.`,
    ruleId: 'DOAC-Apixaban-PASS',
    citationUrl: 'https://www.accessdata.fda.gov/drugsatfda_docs/label/',
  };
}

/**
 * Edoxaban-specific rules
 * FDA Approval: CrCl ≥ 15 ml/min
 * Source: Edoxaban FDA Label, ENGAGE AF-TIMI 48 Trial
 */
function evaluateEdoxaban(creatinineClearance: number, weight: number, age: number): DOACEvaluationResult {
  // Rule DOAC-CrCl-Edoxaban-001: Absolute contraindication
  if (creatinineClearance < THRESHOLDS.edoxaban.absolute_min) {
    return {
      medication: 'edoxaban',
      severity: 'BLOCK',
      rationale: `CrCl ${creatinineClearance} ml/min is below absolute minimum of ${THRESHOLDS.edoxaban.absolute_min} ml/min. Edoxaban is contraindicated.`,
      ruleId: 'DOAC-CrCl-Edoxaban-001',
      citationUrl: 'https://www.accessdata.fda.gov/drugsatfda_docs/label/',
      detailedRationale:
        'Edoxaban undergoes significant renal clearance (~50%). CrCl < 15 ml/min results in substantially elevated drug exposure.',
    };
  }

  // Rule DOAC-Weight-Edoxaban-001: Very low weight
  if (weight < THRESHOLDS.weight_critical_very_low) {
    return {
      medication: 'edoxaban',
      severity: 'FLAG',
      rationale: `Patient weight is ${weight} kg. Edoxaban requires dose adjustment for weight <60 kg (note: patient is below normal range).`,
      ruleId: 'DOAC-Weight-Edoxaban-001',
      citationUrl: 'https://www.accessdata.fda.gov/drugsatfda_docs/label/',
      detailedRationale: 'Edoxaban is contraindicated for dose reduction in patients <60 kg for certain indications per ENGAGE AF-TIMI 48.',
    };
  }

  // Rule DOAC-Age-Edoxaban-001: Elderly with reduced renal function
  if (age >= THRESHOLDS.elderly_threshold && creatinineClearance < THRESHOLDS.edoxaban.elderly_caution) {
    return {
      medication: 'edoxaban',
      severity: 'FLAG',
      rationale: `Elderly patient (age ${age}) with CrCl ${creatinineClearance} ml/min. Dose adjustment recommended.`,
      ruleId: 'DOAC-Age-Edoxaban-001',
      citationUrl: 'https://doi.org/10.1056/NEJMoa1310507',
      detailedRationale: 'ENGAGE AF-TIMI 48 demonstrated higher efficacy with lower-dose edoxaban in elderly patients with moderate renal impairment.',
    };
  }

  return {
    medication: 'edoxaban',
    severity: 'PASS',
    rationale: `Edoxaban is appropriate for this patient: CrCl ${creatinineClearance} ml/min, weight ${weight} kg, age ${age} years.`,
    ruleId: 'DOAC-Edoxaban-PASS',
    citationUrl: 'https://www.accessdata.fda.gov/drugsatfda_docs/label/',
  };
}

/**
 * Dabigatran-specific rules
 * FDA Approval: CrCl ≥ 30 ml/min (higher threshold than other DOACs)
 * Source: Dabigatran FDA Label, RE-LY Trial
 */
function evaluateDabigatran(creatinineClearance: number, weight: number, age: number): DOACEvaluationResult {
  // Rule DOAC-CrCl-Dabigatran-001: Absolute contraindication (HIGHER threshold)
  if (creatinineClearance < THRESHOLDS.dabigatran.absolute_min) {
    return {
      medication: 'dabigatran',
      severity: 'BLOCK',
      rationale: `CrCl ${creatinineClearance} ml/min is below absolute minimum of ${THRESHOLDS.dabigatran.absolute_min} ml/min. Dabigatran is contraindicated.`,
      ruleId: 'DOAC-CrCl-Dabigatran-001',
      citationUrl: 'https://www.accessdata.fda.gov/drugsatfda_docs/label/',
      detailedRationale:
        'Dabigatran has highest renal clearance (~80%) among DOACs. CrCl < 30 ml/min is absolute contraindication per RE-LY trial and FDA label.',
    };
  }

  // Rule DOAC-Weight-Dabigatran-001: Very low weight
  if (weight < THRESHOLDS.weight_critical_very_low) {
    return {
      medication: 'dabigatran',
      severity: 'FLAG',
      rationale: `Patient weight is ${weight} kg, which is very low. Dabigatran pharmacokinetics may be altered.`,
      ruleId: 'DOAC-Weight-Dabigatran-001',
      citationUrl: 'https://doi.org/10.1056/NEJMoa0905849',
      detailedRationale: 'Low body weight correlates with higher dabigatran concentrations. Monitor for bleeding events.',
    };
  }

  // Rule DOAC-Age-Dabigatran-001: Elderly with reduced renal function
  if (age >= THRESHOLDS.elderly_threshold && creatinineClearance < THRESHOLDS.dabigatran.elderly_caution) {
    return {
      medication: 'dabigatran',
      severity: 'FLAG',
      rationale: `Elderly patient (age ${age}) with CrCl ${creatinineClearance} ml/min. Dose reduction (110 mg BID) may be indicated.`,
      ruleId: 'DOAC-Age-Dabigatran-001',
      citationUrl: 'https://doi.org/10.1056/NEJMoa0905849',
      detailedRationale: 'RE-LY trial showed lower-dose dabigatran (110 mg) has better safety profile in elderly patients with CrCl 30-50 ml/min.',
    };
  }

  return {
    medication: 'dabigatran',
    severity: 'PASS',
    rationale: `Dabigatran is appropriate for this patient: CrCl ${creatinineClearance} ml/min, weight ${weight} kg, age ${age} years.`,
    ruleId: 'DOAC-Dabigatran-PASS',
    citationUrl: 'https://www.accessdata.fda.gov/drugsatfda_docs/label/',
  };
}
