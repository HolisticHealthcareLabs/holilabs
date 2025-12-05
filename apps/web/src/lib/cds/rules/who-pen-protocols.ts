/**
 * WHO PEN (Package of Essential Noncommunicable Disease Interventions) Protocols
 *
 * Evidence-based protocols designed for PRIMARY CARE with LIMITED RESOURCES
 * Optimized for settings with minimal laboratory capacity and basic clinical assessment
 *
 * Target: Low-resource clinics, community health centers, rural facilities
 * Data Requirements: Basic vitals (BP, weight, height), clinical history, simple glucose test
 *
 * Sources:
 * - WHO PEN Protocol 1: Package of Essential Noncommunicable Disease Interventions
 * - HEARTS Technical Package: https://www.who.int/cardiovascular_diseases/hearts/en/
 * - WHO Guidelines on Management of NCDs
 *
 * @compliance WHO, PAHO
 */

import type { CDSRule, CDSAlert, CDSContext } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * WHO PEN Risk Stratification
 * Uses total CVD risk rather than individual risk factors
 */
interface WHOPENRiskProfile {
  age: number;
  gender: 'male' | 'female';
  systolicBP: number;
  smoking: boolean;
  diabetic: boolean;
  totalCholesterol?: number; // Optional - not available in all settings
}

/**
 * Calculate 10-year CVD risk using WHO/ISH risk charts
 * Simplified algorithm when cholesterol not available
 */
function calculateWHOCVDRisk(profile: WHOPENRiskProfile): {
  risk: 'low' | 'moderate' | 'high' | 'very-high';
  percentage: number;
  requiresTreatment: boolean;
} {
  let riskScore = 0;

  // Age scoring
  if (profile.age >= 70) riskScore += 4;
  else if (profile.age >= 60) riskScore += 3;
  else if (profile.age >= 50) riskScore += 2;
  else if (profile.age >= 40) riskScore += 1;

  // Gender (males higher risk)
  if (profile.gender === 'male') riskScore += 1;

  // Blood pressure
  if (profile.systolicBP >= 180) riskScore += 4;
  else if (profile.systolicBP >= 160) riskScore += 3;
  else if (profile.systolicBP >= 140) riskScore += 2;
  else if (profile.systolicBP >= 120) riskScore += 1;

  // Smoking adds significant risk
  if (profile.smoking) riskScore += 2;

  // Diabetes is major risk factor
  if (profile.diabetic) riskScore += 3;

  // Cholesterol if available
  if (profile.totalCholesterol) {
    if (profile.totalCholesterol >= 280) riskScore += 3;
    else if (profile.totalCholesterol >= 240) riskScore += 2;
    else if (profile.totalCholesterol >= 200) riskScore += 1;
  }

  // Calculate percentage and category
  let percentage = 0;
  let risk: 'low' | 'moderate' | 'high' | 'very-high' = 'low';
  let requiresTreatment = false;

  if (riskScore >= 12) {
    risk = 'very-high';
    percentage = 40;
    requiresTreatment = true;
  } else if (riskScore >= 9) {
    risk = 'high';
    percentage = 20;
    requiresTreatment = true;
  } else if (riskScore >= 6) {
    risk = 'moderate';
    percentage = 10;
    requiresTreatment = profile.systolicBP >= 140 || profile.diabetic;
  } else {
    risk = 'low';
    percentage = 5;
    requiresTreatment = false;
  }

  return { risk, percentage, requiresTreatment };
}

/**
 * WHO PEN PROTOCOL 1: Hypertension Management (Minimal Resources)
 *
 * Required Data: BP measurement only
 * Optional: Previous BP readings, current medications
 */
export const WHO_PEN_HYPERTENSION_RULE: CDSRule = {
  id: 'who-pen-hypertension',
  name: 'WHO PEN Hypertension Management Protocol',
  description: 'Blood pressure management for low-resource settings using WHO PEN guidelines',
  category: 'guideline-recommendation',
  severity: 'warning',
  triggerHooks: ['patient-view', 'encounter-start'],
  priority: 8,
  enabled: true,
  evidenceStrength: 'A',
  source: 'WHO PEN Protocol 1, HEARTS Technical Package',
  sourceUrl: 'https://www.who.int/publications/i/item/9789241506236',

  condition: (context) => {
    const vitals = context.context.vitalSigns;
    const demographics = context.context.demographics;

    if (!vitals || !demographics) return false;

    const sbp = vitals.bloodPressureSystolic;
    const dbp = vitals.bloodPressureDiastolic;

    // Trigger if BP elevated or hypertensive
    return (sbp !== undefined && sbp >= 130) || (dbp !== undefined && dbp >= 80);
  },

  evaluate: (context) => {
    const vitals = context.context.vitalSigns!;
    const demographics = context.context.demographics!;
    const conditions = context.context.conditions || [];

    const sbp = vitals.bloodPressureSystolic!;
    const dbp = vitals.bloodPressureDiastolic!;

    // Check if already diagnosed with hypertension
    const hasHypertension = conditions.some(c =>
      c.icd10Code?.startsWith('I10') || c.display.toLowerCase().includes('hypertension')
    );

    // Classify blood pressure (WHO definition)
    let bpCategory = '';
    let severity: 'info' | 'warning' | 'critical' = 'info';
    let recommendations: string[] = [];

    if (sbp >= 180 || dbp >= 110) {
      bpCategory = 'Grade 3 Hypertension (Severe)';
      severity = 'critical';
      recommendations = [
        '🚨 URGENT: Start treatment immediately',
        '💊 Initiate combination therapy: Amlodipine 5mg + Enalapril 5mg daily',
        '📅 Follow-up in 1 week to assess response',
        '⚠️ Assess for target organ damage (heart, kidney, eyes)',
        '🏥 Refer if BP >200/120 or signs of acute complications',
      ];
    } else if (sbp >= 160 || dbp >= 100) {
      bpCategory = 'Grade 2 Hypertension (Moderate)';
      severity = 'warning';
      recommendations = [
        '💊 Start pharmacological treatment today',
        '📋 First-line options: Amlodipine 5mg OR Enalapril 5mg daily',
        '🥗 Lifestyle modifications: Reduce salt, lose weight if overweight',
        '📅 Follow-up in 2 weeks',
        '🎯 Target BP: <140/90 mmHg',
      ];
    } else if (sbp >= 140 || dbp >= 90) {
      bpCategory = 'Grade 1 Hypertension (Mild)';
      severity = 'warning';

      // Calculate CVD risk to guide treatment
      const riskProfile: WHOPENRiskProfile = {
        age: demographics.age,
        gender: demographics.gender === 'female' ? 'female' : 'male',
        systolicBP: sbp,
        smoking: demographics.smoking || false,
        diabetic: conditions.some(c => c.icd10Code?.startsWith('E11')),
      };

      const cvdRisk = calculateWHOCVDRisk(riskProfile);

      if (cvdRisk.requiresTreatment) {
        recommendations = [
          `🎯 10-year CVD risk: ${cvdRisk.risk.toUpperCase()} (~${cvdRisk.percentage}%)`,
          '💊 Consider pharmacological treatment based on total CVD risk',
          '📋 Options: Amlodipine 5mg OR Enalapril 5mg daily',
          '🥗 Emphasize lifestyle modifications',
          '📅 Follow-up in 4 weeks',
        ];
      } else {
        recommendations = [
          `📊 10-year CVD risk: ${cvdRisk.risk.toUpperCase()} (~${cvdRisk.percentage}%)`,
          '🥗 Start with lifestyle modifications for 3 months:',
          '   - Reduce salt intake (<5g/day)',
          '   - Increase physical activity (30 min/day)',
          '   - Maintain healthy weight (BMI 18.5-24.9)',
          '   - Limit alcohol',
          '   - Stop smoking',
          '📅 Re-check BP in 3 months',
          '💊 Consider medication if BP remains ≥140/90 after lifestyle changes',
        ];
      }
    } else if (sbp >= 130 || dbp >= 80) {
      bpCategory = 'Elevated Blood Pressure';
      severity = 'info';
      recommendations = [
        '📊 Blood pressure is elevated but not yet hypertensive',
        '🥗 Lifestyle modifications recommended:',
        '   - Reduce salt intake',
        '   - Regular physical activity',
        '   - Healthy weight maintenance',
        '📅 Monitor BP every 6 months',
      ];
    }

    return {
      id: uuidv4(),
      ruleId: 'who-pen-hypertension',
      summary: `${bpCategory}: ${sbp}/${dbp} mmHg`,
      detail: `**WHO PEN Hypertension Protocol**\n\n**Blood Pressure**: ${sbp}/${dbp} mmHg\n**Classification**: ${bpCategory}\n${hasHypertension ? '**Known Hypertensive**: Yes\n' : ''}\n**Management Recommendations**:\n\n${recommendations.join('\n\n')}`,
      severity,
      category: 'guideline-recommendation',
      indicator: severity,
      source: {
        label: 'WHO PEN Protocol 1',
        url: 'https://www.who.int/publications/i/item/9789241506236',
      },
      suggestions: [
        {
          label: 'Review full WHO PEN hypertension protocol',
          isRecommended: true,
        },
        {
          label: 'Prescribe first-line antihypertensive',
          isRecommended: severity === 'critical' || severity === 'warning',
        },
      ],
      timestamp: new Date().toISOString(),
    };
  },
};

/**
 * WHO PEN PROTOCOL 2: Diabetes Management (Minimal Lab Resources)
 *
 * Required Data: Fasting glucose OR random glucose OR HbA1c
 * Optional: Previous glucose readings, medications
 */
export const WHO_PEN_DIABETES_RULE: CDSRule = {
  id: 'who-pen-diabetes-management',
  name: 'WHO PEN Diabetes Management Protocol',
  description: 'Diabetes screening and management for low-resource settings',
  category: 'guideline-recommendation',
  severity: 'warning',
  triggerHooks: ['patient-view', 'encounter-start'],
  priority: 8,
  enabled: true,
  evidenceStrength: 'A',
  source: 'WHO PEN Protocol 1, WHO Diabetes Guidelines',

  condition: (context) => {
    const labResults = context.context.labResults || [];
    const demographics = context.context.demographics;
    const vitals = context.context.vitalSigns;

    if (!demographics) return false;

    // Trigger if glucose results available OR high-risk population
    const hasGlucose = labResults.some(lab =>
      lab.testName.toLowerCase().includes('glucose') ||
      lab.testName.toLowerCase().includes('hba1c')
    );

    const bmiHigh = vitals?.bmi !== undefined ? vitals.bmi >= 25 : false;
    const isHighRisk = demographics.age >= 35 && (
      demographics.age >= 45 ||
      bmiHigh
    );

    return hasGlucose || isHighRisk;
  },

  evaluate: (context) => {
    const labResults = context.context.labResults || [];
    const demographics = context.context.demographics!;
    const conditions = context.context.conditions || [];
    const vitals = context.context.vitalSigns;

    const isDiabetic = conditions.some(c =>
      c.icd10Code?.startsWith('E11') || c.display.toLowerCase().includes('diabetes')
    );

    // Find glucose and HbA1c values
    const fastingGlucose = labResults.find(lab =>
      lab.testName.toLowerCase().includes('fasting') &&
      lab.testName.toLowerCase().includes('glucose')
    );

    const randomGlucose = labResults.find(lab =>
      lab.testName.toLowerCase().includes('glucose') &&
      !lab.testName.toLowerCase().includes('fasting') &&
      !lab.testName.toLowerCase().includes('hba1c')
    );

    const hba1c = labResults.find(lab =>
      lab.testName.toLowerCase().includes('hba1c') ||
      lab.testName.toLowerCase().includes('a1c')
    );

    let category = '';
    let severity: 'info' | 'warning' | 'critical' = 'info';
    let recommendations: string[] = [];

    // Screening recommendation for high-risk patients
    if (!fastingGlucose && !randomGlucose && !hba1c && !isDiabetic) {
      const bmi = vitals?.bmi;
      const riskFactors: string[] = [];

      if (demographics.age >= 45) riskFactors.push('Age ≥45 years');
      if (bmi && bmi >= 25) riskFactors.push(`Overweight/Obese (BMI ${bmi.toFixed(1)})`);
      if (conditions.some(c => c.icd10Code?.startsWith('I10'))) riskFactors.push('Hypertension');
      if (demographics.gender === 'female') {
        riskFactors.push('Risk of gestational diabetes history');
      }

      if (riskFactors.length > 0) {
        return {
          id: uuidv4(),
          ruleId: 'who-pen-diabetes-management',
          summary: 'Diabetes Screening Recommended',
          detail: `**WHO PEN Diabetes Screening Protocol**\n\n**Risk Factors Present**:\n${riskFactors.map(r => `- ${r}`).join('\n')}\n\n**Recommended Action**:\n\n🔬 Screen for Type 2 Diabetes using ONE of:\n   - Fasting plasma glucose (preferred if available)\n   - Random plasma glucose\n   - HbA1c (if affordable)\n\n**Diagnostic Criteria**:\n- Fasting glucose ≥126 mg/dL (7.0 mmol/L)\n- Random glucose ≥200 mg/dL (11.1 mmol/L) with symptoms\n- HbA1c ≥6.5%`,
          severity: 'info',
          category: 'guideline-recommendation',
          indicator: 'info',
          source: {
            label: 'WHO Diabetes Guidelines',
            url: 'https://www.who.int/publications/i/item/9789241549684',
          },
          timestamp: new Date().toISOString(),
        };
      }
    }

    // Evaluate glucose results
    let glucoseValue = 0;
    let glucoseType = '';

    if (hba1c) {
      const value = typeof hba1c.value === 'number' ? hba1c.value : parseFloat(hba1c.value as string);

      if (value >= 9.0) {
        category = 'Poorly Controlled Diabetes';
        severity = 'critical';
        recommendations = [
          `🚨 HbA1c: ${value}% (Target: <7.0%)`,
          '💊 URGENT: Intensify treatment immediately',
          '📋 Consider insulin therapy or combination oral agents',
          '🥗 Reinforce lifestyle modifications',
          '📅 Follow-up in 2 weeks',
          '⚠️ Screen for complications: feet, eyes, kidneys',
        ];
      } else if (value >= 7.0) {
        category = 'Uncontrolled Diabetes';
        severity = 'warning';
        recommendations = [
          `📊 HbA1c: ${value}% (Target: <7.0%)`,
          '💊 Adjust medication regimen',
          '📋 Consider adding second agent if on monotherapy',
          '🥗 Review diet and exercise adherence',
          '📅 Recheck HbA1c in 3 months',
        ];
      } else if (value >= 6.5) {
        if (isDiabetic) {
          category = 'Controlled Diabetes';
          severity = 'info';
          recommendations = [
            `✅ HbA1c: ${value}% (At target)`,
            '💊 Continue current regimen',
            '🥗 Maintain lifestyle modifications',
            '📅 Recheck HbA1c in 6 months',
          ];
        } else {
          category = 'New Diabetes Diagnosis';
          severity = 'warning';
          recommendations = [
            `📊 HbA1c: ${value}% (Diagnostic for diabetes)`,
            '💊 Consider starting Metformin 500mg daily (if no contraindications)',
            '🥗 Intensive lifestyle counseling',
            '📅 Follow-up in 4 weeks',
            '🔬 Screen for complications at diagnosis',
          ];
        }
      } else if (value >= 5.7) {
        category = 'Prediabetes';
        severity = 'info';
        recommendations = [
          `⚠️ HbA1c: ${value}% (Prediabetes range)`,
          '🥗 Lifestyle intervention critical:',
          '   - Weight loss 5-7% if overweight',
          '   - Physical activity 150 min/week',
          '   - Healthy diet',
          '📅 Annual glucose screening',
          '💊 Consider Metformin if high risk',
        ];
      }
    } else if (fastingGlucose) {
      const value = typeof fastingGlucose.value === 'number' ?
        fastingGlucose.value : parseFloat(fastingGlucose.value as string);

      if (value >= 200) {
        category = 'Severe Hyperglycemia';
        severity = 'critical';
        recommendations = [
          `🚨 Fasting Glucose: ${value} mg/dL`,
          '💊 URGENT: Start treatment immediately',
          '🏥 Consider hospital referral if symptomatic',
          '💉 May require insulin therapy',
        ];
      } else if (value >= 126) {
        category = isDiabetic ? 'Uncontrolled Diabetes' : 'Diabetes Diagnosis';
        severity = 'warning';
        recommendations = [
          `📊 Fasting Glucose: ${value} mg/dL (≥126 = Diabetes)`,
          '💊 Start Metformin 500mg daily with meals',
          '🥗 Lifestyle modifications essential',
          '📅 Follow-up in 4 weeks',
        ];
      } else if (value >= 100) {
        category = 'Prediabetes (Impaired Fasting Glucose)';
        severity = 'info';
        recommendations = [
          `⚠️ Fasting Glucose: ${value} mg/dL (100-125 = Prediabetes)`,
          '🥗 Intensive lifestyle intervention',
          '📅 Recheck annually',
        ];
      }
    }

    if (!category) return null;

    return {
      id: uuidv4(),
      ruleId: 'who-pen-diabetes-management',
      summary: category,
      detail: `**WHO PEN Diabetes Management Protocol**\n\n**Patient**: ${demographics.age}yo ${demographics.gender}\n${isDiabetic ? '**Known Diabetic**: Yes\n' : ''}\n**Management Recommendations**:\n\n${recommendations.join('\n\n')}`,
      severity,
      category: 'guideline-recommendation',
      indicator: severity,
      source: {
        label: 'WHO PEN Diabetes Guidelines',
        url: 'https://www.who.int/publications/i/item/9789241549684',
      },
      timestamp: new Date().toISOString(),
    };
  },
};

/**
 * WHO PEN PROTOCOL 3: Total CVD Risk Assessment
 *
 * Uses WHO/ISH risk prediction charts
 * Works WITHOUT cholesterol measurement in low-resource settings
 */
export const WHO_PEN_CVD_RISK_RULE: CDSRule = {
  id: 'who-pen-cvd-risk-assessment',
  name: 'WHO PEN Total Cardiovascular Risk Assessment',
  description: 'CVD risk stratification using WHO/ISH charts for resource-limited settings',
  category: 'guideline-recommendation',
  severity: 'info',
  triggerHooks: ['patient-view', 'encounter-start'],
  priority: 7,
  enabled: true,
  evidenceStrength: 'A',
  source: 'WHO CVD Risk Assessment Charts',

  condition: (context) => {
    const demographics = context.context.demographics;
    const vitals = context.context.vitalSigns;

    // Applicable to adults 40-75 years with BP measurement
    return (
      !!demographics &&
      !!vitals &&
      demographics.age >= 40 &&
      demographics.age <= 75 &&
      vitals.bloodPressureSystolic !== undefined
    );
  },

  evaluate: (context) => {
    const demographics = context.context.demographics!;
    const vitals = context.context.vitalSigns!;
    const conditions = context.context.conditions || [];
    const labResults = context.context.labResults || [];

    // Build risk profile
    const cholesterolLab = labResults.find(lab =>
      lab.testName.toLowerCase().includes('cholesterol') &&
      !lab.testName.toLowerCase().includes('hdl') &&
      !lab.testName.toLowerCase().includes('ldl')
    );

    const riskProfile: WHOPENRiskProfile = {
      age: demographics.age,
      gender: demographics.gender === 'female' ? 'female' : 'male',
      systolicBP: vitals.bloodPressureSystolic!,
      smoking: demographics.smoking || false,
      diabetic: conditions.some(c => c.icd10Code?.startsWith('E11') || c.icd10Code?.startsWith('E10')),
      totalCholesterol: cholesterolLab ?
        (typeof cholesterolLab.value === 'number' ? cholesterolLab.value : parseFloat(cholesterolLab.value as string)) :
        undefined,
    };

    const cvdRisk = calculateWHOCVDRisk(riskProfile);

    // Build risk factors list
    const riskFactors: string[] = [];
    if (demographics.age >= 60) riskFactors.push('Age ≥60 years');
    if (demographics.gender === 'male') riskFactors.push('Male gender');
    if (riskProfile.systolicBP >= 140) riskFactors.push(`Hypertension (${riskProfile.systolicBP} mmHg)`);
    if (riskProfile.smoking) riskFactors.push('Current smoker');
    if (riskProfile.diabetic) riskFactors.push('Diabetes mellitus');
    if (riskProfile.totalCholesterol && riskProfile.totalCholesterol >= 200) {
      riskFactors.push(`Elevated cholesterol (${riskProfile.totalCholesterol} mg/dL)`);
    }

    let severity: 'info' | 'warning' | 'critical' = 'info';
    let recommendations: string[] = [];

    if (cvdRisk.risk === 'very-high') {
      severity = 'critical';
      recommendations = [
        '🚨 Very high CVD risk requires immediate intervention',
        '💊 Start statin therapy (Atorvastatin 20-40mg daily)',
        '💊 Ensure BP control <140/90 mmHg',
        '💊 Consider aspirin 75-100mg daily (if no contraindications)',
        '🥗 Intensive lifestyle modifications',
        '🚭 Smoking cessation is critical',
        '📅 Follow-up monthly until stable',
      ];
    } else if (cvdRisk.risk === 'high') {
      severity = 'warning';
      recommendations = [
        '⚠️ High CVD risk requires treatment',
        '💊 Consider statin therapy (Atorvastatin 10-20mg daily)',
        '💊 Treat hypertension to target <140/90 mmHg',
        '🥗 Lifestyle modifications essential',
        '🚭 Smoking cessation priority',
        '📅 Follow-up every 3 months',
      ];
    } else if (cvdRisk.risk === 'moderate') {
      severity = 'info';
      recommendations = [
        '📊 Moderate CVD risk',
        '🥗 Focus on lifestyle modifications:',
        '   - Healthy diet (reduce saturated fat, salt)',
        '   - Regular physical activity (150 min/week)',
        '   - Weight management',
        '🚭 Stop smoking if applicable',
        '📅 Reassess risk annually',
        '💊 Consider drug therapy if risk factors persist',
      ];
    } else {
      severity = 'info';
      recommendations = [
        '✅ Low CVD risk',
        '🥗 Maintain healthy lifestyle',
        '📅 Reassess risk every 3-5 years',
      ];
    }

    return {
      id: uuidv4(),
      ruleId: 'who-pen-cvd-risk-assessment',
      summary: `10-Year CVD Risk: ${cvdRisk.risk.toUpperCase()} (~${cvdRisk.percentage}%)`,
      detail: `**WHO/ISH Total Cardiovascular Risk Assessment**\n\n**10-Year Risk of Fatal or Non-Fatal CVD Event**: ~${cvdRisk.percentage}%\n**Risk Category**: ${cvdRisk.risk.toUpperCase()}\n\n**Risk Factors Present** (${riskFactors.length}):\n${riskFactors.map(r => `- ${r}`).join('\n')}\n\n${!riskProfile.totalCholesterol ? '📝 *Risk calculated without cholesterol (not available)*\n\n' : ''}\n**Management Recommendations**:\n\n${recommendations.join('\n\n')}`,
      severity,
      category: 'guideline-recommendation',
      indicator: severity,
      source: {
        label: 'WHO/ISH CVD Risk Charts',
        url: 'https://www.who.int/publications/i/item/9789241547178',
      },
      timestamp: new Date().toISOString(),
    };
  },
};

/**
 * Export all WHO PEN protocol rules
 */
export const WHO_PEN_RULES: CDSRule[] = [
  WHO_PEN_HYPERTENSION_RULE,
  WHO_PEN_DIABETES_RULE,
  WHO_PEN_CVD_RISK_RULE,
];
