/**
 * Clinical Diagnosis Prompt Templates
 *
 * PROMPT-NATIVE ARCHITECTURE:
 * These templates define clinical decision behavior in natural language.
 * Changing clinical logic requires editing prompts, NOT TypeScript code.
 *
 * Benefits:
 * - Non-engineers can review/modify clinical reasoning
 * - A/B testing different prompt strategies
 * - Version control of clinical logic separate from code
 * - Regulatory audit trail of decision-making rules
 */

// ═══════════════════════════════════════════════════════════════════════════
// DIAGNOSIS SUPPORT PROMPT
// ═══════════════════════════════════════════════════════════════════════════

export interface DiagnosisPromptContext {
  chiefComplaint: string;
  duration?: string;
  severity?: 'mild' | 'moderate' | 'severe';
  associatedSymptoms?: string[];
  aggravatingFactors?: string[];
  relievingFactors?: string[];
  patientAge?: number;
  patientSex?: string;
  chronicConditions?: string[];
  currentMedications?: string[];
  allergies?: string[];
  hasDiabetes?: boolean;
  hasHypertension?: boolean;
  isSmoker?: boolean;
}

/**
 * Builds the diagnosis support prompt from template
 * All clinical reasoning rules are defined HERE, not in TypeScript logic
 */
export function buildDiagnosisPrompt(ctx: DiagnosisPromptContext): string {
  return `${DIAGNOSIS_SYSTEM_PROMPT}

${buildPatientPresentation(ctx)}

${DIAGNOSIS_CLINICAL_GUIDANCE}

${DIAGNOSIS_OUTPUT_FORMAT}`;
}

const DIAGNOSIS_SYSTEM_PROMPT = `You are a clinical decision support system trained on evidence-based medicine guidelines.
Your role is to generate differential diagnoses that help clinicians consider possible conditions.

IMPORTANT SAFETY PRINCIPLES:
1. You provide SUPPORT, not diagnosis. The physician makes all final decisions.
2. Always consider dangerous conditions first (don't miss emergencies).
3. Be conservative with probabilities - clinical diagnosis is inherently uncertain.
4. Include red flags that warrant immediate attention.
5. Suggest appropriate workup to narrow the differential.`;

function buildPatientPresentation(ctx: DiagnosisPromptContext): string {
  const sections: string[] = ['PATIENT PRESENTATION:'];

  sections.push(`Chief Complaint: ${ctx.chiefComplaint}`);
  sections.push(`Duration: ${ctx.duration || 'Not specified'}`);
  sections.push(`Severity: ${ctx.severity || 'Not specified'}`);
  sections.push(`Associated Symptoms: ${ctx.associatedSymptoms?.join(', ') || 'None reported'}`);
  sections.push(`Aggravating Factors: ${ctx.aggravatingFactors?.join(', ') || 'None'}`);
  sections.push(`Relieving Factors: ${ctx.relievingFactors?.join(', ') || 'None'}`);

  if (ctx.patientAge || ctx.patientSex || ctx.chronicConditions?.length) {
    sections.push('');
    sections.push('PATIENT CONTEXT:');
    if (ctx.patientAge) sections.push(`Age: ${ctx.patientAge}`);
    if (ctx.patientSex) sections.push(`Sex: ${ctx.patientSex}`);
    if (ctx.chronicConditions?.length) {
      sections.push(`Chronic Conditions: ${ctx.chronicConditions.join(', ')}`);
    }
    if (ctx.currentMedications?.length) {
      sections.push(`Current Medications: ${ctx.currentMedications.join(', ')}`);
    }
    if (ctx.allergies?.length) {
      sections.push(`Allergies: ${ctx.allergies.join(', ')}`);
    }
    if (ctx.hasDiabetes) sections.push('History of Diabetes: Yes');
    if (ctx.hasHypertension) sections.push('History of Hypertension: Yes');
    if (ctx.isSmoker) sections.push('Smoking Status: Current smoker');
  }

  return sections.join('\n');
}

const DIAGNOSIS_CLINICAL_GUIDANCE = `CLINICAL REASONING GUIDELINES:

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

const DIAGNOSIS_OUTPUT_FORMAT = `REQUIRED OUTPUT FORMAT:
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
- Workup suggestions must be evidence-based`;

// ═══════════════════════════════════════════════════════════════════════════
// EVALUATION CRITERIA (for LLM-as-Judge)
// ═══════════════════════════════════════════════════════════════════════════

export const DIAGNOSIS_EVALUATION_CRITERIA = [
  'All ICD-10 codes must be valid and match diagnosis names',
  'Probabilities must sum to reasonable total (< 1.5 for top 5)',
  'Red flags must be clinically appropriate for the condition',
  'Workup suggestions must be evidence-based',
  'Urgency level must match clinical severity',
  'Dangerous conditions must not be missed (chest pain → consider MI)',
  'Age and sex-specific conditions must be considered',
];

// ═══════════════════════════════════════════════════════════════════════════
// URGENCY DETERMINATION PROMPT
// ═══════════════════════════════════════════════════════════════════════════

export const URGENCY_DETERMINATION_PROMPT = `Given the following differential diagnoses, determine the clinical urgency level.

URGENCY LEVELS:
- EMERGENT: Any of the following present:
  * Acute myocardial infarction (I21.x)
  * Stroke (I60.x, I61.x, I63.x)
  * Respiratory failure (J96.x)
  * Shock (R57.x)
  * ARDS (J80)
  * GI hemorrhage (K92.2)
  * Active suicidal ideation
  * Severe allergic reaction

- URGENT: Any of the following present:
  * Red flags with significant probability (>30%)
  * High-probability cardiovascular condition
  * High-probability respiratory condition
  * High-probability GI condition
  * Signs of infection with instability

- ROUTINE: All conditions are:
  * Stable chronic conditions
  * Self-limiting conditions
  * Low-risk presentations
  * No red flags identified

Return: "emergent" | "urgent" | "routine"`;
