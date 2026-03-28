import { registerDiscipline } from './registry';
import type { DisciplineConfig } from './types';

export const pediatricsConfig: DisciplineConfig = {
  discipline: 'PEDIATRICS',
  displayName: 'Pediatrics',
  description:
    'Age-gated 0-18 preventive care: vaccination schedules (PNI/PAI), growth monitoring, developmental milestones, and malnutrition screening.',
  jurisdictions: ['BR', 'CO', 'BO'],

  screeningRuleIds: [
    'Hepatitis B Vaccine',
    'BCG Vaccine',
    'Yellow Fever Vaccine',
  ],

  screeningFilters: {
    ageRange: [0, 18],
  },

  riskWeights: {
    low_birth_weight: {
      weight: 0.25,
      sourceAuthority: 'MS Portaria 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    malnutrition_e40_e46: {
      weight: 0.25,
      sourceAuthority: 'WHO',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    vaccination_delay: {
      weight: 0.20,
      sourceAuthority: 'MS/PNI',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    prematurity: {
      weight: 0.15,
      sourceAuthority: 'MS Portaria 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    maternal_complications: {
      weight: 0.10,
      sourceAuthority: 'MS Portaria 2024',
      evidenceTier: 'TIER_2_CONSENSUS',
    },
    socioeconomic_vulnerability: {
      weight: 0.05,
      sourceAuthority: 'WHO',
      evidenceTier: 'TIER_2_CONSENSUS',
    },
  },

  interventionPriority: [
    {
      code: 'PED_CATCH_UP_VACCINATION',
      description: 'Catch-up vaccination for any missed doses per PNI/PAI schedule',
      urgency: 'URGENT',
      sourceAuthority: 'MS/PNI',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'PED_NUTRITION_INTERVENTION',
      description: 'Nutritional supplementation and dietary counseling for weight-for-age <-2 SD',
      urgency: 'URGENT',
      sourceAuthority: 'WHO',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'PED_DEVELOPMENTAL_EVAL',
      description: 'Formal developmental evaluation using validated instrument when milestone delay suspected',
      urgency: 'ROUTINE',
      sourceAuthority: 'CDC Milestones',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'PED_GROWTH_MONITORING',
      description: 'Serial growth plotting (weight, height, head circumference) at every well-child visit',
      urgency: 'PREVENTIVE',
      sourceAuthority: 'WHO',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'PED_IRON_SUPPLEMENTATION',
      description: 'Prophylactic iron supplementation for infants 6-24 months per MS protocol',
      urgency: 'PREVENTIVE',
      sourceAuthority: 'MS Portaria 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
  ],

  monitoringSchedule: [
    {
      biomarkerCode: 'GROWTH_PERCENTILE_INFANT',
      intervalDays: 30,
      conditionTrigger: 'Z00.1',
      sourceAuthority: 'WHO',
    },
    {
      biomarkerCode: 'GROWTH_PERCENTILE_CHILD',
      intervalDays: 90,
      sourceAuthority: 'WHO',
    },
    {
      biomarkerCode: 'VACCINATION_STATUS',
      intervalDays: 30,
      sourceAuthority: 'MS/PNI',
    },
    {
      biomarkerCode: 'DEVELOPMENTAL_MILESTONE',
      intervalDays: 90,
      sourceAuthority: 'CDC Milestones',
    },
    {
      biomarkerCode: 'HEMOGLOBIN',
      intervalDays: 180,
      sourceAuthority: 'MS Portaria 2024',
    },
    {
      biomarkerCode: 'VISION_HEARING_SCREEN',
      intervalDays: 365,
      sourceAuthority: 'WHO',
    },
  ],

  referralTriggers: [
    {
      condition: { '==': [{ var: 'developmental_delay_detected' }, true] },
      urgency: 'URGENT',
      description: 'Developmental delay detected on screening — urgent pediatric neurology/developmental referral',
      sourceAuthority: 'CDC Milestones',
    },
    {
      condition: { '<': [{ var: 'weight_for_age_z_score' }, -3] },
      urgency: 'URGENT',
      description: 'Severe acute malnutrition (weight-for-age <-3 SD) — urgent nutritional/hospital referral',
      sourceAuthority: 'WHO',
    },
    {
      condition: { '<': [{ var: 'weight_for_age_z_score' }, -2] },
      urgency: 'ROUTINE',
      description: 'Moderate malnutrition (weight-for-age <-2 SD) — nutritional counseling and follow-up',
      sourceAuthority: 'WHO',
    },
    {
      condition: { '>=': [{ var: 'vaccination_doses_overdue' }, 3] },
      urgency: 'URGENT',
      description: '>=3 vaccination doses overdue — urgent catch-up schedule',
      sourceAuthority: 'MS/PNI',
    },
    {
      condition: {
        and: [
          { '==': [{ var: 'newborn' }, true] },
          { '==': [{ var: 'neonatal_screening_complete' }, false] },
        ],
      },
      urgency: 'EMERGENT',
      description: 'Newborn without neonatal screening (teste do pezinho) — emergent referral',
      sourceAuthority: 'MS Portaria 2024',
    },
  ],

  jurisdictionOverrides: {
    BR: {
      screeningRuleIds: [
        'Hepatitis B Vaccine',
        'Yellow Fever Vaccine',
      ],
    },
    CO: {
      screeningRuleIds: [
        'Hepatitis B Vaccine',
      ],
    },
    BO: {
      screeningRuleIds: [
        'BCG Vaccine',
        'Yellow Fever Vaccine',
      ],
    },
  },
};

registerDiscipline(pediatricsConfig);
