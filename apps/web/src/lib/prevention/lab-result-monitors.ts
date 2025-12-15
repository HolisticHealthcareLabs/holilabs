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
 * Vitamin D thresholds (ng/mL)
 */
const VITAMIN_D_THRESHOLDS = {
  DEFICIENT: 20, // < 20 ng/mL = Deficiency
  INSUFFICIENT: 30, // 20-29 ng/mL = Insufficiency
  SUFFICIENT: 30, // ≥ 30 ng/mL = Sufficient
};

/**
 * Hemoglobin thresholds (g/dL) - Anemia detection
 */
const HEMOGLOBIN_THRESHOLDS = {
  MALE: {
    SEVERE_ANEMIA: 8.0,
    MODERATE_ANEMIA: 10.0,
    MILD_ANEMIA: 13.0,
    NORMAL: 13.0,
  },
  FEMALE: {
    SEVERE_ANEMIA: 8.0,
    MODERATE_ANEMIA: 10.0,
    MILD_ANEMIA: 12.0,
    NORMAL: 12.0,
  },
};

/**
 * Ferritin thresholds (ng/mL) - Iron stores
 */
const FERRITIN_THRESHOLDS = {
  MALE: {
    DEFICIENT: 30,
    LOW: 100,
    NORMAL: 100,
  },
  FEMALE: {
    DEFICIENT: 15,
    LOW: 50,
    NORMAL: 50,
  },
};

/**
 * Vitamin B12 thresholds (pg/mL)
 */
const VITAMIN_B12_THRESHOLDS = {
  DEFICIENT: 200,
  LOW: 300,
  NORMAL: 300,
};

/**
 * ALT/AST thresholds (U/L) - Liver enzymes
 */
const LIVER_ENZYME_THRESHOLDS = {
  NORMAL_ALT: 40,
  ELEVATED_ALT: 120,
  VERY_HIGH_ALT: 120,
  NORMAL_AST: 40,
  ELEVATED_AST: 120,
  VERY_HIGH_AST: 120,
};

/**
 * Calcium thresholds (mg/dL)
 */
const CALCIUM_THRESHOLDS = {
  LOW: 8.5,
  NORMAL_MIN: 8.5,
  NORMAL_MAX: 10.5,
  HIGH: 10.5,
  CRITICAL_HIGH: 12.0,
};

/**
 * Uric Acid thresholds (mg/dL)
 */
const URIC_ACID_THRESHOLDS = {
  MALE: {
    NORMAL: 7.0,
    HIGH: 7.0,
  },
  FEMALE: {
    NORMAL: 6.0,
    HIGH: 6.0,
  },
};

/**
 * Creatinine thresholds (mg/dL)
 */
const CREATININE_THRESHOLDS = {
  MALE: {
    NORMAL: 1.2,
    ELEVATED: 1.5,
    HIGH: 1.5,
  },
  FEMALE: {
    NORMAL: 1.0,
    ELEVATED: 1.3,
    HIGH: 1.3,
  },
};

/**
 * Albumin thresholds (g/dL)
 */
const ALBUMIN_THRESHOLDS = {
  CRITICAL_LOW: 2.5,
  LOW: 3.5,
  NORMAL: 3.5,
};

/**
 * Platelet count thresholds (thousands/μL)
 */
const PLATELET_THRESHOLDS = {
  CRITICAL_LOW: 50,
  LOW: 150,
  NORMAL_MIN: 150,
  NORMAL_MAX: 400,
  HIGH: 400,
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
        planType: 'DIABETES',
        planName: 'Prediabetes Prevention Plan',
        description: `HbA1c of ${value}% indicates prediabetes. Immediate lifestyle intervention recommended.`,
        status: 'ACTIVE',
        goals: [
          { goal: 'Weight Loss: 5-7% body weight reduction', targetDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
          { goal: 'Exercise: 150 min/week moderate activity', targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
          { goal: 'Repeat HbA1c in 3 months', targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
        ],
        recommendations: [
          {
            category: 'lifestyle',
            intervention: 'Weight Loss Goal: 5-7% body weight reduction within 6 months',
            evidence: 'Grade A - DPP trial: 58% diabetes risk reduction',
            priority: 'high'
          },
          {
            category: 'exercise',
            intervention: '150 minutes/week moderate-intensity aerobic activity + 2 days resistance training',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'nutrition',
            intervention: 'Low-carb or Mediterranean diet with dietitian support',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'monitoring',
            intervention: 'Repeat HbA1c in 3 months to assess response to lifestyle changes',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'medication',
            intervention: 'Consider Metformin if BMI ≥ 35, age < 60, or history of gestational diabetes',
            evidence: 'Grade A',
            priority: 'medium'
          }
        ],
        screeningSchedule: {
          hba1c: { frequency: '3 months', nextDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() }
        },
        guidelineSource: 'USPSTF, ADA',
        evidenceLevel: 'Grade A',
        clinicalTrialRefs: 'DPP trial: 58% diabetes risk reduction with lifestyle intervention',
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
        planType: 'DIABETES',
        planName: 'Diabetes Management Plan',
        description: `HbA1c of ${value}% confirms diabetes diagnosis. Comprehensive diabetes care required.`,
        status: 'ACTIVE',
        goals: [
          { goal: 'Physician evaluation within 1 week', targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
          { goal: 'Initiate glucose-lowering therapy', targetDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
          { goal: 'Target HbA1c < 7%', targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
        ],
        recommendations: [
          { category: 'urgent', intervention: 'IMMEDIATE: Physician evaluation required within 1 week', evidence: 'Grade A', priority: 'critical' },
          { category: 'medication', intervention: 'Initiate metformin or other glucose-lowering therapy', evidence: 'Grade A - UKPDS trial', priority: 'high' },
          { category: 'monitoring', intervention: 'Self-monitoring of blood glucose (SMBG) as directed', evidence: 'Grade A', priority: 'high' },
          { category: 'screening', intervention: 'Comprehensive foot exam annually', evidence: 'Grade A', priority: 'high' },
          { category: 'screening', intervention: 'Dilated eye exam annually', evidence: 'Grade A', priority: 'high' },
          { category: 'screening', intervention: 'Urine albumin-to-creatinine ratio (ACR) annually', evidence: 'Grade A', priority: 'high' },
          { category: 'education', intervention: 'Diabetes Self-Management Education (DSME): Referral to diabetes educator', evidence: 'Grade A', priority: 'high' },
          { category: 'lifestyle', intervention: 'Diet, exercise, weight loss remain critical even with medication', evidence: 'Grade A', priority: 'high' },
        ],
        screeningSchedule: {
          hba1c: { frequency: '3 months', nextDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() },
          foot: { frequency: 'annual', nextDue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() },
          eye: { frequency: 'annual', nextDue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() }
      },
        guidelineSource: 'ADA, USPSTF',
        evidenceLevel: 'Grade A',
        clinicalTrialRefs: 'UKPDS: Each 1% HbA1c reduction → 21% diabetes-related death risk reduction',
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
        planType: 'CARDIOVASCULAR',
        planName: 'Cardiovascular Risk Reduction Plan',
        description: `LDL cholesterol of ${value} mg/dL indicates elevated cardiovascular risk.`,
        status: 'ACTIVE',
        goals: [
          { goal: `Target LDL < ${category === 'VERY_HIGH' ? 70 : 100} mg/dL`, targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
          { goal: 'Weight loss if overweight (BMI > 25)', targetDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
          { goal: 'Repeat lipid panel in 3 months', targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
        ],
        recommendations: [
          {
            category: 'nutrition',
            intervention: 'DASH or Mediterranean diet',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'exercise',
            intervention: '150 minutes/week moderate-intensity aerobic activity',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'lifestyle',
            intervention: 'Smoking cessation if applicable',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'medication',
            intervention: category === 'VERY_HIGH'
              ? 'High-intensity statin recommended (atorvastatin 40-80mg or rosuvastatin 20-40mg)'
              : category === 'HIGH'
              ? 'Moderate-intensity statin recommended (atorvastatin 10-20mg or rosuvastatin 5-10mg)'
              : 'Consider statin based on 10-year ASCVD risk calculation',
            evidence: 'Grade A - CTT meta-analysis',
            priority: category === 'VERY_HIGH' ? 'critical' : 'high'
          }
        ],
        screeningSchedule: {
          lipidPanel: { frequency: '3 months', nextDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() }
        },
        guidelineSource: 'ACC/AHA, USPSTF',
        evidenceLevel: 'Grade A',
        clinicalTrialRefs: 'CTT meta-analysis: Each 1 mmol/L (39 mg/dL) LDL reduction → 22% relative risk reduction',
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
        planType: 'CARDIOVASCULAR',
        planName: 'Low HDL Cholesterol Management',
        description: `HDL cholesterol of ${value} mg/dL indicates increased cardiovascular risk.`,
        status: 'ACTIVE',
        goals: [
          { goal: `Target HDL ≥ ${gender === 'female' ? 50 : 40} mg/dL`, targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
          { goal: 'Weight loss: 5-10% body weight reduction', targetDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
          { goal: 'Repeat lipid panel in 3 months', targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
        ],
        recommendations: [
          {
            category: 'exercise',
            intervention: 'Aerobic exercise: 30-60 minutes, 5 days/week',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'nutrition',
            intervention: 'Mediterranean diet: Rich in olive oil, nuts, fatty fish',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'lifestyle',
            intervention: 'Smoking cessation (can increase HDL by up to 10%)',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'lifestyle',
            intervention: 'Limit trans fats: Avoid partially hydrogenated oils',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'medication',
            intervention: 'Consider niacin or fibrates if lifestyle modifications fail',
            evidence: 'Grade B',
            priority: 'medium'
          }
        ],
        screeningSchedule: {
          lipidPanel: { frequency: '3 months', nextDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() }
        },
        guidelineSource: 'AHA/ACC, USPSTF',
        evidenceLevel: 'Grade B',
        clinicalTrialRefs: 'AHA/ACC 2024: Each 1 mg/dL increase in HDL → 2-3% reduction in CHD risk',
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
        planType: 'CARDIOVASCULAR',
        planName: category === 'VERY_HIGH'
          ? 'Severe Hypertriglyceridemia Management (Pancreatitis Risk)'
          : 'Hypertriglyceridemia Management',
        description: `Triglycerides of ${value} mg/dL indicate ${category === 'VERY_HIGH' ? 'severe dyslipidemia with acute pancreatitis risk' : 'elevated cardiovascular risk'}.`,
        status: 'ACTIVE',
        goals: [
          { goal: `Target triglycerides < 150 mg/dL${category === 'VERY_HIGH' ? ' (URGENT: reduce below 500 mg/dL)' : ''}`, targetDate: new Date(Date.now() + (category === 'VERY_HIGH' ? 14 : 90) * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
          { goal: 'Weight loss: 5-10% body weight reduction', targetDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
          { goal: `Repeat lipid panel in ${category === 'VERY_HIGH' ? '2-4 weeks' : '3 months'}`, targetDate: new Date(Date.now() + (category === 'VERY_HIGH' ? 21 : 90) * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
        ],
        recommendations: [
          {
            category: 'lifestyle',
            intervention: 'Reduce simple carbohydrates: Limit sugar, sweets, refined grains',
            evidence: 'Grade A',
            priority: category === 'VERY_HIGH' ? 'critical' : 'high'
          },
          {
            category: 'lifestyle',
            intervention: 'Limit alcohol (can significantly increase triglycerides)',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'nutrition',
            intervention: 'Increase omega-3: 2-4g/day EPA+DHA (fatty fish or supplements)',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'nutrition',
            intervention: 'Mediterranean diet pattern with whole grains and increased fiber',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'exercise',
            intervention: 'Aerobic exercise: 150+ minutes/week moderate-intensity (can reduce triglycerides by 20-30%)',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'medication',
            intervention: category === 'VERY_HIGH'
              ? 'High-dose Omega-3 (Vascepa/Lovaza) 4g/day EPA + Fibrates (immediate initiation)'
              : 'Consider fibrates (fenofibrate) or high-dose omega-3 if lifestyle fails',
            evidence: category === 'VERY_HIGH' ? 'Grade A - REDUCE-IT trial' : 'Grade A',
            priority: category === 'VERY_HIGH' ? 'critical' : 'medium'
          },
          {
            category: 'screening',
            intervention: 'Screen for secondary causes: Diabetes (HbA1c), hypothyroidism (TSH), kidney disease (eGFR)',
            evidence: 'Grade A',
            priority: 'high'
          }
        ],
        screeningSchedule: {
          lipidPanel: { frequency: category === 'VERY_HIGH' ? '2-4 weeks' : '3 months', nextDue: new Date(Date.now() + (category === 'VERY_HIGH' ? 21 : 90) * 24 * 60 * 60 * 1000).toISOString() }
        },
        guidelineSource: 'AHA/ACC, USPSTF',
        evidenceLevel: 'Grade A',
        clinicalTrialRefs: category === 'VERY_HIGH'
          ? 'REDUCE-IT: High-dose EPA → 25% reduction in cardiovascular events'
          : 'AHA/ACC 2024: Triglycerides 150-499 mg/dL → Moderate cardiovascular risk',
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
        planType: 'CARDIOVASCULAR',
        planName: 'Hypercholesterolemia Management',
        description: `Total cholesterol of ${value} mg/dL indicates elevated cardiovascular risk. Comprehensive lipid panel recommended.`,
        status: 'ACTIVE',
        goals: [
          { goal: 'Order fasting lipid panel (LDL, HDL, triglycerides)', targetDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
          { goal: 'Target total cholesterol < 200 mg/dL', targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
          { goal: 'Calculate 10-year ASCVD risk', targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
        ],
        recommendations: [
          {
            category: 'screening',
            intervention: 'Order comprehensive fasting lipid panel to evaluate LDL, HDL, and triglycerides',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'screening',
            intervention: 'Screen for secondary causes: Hypothyroidism (TSH), diabetes (HbA1c), liver disease (LFTs)',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'nutrition',
            intervention: 'DASH or Mediterranean diet: Saturated fat < 7% of calories, eliminate trans fats, dietary cholesterol < 200mg/day',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'nutrition',
            intervention: 'Plant stanols/sterols 2g/day (reduce LDL by ~10%) and soluble fiber 10-25g/day',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'exercise',
            intervention: '150 minutes/week moderate-intensity aerobic exercise',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'lifestyle',
            intervention: 'Weight loss of 5-10% if overweight (improves lipid profile)',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'medication',
            intervention: 'Consider statin therapy based on 10-year ASCVD risk (typically ≥7.5%) or if LDL ≥190 mg/dL',
            evidence: 'Grade B - USPSTF',
            priority: 'medium'
          }
        ],
        screeningSchedule: {
          lipidPanel: { frequency: '3 months', nextDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() },
          ascvdRisk: { frequency: 'annual', nextDue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() }
        },
        guidelineSource: 'ACC/AHA, USPSTF',
        evidenceLevel: 'Grade B',
        clinicalTrialRefs: 'USPSTF 2024: Statins reduce ASCVD events by 30-40% in at-risk adults',
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
        planType: category === 'DIABETES' ? 'DIABETES' : 'DIABETES',
        planName: `${category === 'DIABETES' ? 'Diabetes' : 'Prediabetes'} Management`,
        description: `Fasting glucose of ${value} mg/dL indicates ${category.toLowerCase()}. Follow-up with HbA1c recommended.`,
        status: 'ACTIVE',
        goals: [
          { goal: 'Confirm diagnosis with HbA1c test', targetDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
          { goal: category === 'DIABETES' ? 'Target fasting glucose < 130 mg/dL' : 'Target fasting glucose < 100 mg/dL', targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
          { goal: 'Repeat glucose testing in 3 months', targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
        ],
        recommendations: [
          {
            category: 'screening',
            intervention: 'Confirm with HbA1c test to establish diagnosis',
            evidence: 'Grade A - ADA',
            priority: 'high'
          },
          {
            category: 'lifestyle',
            intervention: category === 'DIABETES'
              ? 'Lifestyle modifications: Diet and exercise remain critical even with medication'
              : 'Weight loss: Target 5-7% body weight reduction',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'nutrition',
            intervention: 'Low-carb or Mediterranean diet with dietitian support',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'exercise',
            intervention: '150 minutes/week moderate-intensity aerobic activity',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'medication',
            intervention: category === 'DIABETES'
              ? 'Consider metformin or other glucose-lowering therapy'
              : 'Consider metformin if BMI ≥ 35, age < 60, or history of gestational diabetes',
            evidence: 'Grade A - ADA',
            priority: category === 'DIABETES' ? 'high' : 'medium'
          }
        ],
        screeningSchedule: {
          hba1c: { frequency: '3 months', nextDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() },
          fastingGlucose: { frequency: '3 months', nextDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() }
        },
        guidelineSource: 'ADA, USPSTF',
        evidenceLevel: 'Grade B',
        clinicalTrialRefs: 'ADA 2024 Guidelines',
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
        planType: 'HYPERTENSION',
        planName: 'Chronic Kidney Disease Management',
        description: `eGFR of ${value} mL/min/1.73m² indicates ${category.replace('_', ' ')}. Nephrology referral recommended.`,
        status: 'ACTIVE',
        goals: [
          { goal: 'Nephrology referral and evaluation', targetDate: new Date(Date.now() + (value < 30 ? 7 : 30) * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
          { goal: 'Blood pressure control: Target < 130/80 mmHg', targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
          { goal: 'Repeat eGFR and urine albumin monitoring', targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
        ],
        recommendations: [
          {
            category: 'urgent',
            intervention: 'IMMEDIATE: Nephrology referral required',
            evidence: 'Grade A - KDIGO',
            priority: value < 30 ? 'critical' : 'high'
          },
          {
            category: 'medication',
            intervention: 'Blood pressure control: Target < 130/80 mmHg. ACE inhibitor or ARB if proteinuria present',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'monitoring',
            intervention: 'Repeat eGFR and urine albumin every 3-6 months',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'medication',
            intervention: 'Medication dose adjustments for kidney function',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'nutrition',
            intervention: value < 30
              ? 'Low-sodium diet, protein restriction, prepare for renal replacement therapy'
              : 'Low-sodium diet, moderate protein restriction',
            evidence: 'Grade A',
            priority: 'high'
          }
        ],
        screeningSchedule: {
          egfr: { frequency: '3-6 months', nextDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() },
          urineAlbumin: { frequency: '3-6 months', nextDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() }
        },
        guidelineSource: 'KDIGO, USPSTF',
        evidenceLevel: 'Grade A',
        clinicalTrialRefs: 'KDIGO 2024 Guidelines: Early CKD management prevents progression to kidney failure',
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
        planType: 'COMPREHENSIVE',
        planName: `${category === 'HYPERTHYROIDISM' ? 'Hyperthyroidism' : 'Hypothyroidism'} Management`,
        description: `TSH of ${value} mIU/L indicates ${category.toLowerCase()}. Endocrinology evaluation recommended.`,
        status: 'ACTIVE',
        goals: [
          { goal: 'Confirm diagnosis with free T4 and free T3 levels', targetDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
          { goal: 'Endocrinology evaluation and treatment plan', targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
          { goal: 'Repeat TSH in 6-8 weeks after starting treatment', targetDate: new Date(Date.now() + 49 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
        ],
        recommendations: [
          {
            category: 'screening',
            intervention: 'Confirm diagnosis with free T4 and free T3 levels',
            evidence: 'Grade A - ATA',
            priority: 'high'
          },
          {
            category: 'medication',
            intervention: category === 'HYPOTHYROIDISM'
              ? 'Levothyroxine replacement therapy (dosing based on weight and TSH level)'
              : 'Antithyroid medications (methimazole or PTU) or radioactive iodine therapy',
            evidence: 'Grade A - ATA',
            priority: 'high'
          },
          {
            category: 'monitoring',
            intervention: 'Repeat TSH in 6-8 weeks after starting treatment, then every 3-6 months until stable',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'monitoring',
            intervention: 'Symptom assessment: Fatigue, weight changes, temperature intolerance, heart palpitations',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'monitoring',
            intervention: 'Long-term: Annual TSH monitoring once hormone levels are stable',
            evidence: 'Grade B',
            priority: 'medium'
          }
        ],
        screeningSchedule: {
          tsh: { frequency: '6-8 weeks initially, then annual when stable', nextDue: new Date(Date.now() + 49 * 24 * 60 * 60 * 1000).toISOString() },
          freeT4: { frequency: 'as needed', nextDue: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() }
        },
        guidelineSource: 'ATA, USPSTF',
        evidenceLevel: 'Grade B',
        clinicalTrialRefs: 'ATA 2024 Guidelines: Thyroid hormone optimization improves symptoms and prevents complications',
      },
    });
    preventionPlanCreated = true;
  }

  console.log(`[Lab Monitor] TSH ${value} mIU/L for patient ${labResult.patientId}: ${category}`);

  return { flagged, category, preventionPlanCreated };
}

/**
 * Monitor Vitamin D levels and flag deficiency
 */
export async function monitorVitaminD(labResult: LabResult): Promise<{
  flagged: boolean;
  category: string;
  preventionPlanCreated: boolean;
}> {
  const value = parseFloat(labResult.value);

  let category: string;
  let flagged = false;

  if (value < VITAMIN_D_THRESHOLDS.DEFICIENT) {
    category = 'DEFICIENT';
    flagged = true;
  } else if (value < VITAMIN_D_THRESHOLDS.INSUFFICIENT) {
    category = 'INSUFFICIENT';
    flagged = true;
  } else {
    category = 'SUFFICIENT';
  }

  let preventionPlanCreated = false;

  if (flagged) {
    await prisma.preventionPlan.create({
      data: {
        patientId: labResult.patientId,
        planType: 'COMPREHENSIVE',
        planName: 'Vitamin D Deficiency Management',
        description: `Vitamin D level of ${value} ng/mL indicates ${category.toLowerCase()}. Supplementation and sun exposure recommended.`,
        status: 'ACTIVE',
        goals: [
          { goal: 'Target Vitamin D ≥ 30 ng/mL', targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
          { goal: 'Increase sun exposure: 10-30 min daily', targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
          { goal: 'Repeat Vitamin D test in 3 months', targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
        ],
        recommendations: [
          {
            category: 'medication',
            intervention: category === 'DEFICIENT'
              ? 'Vitamin D3 supplementation: 50,000 IU weekly for 8 weeks, then 1,000-2,000 IU daily'
              : 'Vitamin D3 supplementation: 1,000-2,000 IU daily',
            evidence: 'Grade A - Endocrine Society',
            priority: category === 'DEFICIENT' ? 'high' : 'medium'
          },
          {
            category: 'lifestyle',
            intervention: 'Sun exposure: 10-30 minutes daily (face, arms, legs) without sunscreen, between 10 AM-3 PM',
            evidence: 'Grade B',
            priority: 'high'
          },
          {
            category: 'nutrition',
            intervention: 'Dietary sources: Fatty fish (salmon, mackerel), fortified milk/cereal, egg yolks',
            evidence: 'Grade B',
            priority: 'medium'
          },
          {
            category: 'screening',
            intervention: 'Screen for secondary causes: Malabsorption, chronic kidney disease, liver disease',
            evidence: 'Grade B',
            priority: 'medium'
          }
        ],
        screeningSchedule: {
          vitaminD: { frequency: '3 months', nextDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() }
        },
        guidelineSource: 'Endocrine Society, USPSTF',
        evidenceLevel: 'Grade A',
        clinicalTrialRefs: 'Endocrine Society 2024: Vitamin D deficiency associated with osteoporosis, falls, immune dysfunction',
      },
    });
    preventionPlanCreated = true;
  }

  console.log(`[Lab Monitor] Vitamin D ${value} ng/mL for patient ${labResult.patientId}: ${category}`);

  return { flagged, category, preventionPlanCreated };
}

/**
 * Monitor Hemoglobin and flag anemia
 */
export async function monitorHemoglobin(labResult: LabResult): Promise<{
  flagged: boolean;
  category: string;
  preventionPlanCreated: boolean;
}> {
  const value = parseFloat(labResult.value);

  // Get patient gender (default to male if not available)
  const patient = await prisma.patient.findUnique({
    where: { id: labResult.patientId },
    select: { gender: true },
  });
  const gender = patient?.gender?.toLowerCase() || 'male';
  const thresholds = gender === 'female' ? HEMOGLOBIN_THRESHOLDS.FEMALE : HEMOGLOBIN_THRESHOLDS.MALE;

  let category: string;
  let flagged = false;

  if (value < thresholds.SEVERE_ANEMIA) {
    category = 'SEVERE_ANEMIA';
    flagged = true;
  } else if (value < thresholds.MODERATE_ANEMIA) {
    category = 'MODERATE_ANEMIA';
    flagged = true;
  } else if (value < thresholds.MILD_ANEMIA) {
    category = 'MILD_ANEMIA';
    flagged = true;
  } else {
    category = 'NORMAL';
  }

  let preventionPlanCreated = false;

  if (flagged) {
    await prisma.preventionPlan.create({
      data: {
        patientId: labResult.patientId,
        planType: 'COMPREHENSIVE',
        planName: 'Anemia Management',
        description: `Hemoglobin of ${value} g/dL indicates ${category.replace('_', ' ').toLowerCase()}. Evaluation and treatment required.`,
        status: 'ACTIVE',
        goals: [
          { goal: `Target hemoglobin ≥ ${thresholds.NORMAL} g/dL`, targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
          { goal: 'Identify and treat underlying cause', targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
          { goal: 'Repeat CBC in 4-8 weeks', targetDate: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
        ],
        recommendations: [
          {
            category: 'urgent',
            intervention: category === 'SEVERE_ANEMIA'
              ? 'URGENT: Immediate physician evaluation - Consider blood transfusion if symptomatic'
              : 'Physician evaluation required within 1 week',
            evidence: 'Grade A',
            priority: category === 'SEVERE_ANEMIA' ? 'critical' : 'high'
          },
          {
            category: 'screening',
            intervention: 'Workup: Ferritin, iron studies, vitamin B12, folate, reticulocyte count, peripheral smear',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'screening',
            intervention: 'Evaluate for causes: GI bleeding, menstrual blood loss, malnutrition, chronic disease, hemolysis',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'medication',
            intervention: 'Iron supplementation if iron deficiency confirmed (ferrous sulfate 325mg daily)',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'nutrition',
            intervention: 'Iron-rich diet: Red meat, poultry, fish, beans, fortified cereals, spinach. Vitamin C enhances absorption.',
            evidence: 'Grade A',
            priority: 'high'
          }
        ],
        screeningSchedule: {
          cbc: { frequency: '4-8 weeks', nextDue: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString() }
        },
        guidelineSource: 'WHO, USPSTF',
        evidenceLevel: 'Grade A',
        clinicalTrialRefs: 'WHO 2024: Anemia affects 1.6 billion people globally, leading to fatigue, reduced work capacity, cognitive impairment',
      },
    });
    preventionPlanCreated = true;
  }

  console.log(`[Lab Monitor] Hemoglobin ${value} g/dL for patient ${labResult.patientId}: ${category}`);

  return { flagged, category, preventionPlanCreated };
}

/**
 * Monitor Ferritin and flag iron deficiency
 */
export async function monitorFerritin(labResult: LabResult): Promise<{
  flagged: boolean;
  category: string;
  preventionPlanCreated: boolean;
}> {
  const value = parseFloat(labResult.value);

  const patient = await prisma.patient.findUnique({
    where: { id: labResult.patientId },
    select: { gender: true },
  });
  const gender = patient?.gender?.toLowerCase() || 'male';
  const thresholds = gender === 'female' ? FERRITIN_THRESHOLDS.FEMALE : FERRITIN_THRESHOLDS.MALE;

  let category: string;
  let flagged = false;

  if (value < thresholds.DEFICIENT) {
    category = 'DEFICIENT';
    flagged = true;
  } else if (value < thresholds.LOW) {
    category = 'LOW';
    flagged = true;
  } else {
    category = 'NORMAL';
  }

  let preventionPlanCreated = false;

  if (flagged) {
    await prisma.preventionPlan.create({
      data: {
        patientId: labResult.patientId,
        planType: 'COMPREHENSIVE',
        planName: 'Iron Deficiency Management',
        description: `Ferritin of ${value} ng/mL indicates ${category.toLowerCase()} iron stores. Iron supplementation recommended.`,
        status: 'ACTIVE',
        goals: [
          { goal: `Target ferritin ≥ ${thresholds.NORMAL} ng/mL`, targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
          { goal: 'Evaluate and treat underlying cause of iron loss', targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
          { goal: 'Repeat ferritin in 3 months', targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
        ],
        recommendations: [
          {
            category: 'medication',
            intervention: 'Oral iron supplementation: Ferrous sulfate 325mg (65mg elemental iron) 1-2 times daily',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'screening',
            intervention: 'Evaluate for causes: GI bleeding (endoscopy if indicated), heavy menstrual bleeding, malabsorption',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'nutrition',
            intervention: 'Iron-rich foods: Red meat, poultry, seafood, beans, fortified cereals, dark leafy greens',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'medication',
            intervention: 'Take iron with vitamin C (orange juice) for better absorption. Avoid with calcium, tea, coffee.',
            evidence: 'Grade A',
            priority: 'medium'
          }
        ],
        screeningSchedule: {
          ferritin: { frequency: '3 months', nextDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() },
          cbc: { frequency: '3 months', nextDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() }
        },
        guidelineSource: 'USPSTF, WHO',
        evidenceLevel: 'Grade A',
        clinicalTrialRefs: 'Iron deficiency is the most common nutritional deficiency worldwide, causing anemia and fatigue',
      },
    });
    preventionPlanCreated = true;
  }

  console.log(`[Lab Monitor] Ferritin ${value} ng/mL for patient ${labResult.patientId}: ${category}`);

  return { flagged, category, preventionPlanCreated };
}

/**
 * Monitor Vitamin B12 and flag deficiency
 */
export async function monitorVitaminB12(labResult: LabResult): Promise<{
  flagged: boolean;
  category: string;
  preventionPlanCreated: boolean;
}> {
  const value = parseFloat(labResult.value);

  let category: string;
  let flagged = false;

  if (value < VITAMIN_B12_THRESHOLDS.DEFICIENT) {
    category = 'DEFICIENT';
    flagged = true;
  } else if (value < VITAMIN_B12_THRESHOLDS.LOW) {
    category = 'LOW';
    flagged = true;
  } else {
    category = 'NORMAL';
  }

  let preventionPlanCreated = false;

  if (flagged) {
    await prisma.preventionPlan.create({
      data: {
        patientId: labResult.patientId,
        planType: 'COMPREHENSIVE',
        planName: 'Vitamin B12 Deficiency Management',
        description: `Vitamin B12 level of ${value} pg/mL indicates ${category.toLowerCase()}. Supplementation and cause evaluation required.`,
        status: 'ACTIVE',
        goals: [
          { goal: 'Target Vitamin B12 ≥ 300 pg/mL', targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
          { goal: 'Identify and treat underlying cause', targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
          { goal: 'Repeat B12 test in 3 months', targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
        ],
        recommendations: [
          {
            category: 'medication',
            intervention: category === 'DEFICIENT'
              ? 'Vitamin B12 injections: 1000 mcg IM weekly for 4 weeks, then monthly OR oral 1000-2000 mcg daily'
              : 'Oral Vitamin B12: 1000 mcg daily',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'screening',
            intervention: 'Evaluate for causes: Pernicious anemia (intrinsic factor antibodies), malabsorption, strict vegan diet, metformin use',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'nutrition',
            intervention: 'B12-rich foods: Meat, fish, poultry, eggs, dairy. Consider fortified foods if vegan.',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'monitoring',
            intervention: 'Monitor for neurological symptoms: Numbness, tingling, balance problems, cognitive changes',
            evidence: 'Grade A',
            priority: 'high'
          }
        ],
        screeningSchedule: {
          vitaminB12: { frequency: '3 months', nextDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() },
          cbc: { frequency: '3 months', nextDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() }
        },
        guidelineSource: 'USPSTF, NIH',
        evidenceLevel: 'Grade A',
        clinicalTrialRefs: 'B12 deficiency causes megaloblastic anemia and irreversible neurological damage if untreated',
      },
    });
    preventionPlanCreated = true;
  }

  console.log(`[Lab Monitor] Vitamin B12 ${value} pg/mL for patient ${labResult.patientId}: ${category}`);

  return { flagged, category, preventionPlanCreated };
}

/**
 * Monitor ALT and flag liver dysfunction
 */
export async function monitorALT(labResult: LabResult): Promise<{
  flagged: boolean;
  category: string;
  preventionPlanCreated: boolean;
}> {
  const value = parseFloat(labResult.value);

  let category: string;
  let flagged = false;

  if (value >= LIVER_ENZYME_THRESHOLDS.VERY_HIGH_ALT) {
    category = 'VERY_HIGH';
    flagged = true;
  } else if (value > LIVER_ENZYME_THRESHOLDS.NORMAL_ALT) {
    category = 'ELEVATED';
    flagged = true;
  } else {
    category = 'NORMAL';
  }

  let preventionPlanCreated = false;

  if (flagged) {
    await prisma.preventionPlan.create({
      data: {
        patientId: labResult.patientId,
        planType: 'COMPREHENSIVE',
        planName: 'Liver Dysfunction Evaluation',
        description: `ALT of ${value} U/L indicates ${category.toLowerCase()} liver enzymes. Hepatology evaluation recommended.`,
        status: 'ACTIVE',
        goals: [
          { goal: 'Target ALT < 40 U/L', targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
          { goal: 'Identify and treat underlying liver disease', targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
          { goal: 'Repeat LFTs in 4-8 weeks', targetDate: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
        ],
        recommendations: [
          {
            category: 'urgent',
            intervention: category === 'VERY_HIGH'
              ? 'URGENT: Immediate hepatology referral - Risk of acute liver failure'
              : 'Physician evaluation within 1 week',
            evidence: 'Grade A',
            priority: category === 'VERY_HIGH' ? 'critical' : 'high'
          },
          {
            category: 'screening',
            intervention: 'Comprehensive liver workup: AST, alkaline phosphatase, bilirubin, albumin, PT/INR, complete hepatitis panel (A, B, C), autoimmune markers (ANA, ASMA)',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'screening',
            intervention: 'Evaluate causes: Alcohol use, medications (acetaminophen, statins), fatty liver disease (NAFLD), viral hepatitis, autoimmune hepatitis',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'lifestyle',
            intervention: 'Avoid alcohol completely until liver enzymes normalize',
            evidence: 'Grade A',
            priority: 'critical'
          },
          {
            category: 'medication',
            intervention: 'Review all medications for hepatotoxicity. Consider stopping or adjusting doses.',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'lifestyle',
            intervention: 'If NAFLD suspected: Weight loss 7-10%, exercise 150 min/week, Mediterranean diet',
            evidence: 'Grade A',
            priority: 'high'
          }
        ],
        screeningSchedule: {
          lfts: { frequency: '4-8 weeks', nextDue: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString() }
        },
        guidelineSource: 'AASLD, USPSTF',
        evidenceLevel: 'Grade A',
        clinicalTrialRefs: 'AASLD 2024: Early detection and treatment of liver disease prevents cirrhosis and liver failure',
      },
    });
    preventionPlanCreated = true;
  }

  console.log(`[Lab Monitor] ALT ${value} U/L for patient ${labResult.patientId}: ${category}`);

  return { flagged, category, preventionPlanCreated };
}

/**
 * Monitor Calcium and flag abnormalities
 */
export async function monitorCalcium(labResult: LabResult): Promise<{
  flagged: boolean;
  category: string;
  preventionPlanCreated: boolean;
}> {
  const value = parseFloat(labResult.value);

  let category: string;
  let flagged = false;

  if (value >= CALCIUM_THRESHOLDS.CRITICAL_HIGH) {
    category = 'CRITICAL_HIGH';
    flagged = true;
  } else if (value > CALCIUM_THRESHOLDS.HIGH) {
    category = 'HIGH';
    flagged = true;
  } else if (value < CALCIUM_THRESHOLDS.LOW) {
    category = 'LOW';
    flagged = true;
  } else {
    category = 'NORMAL';
  }

  let preventionPlanCreated = false;

  if (flagged) {
    await prisma.preventionPlan.create({
      data: {
        patientId: labResult.patientId,
        planType: 'COMPREHENSIVE',
        planName: category.includes('HIGH') ? 'Hypercalcemia Management' : 'Hypocalcemia Management',
        description: `Calcium of ${value} mg/dL indicates ${category.replace('_', ' ').toLowerCase()}. Endocrinology evaluation recommended.`,
        status: 'ACTIVE',
        goals: [
          { goal: 'Target calcium 8.5-10.5 mg/dL', targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
          { goal: 'Identify and treat underlying cause', targetDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
          { goal: 'Repeat calcium test in 1-2 weeks', targetDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
        ],
        recommendations: [
          {
            category: 'urgent',
            intervention: category === 'CRITICAL_HIGH'
              ? 'EMERGENCY: Immediate hospitalization - Risk of cardiac arrhythmias and coma'
              : category.includes('HIGH')
              ? 'URGENT: Physician evaluation within 24-48 hours'
              : 'Physician evaluation within 1 week',
            evidence: 'Grade A',
            priority: category === 'CRITICAL_HIGH' ? 'critical' : 'high'
          },
          {
            category: 'screening',
            intervention: category.includes('HIGH')
              ? 'Hypercalcemia workup: PTH, vitamin D, phosphorus, albumin, kidney function, bone scan if malignancy suspected'
              : 'Hypocalcemia workup: PTH, vitamin D, magnesium, phosphorus, albumin',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'screening',
            intervention: category.includes('HIGH')
              ? 'Evaluate causes: Hyperparathyroidism, malignancy, vitamin D toxicity, thiazide diuretics, immobilization'
              : 'Evaluate causes: Hypoparathyroidism, vitamin D deficiency, chronic kidney disease, hypomagnesemia',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'medication',
            intervention: category.includes('HIGH')
              ? 'IV fluids and bisphosphonates if severe. Stop calcium/vitamin D supplements.'
              : 'Calcium supplementation (1000-1500mg daily) and vitamin D (800-1000 IU daily)',
            evidence: 'Grade A',
            priority: 'high'
          }
        ],
        screeningSchedule: {
          calcium: { frequency: '1-2 weeks', nextDue: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString() }
        },
        guidelineSource: 'Endocrine Society, USPSTF',
        evidenceLevel: 'Grade A',
        clinicalTrialRefs: category.includes('HIGH')
          ? 'Severe hypercalcemia (>14 mg/dL) is a medical emergency requiring immediate treatment'
          : 'Chronic hypocalcemia increases fracture risk and can cause tetany, seizures',
      },
    });
    preventionPlanCreated = true;
  }

  console.log(`[Lab Monitor] Calcium ${value} mg/dL for patient ${labResult.patientId}: ${category}`);

  return { flagged, category, preventionPlanCreated };
}

/**
 * Monitor Uric Acid and flag hyperuricemia/gout risk
 */
export async function monitorUricAcid(labResult: LabResult): Promise<{
  flagged: boolean;
  category: string;
  preventionPlanCreated: boolean;
}> {
  const value = parseFloat(labResult.value);

  const patient = await prisma.patient.findUnique({
    where: { id: labResult.patientId },
    select: { gender: true },
  });
  const gender = patient?.gender?.toLowerCase() || 'male';
  const threshold = gender === 'female' ? URIC_ACID_THRESHOLDS.FEMALE.HIGH : URIC_ACID_THRESHOLDS.MALE.HIGH;

  let category: string;
  let flagged = false;

  if (value > threshold) {
    category = 'HIGH';
    flagged = true;
  } else {
    category = 'NORMAL';
  }

  let preventionPlanCreated = false;

  if (flagged) {
    await prisma.preventionPlan.create({
      data: {
        patientId: labResult.patientId,
        planType: 'COMPREHENSIVE',
        planName: 'Hyperuricemia/Gout Prevention',
        description: `Uric acid of ${value} mg/dL indicates hyperuricemia. Gout prevention and lifestyle modification recommended.`,
        status: 'ACTIVE',
        goals: [
          { goal: `Target uric acid < ${threshold} mg/dL`, targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
          { goal: 'Prevent gout attacks through lifestyle changes', targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
          { goal: 'Repeat uric acid test in 3 months', targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
        ],
        recommendations: [
          {
            category: 'nutrition',
            intervention: 'Limit purine-rich foods: Red meat, organ meats, shellfish, sardines, anchovies',
            evidence: 'Grade A - ACR',
            priority: 'high'
          },
          {
            category: 'nutrition',
            intervention: 'Avoid: High-fructose corn syrup, sweetened beverages, alcohol (especially beer)',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'nutrition',
            intervention: 'Increase: Low-fat dairy, vegetables, cherries (may reduce gout risk)',
            evidence: 'Grade B',
            priority: 'medium'
          },
          {
            category: 'lifestyle',
            intervention: 'Weight loss if overweight (reduces uric acid levels)',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'lifestyle',
            intervention: 'Hydration: Drink 8-12 glasses of water daily',
            evidence: 'Grade B',
            priority: 'high'
          },
          {
            category: 'medication',
            intervention: 'Consider urate-lowering therapy (allopurinol, febuxostat) if recurrent gout or very high levels',
            evidence: 'Grade A - ACR',
            priority: 'medium'
          }
        ],
        screeningSchedule: {
          uricAcid: { frequency: '3 months', nextDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() }
        },
        guidelineSource: 'ACR (American College of Rheumatology), USPSTF',
        evidenceLevel: 'Grade A',
        clinicalTrialRefs: 'ACR 2024: Hyperuricemia increases risk of gout, kidney stones, cardiovascular disease',
      },
    });
    preventionPlanCreated = true;
  }

  console.log(`[Lab Monitor] Uric Acid ${value} mg/dL for patient ${labResult.patientId}: ${category}`);

  return { flagged, category, preventionPlanCreated };
}

/**
 * Monitor Creatinine and flag kidney dysfunction
 */
export async function monitorCreatinine(labResult: LabResult): Promise<{
  flagged: boolean;
  category: string;
  preventionPlanCreated: boolean;
}> {
  const value = parseFloat(labResult.value);

  const patient = await prisma.patient.findUnique({
    where: { id: labResult.patientId },
    select: { gender: true },
  });
  const gender = patient?.gender?.toLowerCase() || 'male';
  const thresholds = gender === 'female' ? CREATININE_THRESHOLDS.FEMALE : CREATININE_THRESHOLDS.MALE;

  let category: string;
  let flagged = false;

  if (value >= thresholds.HIGH) {
    category = 'HIGH';
    flagged = true;
  } else if (value > thresholds.NORMAL) {
    category = 'ELEVATED';
    flagged = true;
  } else {
    category = 'NORMAL';
  }

  let preventionPlanCreated = false;

  if (flagged) {
    await prisma.preventionPlan.create({
      data: {
        patientId: labResult.patientId,
        planType: 'HYPERTENSION',
        planName: 'Kidney Function Evaluation',
        description: `Creatinine of ${value} mg/dL indicates ${category.toLowerCase()} kidney function. Nephrology evaluation recommended.`,
        status: 'ACTIVE',
        goals: [
          { goal: `Target creatinine < ${thresholds.NORMAL} mg/dL`, targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
          { goal: 'Evaluate and manage underlying kidney disease', targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
          { goal: 'Repeat creatinine and eGFR in 4-8 weeks', targetDate: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
        ],
        recommendations: [
          {
            category: 'screening',
            intervention: 'Calculate eGFR and evaluate for chronic kidney disease staging',
            evidence: 'Grade A - KDIGO',
            priority: 'high'
          },
          {
            category: 'screening',
            intervention: 'Complete kidney workup: Urinalysis, urine albumin-to-creatinine ratio, kidney ultrasound',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'screening',
            intervention: 'Evaluate causes: Diabetes, hypertension, glomerulonephritis, medications (NSAIDs, ACE inhibitors), obstruction',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'medication',
            intervention: 'Blood pressure control (target < 130/80 mmHg). ACE inhibitor or ARB for proteinuria.',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'medication',
            intervention: 'Review all medications for nephrotoxicity. Adjust doses based on eGFR.',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'nutrition',
            intervention: 'Limit protein intake (0.8g/kg/day), reduce sodium, maintain adequate hydration',
            evidence: 'Grade A',
            priority: 'high'
          }
        ],
        screeningSchedule: {
          creatinine: { frequency: '4-8 weeks', nextDue: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString() },
          egfr: { frequency: '4-8 weeks', nextDue: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString() }
        },
        guidelineSource: 'KDIGO, USPSTF',
        evidenceLevel: 'Grade A',
        clinicalTrialRefs: 'KDIGO 2024: Early detection and management of CKD slows progression to kidney failure',
      },
    });
    preventionPlanCreated = true;
  }

  console.log(`[Lab Monitor] Creatinine ${value} mg/dL for patient ${labResult.patientId}: ${category}`);

  return { flagged, category, preventionPlanCreated };
}

/**
 * Monitor Albumin and flag hypoalbuminemia
 */
export async function monitorAlbumin(labResult: LabResult): Promise<{
  flagged: boolean;
  category: string;
  preventionPlanCreated: boolean;
}> {
  const value = parseFloat(labResult.value);

  let category: string;
  let flagged = false;

  if (value < ALBUMIN_THRESHOLDS.CRITICAL_LOW) {
    category = 'CRITICAL_LOW';
    flagged = true;
  } else if (value < ALBUMIN_THRESHOLDS.LOW) {
    category = 'LOW';
    flagged = true;
  } else {
    category = 'NORMAL';
  }

  let preventionPlanCreated = false;

  if (flagged) {
    await prisma.preventionPlan.create({
      data: {
        patientId: labResult.patientId,
        planType: 'COMPREHENSIVE',
        planName: 'Hypoalbuminemia Management',
        description: `Albumin of ${value} g/dL indicates ${category.replace('_', ' ').toLowerCase()}. Nutritional and medical evaluation required.`,
        status: 'ACTIVE',
        goals: [
          { goal: 'Target albumin ≥ 3.5 g/dL', targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
          { goal: 'Identify and treat underlying cause', targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
          { goal: 'Repeat albumin test in 4-8 weeks', targetDate: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
        ],
        recommendations: [
          {
            category: 'urgent',
            intervention: category === 'CRITICAL_LOW'
              ? 'URGENT: Immediate physician evaluation - Risk of severe complications'
              : 'Physician evaluation within 1 week',
            evidence: 'Grade A',
            priority: category === 'CRITICAL_LOW' ? 'critical' : 'high'
          },
          {
            category: 'screening',
            intervention: 'Comprehensive workup: Liver function tests, kidney function, inflammatory markers (CRP, ESR), malnutrition assessment',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'screening',
            intervention: 'Evaluate causes: Malnutrition, liver disease (cirrhosis), nephrotic syndrome, chronic inflammation, malabsorption',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'nutrition',
            intervention: 'High-protein diet: 1.2-1.5 g/kg/day protein. Lean meats, fish, eggs, dairy, legumes.',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'nutrition',
            intervention: 'Consider nutritional supplementation (protein shakes, amino acid supplements)',
            evidence: 'Grade B',
            priority: 'high'
          },
          {
            category: 'monitoring',
            intervention: 'Monitor for complications: Edema, ascites, increased infection risk, poor wound healing',
            evidence: 'Grade A',
            priority: 'high'
          }
        ],
        screeningSchedule: {
          albumin: { frequency: '4-8 weeks', nextDue: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString() },
          lfts: { frequency: '4-8 weeks', nextDue: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString() }
        },
        guidelineSource: 'ASPEN, USPSTF',
        evidenceLevel: 'Grade A',
        clinicalTrialRefs: 'Low albumin is a strong predictor of mortality, poor wound healing, and increased infection risk',
      },
    });
    preventionPlanCreated = true;
  }

  console.log(`[Lab Monitor] Albumin ${value} g/dL for patient ${labResult.patientId}: ${category}`);

  return { flagged, category, preventionPlanCreated };
}

/**
 * Monitor Platelet count and flag thrombocytopenia/thrombocytosis
 */
export async function monitorPlateletCount(labResult: LabResult): Promise<{
  flagged: boolean;
  category: string;
  preventionPlanCreated: boolean;
}> {
  const value = parseFloat(labResult.value);

  let category: string;
  let flagged = false;

  if (value < PLATELET_THRESHOLDS.CRITICAL_LOW) {
    category = 'CRITICAL_LOW';
    flagged = true;
  } else if (value < PLATELET_THRESHOLDS.LOW) {
    category = 'LOW';
    flagged = true;
  } else if (value > PLATELET_THRESHOLDS.HIGH) {
    category = 'HIGH';
    flagged = true;
  } else {
    category = 'NORMAL';
  }

  let preventionPlanCreated = false;

  if (flagged) {
    await prisma.preventionPlan.create({
      data: {
        patientId: labResult.patientId,
        planType: 'COMPREHENSIVE',
        planName: category.includes('LOW') ? 'Thrombocytopenia Management' : 'Thrombocytosis Evaluation',
        description: `Platelet count of ${value} thousand/μL indicates ${category.replace('_', ' ').toLowerCase()}. Hematology evaluation recommended.`,
        status: 'ACTIVE',
        goals: [
          { goal: 'Target platelet count 150-400 thousand/μL', targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
          { goal: 'Identify and treat underlying cause', targetDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
          { goal: 'Repeat CBC with platelets in 1-2 weeks', targetDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
        ],
        recommendations: [
          {
            category: 'urgent',
            intervention: category === 'CRITICAL_LOW'
              ? 'EMERGENCY: Immediate hospitalization - Risk of spontaneous bleeding'
              : category.includes('LOW')
              ? 'URGENT: Hematology referral within 24-48 hours'
              : 'Hematology evaluation within 1 week',
            evidence: 'Grade A',
            priority: category === 'CRITICAL_LOW' ? 'critical' : 'high'
          },
          {
            category: 'screening',
            intervention: category.includes('LOW')
              ? 'Thrombocytopenia workup: Peripheral smear, PT/PTT, fibrinogen, LDH, bilirubin, bone marrow biopsy if indicated'
              : 'Thrombocytosis workup: JAK2 mutation, iron studies, inflammatory markers, bone marrow biopsy if myeloproliferative disorder suspected',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'screening',
            intervention: category.includes('LOW')
              ? 'Evaluate causes: ITP, medications (heparin, chemotherapy), viral infections, bone marrow disorders, splenomegaly, DIC'
              : 'Evaluate causes: Essential thrombocythemia, reactive (infection, inflammation, iron deficiency, malignancy), post-splenectomy',
            evidence: 'Grade A',
            priority: 'high'
          },
          {
            category: 'lifestyle',
            intervention: category.includes('LOW')
              ? 'Avoid: NSAIDs, aspirin, contact sports, activities with bleeding risk'
              : 'If very high (>1000): Consider aspirin to prevent thrombosis',
            evidence: 'Grade A',
            priority: category.includes('LOW') ? 'critical' : 'high'
          },
          {
            category: 'monitoring',
            intervention: category.includes('LOW')
              ? 'Monitor for bleeding: Easy bruising, petechiae, nosebleeds, gum bleeding'
              : 'Monitor for thrombosis: Chest pain, shortness of breath, leg pain/swelling, headache',
            evidence: 'Grade A',
            priority: 'high'
          }
        ],
        screeningSchedule: {
          cbc: { frequency: '1-2 weeks', nextDue: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString() }
        },
        guidelineSource: 'ASH (American Society of Hematology), USPSTF',
        evidenceLevel: 'Grade A',
        clinicalTrialRefs: category.includes('LOW')
          ? 'Severe thrombocytopenia (<50K) increases bleeding risk; critical level (<20K) requires urgent intervention'
          : 'Very high platelet count (>1000K) increases both thrombosis and bleeding risk',
      },
    });
    preventionPlanCreated = true;
  }

  console.log(`[Lab Monitor] Platelet Count ${value} thousand/μL for patient ${labResult.patientId}: ${category}`);

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

  // Vitamin D monitoring (LOINC: 1989-3, 14635-7)
  if (
    testNameLower.includes('vitamin d') ||
    testNameLower.includes('25-hydroxyvitamin d') ||
    testNameLower.includes('25(oh)d') ||
    testNameLower.includes('25-oh-d') ||
    loincCode === '1989-3' ||
    loincCode === '14635-7'
  ) {
    const result = await monitorVitaminD(labResult);
    return {
      monitored: true,
      testType: 'Vitamin D',
      result,
    };
  }

  // Hemoglobin monitoring (LOINC: 718-7)
  if (
    testNameLower.includes('hemoglobin') ||
    testNameLower.includes('hgb') ||
    testNameLower.includes('hb') ||
    (testNameLower.includes('hb') && !testNameLower.includes('hba1c')) ||
    loincCode === '718-7'
  ) {
    const result = await monitorHemoglobin(labResult);
    return {
      monitored: true,
      testType: 'Hemoglobin',
      result,
    };
  }

  // Ferritin monitoring (LOINC: 2276-4)
  if (
    testNameLower.includes('ferritin') ||
    loincCode === '2276-4'
  ) {
    const result = await monitorFerritin(labResult);
    return {
      monitored: true,
      testType: 'Ferritin',
      result,
    };
  }

  // Vitamin B12 monitoring (LOINC: 2132-9)
  if (
    testNameLower.includes('vitamin b12') ||
    testNameLower.includes('b12') ||
    testNameLower.includes('cobalamin') ||
    loincCode === '2132-9'
  ) {
    const result = await monitorVitaminB12(labResult);
    return {
      monitored: true,
      testType: 'Vitamin B12',
      result,
    };
  }

  // ALT monitoring (LOINC: 1742-6)
  if (
    testNameLower.includes('alt') ||
    testNameLower.includes('alanine aminotransferase') ||
    testNameLower.includes('sgpt') ||
    loincCode === '1742-6'
  ) {
    const result = await monitorALT(labResult);
    return {
      monitored: true,
      testType: 'ALT',
      result,
    };
  }

  // Calcium monitoring (LOINC: 17861-6)
  if (
    testNameLower.includes('calcium') ||
    testNameLower.includes('ca') ||
    loincCode === '17861-6'
  ) {
    const result = await monitorCalcium(labResult);
    return {
      monitored: true,
      testType: 'Calcium',
      result,
    };
  }

  // Uric Acid monitoring (LOINC: 3084-1)
  if (
    testNameLower.includes('uric acid') ||
    testNameLower.includes('urate') ||
    loincCode === '3084-1'
  ) {
    const result = await monitorUricAcid(labResult);
    return {
      monitored: true,
      testType: 'Uric Acid',
      result,
    };
  }

  // Creatinine monitoring (LOINC: 2160-0)
  if (
    testNameLower.includes('creatinine') ||
    testNameLower.includes('cr') ||
    loincCode === '2160-0'
  ) {
    const result = await monitorCreatinine(labResult);
    return {
      monitored: true,
      testType: 'Creatinine',
      result,
    };
  }

  // Albumin monitoring (LOINC: 1751-7)
  if (
    testNameLower.includes('albumin') ||
    loincCode === '1751-7'
  ) {
    const result = await monitorAlbumin(labResult);
    return {
      monitored: true,
      testType: 'Albumin',
      result,
    };
  }

  // Platelet Count monitoring (LOINC: 777-3)
  if (
    testNameLower.includes('platelet') ||
    testNameLower.includes('plt') ||
    loincCode === '777-3'
  ) {
    const result = await monitorPlateletCount(labResult);
    return {
      monitored: true,
      testType: 'Platelet Count',
      result,
    };
  }

  // No monitoring rule matched
  return {
    monitored: false,
    testType: labResult.testName,
  };
}
