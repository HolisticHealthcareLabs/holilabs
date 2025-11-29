/**
 * Diabetes Risk Calculator (ADA Risk Test)
 *
 * Based on: Bang et al., Ann Intern Med 151:775–783, 2009
 * "Development and Validation of a Patient Self-assessment Score for Diabetes Risk"
 *
 * Validated for Type 2 Diabetes risk assessment
 * Evidence: ARIC (Atherosclerosis Risk in Communities) Study, N=13,270
 */

export interface DiabetesRiskInputs {
  age: number;
  gender: 'male' | 'female';
  familyHistory: boolean;         // Parent or sibling with diabetes
  hypertension: boolean;           // History of high blood pressure
  physicalActivity: boolean;       // At least 30 minutes daily
  bmi: number;                     // kg/m²
  gestationalDiabetes?: boolean;   // For females: history of GDM
  waistCircumference?: number;     // cm (optional, enhances accuracy)
}

export interface DiabetesRiskResult {
  score: number;                   // Point total
  risk: number;                    // 0.0-1.0 probability
  riskPercentage: string;
  category: string;                // Low, Moderate, High, Very High
  recommendation: string;
  nextSteps: string[];
  clinicalEvidence: string[];
}

/**
 * Calculate diabetes risk score (ADA Risk Test)
 */
export function calculateDiabetesRisk(inputs: DiabetesRiskInputs): DiabetesRiskResult {
  let points = 0;

  // Age scoring
  if (inputs.age >= 40 && inputs.age < 50) {
    points += 1;
  } else if (inputs.age >= 50 && inputs.age < 60) {
    points += 2;
  } else if (inputs.age >= 60) {
    points += 3;
  }

  // Gender (men at higher risk)
  if (inputs.gender === 'male') {
    points += 1;
  }

  // Family history (strongest predictor)
  if (inputs.familyHistory) {
    points += 1;
  }

  // Hypertension
  if (inputs.hypertension) {
    points += 1;
  }

  // Physical inactivity
  if (!inputs.physicalActivity) {
    points += 1;
  }

  // BMI scoring (most significant factor)
  if (inputs.bmi >= 25 && inputs.bmi < 30) {
    // Overweight
    points += 1;
  } else if (inputs.bmi >= 30 && inputs.bmi < 40) {
    // Obese
    points += 2;
  } else if (inputs.bmi >= 40) {
    // Severely obese
    points += 3;
  }

  // Gestational diabetes history (females only, high-risk predictor)
  if (inputs.gender === 'female' && inputs.gestationalDiabetes) {
    points += 1;
  }

  // Waist circumference (additional risk factor if provided)
  if (inputs.waistCircumference) {
    if (inputs.gender === 'male' && inputs.waistCircumference >= 102) {
      // ≥ 40 inches
      points += 1;
    } else if (inputs.gender === 'female' && inputs.waistCircumference >= 88) {
      // ≥ 35 inches
      points += 1;
    }
  }

  // Risk interpretation
  const { risk, category, recommendation, nextSteps } = interpretDiabetesScore(points, inputs);

  return {
    score: points,
    risk,
    riskPercentage: `${(risk * 100).toFixed(1)}%`,
    category,
    recommendation,
    nextSteps,
    clinicalEvidence: getDiabetesEvidence(),
  };
}

/**
 * Interpret diabetes risk score
 */
function interpretDiabetesScore(
  score: number,
  inputs: DiabetesRiskInputs
): {
  risk: number;
  category: string;
  recommendation: string;
  nextSteps: string[];
} {
  if (score < 5) {
    return {
      risk: 0.05,  // ~5% 10-year risk
      category: 'Low Risk',
      recommendation: 'Your risk for type 2 diabetes is low. Maintain healthy lifestyle habits to keep your risk low.',
      nextSteps: [
        'Continue healthy eating patterns',
        'Maintain regular physical activity (150 min/week)',
        'Keep BMI in healthy range (18.5-24.9)',
        'Reassess risk in 3 years or if risk factors change',
      ],
    };
  } else if (score <= 6) {
    return {
      risk: 0.15,  // ~15% 10-year risk
      category: 'Moderate Risk',
      recommendation: 'You are at moderate risk for developing type 2 diabetes. Lifestyle changes can significantly reduce your risk.',
      nextSteps: [
        'Weight loss of 5-7% body weight if overweight',
        'Increase physical activity to 150-300 min/week',
        'Adopt Mediterranean or DASH diet',
        'Fasting plasma glucose or HbA1c screening recommended',
        'Consider referral to Diabetes Prevention Program (DPP)',
      ],
    };
  } else if (score <= 8) {
    return {
      risk: 0.25,  // ~25% 10-year risk
      category: 'High Risk',
      recommendation: 'You are at high risk for type 2 diabetes. Intensive lifestyle intervention or preventive medication should be considered.',
      nextSteps: [
        'IMMEDIATE: Fasting plasma glucose and HbA1c testing',
        'Referral to Diabetes Prevention Program (DPP) - Evidence-based group program',
        'Weight loss goal: 5-10% body weight',
        'Structured exercise plan: 150 min moderate intensity + 2 days resistance',
        'Low-carb or Mediterranean diet with dietitian support',
        'Consider metformin if BMI ≥ 35, age < 60, or history of gestational diabetes',
      ],
    };
  } else {
    return {
      risk: 0.40,  // ~40% 10-year risk (or may already have undiagnosed diabetes)
      category: 'Very High Risk / Possible Undiagnosed Diabetes',
      recommendation: 'You are at very high risk. Immediate screening is essential as you may already have undiagnosed diabetes.',
      nextSteps: [
        'URGENT: Comprehensive diabetes screening (FPG, HbA1c, OGTT if needed)',
        'Medical evaluation by physician within 2 weeks',
        'Check for diabetes symptoms: polyuria, polydipsia, unexplained weight loss, blurred vision',
        'If prediabetes confirmed (HbA1c 5.7-6.4%): Intensive lifestyle intervention + consider metformin',
        'If diabetes confirmed (HbA1c ≥ 6.5%): Start diabetes management immediately',
        'Screen for complications: retinopathy, nephropathy, neuropathy',
      ],
    };
  }
}

/**
 * Calculate specific screening recommendations based on risk
 */
export function getDiabetesScreeningRecommendation(inputs: DiabetesRiskInputs): {
  urgency: 'IMMEDIATE' | 'WITHIN_1_MONTH' | 'WITHIN_3_MONTHS' | 'ROUTINE';
  tests: string[];
  frequency: string;
} {
  const result = calculateDiabetesRisk(inputs);

  if (result.category === 'Very High Risk / Possible Undiagnosed Diabetes') {
    return {
      urgency: 'IMMEDIATE',
      tests: [
        'Fasting Plasma Glucose (FPG)',
        'Hemoglobin A1c (HbA1c)',
        '2-hour Oral Glucose Tolerance Test (OGTT) if FPG 100-125 mg/dL',
        'Lipid panel',
        'Kidney function (eGFR, urine albumin)',
      ],
      frequency: 'If normal, repeat annually. If prediabetes, repeat every 6 months.',
    };
  } else if (result.category === 'High Risk') {
    return {
      urgency: 'WITHIN_1_MONTH',
      tests: ['Fasting Plasma Glucose (FPG)', 'Hemoglobin A1c (HbA1c)'],
      frequency: 'If normal, repeat annually. If prediabetes, repeat every 6 months.',
    };
  } else if (result.category === 'Moderate Risk') {
    return {
      urgency: 'WITHIN_3_MONTHS',
      tests: ['Fasting Plasma Glucose (FPG) or HbA1c'],
      frequency: 'If normal, repeat every 3 years.',
    };
  } else {
    return {
      urgency: 'ROUTINE',
      tests: ['Consider screening if additional risk factors develop'],
      frequency: 'Reassess risk every 3 years or if circumstances change.',
    };
  }
}

/**
 * Diabetes Prevention Program (DPP) eligibility
 */
export function getDPPEligibility(inputs: DiabetesRiskInputs): {
  eligible: boolean;
  reason: string;
  program: string;
  expectedOutcome: string;
} {
  const result = calculateDiabetesRisk(inputs);

  // DPP criteria: Prediabetes (typically HbA1c 5.7-6.4% or FPG 100-125 mg/dL)
  // Or high-risk individuals with BMI ≥ 25 (≥ 23 for Asian Americans)

  if (result.category === 'High Risk' || result.category === 'Very High Risk / Possible Undiagnosed Diabetes') {
    return {
      eligible: true,
      reason: 'High diabetes risk score qualifies for CDC-recognized Diabetes Prevention Program',
      program: 'National DPP (CDC-recognized) - 16-week intensive program + 6 months maintenance',
      expectedOutcome: 'DPP reduces diabetes incidence by 58% (Diabetes Prevention Program Research Group, NEJM 2002)',
    };
  }

  return {
    eligible: false,
    reason: 'Current risk level does not meet DPP criteria. Focus on maintaining healthy lifestyle.',
    program: 'N/A',
    expectedOutcome: 'N/A',
  };
}

/**
 * Metformin recommendation for diabetes prevention
 */
export function getMetforminRecommendation(inputs: DiabetesRiskInputs): {
  recommended: boolean;
  strength: string;
  rationale: string;
  dosing: string;
} {
  const result = calculateDiabetesRisk(inputs);

  // ADA criteria for metformin: BMI ≥ 35, age < 60, or history of gestational diabetes
  const highRiskCriteria =
    inputs.bmi >= 35 || inputs.age < 60 || (inputs.gender === 'female' && inputs.gestationalDiabetes);

  if (result.category === 'High Risk' || result.category === 'Very High Risk / Possible Undiagnosed Diabetes') {
    if (highRiskCriteria) {
      return {
        recommended: true,
        strength: 'STRONGLY RECOMMENDED',
        rationale: `High diabetes risk (score ${result.score}) + BMI ${inputs.bmi} (≥35) and/or age ${inputs.age} (<60). Metformin reduces diabetes incidence by 31% in high-risk patients (DPP, NEJM 2002).`,
        dosing: 'Metformin 850mg twice daily or 1000mg daily (titrate from 500mg daily to minimize GI effects)',
      };
    } else {
      return {
        recommended: true,
        strength: 'CONSIDER',
        rationale: `High diabetes risk (score ${result.score}). Metformin should be considered alongside intensive lifestyle intervention. Shared decision-making with patient recommended.`,
        dosing: 'If prescribed: Metformin 850mg twice daily or 1000mg daily',
      };
    }
  }

  return {
    recommended: false,
    strength: 'NOT INDICATED',
    rationale: 'Lifestyle modifications are first-line for current risk level. Metformin not indicated at this time.',
    dosing: 'N/A',
  };
}

/**
 * Clinical evidence for diabetes prevention
 */
function getDiabetesEvidence(): string[] {
  return [
    'Diabetes Prevention Program (DPP): Lifestyle intervention reduced diabetes incidence by 58%; metformin by 31% (DPP Research Group, NEJM 2002)',
    'DPP 10-year follow-up: Sustained reduction in diabetes incidence (34% lifestyle, 18% metformin) (DPP Research Group, Lancet 2009)',
    'Finnish Diabetes Prevention Study: 58% reduction in diabetes with lifestyle intervention (Tuomilehto et al, NEJM 2001)',
    'Weight loss of 5-7% body weight reduces diabetes risk by 58% in high-risk individuals',
    '150 minutes/week moderate-intensity exercise reduces diabetes risk by 40-50%',
    'Mediterranean diet: 30% reduction in diabetes incidence (Salas-Salvadó et al, Ann Intern Med 2014)',
    'Low-carb diet: HbA1c reduction 0.5-1.0% in prediabetes (Snorgaard et al, BMJ Open Diabetes 2017)',
  ];
}

/**
 * Get personalized lifestyle prescription for diabetes prevention
 */
export function getDiabetesPreventionPlan(inputs: DiabetesRiskInputs): {
  dietRecommendation: string;
  exerciseRecommendation: string;
  weightLossGoal: string;
  behaviorGoals: string[];
} {
  const targetWeightLoss = inputs.bmi >= 25 ? Math.round((inputs.bmi >= 30 ? 0.07 : 0.05) * 70) : 0;  // Assume 70kg average weight

  return {
    dietRecommendation:
      inputs.bmi >= 30
        ? 'Low-carb or Mediterranean diet (1500-1800 kcal/day). Focus on non-starchy vegetables, lean proteins, healthy fats. Limit refined carbs, added sugars.'
        : 'Mediterranean or DASH diet. Whole grains, fruits, vegetables, lean proteins, nuts. Limit processed foods.',

    exerciseRecommendation:
      'Minimum 150 minutes/week moderate-intensity aerobic exercise (brisk walking, cycling) + 2 days/week resistance training. Sedentary behavior < 8 hours/day.',

    weightLossGoal: inputs.bmi >= 25 ? `Target: 5-7% weight loss (~${targetWeightLoss}kg) within 6 months. Gradual loss of 0.5-1kg/week.` : 'Maintain current healthy weight.',

    behaviorGoals: [
      'Track food intake (app or journal) - increases weight loss success by 2x',
      'Self-weigh daily or weekly - associated with sustained weight loss',
      'Identify and address emotional eating triggers',
      'Plan meals in advance - reduces impulsive food choices',
      'Build social support network - join DPP group or online community',
      'Sleep 7-9 hours/night - inadequate sleep increases diabetes risk',
      'Stress management techniques (meditation, yoga) - chronic stress elevates cortisol and blood glucose',
    ],
  };
}
