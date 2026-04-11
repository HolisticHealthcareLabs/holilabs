import { registerDiscipline } from './registry';
import type { DisciplineConfig } from './types';

export const oncologyConfig: DisciplineConfig = {
  discipline: 'ONCOLOGY',
  displayName: 'Oncology',
  description:
    'Cancer screening coordination for breast, cervical, colorectal, and lung malignancies. Jurisdiction-aware modality selection (HPV-DNA vs cytology, mammography vs CBE).',
  jurisdictions: ['BR', 'CO', 'BO'],

  screeningRuleIds: [
    'Breast Cancer Screening (Mammography)',
    'Breast Cancer Screening (CBE)',
    'Cervical Cancer Screening (HPV-DNA)',
    'Cervical Cancer Screening (Cytology)',
    'Cervical Cancer Screening (HPV-DNA Alternative)',
    'Cervical Cancer Screening (VIA or Pap)',
    'Colorectal Cancer Screening (FOBT)',
  ],

  screeningFilters: {
    ageRange: [25, 80],
  },

  riskWeights: {
    family_history_cancer: {
      weight: 0.25,
      sourceAuthority: 'INCA PCDT 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    smoking_pack_years: {
      weight: 0.20,
      sourceAuthority: 'INCA PCDT 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    hpv_positive: {
      weight: 0.20,
      sourceAuthority: 'INCA PCDT 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    brca_mutation: {
      weight: 0.15,
      sourceAuthority: 'INCA PCDT 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    personal_history_polyps: {
      weight: 0.10,
      sourceAuthority: 'INCA PCDT 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    alcohol_heavy_use: {
      weight: 0.05,
      sourceAuthority: 'WHO',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    obesity_e66: {
      weight: 0.05,
      sourceAuthority: 'WHO',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
  },

  interventionPriority: [
    {
      code: 'ONCO_EXPEDITED_BIOPSY',
      description: 'Expedited biopsy referral for abnormal screening results (BI-RADS 4/5, positive FOBT)',
      urgency: 'URGENT',
      sourceAuthority: 'INCA PCDT 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'ONCO_COLPOSCOPY',
      description: 'Colposcopy for abnormal cervical screening (HPV+ with high-risk genotypes or abnormal cytology)',
      urgency: 'URGENT',
      sourceAuthority: 'INCA PCDT 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'ONCO_GENETIC_COUNSELING',
      description: 'Genetic counseling referral for strong family cancer history or suspected hereditary syndromes',
      urgency: 'ROUTINE',
      sourceAuthority: 'INCA PCDT 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'ONCO_SMOKING_CESSATION',
      description: 'Smoking cessation program for patients with >=20 pack-year history',
      urgency: 'PREVENTIVE',
      sourceAuthority: 'INCA PCDT 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'ONCO_HPV_VACCINATION',
      description: 'HPV vaccination for eligible patients (9-26 years) per national immunization schedule',
      urgency: 'PREVENTIVE',
      sourceAuthority: 'WHO',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
  ],

  monitoringSchedule: [
    {
      biomarkerCode: 'MAMMOGRAM',
      intervalDays: 730,
      sourceAuthority: 'INCA PCDT 2024',
    },
    {
      biomarkerCode: 'CERVICAL_SCREEN',
      intervalDays: 1095,
      sourceAuthority: 'INCA PCDT 2024',
    },
    {
      biomarkerCode: 'FOBT',
      intervalDays: 365,
      sourceAuthority: 'INCA PCDT 2024',
    },
    {
      biomarkerCode: 'CEA',
      intervalDays: 90,
      conditionTrigger: 'C18',
      sourceAuthority: 'INCA PCDT 2024',
    },
    {
      biomarkerCode: 'PSA',
      intervalDays: 365,
      conditionTrigger: 'Z80.42',
      sourceAuthority: 'INCA PCDT 2024',
    },
  ],

  referralTriggers: [
    {
      condition: { '==': [{ var: 'abnormal_screening_result' }, true] },
      urgency: 'URGENT',
      description: 'Abnormal cancer screening result — urgent oncology/specialist referral for diagnostic workup',
      sourceAuthority: 'INCA PCDT 2024',
    },
    {
      condition: { '==': [{ var: 'suspected_malignancy' }, true] },
      urgency: 'EMERGENT',
      description: 'Suspected malignancy on imaging or pathology — emergent oncology referral',
      sourceAuthority: 'INCA PCDT 2024',
    },
    {
      condition: {
        and: [
          { '==': [{ var: 'brca_positive' }, true] },
          { '==': [{ var: 'genetic_counseling_completed' }, false] },
        ],
      },
      urgency: 'URGENT',
      description: 'BRCA mutation confirmed without genetic counseling — urgent referral',
      sourceAuthority: 'INCA PCDT 2024',
    },
    {
      condition: { '>=': [{ var: 'birads_score' }, 4] },
      urgency: 'URGENT',
      description: 'BI-RADS 4 or 5 on mammography — urgent biopsy referral',
      sourceAuthority: 'INCA PCDT 2024',
    },
  ],

  jurisdictionOverrides: {
    BR: {
      screeningRuleIds: [
        'Breast Cancer Screening (Mammography)',
        'Cervical Cancer Screening (HPV-DNA)',
        'Colorectal Cancer Screening (FOBT)',
      ],
    },
    CO: {
      screeningRuleIds: [
        'Breast Cancer Screening (Mammography)',
        'Cervical Cancer Screening (Cytology)',
        'Cervical Cancer Screening (HPV-DNA Alternative)',
        'Colorectal Cancer Screening (FOBT)',
      ],
    },
    BO: {
      screeningRuleIds: [
        'Breast Cancer Screening (CBE)',
        'Cervical Cancer Screening (VIA or Pap)',
      ],
    },
  },
};

registerDiscipline(oncologyConfig);
