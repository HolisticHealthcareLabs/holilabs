/**
 * VBC Risk Stratification Service
 *
 * Deterministic risk scoring algorithms for value-based care.
 * All calculations are pure functions — no LLM calls.
 *
 * ANVISA Class I: These are decision-support scores, not diagnostic.
 * ELENA invariant: Each algorithm has sourceAuthority provenance.
 *
 * Algorithms:
 * - ASCVD (Pooled Cohort Equations) — 10-year CV risk
 * - LACE Index — 30-day readmission risk
 * - FINDRISC — 10-year T2D risk
 * - Composite VBC Score — weighted multi-domain risk
 *
 * AWAITING_REVIEW: Coefficient values sourced from published literature —
 * need clinical validation against local LATAM population data.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ASCVDInput {
  age: number;
  sex: 'M' | 'F';
  totalCholesterol: number;  // mg/dL
  hdlCholesterol: number;    // mg/dL
  systolicBP: number;        // mmHg
  onBPTreatment: boolean;
  smoker: boolean;
  diabetic: boolean;
}

export interface ASCVDResult {
  tenYearRisk: number;       // 0-1 probability
  riskCategory: 'LOW' | 'BORDERLINE' | 'INTERMEDIATE' | 'HIGH';
  sourceAuthority: string;
  citationUrl: string;
}

export interface LACEInput {
  lengthOfStayDays: number;  // L
  acuityOfAdmission: boolean; // A — true = emergent
  comorbidityScore: number;   // C — Charlson index (0-6+)
  edVisitsLast6Months: number; // E
}

export interface LACEResult {
  score: number;             // 0-19
  riskCategory: 'LOW' | 'MODERATE' | 'HIGH';
  thirtyDayReadmissionProbability: number;
  sourceAuthority: string;
}

export interface FINDRISCInput {
  age: number;
  bmi: number;
  waistCircumferenceCm: number;
  physicalActivityDaily: boolean;
  dailyVegetableConsumption: boolean;
  historyOfHighGlucose: boolean;
  onAntihypertensives: boolean;
  familyHistoryDiabetes: 'NONE' | 'SECOND_DEGREE' | 'FIRST_DEGREE';
}

export interface FINDRISCResult {
  score: number;             // 0-26
  riskCategory: 'LOW' | 'SLIGHTLY_ELEVATED' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
  tenYearRiskPercent: number;
  sourceAuthority: string;
}

export interface CompositeRiskInput {
  ascvd?: ASCVDResult;
  lace?: LACEResult;
  findrisc?: FINDRISCResult;
  activeConditionCount: number;
  medicationCount: number;
  age: number;
  socialDeterminants?: {
    housingInstability: boolean;
    foodInsecurity: boolean;
    transportationBarrier: boolean;
  };
}

export interface CompositeRiskResult {
  score: number;             // 0-100
  tier: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
  components: Record<string, number>;
}

// ---------------------------------------------------------------------------
// ASCVD — Pooled Cohort Equations (simplified)
// ---------------------------------------------------------------------------

/**
 * Calculates 10-year ASCVD risk using a simplified Pooled Cohort model.
 *
 * sourceAuthority: AHA/ACC 2013 Pooled Cohort Equations
 * citationUrl: https://doi.org/10.1161/01.cir.0000437741.48606.98
 *
 * AWAITING_REVIEW: This is a simplified version. Full PCE uses race-specific
 * coefficients. Needs calibration for LATAM populations (Brazilian SBC 2024).
 */
export function calculateASCVD(input: ASCVDInput): ASCVDResult {
  const { age, sex, totalCholesterol, hdlCholesterol, systolicBP, onBPTreatment, smoker, diabetic } = input;

  if (age < 40 || age > 79) {
    return {
      tenYearRisk: 0,
      riskCategory: 'LOW',
      sourceAuthority: 'AHA/ACC 2013 Pooled Cohort Equations',
      citationUrl: 'https://doi.org/10.1161/01.cir.0000437741.48606.98',
    };
  }

  const lnAge = Math.log(age);
  const lnTC = Math.log(totalCholesterol);
  const lnHDL = Math.log(hdlCholesterol);
  const lnSBP = Math.log(systolicBP);

  let sumCoeff: number;
  let meanCoeff: number;
  let baselineSurvival: number;

  if (sex === 'M') {
    sumCoeff =
      12.344 * lnAge +
      11.853 * lnTC +
      -2.664 * lnAge * lnTC +
      -7.99 * lnHDL +
      1.769 * lnAge * lnHDL +
      (onBPTreatment ? 1.797 * lnSBP : 1.764 * lnSBP) +
      (smoker ? 7.837 + -1.795 * lnAge : 0) +
      (diabetic ? 0.658 : 0);
    meanCoeff = 61.18;
    baselineSurvival = 0.9144;
  } else {
    sumCoeff =
      -29.799 * lnAge +
      13.54 * lnTC +
      -13.578 * lnAge * lnTC +
      -13.578 * lnHDL +
      (onBPTreatment ? 2.019 * lnSBP : 1.957 * lnSBP) +
      (smoker ? 13.54 + -4.459 * lnAge : 0) +
      (diabetic ? 0.661 : 0);
    meanCoeff = -29.18;
    baselineSurvival = 0.9665;
  }

  const risk = 1 - Math.pow(baselineSurvival, Math.exp(sumCoeff - meanCoeff));
  const clampedRisk = Math.max(0, Math.min(1, risk));

  let riskCategory: ASCVDResult['riskCategory'];
  if (clampedRisk < 0.05) riskCategory = 'LOW';
  else if (clampedRisk < 0.075) riskCategory = 'BORDERLINE';
  else if (clampedRisk < 0.20) riskCategory = 'INTERMEDIATE';
  else riskCategory = 'HIGH';

  return {
    tenYearRisk: Math.round(clampedRisk * 10000) / 10000,
    riskCategory,
    sourceAuthority: 'AHA/ACC 2013 Pooled Cohort Equations',
    citationUrl: 'https://doi.org/10.1161/01.cir.0000437741.48606.98',
  };
}

// ---------------------------------------------------------------------------
// LACE Index — 30-Day Readmission Risk
// ---------------------------------------------------------------------------

/**
 * Calculates LACE score for 30-day readmission risk.
 *
 * sourceAuthority: van Walraven et al., CMAJ 2010
 * AWAITING_REVIEW: Probability mapping is approximate — needs local validation.
 */
export function calculateLACE(input: LACEInput): LACEResult {
  const { lengthOfStayDays, acuityOfAdmission, comorbidityScore, edVisitsLast6Months } = input;

  // L — Length of stay
  let lScore: number;
  if (lengthOfStayDays < 1) lScore = 0;
  else if (lengthOfStayDays === 1) lScore = 1;
  else if (lengthOfStayDays === 2) lScore = 2;
  else if (lengthOfStayDays === 3) lScore = 3;
  else if (lengthOfStayDays <= 6) lScore = 4;
  else if (lengthOfStayDays <= 13) lScore = 5;
  else lScore = 7;

  // A — Acuity of admission
  const aScore = acuityOfAdmission ? 3 : 0;

  // C — Comorbidity (Charlson)
  let cScore: number;
  if (comorbidityScore === 0) cScore = 0;
  else if (comorbidityScore === 1) cScore = 1;
  else if (comorbidityScore === 2) cScore = 2;
  else if (comorbidityScore === 3) cScore = 3;
  else cScore = 5;

  // E — ED visits in past 6 months
  let eScore: number;
  if (edVisitsLast6Months === 0) eScore = 0;
  else if (edVisitsLast6Months === 1) eScore = 1;
  else if (edVisitsLast6Months === 2) eScore = 2;
  else if (edVisitsLast6Months === 3) eScore = 3;
  else eScore = 4;

  const score = lScore + aScore + cScore + eScore;

  let riskCategory: LACEResult['riskCategory'];
  let probability: number;
  if (score <= 4) {
    riskCategory = 'LOW';
    probability = 0.02;
  } else if (score <= 9) {
    riskCategory = 'MODERATE';
    probability = 0.08 + (score - 5) * 0.015;
  } else {
    riskCategory = 'HIGH';
    probability = Math.min(0.35, 0.14 + (score - 10) * 0.02);
  }

  return {
    score,
    riskCategory,
    thirtyDayReadmissionProbability: Math.round(probability * 10000) / 10000,
    sourceAuthority: 'van Walraven et al., CMAJ 2010; doi:10.1503/cmaj.091117',
  };
}

// ---------------------------------------------------------------------------
// FINDRISC — Finnish Diabetes Risk Score
// ---------------------------------------------------------------------------

/**
 * Calculates FINDRISC score for 10-year type 2 diabetes risk.
 *
 * sourceAuthority: Lindström & Tuomilehto, Diabetes Care 2003
 * AWAITING_REVIEW: Cutoffs validated for European population — needs LATAM recalibration.
 */
export function calculateFINDRISC(input: FINDRISCInput): FINDRISCResult {
  let score = 0;

  // Age
  if (input.age < 45) score += 0;
  else if (input.age <= 54) score += 2;
  else if (input.age <= 64) score += 3;
  else score += 4;

  // BMI
  if (input.bmi < 25) score += 0;
  else if (input.bmi <= 30) score += 1;
  else score += 3;

  // Waist circumference (sex-unspecified — use higher threshold)
  if (input.waistCircumferenceCm < 94) score += 0;
  else if (input.waistCircumferenceCm <= 102) score += 3;
  else score += 4;

  // Physical activity
  if (!input.physicalActivityDaily) score += 2;

  // Daily vegetable consumption
  if (!input.dailyVegetableConsumption) score += 1;

  // History of high glucose
  if (input.historyOfHighGlucose) score += 5;

  // Antihypertensives
  if (input.onAntihypertensives) score += 2;

  // Family history
  if (input.familyHistoryDiabetes === 'SECOND_DEGREE') score += 3;
  else if (input.familyHistoryDiabetes === 'FIRST_DEGREE') score += 5;

  let riskCategory: FINDRISCResult['riskCategory'];
  let tenYearRiskPercent: number;
  if (score < 7) {
    riskCategory = 'LOW';
    tenYearRiskPercent = 1;
  } else if (score <= 11) {
    riskCategory = 'SLIGHTLY_ELEVATED';
    tenYearRiskPercent = 4;
  } else if (score <= 14) {
    riskCategory = 'MODERATE';
    tenYearRiskPercent = 17;
  } else if (score <= 20) {
    riskCategory = 'HIGH';
    tenYearRiskPercent = 33;
  } else {
    riskCategory = 'VERY_HIGH';
    tenYearRiskPercent = 50;
  }

  return {
    score,
    riskCategory,
    tenYearRiskPercent,
    sourceAuthority: 'Lindström & Tuomilehto, Diabetes Care 2003; doi:10.2337/diacare.26.3.725',
  };
}

// ---------------------------------------------------------------------------
// Composite VBC Risk Score
// ---------------------------------------------------------------------------

/**
 * Produces a weighted 0-100 composite risk score aggregating domain scores,
 * comorbidity burden, polypharmacy, age, and social determinants.
 *
 * AWAITING_REVIEW: Weight distribution is a starting heuristic — needs
 * validation against actual LATAM readmission/outcome data.
 */
export function calculateCompositeRisk(input: CompositeRiskInput): CompositeRiskResult {
  const components: Record<string, number> = {};

  // Domain scores (each normalized to 0-25 contribution)
  if (input.ascvd) {
    components.ascvd = input.ascvd.tenYearRisk * 25;
  }

  if (input.lace) {
    components.lace = Math.min(25, (input.lace.score / 19) * 25);
  }

  if (input.findrisc) {
    components.findrisc = Math.min(25, (input.findrisc.score / 26) * 25);
  }

  // Comorbidity burden (0-15)
  components.comorbidity = Math.min(15, input.activeConditionCount * 2);

  // Polypharmacy risk (0-10)
  components.polypharmacy = Math.min(10, Math.max(0, input.medicationCount - 4) * 2);

  // Age factor (0-10)
  if (input.age >= 75) components.age = 10;
  else if (input.age >= 65) components.age = 7;
  else if (input.age >= 55) components.age = 4;
  else components.age = 0;

  // Social determinants (0-15)
  if (input.socialDeterminants) {
    let sdoh = 0;
    if (input.socialDeterminants.housingInstability) sdoh += 5;
    if (input.socialDeterminants.foodInsecurity) sdoh += 5;
    if (input.socialDeterminants.transportationBarrier) sdoh += 5;
    components.socialDeterminants = sdoh;
  }

  const score = Math.min(
    100,
    Object.values(components).reduce((sum, v) => sum + v, 0),
  );

  let tier: CompositeRiskResult['tier'];
  if (score < 20) tier = 'LOW';
  else if (score < 40) tier = 'MODERATE';
  else if (score < 65) tier = 'HIGH';
  else tier = 'VERY_HIGH';

  return {
    score: Math.round(score * 100) / 100,
    tier,
    components,
  };
}
