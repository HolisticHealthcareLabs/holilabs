import { registerDiscipline } from './registry';
import type { DisciplineConfig } from './types';

export const geriatricsConfig: DisciplineConfig = {
  discipline: 'GERIATRICS',
  displayName: 'Geriatrics',
  description:
    'Age-gated 65+ preventive care: fall prevention, cognitive screening (MMSE/MoCA), polypharmacy review (Beers criteria), and frailty assessment.',
  jurisdictions: ['BR', 'CO', 'BO'],

  screeningRuleIds: [
    'Influenza Vaccine',
    'Pneumococcal Vaccine',
    'COVID-19 Booster',
    'COVID-19 Vaccine',
  ],

  screeningFilters: {
    ageRange: [65, 120],
  },

  riskWeights: {
    fall_history: {
      weight: 0.25,
      sourceAuthority: 'AGS Beers 2023',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    cognitive_decline: {
      weight: 0.20,
      sourceAuthority: 'WHO ICOPE 2023',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    polypharmacy_ge5: {
      weight: 0.20,
      sourceAuthority: 'AGS Beers 2023',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    frailty_index_elevated: {
      weight: 0.15,
      sourceAuthority: 'WHO ICOPE 2023',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    social_isolation_elderly: {
      weight: 0.10,
      sourceAuthority: 'WHO ICOPE 2023',
      evidenceTier: 'TIER_2_CONSENSUS',
    },
    sensory_impairment: {
      weight: 0.05,
      sourceAuthority: 'WHO ICOPE 2023',
      evidenceTier: 'TIER_2_CONSENSUS',
    },
    urinary_incontinence: {
      weight: 0.05,
      sourceAuthority: 'AGS Beers 2023',
      evidenceTier: 'TIER_2_CONSENSUS',
    },
  },

  interventionPriority: [
    {
      code: 'GER_FALL_PREVENTION',
      description: 'Multifactorial fall prevention: exercise program, home safety assessment, medication review',
      urgency: 'URGENT',
      sourceAuthority: 'AGS Beers 2023',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'GER_MEDICATION_REVIEW',
      description: 'Comprehensive medication review using Beers criteria — deprescribe inappropriate medications',
      urgency: 'ROUTINE',
      sourceAuthority: 'AGS Beers 2023',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'GER_COGNITIVE_ASSESSMENT',
      description: 'Formal cognitive assessment (MMSE or MoCA) when decline suspected',
      urgency: 'ROUTINE',
      sourceAuthority: 'WHO ICOPE 2023',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'GER_BONE_DENSITY',
      description: 'DEXA scan for osteoporosis screening in women >=65 and men >=70',
      urgency: 'ROUTINE',
      sourceAuthority: 'USPSTF',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'GER_NUTRITION_SCREEN',
      description: 'Mini Nutritional Assessment for malnutrition risk in elderly',
      urgency: 'PREVENTIVE',
      sourceAuthority: 'WHO ICOPE 2023',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
  ],

  monitoringSchedule: [
    {
      biomarkerCode: 'MMSE_MOCA',
      intervalDays: 180,
      sourceAuthority: 'WHO ICOPE 2023',
    },
    {
      biomarkerCode: 'MEDICATION_REVIEW',
      intervalDays: 90,
      sourceAuthority: 'AGS Beers 2023',
    },
    {
      biomarkerCode: 'FALL_RISK_ASSESSMENT',
      intervalDays: 180,
      sourceAuthority: 'AGS Beers 2023',
    },
    {
      biomarkerCode: 'BONE_DENSITY_DEXA',
      intervalDays: 730,
      sourceAuthority: 'USPSTF',
    },
    {
      biomarkerCode: 'FUNCTIONAL_STATUS_ADL',
      intervalDays: 180,
      sourceAuthority: 'WHO ICOPE 2023',
    },
    {
      biomarkerCode: 'NUTRITIONAL_STATUS_MNA',
      intervalDays: 180,
      sourceAuthority: 'WHO ICOPE 2023',
    },
  ],

  referralTriggers: [
    {
      condition: { '>=': [{ var: 'falls_in_6_months' }, 2] },
      urgency: 'URGENT',
      description: '>=2 falls in 6 months — urgent geriatrics/fall clinic referral',
      sourceAuthority: 'AGS Beers 2023',
    },
    {
      condition: { '<': [{ var: 'mmse_score' }, 24] },
      urgency: 'ROUTINE',
      description: 'MMSE <24 — routine neurology/geriatrics referral for cognitive evaluation',
      sourceAuthority: 'WHO ICOPE 2023',
    },
    {
      condition: { '<': [{ var: 'moca_score' }, 26] },
      urgency: 'ROUTINE',
      description: 'MoCA <26 — routine referral for further cognitive assessment',
      sourceAuthority: 'WHO ICOPE 2023',
    },
    {
      condition: { '>=': [{ var: 'beers_criteria_medications' }, 3] },
      urgency: 'URGENT',
      description: '>=3 Beers criteria medications — urgent pharmacist/geriatrician deprescribing review',
      sourceAuthority: 'AGS Beers 2023',
    },
    {
      condition: {
        and: [
          { '>=': [{ var: 'age' }, 80] },
          { '==': [{ var: 'acute_functional_decline' }, true] },
        ],
      },
      urgency: 'EMERGENT',
      description: 'Acute functional decline in patient >=80 — emergent geriatric assessment',
      sourceAuthority: 'WHO ICOPE 2023',
    },
  ],

  jurisdictionOverrides: {
    BR: {
      screeningRuleIds: [
        'Influenza Vaccine',
        'Pneumococcal Vaccine',
        'COVID-19 Booster',
      ],
    },
    CO: {
      screeningRuleIds: [
        'Influenza Vaccine',
        'COVID-19 Vaccine',
      ],
    },
    BO: {
      screeningRuleIds: [
        'Influenza Vaccine',
        'Pneumococcal Vaccine',
      ],
    },
  },
};

registerDiscipline(geriatricsConfig);
