import { registerDiscipline } from './registry';
import type { DisciplineConfig } from './types';

export const cardiologyConfig: DisciplineConfig = {
  discipline: 'CARDIOLOGY',
  displayName: 'Cardiology',
  description:
    'Cardiovascular risk assessment, hypertension management, dyslipidemia screening, and ASCVD prevention across BR/CO/BO jurisdictions.',
  jurisdictions: ['BR', 'CO', 'BO'],

  screeningRuleIds: [
    'Cardiovascular Risk Assessment (Framingham-BR)',
    'Cardiovascular Risk Assessment (ASCVD)',
    'Cardiovascular Risk Assessment (WHO Charts)',
    'Hypertension Screening (Blood Pressure)',
    'Diabetes Screening (HbA1c)',
    'Diabetes Screening (Fasting Glucose)',
  ],

  screeningFilters: {
    ageRange: [18, 120],
  },

  riskWeights: {
    hypertension_i10: {
      weight: 0.25,
      sourceAuthority: 'SBC 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    smoking: {
      weight: 0.20,
      sourceAuthority: 'ESC 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    dyslipidemia_e78: {
      weight: 0.20,
      sourceAuthority: 'SBC 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    diabetes_e10_e14: {
      weight: 0.20,
      sourceAuthority: 'AHA/ACC 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    family_history_cvd: {
      weight: 0.10,
      sourceAuthority: 'ESC 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    obesity_e66: {
      weight: 0.05,
      sourceAuthority: 'SBC 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
  },

  interventionPriority: [
    {
      code: 'CARDIO_STATIN',
      description: 'High-intensity statin therapy for ASCVD risk >7.5%',
      urgency: 'ROUTINE',
      sourceAuthority: 'AHA/ACC 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'CARDIO_ANTIHYPERTENSIVE',
      description: 'Antihypertensive initiation for BP >=140/90 mmHg (or >=130/80 with high CVD risk)',
      urgency: 'URGENT',
      sourceAuthority: 'SBC 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'CARDIO_ANTIPLATELET',
      description: 'Low-dose aspirin for secondary prevention in established CVD',
      urgency: 'ROUTINE',
      sourceAuthority: 'ESC 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'CARDIO_LIFESTYLE',
      description: 'Lifestyle modification: diet (DASH/Mediterranean), exercise >=150 min/week, smoking cessation',
      urgency: 'PREVENTIVE',
      sourceAuthority: 'AHA/ACC 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
  ],

  monitoringSchedule: [
    {
      biomarkerCode: 'LIPID_PANEL',
      intervalDays: 180,
      sourceAuthority: 'SBC 2024',
    },
    {
      biomarkerCode: 'BLOOD_PRESSURE',
      intervalDays: 90,
      sourceAuthority: 'SBC 2024',
    },
    {
      biomarkerCode: 'HBA1C',
      intervalDays: 90,
      conditionTrigger: 'E11',
      sourceAuthority: 'AHA/ACC 2024',
    },
    {
      biomarkerCode: 'CREATININE_EGFR',
      intervalDays: 365,
      sourceAuthority: 'ESC 2024',
    },
  ],

  referralTriggers: [
    {
      condition: { '<': [{ var: 'time_since_chest_pain_hours' }, 6] },
      urgency: 'EMERGENT',
      description: 'Acute chest pain within 6 hours — immediate cardiology/emergency referral',
      sourceAuthority: 'SBC 2024',
    },
    {
      condition: {
        or: [
          { '>=': [{ var: 'systolic_bp' }, 180] },
          { '>=': [{ var: 'diastolic_bp' }, 120] },
        ],
      },
      urgency: 'EMERGENT',
      description: 'Hypertensive crisis (BP >=180/120 mmHg) — emergency referral',
      sourceAuthority: 'SBC 2024',
    },
    {
      condition: { '>': [{ var: 'ascvd_risk_10yr_pct' }, 20] },
      urgency: 'URGENT',
      description: 'ASCVD 10-year risk >20% — urgent cardiology evaluation',
      sourceAuthority: 'AHA/ACC 2024',
    },
    {
      condition: { '>=': [{ var: 'ldl_cholesterol' }, 190] },
      urgency: 'URGENT',
      description: 'LDL >=190 mg/dL — evaluate for familial hypercholesterolemia',
      sourceAuthority: 'ESC 2024',
    },
  ],

  jurisdictionOverrides: {
    BR: {
      screeningRuleIds: [
        'Cardiovascular Risk Assessment (Framingham-BR)',
        'Hypertension Screening (Blood Pressure)',
        'Diabetes Screening (HbA1c)',
      ],
    },
    CO: {
      screeningRuleIds: [
        'Cardiovascular Risk Assessment (ASCVD)',
        'Hypertension Screening (Blood Pressure)',
        'Diabetes Screening (Fasting Glucose)',
      ],
    },
    BO: {
      screeningRuleIds: [
        'Cardiovascular Risk Assessment (WHO Charts)',
        'Hypertension Screening (Blood Pressure)',
        'Diabetes Screening (Fasting Glucose)',
      ],
    },
  },
};

registerDiscipline(cardiologyConfig);
