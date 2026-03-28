import { registerDiscipline } from './registry';
import type { DisciplineConfig } from './types';

export const obGynConfig: DisciplineConfig = {
  discipline: 'OB_GYN',
  displayName: 'Obstetrics & Gynecology',
  description:
    'Pregnancy-aware preventive care: prenatal monitoring, gestational diabetes screening, cervical cancer screening (HPV-DNA in BR, cytology in CO, VIA in BO), and preeclampsia surveillance.',
  jurisdictions: ['BR', 'CO', 'BO'],

  screeningRuleIds: [
    'Cervical Cancer Screening (HPV-DNA)',
    'Cervical Cancer Screening (Cytology)',
    'Cervical Cancer Screening (HPV-DNA Alternative)',
    'Cervical Cancer Screening (VIA or Pap)',
    'Breast Cancer Screening (Mammography)',
    'Breast Cancer Screening (CBE)',
  ],

  screeningFilters: {
    biologicalSex: ['FEMALE'],
    ageRange: [12, 55],
    pregnancyRelevant: true,
  },

  riskWeights: {
    advanced_maternal_age_ge35: {
      weight: 0.20,
      sourceAuthority: 'FEBRASGO',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    gestational_diabetes_history: {
      weight: 0.20,
      sourceAuthority: 'FEBRASGO',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    preeclampsia_history: {
      weight: 0.20,
      sourceAuthority: 'FEBRASGO',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    obesity_pre_pregnancy: {
      weight: 0.10,
      sourceAuthority: 'WHO ANC 2025',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    multiple_gestation: {
      weight: 0.10,
      sourceAuthority: 'FEBRASGO',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    chronic_hypertension: {
      weight: 0.10,
      sourceAuthority: 'FEBRASGO',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    hpv_high_risk_positive: {
      weight: 0.05,
      sourceAuthority: 'INCA PCDT 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    family_history_breast_cancer: {
      weight: 0.05,
      sourceAuthority: 'INCA PCDT 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
  },

  interventionPriority: [
    {
      code: 'OBGYN_PREECLAMPSIA_ASPIRIN',
      description: 'Low-dose aspirin (100-150 mg/day) starting 12-16 weeks for preeclampsia prevention in high-risk pregnancies',
      urgency: 'URGENT',
      sourceAuthority: 'FEBRASGO',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'OBGYN_GDM_SCREENING',
      description: 'Oral glucose tolerance test (75g OGTT) at 24-28 weeks gestation',
      urgency: 'ROUTINE',
      sourceAuthority: 'FEBRASGO',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'OBGYN_GDM_MANAGEMENT',
      description: 'Medical nutrition therapy and glucose monitoring for confirmed gestational diabetes',
      urgency: 'URGENT',
      sourceAuthority: 'FEBRASGO',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'OBGYN_PRENATAL_FOLIC_ACID',
      description: 'Folic acid supplementation (400-800 mcg/day) starting preconception through first trimester',
      urgency: 'PREVENTIVE',
      sourceAuthority: 'WHO ANC 2025',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'OBGYN_CERVICAL_TREATMENT',
      description: 'LEEP or cryotherapy for confirmed CIN2+ cervical lesions',
      urgency: 'URGENT',
      sourceAuthority: 'INCA PCDT 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'OBGYN_CONTRACEPTIVE_COUNSELING',
      description: 'Contraceptive counseling and method selection per WHO eligibility criteria',
      urgency: 'PREVENTIVE',
      sourceAuthority: 'WHO',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
  ],

  monitoringSchedule: [
    {
      biomarkerCode: 'PRENATAL_VISIT_T1_T2',
      intervalDays: 28,
      conditionTrigger: 'Z34',
      sourceAuthority: 'FEBRASGO',
    },
    {
      biomarkerCode: 'PRENATAL_VISIT_T3',
      intervalDays: 14,
      conditionTrigger: 'Z34',
      sourceAuthority: 'FEBRASGO',
    },
    {
      biomarkerCode: 'BLOOD_PRESSURE_PRENATAL',
      intervalDays: 14,
      conditionTrigger: 'Z34',
      sourceAuthority: 'FEBRASGO',
    },
    {
      biomarkerCode: 'GLUCOSE_TOLERANCE_TEST',
      intervalDays: 0,
      conditionTrigger: 'Z34',
      sourceAuthority: 'FEBRASGO',
    },
    {
      biomarkerCode: 'CERVICAL_SCREEN',
      intervalDays: 1095,
      sourceAuthority: 'INCA PCDT 2024',
    },
    {
      biomarkerCode: 'URINE_PROTEIN',
      intervalDays: 28,
      conditionTrigger: 'O14',
      sourceAuthority: 'FEBRASGO',
    },
  ],

  referralTriggers: [
    {
      condition: {
        or: [
          { '>=': [{ var: 'systolic_bp' }, 160] },
          { '>=': [{ var: 'diastolic_bp' }, 110] },
          { and: [
            { '>=': [{ var: 'systolic_bp' }, 140] },
            { '>=': [{ var: 'urine_protein_mg_dl' }, 300] },
          ]},
        ],
      },
      urgency: 'EMERGENT',
      description: 'Preeclampsia signs (BP >=160/110 or BP >=140/90 with proteinuria) — emergent obstetric referral',
      sourceAuthority: 'FEBRASGO',
    },
    {
      condition: {
        and: [
          { '>=': [{ var: 'fasting_glucose' }, 92] },
          { '==': [{ var: 'pregnant' }, true] },
        ],
      },
      urgency: 'URGENT',
      description: 'Gestational diabetes confirmed — urgent maternal-fetal medicine referral',
      sourceAuthority: 'FEBRASGO',
    },
    {
      condition: { '==': [{ var: 'cervical_cin2_plus' }, true] },
      urgency: 'URGENT',
      description: 'CIN2+ cervical lesion — urgent colposcopy/treatment referral',
      sourceAuthority: 'INCA PCDT 2024',
    },
    {
      condition: {
        and: [
          { '>=': [{ var: 'gestational_weeks' }, 41] },
          { '==': [{ var: 'spontaneous_labor' }, false] },
        ],
      },
      urgency: 'URGENT',
      description: 'Post-dates pregnancy >=41 weeks without labor — urgent obstetric evaluation for induction',
      sourceAuthority: 'FEBRASGO',
    },
    {
      condition: { '==': [{ var: 'ectopic_suspected' }, true] },
      urgency: 'EMERGENT',
      description: 'Suspected ectopic pregnancy — emergent surgical/gynecologic referral',
      sourceAuthority: 'FEBRASGO',
    },
  ],

  jurisdictionOverrides: {
    BR: {
      screeningRuleIds: [
        'Cervical Cancer Screening (HPV-DNA)',
        'Breast Cancer Screening (Mammography)',
      ],
    },
    CO: {
      screeningRuleIds: [
        'Cervical Cancer Screening (Cytology)',
        'Cervical Cancer Screening (HPV-DNA Alternative)',
        'Breast Cancer Screening (Mammography)',
      ],
    },
    BO: {
      screeningRuleIds: [
        'Cervical Cancer Screening (VIA or Pap)',
        'Breast Cancer Screening (CBE)',
      ],
    },
  },
};

registerDiscipline(obGynConfig);
