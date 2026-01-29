/**
 * Symptom-to-Diagnosis Prompt Templates (Prompt-Native)
 *
 * PROMPT-NATIVE ARCHITECTURE:
 * Symptom-to-diagnosis mappings and clinical reasoning rules are defined
 * in natural language prompts rather than hardcoded TypeScript logic.
 *
 * This enables:
 * - Clinical logic updates without code deployments
 * - Auditable decision rules for LGPD/HIPAA compliance
 * - A/B testing of different diagnostic strategies
 * - Non-engineers can review/modify clinical mappings
 *
 * Migrated from: /lib/clinical/engines/symptom-diagnosis-engine.ts
 *
 * @module prompts/clinical-engines/symptom-diagnosis.prompt
 */

import { z } from 'zod';
import type {
  SymptomDiagnosisRule,
  ProbabilityModifiers,
  SeverityModifiers,
  UrgencyRule,
} from './types';
import { symptomDiagnosisOutputSchema } from './types';

// =============================================================================
// EXPORTED SCHEMAS
// =============================================================================

export { symptomDiagnosisOutputSchema };

// =============================================================================
// EMERGENT CONDITIONS (ICD-10 PREFIXES)
// =============================================================================

/**
 * ICD-10 prefixes that indicate emergent conditions requiring immediate attention.
 * These are used by the urgency determination logic.
 */
export const EMERGENT_ICD10_RULES: UrgencyRule[] = [
  { icd10Prefix: 'I21', conditionName: 'Acute myocardial infarction', urgencyLevel: 'emergent' },
  { icd10Prefix: 'I60', conditionName: 'Nontraumatic subarachnoid hemorrhage', urgencyLevel: 'emergent' },
  { icd10Prefix: 'I61', conditionName: 'Nontraumatic intracerebral hemorrhage', urgencyLevel: 'emergent' },
  { icd10Prefix: 'I63', conditionName: 'Cerebral infarction (stroke)', urgencyLevel: 'emergent' },
  { icd10Prefix: 'J96', conditionName: 'Respiratory failure', urgencyLevel: 'emergent' },
  { icd10Prefix: 'R57', conditionName: 'Shock', urgencyLevel: 'emergent' },
  { icd10Prefix: 'J80', conditionName: 'Acute respiratory distress syndrome', urgencyLevel: 'emergent' },
  { icd10Prefix: 'K92.2', conditionName: 'GI hemorrhage', urgencyLevel: 'emergent' },
];

/**
 * ICD-10 prefixes for cardiovascular conditions (urgent evaluation)
 */
export const CARDIOVASCULAR_ICD10_PREFIXES = ['I'];

/**
 * ICD-10 prefixes for respiratory conditions (urgent evaluation)
 */
export const RESPIRATORY_ICD10_PREFIXES = ['J'];

/**
 * ICD-10 prefixes for GI conditions (urgent evaluation)
 */
export const GI_ICD10_PREFIXES = ['K'];

// =============================================================================
// SEVERITY MODIFIERS
// =============================================================================

/**
 * Severity modifiers applied to base probability based on symptom severity.
 * Severe symptoms increase probability, mild symptoms decrease it.
 */
export const SEVERITY_MODIFIERS: SeverityModifiers = {
  severe: 1.2, // 20% increase
  moderate: 1.1, // 10% increase
  mild: 0.9, // 10% decrease
};

// =============================================================================
// SYMPTOM-TO-DIAGNOSIS MAPPINGS
// =============================================================================

/**
 * PROMPT-NATIVE SYMPTOM-DIAGNOSIS RULES
 *
 * These mappings define the relationship between symptoms and potential diagnoses.
 * Previously hardcoded in the SymptomDiagnosisEngine, now externalized for:
 * - Easy updates without code changes
 * - Regulatory audit trail
 * - Clinical team review and modification
 *
 * Each rule specifies:
 * - Keywords that trigger the diagnosis
 * - Base probability before patient-specific adjustments
 * - Red flags that increase clinical urgency
 * - Recommended workup for the diagnosis
 * - Patient factor modifiers (age, sex, comorbidities)
 */
export const SYMPTOM_DIAGNOSIS_RULES: SymptomDiagnosisRule[] = [
  // =========================================================================
  // CHEST PAIN DIFFERENTIALS
  // =========================================================================
  {
    id: 'chest-pain-acs',
    icd10Code: 'I21.9',
    diagnosisName: 'Acute coronary syndrome, unspecified',
    symptomKeywords: ['chest pain', 'chest pressure', 'crushing chest', 'substernal', 'angina'],
    baseProbability: 0.25,
    redFlags: [
      'Diaphoresis with chest pain',
      'Radiation to left arm or jaw',
      'Shortness of breath',
      'Nausea/vomiting',
      'History of CAD',
    ],
    workupSuggestions: [
      'ECG (12-lead) immediately',
      'Troponin (serial)',
      'Chest X-ray',
      'CBC, BMP',
      'Consider cardiology consult',
    ],
    probabilityModifiers: {
      'age>65': 1.5,
      'age>80': 1.8,
      'sex=male': 1.3,
      diabetes: 1.4,
      hypertension: 1.3,
      smoker: 1.5,
      cardiovascular: 2.0,
    },
    isActive: true,
  },
  {
    id: 'chest-pain-pe',
    icd10Code: 'I26.99',
    diagnosisName: 'Pulmonary embolism without acute cor pulmonale',
    symptomKeywords: ['chest pain', 'pleuritic', 'sharp', 'worse with breathing', 'dyspnea'],
    baseProbability: 0.15,
    redFlags: [
      'Sudden onset dyspnea',
      'Recent immobility or surgery',
      'Hemoptysis',
      'Leg swelling/pain',
      'History of DVT/PE',
      'Tachycardia',
    ],
    workupSuggestions: [
      'D-dimer',
      'CT angiography chest',
      'ECG',
      'Lower extremity Doppler if indicated',
      'Wells score calculation',
    ],
    probabilityModifiers: {
      'age>65': 1.3,
      cancer: 2.5,
      cardiovascular: 1.2,
    },
    isActive: true,
  },
  {
    id: 'chest-pain-gerd',
    icd10Code: 'K21.0',
    diagnosisName: 'Gastroesophageal reflux disease with esophagitis',
    symptomKeywords: ['heartburn', 'acid reflux', 'burning chest', 'regurgitation', 'dyspepsia'],
    baseProbability: 0.35,
    redFlags: ['Dysphagia', 'Weight loss', 'GI bleeding', 'Anemia'],
    workupSuggestions: [
      'Trial of PPI therapy',
      'EGD if red flags present',
      'H. pylori testing if indicated',
    ],
    probabilityModifiers: {
      'age>65': 1.1,
    },
    isActive: true,
  },
  {
    id: 'chest-pain-msk',
    icd10Code: 'M79.3',
    diagnosisName: 'Panniculitis, unspecified (Chest wall pain)',
    symptomKeywords: ['chest wall pain', 'reproducible', 'tenderness', 'musculoskeletal'],
    baseProbability: 0.30,
    redFlags: ['Associated with exertion', 'Diaphoresis', 'Radiation'],
    workupSuggestions: ['Physical examination', 'Trial of NSAIDs', 'Consider chest X-ray'],
    probabilityModifiers: {
      'age<18': 1.4,
    },
    isActive: true,
  },

  // =========================================================================
  // HEADACHE DIFFERENTIALS
  // =========================================================================
  {
    id: 'headache-tension',
    icd10Code: 'G44.209',
    diagnosisName: 'Tension-type headache, unspecified',
    symptomKeywords: ['headache', 'bilateral', 'band-like', 'pressure', 'tight'],
    baseProbability: 0.45,
    redFlags: ['Sudden onset', 'Worst headache of life', 'Fever', 'Stiff neck'],
    workupSuggestions: ['Clinical diagnosis', 'Consider imaging if red flags'],
    probabilityModifiers: {},
    isActive: true,
  },
  {
    id: 'headache-migraine',
    icd10Code: 'G43.909',
    diagnosisName: 'Migraine, unspecified',
    symptomKeywords: ['headache', 'throbbing', 'pulsating', 'unilateral', 'nausea', 'photophobia', 'aura'],
    baseProbability: 0.30,
    redFlags: ['New onset after 50', 'Change in pattern', 'Neurological deficits'],
    workupSuggestions: ['Clinical diagnosis', 'MRI if first presentation or atypical'],
    probabilityModifiers: {
      'sex=female': 1.5,
      'age<18': 0.8,
      'age>65': 0.6,
    },
    isActive: true,
  },
  {
    id: 'headache-sah',
    icd10Code: 'I60.9',
    diagnosisName: 'Nontraumatic subarachnoid hemorrhage, unspecified',
    symptomKeywords: ['thunderclap', 'worst headache', 'sudden severe', 'explosive'],
    baseProbability: 0.05,
    redFlags: [
      'Thunderclap onset',
      'Altered consciousness',
      'Stiff neck',
      'Vomiting',
      'Focal neurological deficits',
    ],
    workupSuggestions: ['CT head without contrast immediately', 'LP if CT negative', 'Neurosurgery consult'],
    probabilityModifiers: {
      'age>65': 1.3,
      hypertension: 1.5,
      smoker: 1.3,
    },
    isActive: true,
  },

  // =========================================================================
  // ABDOMINAL PAIN DIFFERENTIALS
  // =========================================================================
  {
    id: 'abdominal-appendicitis',
    icd10Code: 'K35.80',
    diagnosisName: 'Unspecified acute appendicitis',
    symptomKeywords: ['right lower quadrant', 'rlq pain', 'periumbilical', 'mcburney'],
    baseProbability: 0.20,
    redFlags: ['Fever', 'Rebound tenderness', 'Guarding', 'Anorexia'],
    workupSuggestions: ['CT abdomen/pelvis with contrast', 'CBC with differential', 'Surgical consult'],
    probabilityModifiers: {
      'age<18': 1.5,
      'age>65': 0.6,
    },
    isActive: true,
  },
  {
    id: 'abdominal-cholecystitis',
    icd10Code: 'K81.0',
    diagnosisName: 'Acute cholecystitis',
    symptomKeywords: ['right upper quadrant', 'ruq pain', 'murphy', 'after eating', 'fatty food'],
    baseProbability: 0.20,
    redFlags: ['Fever', 'Jaundice', 'Murphy sign positive'],
    workupSuggestions: ['RUQ ultrasound', 'LFTs', 'Lipase', 'CBC', 'Surgical consult if confirmed'],
    probabilityModifiers: {
      'sex=female': 1.4,
      'age>65': 1.2,
    },
    isActive: true,
  },
  {
    id: 'abdominal-gastroenteritis',
    icd10Code: 'K52.9',
    diagnosisName: 'Noninfective gastroenteritis and colitis, unspecified',
    symptomKeywords: ['diarrhea', 'vomiting', 'nausea', 'cramping', 'stomach bug'],
    baseProbability: 0.40,
    redFlags: ['Bloody diarrhea', 'Severe dehydration', 'High fever', 'Immunocompromised'],
    workupSuggestions: ['Supportive care', 'Stool studies if severe', 'Consider BMP if dehydrated'],
    probabilityModifiers: {
      'age<5': 1.3,
      'age>65': 1.2,
    },
    isActive: true,
  },

  // =========================================================================
  // RESPIRATORY DIFFERENTIALS
  // =========================================================================
  {
    id: 'respiratory-pneumonia',
    icd10Code: 'J18.9',
    diagnosisName: 'Pneumonia, unspecified organism',
    symptomKeywords: ['cough', 'fever', 'productive', 'chills', 'pleuritic', 'dyspnea'],
    baseProbability: 0.25,
    redFlags: ['Hypoxia', 'Altered mental status', 'Hemodynamic instability', 'Immunocompromised'],
    workupSuggestions: ['Chest X-ray', 'CBC', 'BMP', 'Blood cultures if severe', 'Procalcitonin'],
    probabilityModifiers: {
      'age>65': 1.5,
      'age>80': 1.8,
      diabetes: 1.3,
    },
    isActive: true,
  },
  {
    id: 'respiratory-copd-exacerbation',
    icd10Code: 'J44.1',
    diagnosisName: 'Chronic obstructive pulmonary disease with acute exacerbation',
    symptomKeywords: ['shortness of breath', 'wheezing', 'copd', 'increased sputum', 'cough worse'],
    baseProbability: 0.30,
    redFlags: ['Severe hypoxia', 'Accessory muscle use', 'Unable to speak sentences'],
    workupSuggestions: ['Chest X-ray', 'ABG or SpO2', 'CBC', 'BNP to rule out CHF'],
    probabilityModifiers: {
      'age>65': 1.4,
      smoker: 2.0,
    },
    isActive: true,
  },
  {
    id: 'respiratory-asthma',
    icd10Code: 'J45.20',
    diagnosisName: 'Mild intermittent asthma, uncomplicated',
    symptomKeywords: ['wheezing', 'cough', 'shortness of breath', 'chest tightness', 'allergies'],
    baseProbability: 0.35,
    redFlags: ['Silent chest', 'Unable to speak', 'Cyanosis', 'Altered consciousness'],
    workupSuggestions: ['Peak flow', 'Pulse oximetry', 'Consider chest X-ray if first presentation'],
    probabilityModifiers: {
      'age<18': 1.4,
      'age>65': 0.7,
    },
    isActive: true,
  },

  // =========================================================================
  // DIABETES-RELATED
  // =========================================================================
  {
    id: 'diabetes-hyperglycemia',
    icd10Code: 'E11.65',
    diagnosisName: 'Type 2 diabetes mellitus with hyperglycemia',
    symptomKeywords: ['polyuria', 'polydipsia', 'high blood sugar', 'thirst', 'frequent urination'],
    baseProbability: 0.30,
    redFlags: ['DKA symptoms', 'Altered mental status', 'Kussmaul breathing', 'Fruity breath'],
    workupSuggestions: ['Fingerstick glucose', 'BMP', 'HbA1c', 'Urinalysis for ketones'],
    probabilityModifiers: {
      diabetes: 3.0,
      'age>65': 1.2,
    },
    isActive: true,
  },

  // =========================================================================
  // CARDIOVASCULAR
  // =========================================================================
  {
    id: 'cardiovascular-chf',
    icd10Code: 'I50.9',
    diagnosisName: 'Heart failure, unspecified',
    symptomKeywords: ['dyspnea', 'leg swelling', 'orthopnea', 'pnd', 'weight gain', 'fatigue'],
    baseProbability: 0.20,
    redFlags: ['Acute pulmonary edema', 'Hypotension', 'New onset'],
    workupSuggestions: ['BNP/NT-proBNP', 'Chest X-ray', 'ECG', 'Echo', 'BMP'],
    probabilityModifiers: {
      'age>65': 1.5,
      'age>80': 2.0,
      hypertension: 1.4,
      diabetes: 1.3,
      cardiovascular: 2.0,
    },
    isActive: true,
  },
  {
    id: 'cardiovascular-afib',
    icd10Code: 'I48.91',
    diagnosisName: 'Unspecified atrial fibrillation',
    symptomKeywords: ['palpitations', 'irregular heartbeat', 'racing heart', 'afib'],
    baseProbability: 0.15,
    redFlags: ['Chest pain', 'Syncope', 'Acute stroke symptoms', 'Hemodynamic instability'],
    workupSuggestions: ['ECG', 'Thyroid function', 'BMP', 'Consider Echo', 'Anticoagulation assessment'],
    probabilityModifiers: {
      'age>65': 1.8,
      'age>80': 2.5,
      hypertension: 1.3,
    },
    isActive: true,
  },
];

// =============================================================================
// SYSTEM PROMPT
// =============================================================================

/**
 * System prompt for symptom-to-diagnosis AI evaluation.
 * Defines the role, safety principles, and clinical reasoning guidelines.
 */
export const SYMPTOM_DIAGNOSIS_SYSTEM_PROMPT = `You are a clinical decision support system trained on evidence-based medicine guidelines.
Your role is to generate differential diagnoses that help clinicians consider possible conditions.

IMPORTANT SAFETY PRINCIPLES:
1. You provide SUPPORT, not diagnosis. The physician makes all final decisions.
2. Always consider dangerous conditions first (don't miss emergencies).
3. Be conservative with probabilities - clinical diagnosis is inherently uncertain.
4. Include red flags that warrant immediate attention.
5. Suggest appropriate workup to narrow the differential.

CLINICAL REASONING GUIDELINES:

1. DIFFERENTIAL GENERATION:
   - Include both common AND dangerous diagnoses
   - Consider "can't miss" diagnoses even if probability is low
   - Think about typical vs atypical presentations
   - Consider age, sex, and comorbidity-specific risks

2. PROBABILITY ESTIMATION:
   - Probabilities should reflect your uncertainty, not sum to 1
   - High probability (>0.6) only for classic presentations
   - Include low-probability dangerous conditions
   - Adjust for patient risk factors

3. RED FLAGS TO IDENTIFY:
   - Sudden onset of severe symptoms
   - Neurological deficits
   - Hemodynamic instability signs
   - Fever with immunocompromise
   - Chest pain with cardiac risk factors

4. URGENCY CLASSIFICATION:
   - EMERGENT: Life-threatening, needs immediate intervention
   - URGENT: Needs evaluation within hours
   - ROUTINE: Safe for scheduled evaluation`;

// =============================================================================
// OUTPUT FORMAT PROMPT
// =============================================================================

/**
 * Output format specification for AI responses.
 * Ensures consistent, parseable JSON output.
 */
export const SYMPTOM_DIAGNOSIS_OUTPUT_FORMAT = `REQUIRED OUTPUT FORMAT:
Return a JSON object with this exact structure:

{
  "differentials": [
    {
      "icd10Code": "Valid ICD-10 code (e.g., I21.0)",
      "name": "Diagnosis name",
      "probability": 0.0-1.0,
      "confidence": "high" | "medium" | "low",
      "reasoning": "Why this diagnosis is considered",
      "redFlags": ["Warning signs that increase urgency"],
      "workupSuggestions": ["Recommended tests/evaluations"],
      "source": "ai"
    }
  ],
  "urgency": "emergent" | "urgent" | "routine",
  "processingMethod": "ai",
  "timestamp": "ISO timestamp"
}

CONSTRAINTS:
- Maximum 5 differentials
- ICD-10 codes must be valid
- Include reasoning for each diagnosis
- Red flags must be clinically appropriate
- Workup suggestions must be evidence-based
- Probabilities across all differentials need not sum to 1`;

// =============================================================================
// FEW-SHOT EXAMPLES
// =============================================================================

/**
 * Few-shot examples for consistent AI output formatting.
 * These help the model understand expected response structure.
 */
export const SYMPTOM_DIAGNOSIS_EXAMPLES = [
  {
    input: {
      chiefComplaint: 'chest pain',
      duration: '2 hours',
      severity: 'severe',
      associatedSymptoms: ['diaphoresis', 'nausea', 'shortness of breath'],
      patientContext: {
        age: 62,
        sex: 'male',
        hasDiabetes: true,
        hasHypertension: true,
      },
    },
    output: {
      differentials: [
        {
          icd10Code: 'I21.9',
          name: 'Acute coronary syndrome, unspecified',
          probability: 0.65,
          confidence: 'high',
          reasoning:
            'Classic presentation: substernal chest pain with diaphoresis and dyspnea in male with cardiac risk factors (diabetes, hypertension).',
          redFlags: ['Diaphoresis with chest pain', 'Shortness of breath', 'Multiple cardiac risk factors'],
          workupSuggestions: ['ECG immediately', 'Serial troponins', 'Aspirin 325mg if no contraindications'],
          source: 'ai',
        },
        {
          icd10Code: 'I26.99',
          name: 'Pulmonary embolism',
          probability: 0.15,
          confidence: 'medium',
          reasoning:
            'Cannot rule out PE with acute dyspnea and chest pain. Risk factors should be assessed.',
          redFlags: ['Sudden onset dyspnea', 'Pleuritic component'],
          workupSuggestions: ['D-dimer', 'CT angiography if indicated', 'Wells score calculation'],
          source: 'ai',
        },
      ],
      urgency: 'emergent',
      processingMethod: 'ai',
      timestamp: '2024-01-15T10:30:00Z',
    },
  },
  {
    input: {
      chiefComplaint: 'headache',
      duration: '3 days',
      severity: 'moderate',
      associatedSymptoms: ['stress', 'neck tension'],
      patientContext: {
        age: 35,
        sex: 'female',
      },
    },
    output: {
      differentials: [
        {
          icd10Code: 'G44.209',
          name: 'Tension-type headache, unspecified',
          probability: 0.60,
          confidence: 'high',
          reasoning:
            'Bilateral headache with neck tension and stress history. Classic tension-type pattern.',
          redFlags: [],
          workupSuggestions: ['Clinical diagnosis', 'OTC analgesics', 'Stress management'],
          source: 'ai',
        },
        {
          icd10Code: 'G43.909',
          name: 'Migraine, unspecified',
          probability: 0.25,
          confidence: 'medium',
          reasoning: 'Should consider migraine given female patient. Ask about photophobia, aura.',
          redFlags: [],
          workupSuggestions: ['Migraine diary', 'Consider prophylaxis if frequent'],
          source: 'ai',
        },
      ],
      urgency: 'routine',
      processingMethod: 'ai',
      timestamp: '2024-01-15T10:30:00Z',
    },
  },
];

// =============================================================================
// PROMPT BUILDER FUNCTIONS
// =============================================================================

export interface SymptomDiagnosisPromptContext {
  chiefComplaint: string;
  duration?: string;
  severity?: 'mild' | 'moderate' | 'severe';
  associatedSymptoms?: string[];
  aggravatingFactors?: string[];
  relievingFactors?: string[];
  patientContext?: {
    age?: number;
    sex?: string;
    diagnoses?: Array<{ icd10Code: string; name: string }>;
    medications?: Array<{ name: string }>;
    allergies?: Array<{ allergen: string }>;
    hasDiabetes?: boolean;
    hasHypertension?: boolean;
    isSmoker?: boolean;
  };
}

/**
 * Build the patient presentation section of the prompt.
 */
function buildPatientPresentation(ctx: SymptomDiagnosisPromptContext): string {
  const sections: string[] = ['PATIENT SYMPTOMS:'];

  sections.push(`Chief Complaint: ${ctx.chiefComplaint}`);
  sections.push(`Duration: ${ctx.duration || 'Not specified'}`);
  sections.push(`Severity: ${ctx.severity || 'Not specified'}`);
  sections.push(`Associated Symptoms: ${ctx.associatedSymptoms?.join(', ') || 'None reported'}`);
  sections.push(`Aggravating Factors: ${ctx.aggravatingFactors?.join(', ') || 'None'}`);
  sections.push(`Relieving Factors: ${ctx.relievingFactors?.join(', ') || 'None'}`);

  if (ctx.patientContext) {
    const pc = ctx.patientContext;
    sections.push('');
    sections.push('PATIENT CONTEXT:');
    if (pc.age) sections.push(`Age: ${pc.age}`);
    if (pc.sex) sections.push(`Sex: ${pc.sex}`);
    if (pc.diagnoses?.length) {
      sections.push(`Chronic Conditions: ${pc.diagnoses.map((d) => d.name).join(', ')}`);
    }
    if (pc.medications?.length) {
      sections.push(`Current Medications: ${pc.medications.map((m) => m.name).join(', ')}`);
    }
    if (pc.allergies?.length) {
      sections.push(`Allergies: ${pc.allergies.map((a) => a.allergen).join(', ')}`);
    }
    if (pc.hasDiabetes) sections.push('History of Diabetes: Yes');
    if (pc.hasHypertension) sections.push('History of Hypertension: Yes');
    if (pc.isSmoker) sections.push('Smoking Status: Current smoker');
  } else {
    sections.push('');
    sections.push('No additional patient context available.');
  }

  return sections.join('\n');
}

/**
 * Build the complete symptom-to-diagnosis prompt from templates.
 *
 * @param ctx - Symptom and patient context
 * @returns Complete prompt string for AI evaluation
 */
export function buildSymptomDiagnosisPrompt(ctx: SymptomDiagnosisPromptContext): string {
  return `${SYMPTOM_DIAGNOSIS_SYSTEM_PROMPT}

${buildPatientPresentation(ctx)}

${SYMPTOM_DIAGNOSIS_OUTPUT_FORMAT}`;
}

/**
 * Build prompt with few-shot examples for improved accuracy.
 *
 * @param ctx - Symptom and patient context
 * @returns Complete prompt with examples
 */
export function buildSymptomDiagnosisPromptWithExamples(ctx: SymptomDiagnosisPromptContext): string {
  const examplesSection = SYMPTOM_DIAGNOSIS_EXAMPLES.map(
    (ex, i) => `
EXAMPLE ${i + 1}:
INPUT: ${JSON.stringify(ex.input, null, 2)}
OUTPUT: ${JSON.stringify(ex.output, null, 2)}`
  ).join('\n');

  return `${SYMPTOM_DIAGNOSIS_SYSTEM_PROMPT}

${examplesSection}

NOW EVALUATE THE FOLLOWING:
${buildPatientPresentation(ctx)}

${SYMPTOM_DIAGNOSIS_OUTPUT_FORMAT}`;
}

// =============================================================================
// RULE LOADING FUNCTIONS
// =============================================================================

let loadedRules: SymptomDiagnosisRule[] = [...SYMPTOM_DIAGNOSIS_RULES];

/**
 * Get currently loaded symptom-diagnosis rules.
 */
export function getLoadedRules(): SymptomDiagnosisRule[] {
  return loadedRules;
}

/**
 * Get rules as templates for database seeding.
 */
export function getRuleTemplates(): SymptomDiagnosisRule[] {
  return SYMPTOM_DIAGNOSIS_RULES;
}

/**
 * Reload rules from database (placeholder for dynamic loading).
 * In production, this would fetch from the SymptomDiagnosisMap table.
 */
export async function reloadRulesFromDatabase(): Promise<void> {
  // TODO: Implement database loading
  // const dbRules = await prisma.symptomDiagnosisMap.findMany({ where: { isActive: true } });
  // loadedRules = dbRules.map(convertToRule);
  loadedRules = [...SYMPTOM_DIAGNOSIS_RULES];
}

/**
 * Update rules in memory (for testing or hot-reloading).
 */
export function updateRules(newRules: SymptomDiagnosisRule[]): void {
  loadedRules = newRules;
}

// =============================================================================
// EVALUATION CRITERIA (for LLM-as-Judge)
// =============================================================================

/**
 * Evaluation criteria for assessing AI diagnosis quality.
 * Used by LLM-as-Judge quality grading pipeline.
 */
export const SYMPTOM_DIAGNOSIS_EVALUATION_CRITERIA = [
  'All ICD-10 codes must be valid and match diagnosis names',
  'Probabilities must sum to reasonable total (< 1.5 for top 5)',
  'Red flags must be clinically appropriate for the condition',
  'Workup suggestions must be evidence-based',
  'Urgency level must match clinical severity',
  'Dangerous conditions must not be missed (chest pain -> consider MI)',
  'Age and sex-specific conditions must be considered',
  'Patient comorbidities must influence differential ranking',
];
