import { registerDiscipline } from './registry';
import type { DisciplineConfig } from './types';

export const mentalHealthConfig: DisciplineConfig = {
  discipline: 'MENTAL_HEALTH',
  displayName: 'Mental Health',
  description:
    'Depression, anxiety, and substance use disorder screening using validated instruments (PHQ-9, GAD-7, AUDIT). Suicidal ideation escalation protocol.',
  jurisdictions: ['BR', 'CO', 'BO'],

  screeningRuleIds: [],

  screeningFilters: {
    ageRange: [12, 120],
  },

  riskWeights: {
    prior_depression_f32: {
      weight: 0.25,
      sourceAuthority: 'WHO mhGAP 2023',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    substance_abuse_f10_f19: {
      weight: 0.20,
      sourceAuthority: 'WHO mhGAP 2023',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    social_isolation: {
      weight: 0.15,
      sourceAuthority: 'WHO mhGAP 2023',
      evidenceTier: 'TIER_2_CONSENSUS',
    },
    trauma_history: {
      weight: 0.15,
      sourceAuthority: 'WHO mhGAP 2023',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    chronic_pain: {
      weight: 0.10,
      sourceAuthority: 'APA 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    family_history_mental_illness: {
      weight: 0.10,
      sourceAuthority: 'APA 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    unemployment_socioeconomic: {
      weight: 0.05,
      sourceAuthority: 'WHO mhGAP 2023',
      evidenceTier: 'TIER_2_CONSENSUS',
    },
  },

  interventionPriority: [
    {
      code: 'MH_CRISIS_PROTOCOL',
      description: 'Immediate safety assessment and crisis intervention for active suicidal ideation',
      urgency: 'EMERGENT',
      sourceAuthority: 'WHO mhGAP 2023',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'MH_SSRI_INITIATION',
      description: 'SSRI initiation for moderate-severe depression (PHQ-9 >=15)',
      urgency: 'URGENT',
      sourceAuthority: 'APA 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'MH_CBT_REFERRAL',
      description: 'Cognitive behavioral therapy referral for mild-moderate depression or anxiety',
      urgency: 'ROUTINE',
      sourceAuthority: 'NICE 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'MH_BRIEF_INTERVENTION',
      description: 'Brief alcohol intervention for AUDIT score 8-15',
      urgency: 'ROUTINE',
      sourceAuthority: 'WHO mhGAP 2023',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'MH_PSYCHOEDUCATION',
      description: 'Psychoeducation and self-management strategies for mild symptoms',
      urgency: 'PREVENTIVE',
      sourceAuthority: 'WHO mhGAP 2023',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
  ],

  monitoringSchedule: [
    {
      biomarkerCode: 'PHQ9_SCORE',
      intervalDays: 30,
      conditionTrigger: 'F32',
      sourceAuthority: 'APA 2024',
    },
    {
      biomarkerCode: 'PHQ9_SCORE_MAINTENANCE',
      intervalDays: 90,
      sourceAuthority: 'APA 2024',
    },
    {
      biomarkerCode: 'GAD7_SCORE',
      intervalDays: 30,
      conditionTrigger: 'F41',
      sourceAuthority: 'APA 2024',
    },
    {
      biomarkerCode: 'AUDIT_SCORE',
      intervalDays: 180,
      sourceAuthority: 'WHO mhGAP 2023',
    },
    {
      biomarkerCode: 'MEDICATION_ADHERENCE_MH',
      intervalDays: 30,
      conditionTrigger: 'F32',
      sourceAuthority: 'APA 2024',
    },
  ],

  referralTriggers: [
    {
      condition: { '==': [{ var: 'suicidal_ideation_active' }, true] },
      urgency: 'EMERGENT',
      description: 'Active suicidal ideation detected — emergent psychiatric crisis referral',
      sourceAuthority: 'WHO mhGAP 2023',
    },
    {
      condition: { '>': [{ var: 'phq9_score' }, 20] },
      urgency: 'URGENT',
      description: 'PHQ-9 >20 (severe depression) — urgent psychiatry referral',
      sourceAuthority: 'APA 2024',
    },
    {
      condition: { '>': [{ var: 'gad7_score' }, 15] },
      urgency: 'URGENT',
      description: 'GAD-7 >15 (severe anxiety) — urgent psychiatry referral',
      sourceAuthority: 'APA 2024',
    },
    {
      condition: { '>=': [{ var: 'audit_score' }, 20] },
      urgency: 'URGENT',
      description: 'AUDIT score >=20 — urgent referral for alcohol dependence evaluation',
      sourceAuthority: 'WHO mhGAP 2023',
    },
    {
      condition: {
        and: [
          { '>=': [{ var: 'phq9_score' }, 10] },
          { '>=': [{ var: 'treatment_weeks_without_improvement' }, 8] },
        ],
      },
      urgency: 'URGENT',
      description: 'No improvement after 8 weeks of adequate treatment — urgent psychiatry reassessment',
      sourceAuthority: 'NICE 2024',
    },
  ],
};

registerDiscipline(mentalHealthConfig);
