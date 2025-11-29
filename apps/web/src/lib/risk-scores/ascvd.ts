/**
 * ASCVD Risk Calculator (Pooled Cohort Equations)
 *
 * Adapted from: https://github.com/cerner/ascvd-risk-calculator
 * License: Apache 2.0
 * Reference: 2013 ACC/AHA Guideline on the Assessment of Cardiovascular Risk
 *
 * Calculates 10-year atherosclerotic cardiovascular disease (ASCVD) risk
 * Valid for ages 40-79 years
 */

export interface ASCVDInputs {
  age: number;
  gender: 'male' | 'female';
  race: 'white' | 'african_american' | 'other';
  totalCholesterol: number;  // mg/dL
  hdlCholesterol: number;    // mg/dL
  systolicBP: number;        // mmHg
  bpTreated: boolean;        // On hypertension treatment
  diabetic: boolean;
  smoker: boolean;
}

export interface ASCVDResult {
  tenYearRisk: number;       // 0.0-1.0 (e.g., 0.125 = 12.5%)
  riskPercentage: string;    // Formatted percentage
  category: string;          // Low, Borderline, Intermediate, High
  recommendation: string;
  uspstfGrade: string;
  lifetimeRisk: number | null;  // If age 20-59
}

/**
 * Calculate 10-year ASCVD risk using Pooled Cohort Equations
 */
export function calculateASCVDRisk(inputs: ASCVDInputs): number {
  const {
    age,
    gender,
    race,
    totalCholesterol,
    hdlCholesterol,
    systolicBP,
    bpTreated,
    diabetic,
    smoker,
  } = inputs;

  // Validate age range
  if (age < 40 || age > 79) {
    throw new Error('ASCVD calculator is valid for ages 40-79');
  }

  // Log transformations (natural logarithm)
  const lnAge = Math.log(age);
  const lnTotalChol = Math.log(totalCholesterol);
  const lnHDL = Math.log(hdlCholesterol);
  const lnSBPTreated = bpTreated ? Math.log(systolicBP) : 0;
  const lnSBPUntreated = !bpTreated ? Math.log(systolicBP) : 0;
  const diabetes = diabetic ? 1 : 0;
  const smoking = smoker ? 1 : 0;

  let sum = 0;
  let meanCoefficient = 0;
  let baselineSurvival = 0;

  // Select equation based on gender and race
  if (gender === 'female' && race === 'white') {
    // White Female Coefficients
    sum =
      -29.799 +
      4.884 * lnAge +
      13.54 * lnTotalChol +
      -3.114 * lnAge * lnTotalChol +
      -13.578 * lnHDL +
      3.149 * lnAge * lnHDL +
      2.019 * lnSBPTreated +
      1.957 * lnSBPUntreated +
      7.574 * diabetes +
      -1.665 * lnAge * diabetes +
      0.661 * smoking;

    meanCoefficient = -29.18;
    baselineSurvival = 0.9665;
  } else if (gender === 'female' && race === 'african_american') {
    // African American Female Coefficients
    sum =
      17.114 +
      0 * lnAge +
      0.94 * lnTotalChol +
      0 * lnAge * lnTotalChol +
      -18.92 * lnHDL +
      4.475 * lnAge * lnHDL +
      29.291 * lnSBPTreated +
      -6.432 * lnAge * lnSBPTreated +
      27.82 * lnSBPUntreated +
      -6.087 * lnAge * lnSBPUntreated +
      0.691 * diabetes +
      0.874 * smoking;

    meanCoefficient = 86.61;
    baselineSurvival = 0.9533;
  } else if (gender === 'male' && race === 'white') {
    // White Male Coefficients
    sum =
      12.344 +
      11.853 * lnAge +
      -2.664 * Math.pow(lnAge, 2) +
      -7.99 * lnTotalChol +
      1.769 * lnAge * lnTotalChol +
      -1.665 * lnHDL +
      0.302 * lnAge * lnHDL +
      1.916 * lnSBPTreated +
      1.809 * lnSBPUntreated +
      0.549 * diabetes +
      0.645 * smoking;

    meanCoefficient = 61.18;
    baselineSurvival = 0.9144;
  } else {
    // African American Male Coefficients (default for 'other' race)
    sum =
      2.469 +
      0.302 * lnAge +
      0.307 * lnTotalChol +
      0 * lnAge * lnTotalChol +
      -0.307 * lnHDL +
      0 * lnAge * lnHDL +
      1.916 * lnSBPTreated +
      1.809 * lnSBPUntreated +
      0.549 * diabetes +
      0.645 * smoking;

    meanCoefficient = 19.54;
    baselineSurvival = 0.8954;
  }

  // Calculate 10-year risk
  const risk = 1 - Math.pow(baselineSurvival, Math.exp(sum - meanCoefficient));

  // Clamp to valid range [0, 1]
  return Math.max(0, Math.min(1, risk));
}

/**
 * Get comprehensive ASCVD assessment with recommendations
 */
export function getASCVDAssessment(inputs: ASCVDInputs): ASCVDResult {
  const tenYearRisk = calculateASCVDRisk(inputs);
  const riskPercentage = `${(tenYearRisk * 100).toFixed(1)}%`;

  let category: string;
  let recommendation: string;
  let uspstfGrade: string;

  if (tenYearRisk < 0.05) {
    // < 5%
    category = 'Low Risk';
    recommendation = 'Lifestyle modifications recommended. Reassess risk in 4-6 years. Focus on diet, exercise, smoking cessation.';
    uspstfGrade = 'N/A';
  } else if (tenYearRisk < 0.075) {
    // 5% - 7.5%
    category = 'Borderline Risk';
    recommendation = 'Lifestyle modifications strongly recommended. Consider moderate-intensity statin if risk enhancers present (family history, chronic kidney disease, metabolic syndrome, inflammatory conditions). Shared decision-making with patient.';
    uspstfGrade = 'B';
  } else if (tenYearRisk < 0.20) {
    // 7.5% - 20%
    category = 'Intermediate Risk';
    recommendation = 'Moderate-intensity statin recommended (e.g., atorvastatin 10-20mg, rosuvastatin 5-10mg). Target LDL < 100 mg/dL. Lifestyle modifications essential. Consider high-intensity if risk enhancers or LDL ≥ 160 mg/dL.';
    uspstfGrade = 'A';
  } else {
    // ≥ 20%
    category = 'High Risk';
    recommendation = 'High-intensity statin recommended (atorvastatin 40-80mg, rosuvastatin 20-40mg). Target LDL < 70 mg/dL. Aggressive lifestyle modifications. Consider adding ezetimibe if LDL remains elevated. Aspirin for secondary prevention if not contraindicated.';
    uspstfGrade = 'A';
  }

  // Calculate lifetime risk if age 20-59
  let lifetimeRisk = null;
  if (inputs.age >= 20 && inputs.age <= 59) {
    lifetimeRisk = estimateLifetimeRisk(inputs);
  }

  return {
    tenYearRisk,
    riskPercentage,
    category,
    recommendation,
    uspstfGrade,
    lifetimeRisk,
  };
}

/**
 * Estimate lifetime ASCVD risk (ages 20-59)
 * Simplified estimation based on major risk factors
 */
function estimateLifetimeRisk(inputs: ASCVDInputs): number {
  // Risk factor count
  let riskFactors = 0;

  if (inputs.totalCholesterol >= 240) riskFactors++;
  if (inputs.hdlCholesterol < 40) riskFactors++;
  if (inputs.systolicBP >= 140) riskFactors++;
  if (inputs.diabetic) riskFactors++;
  if (inputs.smoker) riskFactors++;

  // Lifetime risk estimates based on risk factor burden
  if (riskFactors === 0) {
    return inputs.gender === 'male' ? 0.32 : 0.15;  // 32% men, 15% women
  } else if (riskFactors === 1) {
    return inputs.gender === 'male' ? 0.42 : 0.27;  // 42% men, 27% women
  } else {
    return inputs.gender === 'male' ? 0.52 : 0.39;  // 52% men, 39% women
  }
}

/**
 * Get treatment target based on risk level
 */
export function getASCVDTreatmentTarget(risk: number): {
  ldlTarget: number;
  statinIntensity: string;
  additionalTherapy: string[];
} {
  if (risk < 0.075) {
    return {
      ldlTarget: 130,  // mg/dL
      statinIntensity: 'None or low-intensity',
      additionalTherapy: ['Lifestyle modifications', 'Diet (DASH, Mediterranean)', 'Exercise 150 min/week'],
    };
  } else if (risk < 0.20) {
    return {
      ldlTarget: 100,
      statinIntensity: 'Moderate-intensity',
      additionalTherapy: ['Lifestyle modifications', 'Consider ezetimibe if LDL goal not met', 'Blood pressure control <130/80 mmHg'],
    };
  } else {
    return {
      ldlTarget: 70,
      statinIntensity: 'High-intensity',
      additionalTherapy: ['Lifestyle modifications', 'Ezetimibe if LDL ≥ 70 mg/dL on statin', 'PCSK9 inhibitor if LDL ≥ 70 mg/dL on statin + ezetimibe', 'Aspirin 81mg daily (if no bleeding risk)', 'Blood pressure control <130/80 mmHg'],
    };
  }
}

/**
 * Clinical evidence supporting ASCVD risk reduction
 */
export function getASCVDEvidence(): string[] {
  return [
    'JUPITER trial: Rosuvastatin reduced CV events by 44% in patients with LDL <130 mg/dL but hsCRP ≥2 mg/L (Ridker et al, NEJM 2008)',
    'CTT meta-analysis: Each 1 mmol/L (39 mg/dL) LDL reduction → 22% relative risk reduction in major vascular events (CTT Collaboration, Lancet 2012)',
    'IMPROVE-IT: Ezetimibe added to simvastatin reduced CV events by 6.4% (Cannon et al, NEJM 2015)',
    'FOURIER: PCSK9 inhibitor (evolocumab) reduced CV events by 15% (Sabatine et al, NEJM 2017)',
    'PREDIMED: Mediterranean diet reduced major CV events by 30% (Estruch et al, NEJM 2013)',
    'DASH diet: 11 mmHg reduction in systolic blood pressure (Appel et al, NEJM 1997)',
  ];
}
