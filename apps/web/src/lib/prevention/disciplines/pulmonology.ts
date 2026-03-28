import { registerDiscipline } from './registry';
import type { DisciplineConfig } from './types';

export const pulmonologyConfig: DisciplineConfig = {
  discipline: 'PULMONOLOGY',
  displayName: 'Pulmonology',
  description:
    'COPD management (GOLD staging), asthma control assessment (GINA), spirometry scheduling, and CPAP compliance monitoring.',
  jurisdictions: ['BR', 'CO', 'BO'],

  screeningRuleIds: [
    'Influenza Vaccine',
    'Pneumococcal Vaccine',
  ],

  screeningFilters: {
    ageRange: [5, 120],
  },

  riskWeights: {
    smoking_pack_years_ge20: {
      weight: 0.30,
      sourceAuthority: 'GOLD 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    occupational_dust_exposure: {
      weight: 0.20,
      sourceAuthority: 'GOLD 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    asthma_exacerbations_ge2_year: {
      weight: 0.20,
      sourceAuthority: 'GINA 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    biomass_fuel_exposure: {
      weight: 0.10,
      sourceAuthority: 'GOLD 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    family_history_copd: {
      weight: 0.10,
      sourceAuthority: 'GOLD 2024',
      evidenceTier: 'TIER_2_CONSENSUS',
    },
    alpha1_antitrypsin_deficiency: {
      weight: 0.10,
      sourceAuthority: 'GOLD 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
  },

  interventionPriority: [
    {
      code: 'PULM_BRONCHODILATOR',
      description: 'Long-acting bronchodilator (LABA or LAMA) for symptomatic COPD GOLD B-E',
      urgency: 'ROUTINE',
      sourceAuthority: 'GOLD 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'PULM_ICS_STEP_UP',
      description: 'Inhaled corticosteroid step-up for uncontrolled asthma (ACT <20)',
      urgency: 'URGENT',
      sourceAuthority: 'GINA 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'PULM_SMOKING_CESSATION',
      description: 'Smoking cessation intervention including pharmacotherapy (varenicline/NRT)',
      urgency: 'ROUTINE',
      sourceAuthority: 'GOLD 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'PULM_PULMONARY_REHAB',
      description: 'Pulmonary rehabilitation for COPD with mMRC >=2 or post-exacerbation',
      urgency: 'ROUTINE',
      sourceAuthority: 'GOLD 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'PULM_OXYGEN_THERAPY',
      description: 'Long-term oxygen therapy evaluation for resting SpO2 <=88%',
      urgency: 'URGENT',
      sourceAuthority: 'GOLD 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'PULM_ASTHMA_ACTION_PLAN',
      description: 'Written asthma action plan with peak flow zones for self-management',
      urgency: 'PREVENTIVE',
      sourceAuthority: 'GINA 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
  ],

  monitoringSchedule: [
    {
      biomarkerCode: 'SPIROMETRY_FEV1',
      intervalDays: 365,
      sourceAuthority: 'GOLD 2024',
    },
    {
      biomarkerCode: 'PEAK_FLOW',
      intervalDays: 30,
      conditionTrigger: 'J45',
      sourceAuthority: 'GINA 2024',
    },
    {
      biomarkerCode: 'SPO2',
      intervalDays: 90,
      conditionTrigger: 'J44',
      sourceAuthority: 'GOLD 2024',
    },
    {
      biomarkerCode: 'ASTHMA_CONTROL_TEST',
      intervalDays: 90,
      conditionTrigger: 'J45',
      sourceAuthority: 'GINA 2024',
    },
    {
      biomarkerCode: 'CPAP_ADHERENCE',
      intervalDays: 90,
      conditionTrigger: 'G47.3',
      sourceAuthority: 'SBPT',
    },
    {
      biomarkerCode: 'CHEST_XRAY',
      intervalDays: 365,
      conditionTrigger: 'J44',
      sourceAuthority: 'GOLD 2024',
    },
  ],

  referralTriggers: [
    {
      condition: { '<': [{ var: 'fev1_pct_predicted' }, 50] },
      urgency: 'URGENT',
      description: 'FEV1 <50% predicted — urgent pulmonology referral for advanced COPD management',
      sourceAuthority: 'GOLD 2024',
    },
    {
      condition: {
        and: [
          { '==': [{ var: 'exacerbation_requiring_icu' }, true] },
          { '<=': [{ var: 'days_since_icu' }, 30] },
        ],
      },
      urgency: 'EMERGENT',
      description: 'Severe exacerbation requiring ICU within 30 days — emergent pulmonology follow-up',
      sourceAuthority: 'GOLD 2024',
    },
    {
      condition: { '>=': [{ var: 'copd_exacerbations_per_year' }, 2] },
      urgency: 'URGENT',
      description: '>=2 COPD exacerbations per year — urgent pulmonology review for escalation',
      sourceAuthority: 'GOLD 2024',
    },
    {
      condition: {
        and: [
          { '<=': [{ var: 'spo2_resting' }, 88] },
          { '==': [{ var: 'on_supplemental_o2' }, false] },
        ],
      },
      urgency: 'URGENT',
      description: 'Resting SpO2 <=88% without supplemental O2 — urgent oxygen therapy assessment',
      sourceAuthority: 'GOLD 2024',
    },
    {
      condition: {
        and: [
          { '>=': [{ var: 'asthma_exacerbations_year' }, 3] },
          { '==': [{ var: 'on_high_dose_ics' }, true] },
        ],
      },
      urgency: 'URGENT',
      description: '>=3 asthma exacerbations on high-dose ICS — urgent referral for biologic assessment',
      sourceAuthority: 'GINA 2024',
    },
  ],
};

registerDiscipline(pulmonologyConfig);
