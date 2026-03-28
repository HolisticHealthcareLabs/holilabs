import { registerDiscipline } from './registry';
import type { DisciplineConfig } from './types';

export const endocrinologyConfig: DisciplineConfig = {
  discipline: 'ENDOCRINOLOGY',
  displayName: 'Endocrinology',
  description:
    'Type 2 diabetes management, thyroid disorder screening, metabolic syndrome evaluation, and osteoporosis risk assessment.',
  jurisdictions: ['BR', 'CO', 'BO'],

  screeningRuleIds: [
    'Diabetes Screening (HbA1c)',
    'Diabetes Screening (Fasting Glucose)',
  ],

  screeningFilters: {
    ageRange: [18, 120],
  },

  riskWeights: {
    hba1c_elevated: {
      weight: 0.30,
      sourceAuthority: 'SBD 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    fasting_glucose_impaired: {
      weight: 0.20,
      sourceAuthority: 'ADA Standards of Care 2025',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    bmi_ge_30: {
      weight: 0.15,
      sourceAuthority: 'SBD 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    pcos_e28_2: {
      weight: 0.10,
      sourceAuthority: 'ADA Standards of Care 2025',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    thyroid_antibodies_positive: {
      weight: 0.10,
      sourceAuthority: 'SBD 2024',
      evidenceTier: 'TIER_2_CONSENSUS',
    },
    family_history_diabetes: {
      weight: 0.10,
      sourceAuthority: 'ADA Standards of Care 2025',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    gestational_diabetes_history: {
      weight: 0.05,
      sourceAuthority: 'SBD 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
  },

  interventionPriority: [
    {
      code: 'ENDO_METFORMIN',
      description: 'Metformin initiation as first-line therapy for T2DM',
      urgency: 'ROUTINE',
      sourceAuthority: 'ADA Standards of Care 2025',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'ENDO_INSULIN_TITRATION',
      description: 'Insulin initiation or titration when HbA1c remains above target on oral agents',
      urgency: 'URGENT',
      sourceAuthority: 'SBD 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'ENDO_THYROID_REPLACEMENT',
      description: 'Levothyroxine for confirmed hypothyroidism (TSH elevated, low free T4)',
      urgency: 'ROUTINE',
      sourceAuthority: 'SBD 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'ENDO_LIFESTYLE_DM',
      description: 'Structured lifestyle intervention: medical nutrition therapy, 150 min/week moderate exercise',
      urgency: 'PREVENTIVE',
      sourceAuthority: 'ADA Standards of Care 2025',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'ENDO_SGLT2_GLP1',
      description: 'SGLT2 inhibitor or GLP-1 RA for T2DM with CVD or CKD comorbidity',
      urgency: 'ROUTINE',
      sourceAuthority: 'ADA Standards of Care 2025',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
  ],

  monitoringSchedule: [
    {
      biomarkerCode: 'HBA1C',
      intervalDays: 90,
      sourceAuthority: 'SBD 2024',
    },
    {
      biomarkerCode: 'TSH',
      intervalDays: 180,
      sourceAuthority: 'SBD 2024',
    },
    {
      biomarkerCode: 'FASTING_GLUCOSE',
      intervalDays: 90,
      sourceAuthority: 'ADA Standards of Care 2025',
    },
    {
      biomarkerCode: 'LIPID_PANEL',
      intervalDays: 180,
      conditionTrigger: 'E11',
      sourceAuthority: 'ADA Standards of Care 2025',
    },
    {
      biomarkerCode: 'URINE_ALBUMIN_CREATININE',
      intervalDays: 365,
      conditionTrigger: 'E11',
      sourceAuthority: 'ADA Standards of Care 2025',
    },
    {
      biomarkerCode: 'FREE_T4',
      intervalDays: 180,
      conditionTrigger: 'E03',
      sourceAuthority: 'SBD 2024',
    },
  ],

  referralTriggers: [
    {
      condition: { '>=': [{ var: 'hba1c_pct' }, 10] },
      urgency: 'URGENT',
      description: 'HbA1c >=10% — urgent endocrinology referral for insulin initiation assessment',
      sourceAuthority: 'ADA Standards of Care 2025',
    },
    {
      condition: { '>=': [{ var: 'hypoglycemia_episodes_30d' }, 2] },
      urgency: 'URGENT',
      description: '>=2 hypoglycemia episodes in 30 days — urgent medication review',
      sourceAuthority: 'SBD 2024',
    },
    {
      condition: { '==': [{ var: 'thyroid_nodule_detected' }, true] },
      urgency: 'ROUTINE',
      description: 'Thyroid nodule detected — routine endocrinology referral for FNA evaluation',
      sourceAuthority: 'SBD 2024',
    },
    {
      condition: {
        and: [
          { '<': [{ var: 'fasting_glucose' }, 54] },
          { '==': [{ var: 'symptomatic_hypoglycemia' }, true] },
        ],
      },
      urgency: 'EMERGENT',
      description: 'Severe symptomatic hypoglycemia (glucose <54 mg/dL) — emergency management',
      sourceAuthority: 'ADA Standards of Care 2025',
    },
  ],

  jurisdictionOverrides: {
    BR: {
      screeningRuleIds: [
        'Diabetes Screening (HbA1c)',
      ],
    },
    CO: {
      screeningRuleIds: [
        'Diabetes Screening (Fasting Glucose)',
      ],
    },
    BO: {
      screeningRuleIds: [
        'Diabetes Screening (Fasting Glucose)',
      ],
    },
  },
};

registerDiscipline(endocrinologyConfig);
