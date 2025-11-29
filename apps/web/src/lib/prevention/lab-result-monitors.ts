/**
 * Lab Result Monitors
 *
 * Automated monitoring and flagging of critical lab results
 * - HbA1c for prediabetes/diabetes detection
 * - LDL cholesterol for cardiovascular risk
 * - Blood pressure for hypertension
 *
 * Phase 1: Quick Win - Prevention Automation
 */

import { prisma } from '@/lib/prisma';
import { calculateDiabetesRisk } from '@/lib/risk-scores/diabetes';
import { calculateASCVDRisk } from '@/lib/risk-scores/ascvd';

/**
 * Lab result structure
 */
export interface LabResult {
  id: string;
  patientId: string;
  testName: string;
  loincCode?: string;
  value: string;
  unit: string;
  referenceRange?: string;
  flag?: 'HIGH' | 'LOW' | 'CRITICAL' | 'NORMAL';
  observedAt: Date;
}

/**
 * HbA1c interpretation thresholds (ADA 2024)
 */
const HBA1C_THRESHOLDS = {
  NORMAL: 5.7, // < 5.7% = Normal
  PREDIABETES: 6.5, // 5.7-6.4% = Prediabetes
  DIABETES: 6.5, // ≥ 6.5% = Diabetes
};

/**
 * LDL cholesterol thresholds (mg/dL)
 */
const LDL_THRESHOLDS = {
  OPTIMAL: 100,
  NEAR_OPTIMAL: 130,
  BORDERLINE_HIGH: 160,
  HIGH: 190,
  VERY_HIGH: 190,
};

/**
 * Blood pressure thresholds (mmHg)
 */
const BP_THRESHOLDS = {
  NORMAL: { systolic: 120, diastolic: 80 },
  ELEVATED: { systolic: 130, diastolic: 80 },
  STAGE_1: { systolic: 140, diastolic: 90 },
  STAGE_2: { systolic: 180, diastolic: 120 }, // Hypertensive crisis
};

/**
 * Triglycerides thresholds (mg/dL)
 */
const TRIGLYCERIDES_THRESHOLDS = {
  NORMAL: 150,
  BORDERLINE_HIGH: 200,
  HIGH: 500,
  VERY_HIGH: 500,
};

/**
 * HDL cholesterol thresholds (mg/dL)
 */
const HDL_THRESHOLDS = {
  LOW_MALE: 40, // < 40 is low for men
  LOW_FEMALE: 50, // < 50 is low for women
  OPTIMAL: 60, // ≥ 60 is protective
};

/**
 * Fasting glucose thresholds (mg/dL)
 */
const FASTING_GLUCOSE_THRESHOLDS = {
  NORMAL: 100,
  PREDIABETES: 126,
  DIABETES: 126,
};

/**
 * eGFR thresholds (mL/min/1.73m²) - Kidney function
 */
const EGFR_THRESHOLDS = {
  NORMAL: 90,
  MILD_REDUCTION: 60,
  MODERATE_REDUCTION: 30,
  SEVERE_REDUCTION: 15,
};

/**
 * TSH thresholds (mIU/L) - Thyroid function
 */
const TSH_THRESHOLDS = {
  LOW: 0.4, // < 0.4 = Hyperthyroidism
  NORMAL_MIN: 0.4,
  NORMAL_MAX: 4.0,
  HIGH: 4.0, // > 4.0 = Hypothyroidism
};

/**
 * PSA thresholds (ng/mL) - Prostate-specific antigen
 */
const PSA_THRESHOLDS = {
  NORMAL: 4.0,
  ELEVATED: 10.0,
  VERY_HIGH: 10.0,
};

/**
 * Monitor HbA1c lab results and auto-flag prediabetes/diabetes
 */
export async function monitorHbA1c(labResult: LabResult): Promise<{
  flagged: boolean;
  category: 'NORMAL' | 'PREDIABETES' | 'DIABETES';
  preventionPlanCreated: boolean;
  riskScore?: any;
}> {
  const value = parseFloat(labResult.value);

  if (isNaN(value)) {
    throw new Error(`Invalid HbA1c value: ${labResult.value}`);
  }

  let category: 'NORMAL' | 'PREDIABETES' | 'DIABETES';
  let flagged = false;

  // Categorize result
  if (value < HBA1C_THRESHOLDS.NORMAL) {
    category = 'NORMAL';
  } else if (value < HBA1C_THRESHOLDS.DIABETES) {
    category = 'PREDIABETES';
    flagged = true;
  } else {
    category = 'DIABETES';
    flagged = true;
  }

  // Get patient data for risk calculation
  const patient = await prisma.patient.findUnique({
    where: { id: labResult.patientId },
    select: {
      age: true,
      gender: true,
      bmi: true,
      tobaccoUse: true,
      dateOfBirth: true,
      assignedClinicianId: true,
    },
  });

  if (!patient) {
    throw new Error('Patient not found');
  }

  // Calculate age
  const age = Math.floor(
    (Date.now() - patient.dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  );

  let preventionPlanCreated = false;
  let riskScore: any = null;

  // Create prevention plan for prediabetes
  if (category === 'PREDIABETES') {
    // Calculate diabetes risk score
    riskScore = calculateDiabetesRisk({
      age,
      gender: (patient.gender?.toLowerCase() === 'female' ? 'female' : 'male') as 'male' | 'female',
      familyHistory: false, // TODO: Get from patient history
      hypertension: false, // TODO: Get from patient conditions
      physicalActivity: true, // TODO: Get from patient lifestyle
      bmi: patient.bmi || 25,
    });

    // Create prevention plan
    await prisma.preventionPlan.create({
      data: {
        patientId: labResult.patientId,
        type: 'RISK_MITIGATION',
        title: 'Prediabetes Prevention Plan',
        description: `HbA1c of ${value}% indicates prediabetes. Immediate lifestyle intervention recommended.`,
        priority: 'HIGH',
        status: 'ACTIVE',
        scheduledDate: new Date(),
        clinicalRecommendations: [
          '**Weight Loss Goal**: 5-7% body weight reduction within 6 months',
          '**Exercise**: 150 minutes/week moderate-intensity aerobic activity + 2 days resistance training',
          '**Diet**: Low-carb or Mediterranean diet with dietitian support',
          '**Monitoring**: Repeat HbA1c in 3 months to assess response to lifestyle changes',
          '**Consider Metformin**: If BMI ≥ 35, age < 60, or history of gestational diabetes',
          '**Diabetes Prevention Program (DPP)**: Referral to CDC-recognized DPP if available',
        ],
        uspstfGrade: 'A',
        evidenceStrength: 'DPP trial: 58% diabetes risk reduction with lifestyle intervention',
        targetMetrics: {
          hba1c: value,
          category: 'PREDIABETES',
          targetHbA1c: 5.6,
          diabetesRiskScore: riskScore.score,
          diabetesRiskCategory: riskScore.category,
        },
      },
    });

    // Update patient screening tracking
    await prisma.patient.update({
      where: { id: labResult.patientId },
      data: {
        lastHbA1c: labResult.observedAt,
        prediabetesDetected: true,
        diabetesRiskScore: riskScore.score,
        diabetesRiskDate: new Date(),
        diabetesRiskCategory: riskScore.category,
      },
    });

    preventionPlanCreated = true;
  }

  // Create prevention plan for diabetes
  if (category === 'DIABETES') {
    await prisma.preventionPlan.create({
      data: {
        patientId: labResult.patientId,
        type: 'DISEASE_MANAGEMENT',
        title: 'Diabetes Management Plan',
        description: `HbA1c of ${value}% confirms diabetes diagnosis. Comprehensive diabetes care required.`,
        priority: 'HIGH',
        status: 'ACTIVE',
        scheduledDate: new Date(),
        clinicalRecommendations: [
          '**IMMEDIATE: Physician evaluation required within 1 week**',
          '**Medication**: Initiate metformin or other glucose-lowering therapy',
          '**Monitoring**: Self-monitoring of blood glucose (SMBG) as directed',
          '**HbA1c Goal**: Target < 7% (individualize based on patient factors)',
          '**Screening for Complications**:',
          '  - Comprehensive foot exam annually',
          '  - Dilated eye exam annually',
          '  - Urine albumin-to-creatinine ratio (ACR) annually',
          '  - Lipid panel',
          '**Diabetes Self-Management Education (DSME)**: Referral to diabetes educator',
          '**Lifestyle**: Diet, exercise, weight loss remain critical even with medication',
        ],
        uspstfGrade: 'A',
        evidenceStrength: 'UKPDS: Each 1% HbA1c reduction → 21% diabetes-related death risk reduction',
        targetMetrics: {
          hba1c: value,
          category: 'DIABETES',
          targetHbA1c: 7.0,
        },
      },
    });

    // Update patient screening tracking
    await prisma.patient.update({
      where: { id: labResult.patientId },
      data: {
        lastHbA1c: labResult.observedAt,
        prediabetesDetected: false, // No longer prediabetes
        diabetesRiskScore: 100, // Confirmed diabetes
        diabetesRiskDate: new Date(),
        diabetesRiskCategory: 'Confirmed Diabetes',
      },
    });

    preventionPlanCreated = true;
  }

  // Log monitoring event
  console.log(`[Lab Monitor] HbA1c ${value}% for patient ${labResult.patientId}: ${category}`);

  return {
    flagged,
    category,
    preventionPlanCreated,
    riskScore,
  };
}

/**
 * Monitor LDL cholesterol and auto-flag high cardiovascular risk
 */
export async function monitorLDL(labResult: LabResult): Promise<{
  flagged: boolean;
  category: string;
  preventionPlanCreated: boolean;
}> {
  const value = parseFloat(labResult.value);

  if (isNaN(value)) {
    throw new Error(`Invalid LDL value: ${labResult.value}`);
  }

  let category: string;
  let flagged = false;

  if (value < LDL_THRESHOLDS.OPTIMAL) {
    category = 'OPTIMAL';
  } else if (value < LDL_THRESHOLDS.NEAR_OPTIMAL) {
    category = 'NEAR_OPTIMAL';
  } else if (value < LDL_THRESHOLDS.BORDERLINE_HIGH) {
    category = 'BORDERLINE_HIGH';
    flagged = true;
  } else if (value < LDL_THRESHOLDS.VERY_HIGH) {
    category = 'HIGH';
    flagged = true;
  } else {
    category = 'VERY_HIGH';
    flagged = true;
  }

  let preventionPlanCreated = false;

  // Create prevention plan for high LDL
  if (flagged) {
    await prisma.preventionPlan.create({
      data: {
        patientId: labResult.patientId,
        type: 'RISK_MITIGATION',
        title: 'Cardiovascular Risk Reduction Plan',
        description: `LDL cholesterol of ${value} mg/dL indicates elevated cardiovascular risk.`,
        priority: category === 'VERY_HIGH' ? 'HIGH' : 'MEDIUM',
        status: 'ACTIVE',
        scheduledDate: new Date(),
        clinicalRecommendations: [
          '**Lifestyle Modifications**:',
          '  - DASH or Mediterranean diet',
          '  - Exercise: 150 minutes/week moderate-intensity',
          '  - Weight loss if overweight (BMI > 25)',
          '  - Smoking cessation if applicable',
          category === 'VERY_HIGH'
            ? '**Statin Therapy**: High-intensity statin recommended (atorvastatin 40-80mg or rosuvastatin 20-40mg)'
            : category === 'HIGH'
            ? '**Statin Therapy**: Moderate-intensity statin recommended (atorvastatin 10-20mg or rosuvastatin 5-10mg)'
            : '**Consider Statin**: Based on 10-year ASCVD risk calculation',
          '**Target LDL**: < 100 mg/dL (< 70 mg/dL for high-risk patients)',
          '**Repeat Lipid Panel**: In 3 months to assess response to therapy',
        ],
        uspstfGrade: 'A',
        evidenceStrength: 'CTT meta-analysis: Each 1 mmol/L (39 mg/dL) LDL reduction → 22% relative risk reduction',
        targetMetrics: {
          ldl: value,
          category,
          targetLDL: category === 'VERY_HIGH' ? 70 : 100,
        },
      },
    });

    preventionPlanCreated = true;
  }

  console.log(`[Lab Monitor] LDL ${value} mg/dL for patient ${labResult.patientId}: ${category}`);

  return {
    flagged,
    category,
    preventionPlanCreated,
  };
}

/**
 * Monitor HDL cholesterol and flag cardiovascular risk
 * (LOINC: 2085-9)
 */
export async function monitorHDL(
  labResult: LabResult,
  patientGender?: string
): Promise<{
  flagged: boolean;
  category: string;
  preventionPlanCreated: boolean;
}> {
  const value = parseFloat(labResult.value);

  if (isNaN(value)) {
    throw new Error(`Invalid HDL value: ${labResult.value}`);
  }

  // Get patient gender for gender-specific thresholds
  const patient = await prisma.patient.findUnique({
    where: { id: labResult.patientId },
    select: { gender: true },
  });

  const gender = patientGender || patient?.gender?.toLowerCase() || 'male';
  const lowThreshold = gender === 'female' ? HDL_THRESHOLDS.LOW_FEMALE : HDL_THRESHOLDS.LOW_MALE;

  let category: string;
  let flagged = false;

  if (value >= HDL_THRESHOLDS.OPTIMAL) {
    category = 'OPTIMAL'; // Protective against cardiovascular disease
  } else if (value >= lowThreshold) {
    category = 'ACCEPTABLE';
  } else {
    category = 'LOW';
    flagged = true; // Low HDL is a cardiovascular risk factor
  }

  let preventionPlanCreated = false;

  // Create prevention plan for low HDL
  if (flagged) {
    await prisma.preventionPlan.create({
      data: {
        patientId: labResult.patientId,
        type: 'RISK_MITIGATION',
        title: 'Low HDL Cholesterol Management',
        description: `HDL cholesterol of ${value} mg/dL indicates increased cardiovascular risk.`,
        priority: 'MEDIUM',
        status: 'ACTIVE',
        scheduledDate: new Date(),
        clinicalRecommendations: [
          '**Lifestyle Modifications** (First-line therapy):',
          '  - **Aerobic Exercise**: 30-60 minutes, 5 days/week',
          '  - **Weight Loss**: 5-10% body weight can increase HDL by 3-5 mg/dL',
          '  - **Mediterranean Diet**: Rich in olive oil, nuts, fatty fish',
          '  - **Smoking Cessation**: Can increase HDL by up to 10%',
          '  - **Limit Trans Fats**: Avoid partially hydrogenated oils',
          '',
          '**Alcohol Moderation** (if appropriate):',
          '  - Moderate intake (1 drink/day for women, 2 for men) may increase HDL',
          '  - Only if no contraindications',
          '',
          '**Consider Medication** (if lifestyle fails):',
          '  - Niacin: Can increase HDL by 15-35%',
          '  - Fibrates: Moderate HDL increase (5-15%)',
          '  - Evaluate need for statin based on total ASCVD risk',
          '',
          '**Target HDL**: ≥ 40 mg/dL (men), ≥ 50 mg/dL (women)',
          '**Repeat Lipid Panel**: In 3 months',
        ],
        uspstfGrade: 'B',
        evidenceStrength: 'AHA/ACC 2024: Each 1 mg/dL increase in HDL → 2-3% reduction in CHD risk',
        targetMetrics: {
          hdl: value,
          category,
          targetHDL: gender === 'female' ? 50 : 40,
          gender,
        },
      },
    });

    preventionPlanCreated = true;
  }

  console.log(`[Lab Monitor] HDL ${value} mg/dL for patient ${labResult.patientId}: ${category}`);

  return {
    flagged,
    category,
    preventionPlanCreated,
  };
}

/**
 * Monitor Triglycerides and flag dyslipidemia
 * (LOINC: 2571-8)
 */
export async function monitorTriglycerides(labResult: LabResult): Promise<{
  flagged: boolean;
  category: string;
  preventionPlanCreated: boolean;
}> {
  const value = parseFloat(labResult.value);

  if (isNaN(value)) {
    throw new Error(`Invalid triglycerides value: ${labResult.value}`);
  }

  let category: string;
  let flagged = false;

  if (value < TRIGLYCERIDES_THRESHOLDS.NORMAL) {
    category = 'NORMAL';
  } else if (value < TRIGLYCERIDES_THRESHOLDS.BORDERLINE_HIGH) {
    category = 'BORDERLINE_HIGH';
    flagged = true;
  } else if (value < TRIGLYCERIDES_THRESHOLDS.HIGH) {
    category = 'HIGH';
    flagged = true;
  } else {
    category = 'VERY_HIGH';
    flagged = true;
  }

  let preventionPlanCreated = false;

  // Create prevention plan for elevated triglycerides
  if (flagged) {
    await prisma.preventionPlan.create({
      data: {
        patientId: labResult.patientId,
        type: category === 'VERY_HIGH' ? 'DISEASE_MANAGEMENT' : 'RISK_MITIGATION',
        title: category === 'VERY_HIGH'
          ? 'Severe Hypertriglyceridemia Management (Pancreatitis Risk)'
          : 'Hypertriglyceridemia Management',
        description: `Triglycerides of ${value} mg/dL indicate ${category === 'VERY_HIGH' ? 'severe dyslipidemia with acute pancreatitis risk' : 'elevated cardiovascular risk'}.`,
        priority: category === 'VERY_HIGH' ? 'HIGH' : 'MEDIUM',
        status: 'ACTIVE',
        scheduledDate: new Date(),
        clinicalRecommendations: [
          category === 'VERY_HIGH'
            ? '**⚠️ URGENT**: Very high triglycerides (≥500 mg/dL) → Risk of acute pancreatitis'
            : '**Cardiovascular Risk Reduction**:',
          '',
          '**Immediate Interventions**:',
          '  - **Weight Loss**: Most effective if overweight (target 5-10% reduction)',
          '  - **Reduce Simple Carbohydrates**: Limit sugar, sweets, refined grains',
          '  - **Limit Alcohol**: Can significantly increase triglycerides',
          '  - **Increase Omega-3**: 2-4g/day EPA+DHA (fatty fish or supplements)',
          '',
          '**Dietary Modifications**:',
          '  - Replace refined carbs with whole grains',
          '  - Increase dietary fiber (soluble fiber particularly effective)',
          '  - Avoid trans fats and limit saturated fats',
          '  - Mediterranean diet pattern',
          '',
          '**Physical Activity**:',
          '  - Aerobic exercise: 150+ minutes/week moderate-intensity',
          '  - Can reduce triglycerides by 20-30%',
          '',
          category === 'VERY_HIGH'
            ? '**Pharmacotherapy** (REQUIRED for very high levels):'
            : '**Consider Pharmacotherapy**:',
          category === 'VERY_HIGH'
            ? '  - **High-dose Omega-3** (Vascepa/Lovaza): 4g/day EPA'
            : '  - **Fibrates**: Fenofibrate (first-line for isolated hypertriglyceridemia)',
          category === 'VERY_HIGH'
            ? '  - **Fibrates**: Immediate initiation'
            : '  - **High-dose Omega-3**: 2-4g/day prescription-strength',
          category === 'VERY_HIGH'
            ? '  - **Statins**: Add for ASCVD risk reduction'
            : '  - **Statins**: If elevated LDL or high ASCVD risk',
          '',
          '**Screen for Secondary Causes**:',
          '  - Diabetes (check HbA1c)',
          '  - Hypothyroidism (check TSH)',
          '  - Chronic kidney disease (check eGFR)',
          '  - Medications (thiazides, beta-blockers, estrogen)',
          '',
          `**Target Triglycerides**: < 150 mg/dL ${category === 'VERY_HIGH' ? '(URGENT: reduce below 500 mg/dL)' : ''}`,
          category === 'VERY_HIGH'
            ? '**Repeat Lipid Panel**: In 2-4 weeks (urgent follow-up)'
            : '**Repeat Lipid Panel**: In 3 months',
        ],
        uspstfGrade: 'A',
        evidenceStrength:
          category === 'VERY_HIGH'
            ? 'REDUCE-IT: High-dose EPA → 25% reduction in cardiovascular events'
            : 'AHA/ACC 2024: Triglycerides 150-499 mg/dL → Moderate cardiovascular risk',
        targetMetrics: {
          triglycerides: value,
          category,
          targetTriglycerides: 150,
          urgentFlag: category === 'VERY_HIGH',
        },
      },
    });

    preventionPlanCreated = true;
  }

  console.log(`[Lab Monitor] Triglycerides ${value} mg/dL for patient ${labResult.patientId}: ${category}`);

  return {
    flagged,
    category,
    preventionPlanCreated,
  };
}

/**
 * Monitor Total Cholesterol and flag for comprehensive lipid panel
 * (LOINC: 2093-3)
 */
export async function monitorTotalCholesterol(labResult: LabResult): Promise<{
  flagged: boolean;
  category: string;
  preventionPlanCreated: boolean;
}> {
  const value = parseFloat(labResult.value);

  if (isNaN(value)) {
    throw new Error(`Invalid total cholesterol value: ${labResult.value}`);
  }

  let category: string;
  let flagged = false;

  if (value < 200) {
    category = 'DESIRABLE';
  } else if (value < 240) {
    category = 'BORDERLINE_HIGH';
    flagged = true;
  } else {
    category = 'HIGH';
    flagged = true;
  }

  let preventionPlanCreated = false;

  // Create prevention plan for elevated total cholesterol
  if (flagged) {
    await prisma.preventionPlan.create({
      data: {
        patientId: labResult.patientId,
        type: 'RISK_MITIGATION',
        title: 'Hypercholesterolemia Management',
        description: `Total cholesterol of ${value} mg/dL indicates elevated cardiovascular risk.`,
        priority: category === 'HIGH' ? 'HIGH' : 'MEDIUM',
        status: 'ACTIVE',
        scheduledDate: new Date(),
        clinicalRecommendations: [
          '**Action Required**: Total cholesterol ≥200 mg/dL requires comprehensive lipid panel',
          '',
          '**Immediate Steps**:',
          '  1. **Order Fasting Lipid Panel** (if not already done):',
          '     - LDL cholesterol (primary target)',
          '     - HDL cholesterol (protective factor)',
          '     - Triglycerides',
          '     - Non-HDL cholesterol (calculated)',
          '',
          '  2. **Calculate 10-year ASCVD Risk**:',
          '     - Use ACC/AHA Pooled Cohort Equations',
          '     - Guides statin therapy initiation',
          '',
          '  3. **Screen for Secondary Causes**:',
          '     - Hypothyroidism (TSH)',
          '     - Diabetes (HbA1c)',
          '     - Liver disease (LFTs)',
          '     - Nephrotic syndrome (urinalysis)',
          '',
          '**Therapeutic Lifestyle Changes** (initiate now):',
          '  - **Diet**: DASH or Mediterranean',
          '  - **Saturated Fat**: < 7% of total calories',
          '  - **Trans Fats**: Eliminate',
          '  - **Dietary Cholesterol**: < 200mg/day',
          '  - **Plant Stanols/Sterols**: 2g/day (reduce LDL by ~10%)',
          '  - **Soluble Fiber**: 10-25g/day',
          '',
          '**Physical Activity**:',
          '  - 150 minutes/week moderate-intensity aerobic exercise',
          '  - Can improve lipid profile and reduce ASCVD risk',
          '',
          '**Weight Management**:',
          '  - Weight loss of 5-10% improves lipid profile',
          '',
          '**Statin Therapy Considerations**:',
          '  - Primary prevention: Based on ASCVD risk (typically ≥7.5%)',
          '  - Secondary prevention: All patients with known ASCVD',
          '  - High-intensity statin if LDL ≥190 mg/dL',
          '',
          '**Follow-up**:',
          '  - **Repeat Lipid Panel**: 3 months after lifestyle changes',
          '  - **Target Total Cholesterol**: < 200 mg/dL',
          '  - **Reassess ASCVD Risk**: Annually',
        ],
        uspstfGrade: 'B',
        evidenceStrength: 'USPSTF 2024: Statins reduce ASCVD events by 30-40% in at-risk adults',
        targetMetrics: {
          totalCholesterol: value,
          category,
          targetTotalCholesterol: 200,
          requiresFastingPanel: true,
        },
      },
    });

    preventionPlanCreated = true;
  }

  console.log(`[Lab Monitor] Total Cholesterol ${value} mg/dL for patient ${labResult.patientId}: ${category}`);

  return {
    flagged,
    category,
    preventionPlanCreated,
  };
}

/**
 * Monitor fasting glucose and flag prediabetes/diabetes
 */
export async function monitorFastingGlucose(labResult: LabResult): Promise<{
  flagged: boolean;
  category: string;
  preventionPlanCreated: boolean;
}> {
  const value = parseFloat(labResult.value);

  if (isNaN(value)) {
    throw new Error(`Invalid fasting glucose value: ${labResult.value}`);
  }

  let category: string;
  let flagged = false;

  if (value < FASTING_GLUCOSE_THRESHOLDS.NORMAL) {
    category = 'NORMAL';
  } else if (value < FASTING_GLUCOSE_THRESHOLDS.DIABETES) {
    category = 'PREDIABETES';
    flagged = true;
  } else {
    category = 'DIABETES';
    flagged = true;
  }

  let preventionPlanCreated = false;

  if (flagged) {
    await prisma.preventionPlan.create({
      data: {
        patientId: labResult.patientId,
        type: category === 'DIABETES' ? 'DISEASE_MANAGEMENT' : 'RISK_MITIGATION',
        title: `${category === 'DIABETES' ? 'Diabetes' : 'Prediabetes'} Management`,
        description: `Fasting glucose of ${value} mg/dL indicates ${category.toLowerCase()}. Follow-up with HbA1c recommended.`,
        priority: 'HIGH',
        status: 'ACTIVE',
        scheduledDate: new Date(),
        clinicalRecommendations: [
          '**Confirm with HbA1c test**',
          '**Lifestyle modifications**: Diet and exercise',
          category === 'DIABETES' ? '**Medication**: Consider metformin or other glucose-lowering therapy' : '**Weight loss**: Target 5-7% body weight reduction',
          '**Follow-up**: Repeat testing in 3 months',
        ],
        uspstfGrade: 'B',
        evidenceStrength: 'ADA 2024 Guidelines',
        targetMetrics: { fastingGlucose: value, category },
      },
    });
    preventionPlanCreated = true;
  }

  console.log(`[Lab Monitor] Fasting Glucose ${value} mg/dL for patient ${labResult.patientId}: ${category}`);

  return { flagged, category, preventionPlanCreated };
}

/**
 * Monitor eGFR and flag chronic kidney disease
 */
export async function monitorEGFR(labResult: LabResult): Promise<{
  flagged: boolean;
  category: string;
  preventionPlanCreated: boolean;
}> {
  const value = parseFloat(labResult.value);

  if (isNaN(value)) {
    throw new Error(`Invalid eGFR value: ${labResult.value}`);
  }

  let category: string;
  let flagged = false;

  if (value >= EGFR_THRESHOLDS.NORMAL) {
    category = 'NORMAL';
  } else if (value >= EGFR_THRESHOLDS.MILD_REDUCTION) {
    category = 'MILD_CKD';
    flagged = true;
  } else if (value >= EGFR_THRESHOLDS.MODERATE_REDUCTION) {
    category = 'MODERATE_CKD';
    flagged = true;
  } else if (value >= EGFR_THRESHOLDS.SEVERE_REDUCTION) {
    category = 'SEVERE_CKD';
    flagged = true;
  } else {
    category = 'KIDNEY_FAILURE';
    flagged = true;
  }

  let preventionPlanCreated = false;

  if (flagged) {
    await prisma.preventionPlan.create({
      data: {
        patientId: labResult.patientId,
        type: 'DISEASE_MANAGEMENT',
        title: 'Chronic Kidney Disease Management',
        description: `eGFR of ${value} mL/min/1.73m² indicates ${category.replace('_', ' ')}. Nephrology referral recommended.`,
        priority: value < 30 ? 'HIGH' : 'MEDIUM',
        status: 'ACTIVE',
        scheduledDate: new Date(),
        clinicalRecommendations: [
          '**Nephrology referral**',
          '**Blood pressure control**: Target < 130/80 mmHg',
          '**ACE inhibitor or ARB**: If proteinuria present',
          '**Monitor**: Repeat eGFR and urine albumin every 3-6 months',
          '**Medication adjustments**: Adjust doses for kidney function',
          value < 30 ? '**Prepare for renal replacement therapy**' : '**Lifestyle**: Low-sodium diet, protein restriction',
        ],
        uspstfGrade: 'A',
        evidenceStrength: 'KDIGO 2024 Guidelines',
        targetMetrics: { egfr: value, category },
      },
    });
    preventionPlanCreated = true;
  }

  console.log(`[Lab Monitor] eGFR ${value} mL/min/1.73m² for patient ${labResult.patientId}: ${category}`);

  return { flagged, category, preventionPlanCreated };
}

/**
 * Monitor TSH and flag thyroid dysfunction
 */
export async function monitorTSH(labResult: LabResult): Promise<{
  flagged: boolean;
  category: string;
  preventionPlanCreated: boolean;
}> {
  const value = parseFloat(labResult.value);

  if (isNaN(value)) {
    throw new Error(`Invalid TSH value: ${labResult.value}`);
  }

  let category: string;
  let flagged = false;

  if (value < TSH_THRESHOLDS.LOW) {
    category = 'HYPERTHYROIDISM';
    flagged = true;
  } else if (value >= TSH_THRESHOLDS.NORMAL_MIN && value <= TSH_THRESHOLDS.NORMAL_MAX) {
    category = 'NORMAL';
  } else if (value > TSH_THRESHOLDS.HIGH) {
    category = 'HYPOTHYROIDISM';
    flagged = true;
  } else {
    category = 'NORMAL';
  }

  let preventionPlanCreated = false;

  if (flagged) {
    await prisma.preventionPlan.create({
      data: {
        patientId: labResult.patientId,
        type: 'DISEASE_MANAGEMENT',
        title: `${category === 'HYPERTHYROIDISM' ? 'Hyperthyroidism' : 'Hypothyroidism'} Management`,
        description: `TSH of ${value} mIU/L indicates ${category.toLowerCase()}. Endocrinology evaluation recommended.`,
        priority: 'MEDIUM',
        status: 'ACTIVE',
        scheduledDate: new Date(),
        clinicalRecommendations: [
          '**Confirm diagnosis**: Free T4 and free T3 levels',
          category === 'HYPOTHYROIDISM'
            ? '**Treatment**: Levothyroxine replacement therapy'
            : '**Treatment**: Antithyroid medications or radioactive iodine',
          '**Monitor**: Repeat TSH in 6-8 weeks after starting treatment',
          '**Symptom assessment**: Fatigue, weight changes, temperature intolerance',
          '**Long-term**: Annual TSH monitoring once stable',
        ],
        uspstfGrade: 'B',
        evidenceStrength: 'ATA 2024 Guidelines',
        targetMetrics: { tsh: value, category },
      },
    });
    preventionPlanCreated = true;
  }

  console.log(`[Lab Monitor] TSH ${value} mIU/L for patient ${labResult.patientId}: ${category}`);

  return { flagged, category, preventionPlanCreated };
}

/**
 * Main lab result monitoring dispatcher
 * Call this whenever a new lab result is created
 */
export async function monitorLabResult(labResult: LabResult): Promise<{
  monitored: boolean;
  testType: string;
  result?: any;
}> {
  const testNameLower = labResult.testName.toLowerCase();
  const loincCode = labResult.loincCode;

  // HbA1c monitoring (LOINC: 4548-4)
  if (
    testNameLower.includes('hba1c') ||
    testNameLower.includes('hemoglobin a1c') ||
    testNameLower.includes('glycated hemoglobin') ||
    loincCode === '4548-4'
  ) {
    const result = await monitorHbA1c(labResult);
    return {
      monitored: true,
      testType: 'HbA1c',
      result,
    };
  }

  // LDL cholesterol monitoring (LOINC: 13457-7)
  if (
    testNameLower.includes('ldl') ||
    testNameLower.includes('low density lipoprotein') ||
    loincCode === '13457-7'
  ) {
    const result = await monitorLDL(labResult);
    return {
      monitored: true,
      testType: 'LDL',
      result,
    };
  }

  // Fasting glucose monitoring (LOINC: 1558-6)
  if (
    testNameLower.includes('fasting glucose') ||
    testNameLower.includes('fasting blood glucose') ||
    testNameLower.includes('fbg') ||
    loincCode === '1558-6'
  ) {
    const result = await monitorFastingGlucose(labResult);
    return {
      monitored: true,
      testType: 'Fasting Glucose',
      result,
    };
  }

  // eGFR monitoring (LOINC: 33914-3, 48643-1)
  if (
    testNameLower.includes('egfr') ||
    testNameLower.includes('glomerular filtration rate') ||
    loincCode === '33914-3' ||
    loincCode === '48643-1'
  ) {
    const result = await monitorEGFR(labResult);
    return {
      monitored: true,
      testType: 'eGFR',
      result,
    };
  }

  // TSH monitoring (LOINC: 3016-3)
  if (
    testNameLower.includes('tsh') ||
    testNameLower.includes('thyroid stimulating hormone') ||
    loincCode === '3016-3'
  ) {
    const result = await monitorTSH(labResult);
    return {
      monitored: true,
      testType: 'TSH',
      result,
    };
  }

  // HDL cholesterol monitoring (LOINC: 2085-9)
  if (
    testNameLower.includes('hdl') ||
    testNameLower.includes('high density lipoprotein') ||
    loincCode === '2085-9'
  ) {
    const result = await monitorHDL(labResult);
    return {
      monitored: true,
      testType: 'HDL',
      result,
    };
  }

  // Triglycerides monitoring (LOINC: 2571-8)
  if (
    testNameLower.includes('triglyceride') ||
    testNameLower.includes('trig') ||
    loincCode === '2571-8'
  ) {
    const result = await monitorTriglycerides(labResult);
    return {
      monitored: true,
      testType: 'Triglycerides',
      result,
    };
  }

  // Total Cholesterol monitoring (LOINC: 2093-3)
  if (
    testNameLower.includes('total cholesterol') ||
    testNameLower.includes('cholesterol total') ||
    (testNameLower.includes('cholesterol') && !testNameLower.includes('ldl') && !testNameLower.includes('hdl')) ||
    loincCode === '2093-3'
  ) {
    const result = await monitorTotalCholesterol(labResult);
    return {
      monitored: true,
      testType: 'Total Cholesterol',
      result,
    };
  }

  // No monitoring rule matched
  return {
    monitored: false,
    testType: labResult.testName,
  };
}
