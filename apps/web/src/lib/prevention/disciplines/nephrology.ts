import { registerDiscipline } from './registry';
import type { DisciplineConfig } from './types';

export const nephrologyConfig: DisciplineConfig = {
  discipline: 'NEPHROLOGY',
  displayName: 'Nephrology',
  description:
    'Chronic kidney disease staging (KDIGO eGFR + albuminuria), dialysis readiness assessment, anemia monitoring, and CKD-MBD management.',
  jurisdictions: ['BR', 'CO', 'BO'],

  screeningRuleIds: [
    'Diabetes Screening (HbA1c)',
    'Diabetes Screening (Fasting Glucose)',
    'Hypertension Screening (Blood Pressure)',
  ],

  screeningFilters: {
    ageRange: [18, 120],
    requiredConditionIcd10: ['N18', 'E11', 'I10'],
  },

  riskWeights: {
    diabetes_e11: {
      weight: 0.30,
      sourceAuthority: 'KDIGO 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    hypertension_i10: {
      weight: 0.25,
      sourceAuthority: 'KDIGO 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    family_history_ckd: {
      weight: 0.15,
      sourceAuthority: 'KDIGO 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    proteinuria_detected: {
      weight: 0.15,
      sourceAuthority: 'KDIGO 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    nephrotoxic_medications: {
      weight: 0.10,
      sourceAuthority: 'KDIGO 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    age_over_60: {
      weight: 0.05,
      sourceAuthority: 'KDIGO 2024',
      evidenceTier: 'TIER_2_CONSENSUS',
    },
  },

  interventionPriority: [
    {
      code: 'NEPH_RAAS_BLOCKADE',
      description: 'ACE inhibitor or ARB initiation for albuminuria >30 mg/g with diabetes or hypertension',
      urgency: 'ROUTINE',
      sourceAuthority: 'KDIGO 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'NEPH_SGLT2_CKD',
      description: 'SGLT2 inhibitor for CKD with eGFR 20-45 or albuminuria >=200 mg/g',
      urgency: 'ROUTINE',
      sourceAuthority: 'KDIGO 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'NEPH_DIALYSIS_PLANNING',
      description: 'Dialysis access planning (fistula/catheter) when eGFR <20 ml/min/1.73m2',
      urgency: 'URGENT',
      sourceAuthority: 'KDIGO 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'NEPH_ANEMIA_MANAGEMENT',
      description: 'ESA therapy and iron supplementation for CKD-associated anemia (Hb <10 g/dL)',
      urgency: 'ROUTINE',
      sourceAuthority: 'KDIGO 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'NEPH_BP_TARGET',
      description: 'Intensified blood pressure control targeting <130/80 mmHg in CKD',
      urgency: 'ROUTINE',
      sourceAuthority: 'KDIGO 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'NEPH_NEPHROTOXIN_REVIEW',
      description: 'Review and discontinue nephrotoxic agents (NSAIDs, aminoglycosides) in CKD patients',
      urgency: 'PREVENTIVE',
      sourceAuthority: 'KDIGO 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
  ],

  monitoringSchedule: [
    {
      biomarkerCode: 'EGFR',
      intervalDays: 90,
      conditionTrigger: 'N18.3',
      sourceAuthority: 'KDIGO 2024',
    },
    {
      biomarkerCode: 'URINE_ALBUMIN_CREATININE_RATIO',
      intervalDays: 90,
      sourceAuthority: 'KDIGO 2024',
    },
    {
      biomarkerCode: 'HEMOGLOBIN',
      intervalDays: 90,
      conditionTrigger: 'N18',
      sourceAuthority: 'KDIGO 2024',
    },
    {
      biomarkerCode: 'POTASSIUM',
      intervalDays: 90,
      conditionTrigger: 'N18.4',
      sourceAuthority: 'KDIGO 2024',
    },
    {
      biomarkerCode: 'PHOSPHATE',
      intervalDays: 90,
      conditionTrigger: 'N18.4',
      sourceAuthority: 'KDIGO 2024',
    },
    {
      biomarkerCode: 'PTH',
      intervalDays: 180,
      conditionTrigger: 'N18.3',
      sourceAuthority: 'KDIGO 2024',
    },
    {
      biomarkerCode: 'BICARBONATE',
      intervalDays: 90,
      conditionTrigger: 'N18.4',
      sourceAuthority: 'KDIGO 2024',
    },
  ],

  referralTriggers: [
    {
      condition: { '<': [{ var: 'egfr' }, 30] },
      urgency: 'URGENT',
      description: 'eGFR <30 ml/min/1.73m2 (CKD stage 4) — urgent nephrology referral',
      sourceAuthority: 'KDIGO 2024',
    },
    {
      condition: { '<': [{ var: 'egfr' }, 15] },
      urgency: 'EMERGENT',
      description: 'eGFR <15 ml/min/1.73m2 (CKD stage 5) — emergent nephrology for renal replacement therapy planning',
      sourceAuthority: 'KDIGO 2024',
    },
    {
      condition: { '>': [{ var: 'egfr_decline_per_year' }, 5] },
      urgency: 'URGENT',
      description: 'Rapid eGFR decline >5 ml/min/1.73m2 per year — urgent nephrology evaluation',
      sourceAuthority: 'KDIGO 2024',
    },
    {
      condition: { '>=': [{ var: 'urine_acr_mg_g' }, 300] },
      urgency: 'URGENT',
      description: 'Severely increased albuminuria (ACR >=300 mg/g) — urgent nephrology referral',
      sourceAuthority: 'KDIGO 2024',
    },
    {
      condition: {
        and: [
          { '<': [{ var: 'egfr' }, 45] },
          { '>=': [{ var: 'potassium' }, 5.5] },
        ],
      },
      urgency: 'EMERGENT',
      description: 'CKD with hyperkalemia (K+ >=5.5 mEq/L) — emergent management',
      sourceAuthority: 'KDIGO 2024',
    },
  ],
};

registerDiscipline(nephrologyConfig);
