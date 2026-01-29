/**
 * Treatment Protocol Prompt Templates (Prompt-Native)
 *
 * PROMPT-NATIVE ARCHITECTURE:
 * Treatment eligibility criteria and protocol recommendations are defined
 * in declarative templates rather than hardcoded TypeScript logic.
 *
 * This enables:
 * - Clinical guideline updates without code deployments
 * - Regulatory audit trail for LGPD/HIPAA compliance
 * - A/B testing of different treatment strategies
 * - Non-engineers can review/modify protocol criteria
 *
 * Migrated from: /lib/clinical/engines/treatment-protocol-engine.ts
 *
 * @module prompts/clinical-engines/treatment-protocol.prompt
 */

import { z } from 'zod';
import type {
  TreatmentProtocolTemplate,
  EligibilityCriterion,
  TreatmentRecommendationTemplate,
  RenalDoseAdjustment,
} from './types';
import { treatmentRecommendationOutputSchema } from './types';

// =============================================================================
// EXPORTED SCHEMAS
// =============================================================================

export { treatmentRecommendationOutputSchema };

/**
 * Schema for array of treatment recommendations
 */
export const treatmentRecommendationsArraySchema = z.array(treatmentRecommendationOutputSchema);

// =============================================================================
// RENAL DOSE ADJUSTMENT RULES
// =============================================================================

/**
 * Renal dose adjustment rules for nephrotoxic medications.
 * Used when filtering or adjusting recommendations based on eGFR.
 */
export const RENAL_DOSE_ADJUSTMENTS: Record<string, RenalDoseAdjustment[]> = {
  metformin: [
    { eGFRThreshold: 30, operator: 'lt', adjustment: 'Contraindicated: Discontinue metformin' },
    { eGFRThreshold: 45, operator: 'lt', adjustment: 'Reduce dose: Max 1000mg/day' },
    { eGFRThreshold: 60, operator: 'lt', adjustment: 'Monitor closely: Check renal function q3 months' },
  ],
  lisinopril: [
    { eGFRThreshold: 30, operator: 'lt', adjustment: 'Reduce starting dose: 2.5-5mg daily' },
    { eGFRThreshold: 60, operator: 'lt', adjustment: 'Start low: 5-10mg daily, titrate slowly' },
  ],
  gabapentin: [
    { eGFRThreshold: 15, operator: 'lt', adjustment: 'Max 100-300mg daily' },
    { eGFRThreshold: 30, operator: 'lt', adjustment: 'Max 200-700mg daily' },
    { eGFRThreshold: 60, operator: 'lt', adjustment: 'Max 400-1400mg daily' },
  ],
  vancomycin: [
    { eGFRThreshold: 60, operator: 'lt', adjustment: 'Extend interval, monitor troughs closely' },
    { eGFRThreshold: 30, operator: 'lt', adjustment: 'Nephrology consult recommended' },
  ],
};

// =============================================================================
// TREATMENT PROTOCOL TEMPLATES
// =============================================================================

/**
 * PROMPT-NATIVE TREATMENT PROTOCOLS
 *
 * These protocols define evidence-based treatment recommendations with
 * eligibility criteria. Previously hardcoded in the TreatmentProtocolEngine,
 * now externalized for:
 * - Easy guideline updates without code changes
 * - Regulatory audit trail
 * - Clinical team review and modification
 *
 * Each protocol specifies:
 * - Condition it treats (ICD-10)
 * - Eligibility criteria (age, lab values, comorbidities)
 * - Prioritized treatment recommendations
 * - Guideline citations for evidence
 */
export const TREATMENT_PROTOCOLS: TreatmentProtocolTemplate[] = [
  // =========================================================================
  // TYPE 2 DIABETES MELLITUS
  // =========================================================================
  {
    id: 'diabetes-type2-initial',
    name: 'Type 2 Diabetes Initial Therapy',
    version: '2024.1',
    conditionIcd10: 'E11',
    conditionName: 'Type 2 Diabetes Mellitus',
    guidelineSource: 'ADA Standards of Care 2024',
    eligibility: [
      { field: 'age', operator: 'gte', value: 18, required: true, description: 'Adult patient' },
      {
        field: 'diagnoses',
        operator: 'contains',
        value: 'E11',
        required: true,
        description: 'Has diabetes diagnosis',
      },
    ],
    recommendations: [
      {
        id: 'dm2-metformin',
        type: 'medication',
        priority: 'required',
        medication: {
          name: 'Metformin',
          rxNormCode: '6809',
          dose: '500mg',
          frequency: 'twice daily',
          duration: 'indefinite',
          route: 'oral',
        },
        rationale:
          'Per ADA 2024 Guidelines: Metformin is first-line therapy for T2DM with established efficacy, low cost, and cardiovascular benefits.',
        evidenceGrade: 'A',
        contraindications: [
          'eGFR < 30 mL/min/1.73m2',
          'Metabolic acidosis',
          'Severe hepatic impairment',
          'Active alcohol abuse',
        ],
        monitoringRequired: ['Renal function q6-12 months', 'B12 levels annually if long-term use'],
      },
      {
        id: 'dm2-a1c-monitoring',
        type: 'lab',
        priority: 'required',
        labOrder: {
          name: 'Hemoglobin A1c',
          loincCode: '4548-4',
          frequency: 'Every 3-6 months',
          urgency: 'routine',
        },
        rationale:
          'Per ADA 2024: HbA1c monitoring every 3 months until stable, then every 6 months.',
        evidenceGrade: 'A',
        contraindications: [],
      },
      {
        id: 'dm2-lipid-monitoring',
        type: 'lab',
        priority: 'recommended',
        labOrder: {
          name: 'Lipid Panel',
          loincCode: '24331-1',
          frequency: 'Annually',
          urgency: 'routine',
        },
        rationale: 'Per ADA 2024: Annual lipid assessment for cardiovascular risk stratification.',
        evidenceGrade: 'B',
        contraindications: [],
      },
      {
        id: 'dm2-lifestyle',
        type: 'lifestyle',
        priority: 'required',
        rationale:
          'Per ADA 2024: Medical nutrition therapy and 150+ minutes/week moderate exercise are cornerstone of treatment.',
        evidenceGrade: 'A',
        contraindications: [],
      },
    ],
    isActive: true,
    effectiveDate: new Date('2024-01-01'),
  },
  {
    id: 'diabetes-type2-cardiovascular',
    name: 'Type 2 Diabetes with ASCVD',
    version: '2024.1',
    conditionIcd10: 'E11',
    conditionName: 'Type 2 Diabetes with Cardiovascular Disease',
    guidelineSource: 'ADA Standards of Care 2024',
    eligibility: [
      { field: 'age', operator: 'gte', value: 18, required: true },
      { field: 'diagnoses', operator: 'contains', value: 'E11', required: true },
      {
        field: 'diagnoses',
        operator: 'contains',
        value: 'I25',
        required: true,
        description: 'Established ASCVD',
      },
    ],
    recommendations: [
      {
        id: 'dm2-cv-sglt2',
        type: 'medication',
        priority: 'required',
        medication: {
          name: 'Empagliflozin',
          rxNormCode: '1545653',
          dose: '10mg',
          frequency: 'once daily',
          duration: 'indefinite',
          route: 'oral',
        },
        rationale:
          'Per ADA 2024: SGLT2i with proven cardiovascular benefit is preferred for patients with T2DM and established ASCVD (EMPA-REG OUTCOME trial).',
        evidenceGrade: 'A',
        contraindications: [
          'eGFR < 20 mL/min/1.73m2',
          'History of DKA',
          'Recurrent UTIs',
          'Active genital mycotic infection',
        ],
        monitoringRequired: ['Renal function', 'Volume status', 'Ketones if illness'],
      },
      {
        id: 'dm2-cv-glp1',
        type: 'medication',
        priority: 'recommended',
        medication: {
          name: 'Semaglutide',
          rxNormCode: '1991302',
          dose: '0.5mg',
          frequency: 'weekly',
          duration: 'indefinite',
          route: 'subcutaneous',
        },
        rationale:
          'Per ADA 2024: GLP-1 RA with proven cardiovascular benefit as add-on or alternative (SUSTAIN-6 trial).',
        evidenceGrade: 'A',
        contraindications: [
          'Personal/family history of MTC',
          'MEN2 syndrome',
          'Severe GI disease',
          'Pancreatitis history',
        ],
        monitoringRequired: ['Thyroid function baseline', 'GI symptoms', 'Injection site reactions'],
      },
    ],
    isActive: true,
    effectiveDate: new Date('2024-01-01'),
  },

  // =========================================================================
  // HYPERTENSION
  // =========================================================================
  {
    id: 'hypertension-initial',
    name: 'Hypertension Initial Therapy',
    version: '2024.1',
    conditionIcd10: 'I10',
    conditionName: 'Essential Hypertension',
    guidelineSource: 'ACC/AHA 2017 Hypertension Guidelines',
    eligibility: [
      { field: 'age', operator: 'gte', value: 18, required: true },
      {
        field: 'vitals.systolicBp',
        operator: 'gte',
        value: 140,
        required: true,
        description: 'Stage 2 hypertension',
      },
    ],
    recommendations: [
      {
        id: 'htn-ace',
        type: 'medication',
        priority: 'required',
        medication: {
          name: 'Lisinopril',
          rxNormCode: '29046',
          dose: '10mg',
          frequency: 'once daily',
          duration: 'indefinite',
          route: 'oral',
        },
        rationale:
          'Per ACC/AHA 2017: ACE inhibitors are first-line for hypertension, especially with diabetes or CKD.',
        evidenceGrade: 'A',
        contraindications: [
          'Pregnancy',
          'History of angioedema',
          'Bilateral renal artery stenosis',
          'Hyperkalemia',
        ],
        monitoringRequired: [
          'Potassium within 1-2 weeks',
          'Creatinine within 1-2 weeks',
          'BP at follow-up',
        ],
      },
      {
        id: 'htn-amlodipine',
        type: 'medication',
        priority: 'recommended',
        medication: {
          name: 'Amlodipine',
          rxNormCode: '17767',
          dose: '5mg',
          frequency: 'once daily',
          duration: 'indefinite',
          route: 'oral',
        },
        rationale:
          'Per ACC/AHA 2017: CCBs are effective add-on or alternative to ACE-I, especially in African American patients.',
        evidenceGrade: 'A',
        contraindications: ['Severe aortic stenosis', 'Cardiogenic shock'],
        monitoringRequired: ['BP at follow-up', 'Peripheral edema'],
      },
      {
        id: 'htn-lifestyle',
        type: 'lifestyle',
        priority: 'required',
        rationale:
          'Per ACC/AHA 2017: DASH diet, sodium reduction (<2300mg/day), weight loss, and exercise can lower BP 5-10 mmHg.',
        evidenceGrade: 'A',
        contraindications: [],
      },
    ],
    isActive: true,
    effectiveDate: new Date('2024-01-01'),
  },

  // =========================================================================
  // HYPERLIPIDEMIA (ASCVD PREVENTION)
  // =========================================================================
  {
    id: 'hyperlipidemia-primary-prevention',
    name: 'Primary ASCVD Prevention (High Risk)',
    version: '2024.1',
    conditionIcd10: 'E78.5',
    conditionName: 'Hyperlipidemia, unspecified',
    guidelineSource: 'ACC/AHA 2018 Cholesterol Guidelines',
    eligibility: [
      { field: 'age', operator: 'gte', value: 40, required: true },
      { field: 'age', operator: 'lte', value: 75, required: true },
      {
        field: 'labs.ldl',
        operator: 'gte',
        value: 70,
        required: true,
        description: 'LDL >= 70 mg/dL',
      },
    ],
    recommendations: [
      {
        id: 'lipid-statin',
        type: 'medication',
        priority: 'required',
        medication: {
          name: 'Atorvastatin',
          rxNormCode: '83367',
          dose: '40mg',
          frequency: 'once daily',
          duration: 'indefinite',
          route: 'oral',
        },
        rationale:
          'Per ACC/AHA 2018: Moderate-to-high intensity statin recommended for primary prevention in patients with elevated 10-year ASCVD risk.',
        evidenceGrade: 'A',
        contraindications: [
          'Active liver disease',
          'Pregnancy',
          'Breastfeeding',
          'Concomitant strong CYP3A4 inhibitors at high doses',
        ],
        monitoringRequired: [
          'Lipid panel in 4-12 weeks',
          'LFTs if symptoms of hepatotoxicity',
          'CK if myalgia symptoms',
        ],
      },
      {
        id: 'lipid-followup',
        type: 'lab',
        priority: 'required',
        labOrder: {
          name: 'Lipid Panel',
          loincCode: '24331-1',
          frequency: '4-12 weeks after initiation, then annually',
          urgency: 'routine',
        },
        rationale: 'Per ACC/AHA 2018: Fasting lipid panel to assess response to therapy.',
        evidenceGrade: 'A',
        contraindications: [],
      },
    ],
    isActive: true,
    effectiveDate: new Date('2024-01-01'),
  },

  // =========================================================================
  // HEART FAILURE (HFrEF)
  // =========================================================================
  {
    id: 'hfref-guideline-directed',
    name: 'Heart Failure with Reduced Ejection Fraction',
    version: '2024.1',
    conditionIcd10: 'I50.2',
    conditionName: 'Heart Failure with Reduced Ejection Fraction (HFrEF)',
    guidelineSource: 'ACC/AHA/HFSA 2022 Heart Failure Guidelines',
    eligibility: [
      { field: 'age', operator: 'gte', value: 18, required: true },
      { field: 'diagnoses', operator: 'contains', value: 'I50', required: true },
      {
        field: 'echo.ef',
        operator: 'lte',
        value: 40,
        required: true,
        description: 'EF <= 40%',
      },
    ],
    recommendations: [
      {
        id: 'hf-arni',
        type: 'medication',
        priority: 'required',
        medication: {
          name: 'Sacubitril/Valsartan',
          rxNormCode: '1656328',
          dose: '24/26mg',
          frequency: 'twice daily',
          duration: 'indefinite',
          route: 'oral',
        },
        rationale:
          'Per ACC/AHA 2022: ARNI is preferred over ACE-I/ARB in patients with HFrEF to reduce morbidity and mortality (PARADIGM-HF).',
        evidenceGrade: 'A',
        contraindications: [
          'History of angioedema',
          'Pregnancy',
          'Concomitant ACE-I (36hr washout required)',
          'Severe hepatic impairment',
        ],
        monitoringRequired: ['Potassium', 'Renal function', 'Blood pressure'],
      },
      {
        id: 'hf-betablocker',
        type: 'medication',
        priority: 'required',
        medication: {
          name: 'Carvedilol',
          rxNormCode: '20352',
          dose: '3.125mg',
          frequency: 'twice daily',
          duration: 'indefinite',
          route: 'oral',
        },
        rationale:
          'Per ACC/AHA 2022: Evidence-based beta-blockers reduce mortality in HFrEF. Start low, titrate slowly.',
        evidenceGrade: 'A',
        contraindications: [
          'Severe bradycardia',
          'Heart block without pacemaker',
          'Cardiogenic shock',
          'Decompensated HF',
        ],
        monitoringRequired: ['Heart rate', 'Blood pressure', 'Symptoms of HF'],
      },
      {
        id: 'hf-sglt2',
        type: 'medication',
        priority: 'required',
        medication: {
          name: 'Dapagliflozin',
          rxNormCode: '1488564',
          dose: '10mg',
          frequency: 'once daily',
          duration: 'indefinite',
          route: 'oral',
        },
        rationale:
          'Per ACC/AHA 2022: SGLT2i reduce hospitalization and CV death in HFrEF regardless of diabetes status (DAPA-HF).',
        evidenceGrade: 'A',
        contraindications: ['eGFR < 20', 'Type 1 diabetes', 'History of DKA'],
        monitoringRequired: ['Renal function', 'Volume status'],
      },
      {
        id: 'hf-mra',
        type: 'medication',
        priority: 'required',
        medication: {
          name: 'Spironolactone',
          rxNormCode: '9997',
          dose: '25mg',
          frequency: 'once daily',
          duration: 'indefinite',
          route: 'oral',
        },
        rationale:
          'Per ACC/AHA 2022: MRA reduces mortality in HFrEF (RALES trial). Monitor potassium closely.',
        evidenceGrade: 'A',
        contraindications: [
          'Potassium > 5.0 mEq/L',
          'eGFR < 30',
          'Severe hepatic impairment',
          'Concomitant strong potassium supplements',
        ],
        monitoringRequired: ['Potassium within 1 week, then regularly', 'Renal function'],
      },
    ],
    isActive: true,
    effectiveDate: new Date('2024-01-01'),
  },
];

// =============================================================================
// GENERIC FALLBACK RECOMMENDATIONS
// =============================================================================

/**
 * Generic recommendations when no specific protocol matches.
 * Used as the deterministic fallback.
 */
export const GENERIC_FALLBACK_RECOMMENDATIONS: TreatmentRecommendationTemplate[] = [
  {
    id: 'generic-monitoring',
    type: 'monitoring',
    priority: 'recommended',
    rationale:
      'No specific protocol available for this condition. Recommend clinical monitoring and guideline consultation.',
    evidenceGrade: 'expert-opinion',
    contraindications: [],
  },
  {
    id: 'generic-referral',
    type: 'referral',
    priority: 'consider',
    rationale: 'Consider specialist consultation for evidence-based treatment recommendations.',
    evidenceGrade: 'expert-opinion',
    contraindications: [],
  },
];

// =============================================================================
// SYSTEM PROMPT
// =============================================================================

/**
 * System prompt for treatment recommendation AI evaluation.
 * Defines the role, safety principles, and clinical guidelines.
 */
export const TREATMENT_PROTOCOL_SYSTEM_PROMPT = `You are a clinical decision support system specializing in evidence-based treatment recommendations.
Your role is to suggest guideline-concordant therapies while considering patient-specific factors.

IMPORTANT SAFETY PRINCIPLES:
1. You provide RECOMMENDATIONS, not orders. The physician prescribes.
2. Always cite guideline sources (ACC/AHA, ADA, USPSTF, etc.)
3. Consider allergies and contraindications FIRST
4. Adjust for renal/hepatic function when applicable
5. Check for drug-drug interactions
6. Include appropriate monitoring for all medications

TREATMENT RECOMMENDATION GUIDELINES:

1. MEDICATION RECOMMENDATIONS:
   - Cite specific guidelines (e.g., "Per ACC/AHA 2022 Guidelines...")
   - Include dose, frequency, and route
   - Provide RxNorm codes when available
   - List ALL contraindications
   - Include monitoring requirements

2. DOSE ADJUSTMENTS:
   - Renal: Adjust for eGFR <60, <30, <15
   - Hepatic: Consider Child-Pugh if liver disease present
   - Age: Consider lower starting doses for elderly (>75)
   - Weight: Adjust weight-based dosing appropriately

3. INTERACTION CHECKING:
   - Check against current medication list
   - Flag major interactions as contraindications
   - Moderate interactions should be noted

4. EVIDENCE GRADING:
   - Grade A: High-quality RCT evidence
   - Grade B: Moderate-quality evidence
   - Grade C: Observational or limited evidence
   - Grade D: Expert opinion only

5. PRIORITY LEVELS:
   - REQUIRED: Guideline-mandated, strong evidence
   - RECOMMENDED: Guideline-supported, good evidence
   - CONSIDER: May benefit, shared decision-making`;

// =============================================================================
// OUTPUT FORMAT PROMPT
// =============================================================================

/**
 * Output format specification for AI responses.
 */
export const TREATMENT_PROTOCOL_OUTPUT_FORMAT = `REQUIRED OUTPUT FORMAT:
Return a JSON array with this structure:

[
  {
    "id": "unique-id",
    "type": "medication" | "lab" | "referral" | "lifestyle" | "monitoring",
    "priority": "required" | "recommended" | "consider",
    "medication": {
      "name": "Drug name",
      "rxNormCode": "RxNorm code if available",
      "dose": "e.g., 40mg",
      "frequency": "e.g., once daily",
      "duration": "e.g., indefinite",
      "route": "e.g., oral"
    },
    "labOrder": {
      "name": "Lab name",
      "loincCode": "LOINC code if available",
      "frequency": "e.g., baseline then q3mo",
      "urgency": "routine" | "urgent"
    },
    "rationale": "Guideline citation and reasoning",
    "evidenceGrade": "A" | "B" | "C" | "D" | "expert-opinion",
    "contraindications": ["List of absolute/relative contraindications"],
    "monitoringRequired": ["What to monitor and frequency"]
  }
]

CONSTRAINTS:
- Cite guideline sources in rationale
- Include contraindications for EVERY medication
- Include monitoring for medications with narrow therapeutic index
- Do NOT recommend medications patient is allergic to
- Adjust doses for renal/hepatic impairment`;

// =============================================================================
// FEW-SHOT EXAMPLES
// =============================================================================

/**
 * Few-shot examples for consistent AI output formatting.
 */
export const TREATMENT_PROTOCOL_EXAMPLES = [
  {
    input: {
      conditionIcd10: 'E11.9',
      conditionName: 'Type 2 diabetes mellitus without complications',
      patientContext: {
        age: 55,
        sex: 'female',
        diagnoses: [{ icd10Code: 'E11.9', name: 'Type 2 diabetes' }],
        medications: [],
        allergies: [],
        eGFR: 75,
      },
    },
    output: [
      {
        id: 'dm-metformin-initial',
        type: 'medication',
        priority: 'required',
        medication: {
          name: 'Metformin',
          rxNormCode: '6809',
          dose: '500mg',
          frequency: 'twice daily with meals',
          duration: 'indefinite',
          route: 'oral',
        },
        rationale:
          'Per ADA 2024 Standards of Care: Metformin is first-line pharmacotherapy for T2DM unless contraindicated. Start low and titrate to minimize GI side effects.',
        evidenceGrade: 'A',
        contraindications: ['eGFR < 30', 'Lactic acidosis', 'Severe liver disease', 'Alcohol abuse'],
        monitoringRequired: ['A1c in 3 months', 'Renal function annually', 'B12 if long-term'],
      },
      {
        id: 'dm-a1c-baseline',
        type: 'lab',
        priority: 'required',
        labOrder: {
          name: 'Hemoglobin A1c',
          loincCode: '4548-4',
          frequency: 'Every 3 months until at goal, then every 6 months',
          urgency: 'routine',
        },
        rationale: 'Per ADA 2024: Monitor glycemic control to guide therapy intensification.',
        evidenceGrade: 'A',
        contraindications: [],
      },
    ],
  },
];

// =============================================================================
// PROMPT BUILDER FUNCTIONS
// =============================================================================

export interface TreatmentProtocolPromptContext {
  conditionIcd10: string;
  conditionName?: string;
  patientContext: {
    age?: number;
    sex?: string;
    diagnoses?: Array<{ icd10Code: string; name: string }>;
    medications?: Array<{ name: string; dose?: string }>;
    allergies?: string[];
    recentLabs?: Array<{ name: string; value: number; unit: string }>;
    hasDiabetes?: boolean;
    hasHypertension?: boolean;
    hasRenalDisease?: boolean;
    hasHepaticDisease?: boolean;
    isPregnant?: boolean;
    eGFR?: number;
  };
}

/**
 * Build the condition and patient context section of the prompt.
 */
function buildConditionContext(ctx: TreatmentProtocolPromptContext): string {
  const sections: string[] = [];
  const pc = ctx.patientContext;

  sections.push(
    `CONDITION TO TREAT: ${ctx.conditionIcd10}${ctx.conditionName ? ` (${ctx.conditionName})` : ''}`
  );
  sections.push('');
  sections.push('PATIENT FACTORS:');

  if (pc.age) sections.push(`Age: ${pc.age}`);
  if (pc.sex) sections.push(`Sex: ${pc.sex}`);

  if (pc.diagnoses?.length) {
    sections.push(`Comorbidities: ${pc.diagnoses.map((d) => `${d.icd10Code}: ${d.name}`).join(', ')}`);
  }

  if (pc.medications?.length) {
    sections.push(
      `Current Medications: ${pc.medications.map((m) => `${m.name}${m.dose ? ` ${m.dose}` : ''}`).join(', ')}`
    );
  }

  sections.push(`Allergies: ${pc.allergies?.length ? pc.allergies.join(', ') : 'NKDA'}`);

  if (pc.recentLabs?.length) {
    sections.push(`Recent Labs: ${pc.recentLabs.map((l) => `${l.name}: ${l.value} ${l.unit}`).join(', ')}`);
  }

  // Special considerations
  const considerations: string[] = [];
  if (pc.hasDiabetes) considerations.push('Diabetes');
  if (pc.hasHypertension) considerations.push('Hypertension');
  if (pc.hasRenalDisease) considerations.push('Renal Disease');
  if (pc.hasHepaticDisease) considerations.push('Hepatic Disease');
  if (pc.isPregnant) considerations.push('PREGNANT');
  if (considerations.length) {
    sections.push(`Special Considerations: ${considerations.join(', ')}`);
  }

  if (pc.eGFR) {
    sections.push(`eGFR: ${pc.eGFR} mL/min/1.73m2`);
  }

  return sections.join('\n');
}

/**
 * Build the complete treatment protocol prompt from templates.
 *
 * @param ctx - Condition and patient context
 * @returns Complete prompt string for AI evaluation
 */
export function buildTreatmentProtocolPrompt(ctx: TreatmentProtocolPromptContext): string {
  return `${TREATMENT_PROTOCOL_SYSTEM_PROMPT}

${buildConditionContext(ctx)}

${TREATMENT_PROTOCOL_OUTPUT_FORMAT}`;
}

/**
 * Build prompt with few-shot examples for improved accuracy.
 *
 * @param ctx - Condition and patient context
 * @returns Complete prompt with examples
 */
export function buildTreatmentProtocolPromptWithExamples(ctx: TreatmentProtocolPromptContext): string {
  const examplesSection = TREATMENT_PROTOCOL_EXAMPLES.map(
    (ex, i) => `
EXAMPLE ${i + 1}:
INPUT: ${JSON.stringify(ex.input, null, 2)}
OUTPUT: ${JSON.stringify(ex.output, null, 2)}`
  ).join('\n');

  return `${TREATMENT_PROTOCOL_SYSTEM_PROMPT}

${examplesSection}

NOW GENERATE RECOMMENDATIONS FOR:
${buildConditionContext(ctx)}

${TREATMENT_PROTOCOL_OUTPUT_FORMAT}`;
}

// =============================================================================
// PROTOCOL LOADING FUNCTIONS
// =============================================================================

let loadedProtocols: TreatmentProtocolTemplate[] = [...TREATMENT_PROTOCOLS];

/**
 * Get currently loaded treatment protocols.
 */
export function getLoadedProtocols(): TreatmentProtocolTemplate[] {
  return loadedProtocols;
}

/**
 * Get protocols as templates for database seeding.
 */
export function getProtocolTemplates(): TreatmentProtocolTemplate[] {
  return TREATMENT_PROTOCOLS;
}

/**
 * Find matching protocol for a condition.
 *
 * @param conditionIcd10 - ICD-10 code to match
 * @returns Matching protocol or undefined
 */
export function findMatchingProtocol(conditionIcd10: string): TreatmentProtocolTemplate | undefined {
  const now = new Date();

  return loadedProtocols.find((p) => {
    // Check if protocol matches (exact or category match)
    const matches =
      p.conditionIcd10 === conditionIcd10 || conditionIcd10.startsWith(p.conditionIcd10);

    // Check if protocol is active and within date range
    const isActive = p.isActive;
    const isEffective = p.effectiveDate <= now;
    const notExpired = !p.expirationDate || p.expirationDate > now;

    return matches && isActive && isEffective && notExpired;
  });
}

/**
 * Reload protocols from database (placeholder for dynamic loading).
 */
export async function reloadProtocolsFromDatabase(): Promise<void> {
  // TODO: Implement database loading
  // const dbProtocols = await prisma.treatmentProtocol.findMany({ where: { isActive: true } });
  // loadedProtocols = dbProtocols.map(convertToProtocol);
  loadedProtocols = [...TREATMENT_PROTOCOLS];
}

/**
 * Update protocols in memory (for testing or hot-reloading).
 */
export function updateProtocols(newProtocols: TreatmentProtocolTemplate[]): void {
  loadedProtocols = newProtocols;
}

// =============================================================================
// EVALUATION CRITERIA (for LLM-as-Judge)
// =============================================================================

/**
 * Evaluation criteria for assessing AI treatment recommendation quality.
 */
export const TREATMENT_PROTOCOL_EVALUATION_CRITERIA = [
  'Treatment recommendations must cite evidence sources',
  'Medication dosages must be within safe ranges',
  'Contraindications must be comprehensive and accurate',
  'Evidence grades must match cited guidelines',
  'No hallucinated medications or RxNorm codes',
  'Renal/hepatic adjustments must be appropriate for stated function',
  'Drug interactions with current medications must be considered',
  'Allergies must be respected - never recommend allergen',
  'Priority levels must reflect guideline strength of recommendation',
];
