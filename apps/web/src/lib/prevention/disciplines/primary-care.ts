import { registerDiscipline } from './registry';
import type { DisciplineConfig } from './types';

export const primaryCareConfig: DisciplineConfig = {
  discipline: 'PRIMARY_CARE',
  displayName: 'Primary Care',
  description:
    'Aggregator discipline referencing all screening rules. Acts as the referral originator for specialist disciplines, managing broad preventive care and chronic disease coordination.',
  jurisdictions: ['BR', 'CO', 'BO'],

  screeningRuleIds: [
    'Cardiovascular Risk Assessment (Framingham-BR)',
    'Cardiovascular Risk Assessment (ASCVD)',
    'Cardiovascular Risk Assessment (WHO Charts)',
    'Hypertension Screening (Blood Pressure)',
    'Diabetes Screening (HbA1c)',
    'Diabetes Screening (Fasting Glucose)',
    'Breast Cancer Screening (Mammography)',
    'Breast Cancer Screening (CBE)',
    'Cervical Cancer Screening (HPV-DNA)',
    'Cervical Cancer Screening (Cytology)',
    'Cervical Cancer Screening (HPV-DNA Alternative)',
    'Cervical Cancer Screening (VIA or Pap)',
    'Colorectal Cancer Screening (FOBT)',
    'Influenza Vaccine',
    'COVID-19 Booster',
    'COVID-19 Vaccine',
    'Pneumococcal Vaccine',
    'Hepatitis B Vaccine',
    'Yellow Fever Vaccine',
    'Tetanus Vaccine (dT)',
    'Tetanus Vaccine (Td)',
    'BCG Vaccine',
  ],

  screeningFilters: {
    ageRange: [0, 120],
  },

  riskWeights: {
    hypertension_i10: {
      weight: 0.12,
      sourceAuthority: 'SBC 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    diabetes_e11: {
      weight: 0.12,
      sourceAuthority: 'SBD 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    smoking: {
      weight: 0.10,
      sourceAuthority: 'WHO',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    obesity_e66: {
      weight: 0.10,
      sourceAuthority: 'WHO',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    dyslipidemia_e78: {
      weight: 0.08,
      sourceAuthority: 'SBC 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    sedentary_lifestyle: {
      weight: 0.08,
      sourceAuthority: 'WHO',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    alcohol_excessive: {
      weight: 0.08,
      sourceAuthority: 'WHO',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    family_history_cvd: {
      weight: 0.06,
      sourceAuthority: 'SBC 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    family_history_cancer: {
      weight: 0.06,
      sourceAuthority: 'INCA PCDT 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    family_history_diabetes: {
      weight: 0.06,
      sourceAuthority: 'SBD 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    vaccination_incomplete: {
      weight: 0.06,
      sourceAuthority: 'MS/PNI',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    depression_f32: {
      weight: 0.04,
      sourceAuthority: 'WHO mhGAP 2023',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    ckd_n18: {
      weight: 0.04,
      sourceAuthority: 'KDIGO 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
  },

  interventionPriority: [
    {
      code: 'PC_LIFESTYLE_COUNSELING',
      description: 'Structured lifestyle counseling: diet, physical activity >=150 min/week, weight management',
      urgency: 'PREVENTIVE',
      sourceAuthority: 'WHO',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'PC_VACCINATION_UPDATE',
      description: 'Catch-up vaccination per national immunization schedule (PNI/PAI)',
      urgency: 'ROUTINE',
      sourceAuthority: 'MS/PNI',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'PC_SCREENING_ADHERENCE',
      description: 'Ensure adherence to age- and sex-appropriate cancer and chronic disease screening',
      urgency: 'ROUTINE',
      sourceAuthority: 'USPSTF',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'PC_SMOKING_CESSATION',
      description: 'Brief smoking cessation intervention (5 As) at every encounter',
      urgency: 'ROUTINE',
      sourceAuthority: 'WHO',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'PC_METABOLIC_SYNDROME',
      description: 'Metabolic syndrome identification and intervention (waist circumference, lipids, glucose, BP)',
      urgency: 'ROUTINE',
      sourceAuthority: 'SBC 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'PC_MENTAL_HEALTH_SCREEN',
      description: 'PHQ-2 screening at annual wellness visit; escalate to PHQ-9 if positive',
      urgency: 'PREVENTIVE',
      sourceAuthority: 'USPSTF',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
  ],

  monitoringSchedule: [
    {
      biomarkerCode: 'BLOOD_PRESSURE',
      intervalDays: 365,
      sourceAuthority: 'SBC 2024',
    },
    {
      biomarkerCode: 'FASTING_GLUCOSE_OR_HBA1C',
      intervalDays: 1095,
      sourceAuthority: 'SBD 2024',
    },
    {
      biomarkerCode: 'LIPID_PANEL',
      intervalDays: 1825,
      sourceAuthority: 'SBC 2024',
    },
    {
      biomarkerCode: 'BMI',
      intervalDays: 365,
      sourceAuthority: 'WHO',
    },
    {
      biomarkerCode: 'VACCINATION_STATUS',
      intervalDays: 365,
      sourceAuthority: 'MS/PNI',
    },
    {
      biomarkerCode: 'CREATININE_EGFR',
      intervalDays: 1825,
      sourceAuthority: 'KDIGO 2024',
    },
  ],

  referralTriggers: [
    {
      condition: {
        or: [
          { '>=': [{ var: 'systolic_bp' }, 180] },
          { '>=': [{ var: 'diastolic_bp' }, 120] },
        ],
      },
      urgency: 'EMERGENT',
      description: 'Hypertensive crisis — emergent referral to cardiology/emergency',
      sourceAuthority: 'SBC 2024',
    },
    {
      condition: { '>=': [{ var: 'hba1c_pct' }, 10] },
      urgency: 'URGENT',
      description: 'HbA1c >=10% — refer to endocrinology',
      sourceAuthority: 'SBD 2024',
    },
    {
      condition: { '==': [{ var: 'abnormal_screening_result' }, true] },
      urgency: 'URGENT',
      description: 'Abnormal cancer screening — refer to oncology',
      sourceAuthority: 'INCA PCDT 2024',
    },
    {
      condition: { '<': [{ var: 'egfr' }, 30] },
      urgency: 'URGENT',
      description: 'eGFR <30 — refer to nephrology',
      sourceAuthority: 'KDIGO 2024',
    },
    {
      condition: { '<': [{ var: 'fev1_pct_predicted' }, 50] },
      urgency: 'URGENT',
      description: 'FEV1 <50% predicted — refer to pulmonology',
      sourceAuthority: 'GOLD 2024',
    },
    {
      condition: { '==': [{ var: 'suicidal_ideation_active' }, true] },
      urgency: 'EMERGENT',
      description: 'Active suicidal ideation — emergent psychiatric referral',
      sourceAuthority: 'WHO mhGAP 2023',
    },
    {
      condition: { '==': [{ var: 'developmental_delay_detected' }, true] },
      urgency: 'URGENT',
      description: 'Developmental delay in child — refer to pediatric neurology',
      sourceAuthority: 'CDC Milestones',
    },
    {
      condition: { '>=': [{ var: 'falls_in_6_months' }, 2] },
      urgency: 'URGENT',
      description: '>=2 falls in 6 months (elderly) — refer to geriatrics/fall clinic',
      sourceAuthority: 'AGS Beers 2023',
    },
    {
      condition: {
        and: [
          { '==': [{ var: 'pregnant' }, true] },
          { '>=': [{ var: 'systolic_bp' }, 140] },
        ],
      },
      urgency: 'EMERGENT',
      description: 'Hypertension in pregnancy — emergent OB/GYN referral for preeclampsia evaluation',
      sourceAuthority: 'FEBRASGO',
    },
  ],
};

registerDiscipline(primaryCareConfig);
