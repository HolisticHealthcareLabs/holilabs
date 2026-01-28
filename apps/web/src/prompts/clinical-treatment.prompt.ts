/**
 * Clinical Treatment Prompt Templates
 *
 * PROMPT-NATIVE ARCHITECTURE:
 * Treatment recommendations are defined in natural language prompts.
 * This enables:
 * - Clinical guidelines can be updated without code changes
 * - Regulatory compliance through prompt versioning
 * - A/B testing of different recommendation strategies
 */

// ═══════════════════════════════════════════════════════════════════════════
// TREATMENT RECOMMENDATION PROMPT
// ═══════════════════════════════════════════════════════════════════════════

export interface TreatmentPromptContext {
  conditionIcd10: string;
  conditionName?: string;
  patientAge?: number;
  patientSex?: string;
  currentDiagnoses?: Array<{ icd10Code: string; name: string }>;
  currentMedications?: Array<{ name: string; dose?: string }>;
  allergies?: string[];
  recentLabs?: Array<{ name: string; value: number; unit: string }>;
  hasDiabetes?: boolean;
  hasHypertension?: boolean;
  hasRenalDisease?: boolean;
  hasHepaticDisease?: boolean;
  isPregnant?: boolean;
  eGFR?: number;
}

/**
 * Builds the treatment recommendation prompt from template
 */
export function buildTreatmentPrompt(ctx: TreatmentPromptContext): string {
  return `${TREATMENT_SYSTEM_PROMPT}

${buildConditionContext(ctx)}

${TREATMENT_CLINICAL_GUIDANCE}

${TREATMENT_OUTPUT_FORMAT}`;
}

const TREATMENT_SYSTEM_PROMPT = `You are a clinical decision support system specializing in evidence-based treatment recommendations.
Your role is to suggest guideline-concordant therapies while considering patient-specific factors.

IMPORTANT SAFETY PRINCIPLES:
1. You provide RECOMMENDATIONS, not orders. The physician prescribes.
2. Always cite guideline sources (ACC/AHA, ADA, USPSTF, etc.)
3. Consider allergies and contraindications FIRST
4. Adjust for renal/hepatic function when applicable
5. Check for drug-drug interactions
6. Include appropriate monitoring for all medications`;

function buildConditionContext(ctx: TreatmentPromptContext): string {
  const sections: string[] = [];

  sections.push(`CONDITION TO TREAT: ${ctx.conditionIcd10}${ctx.conditionName ? ` (${ctx.conditionName})` : ''}`);
  sections.push('');
  sections.push('PATIENT FACTORS:');

  if (ctx.patientAge) sections.push(`Age: ${ctx.patientAge}`);
  if (ctx.patientSex) sections.push(`Sex: ${ctx.patientSex}`);

  if (ctx.currentDiagnoses?.length) {
    sections.push(`Comorbidities: ${ctx.currentDiagnoses.map(d => `${d.icd10Code}: ${d.name}`).join(', ')}`);
  }

  if (ctx.currentMedications?.length) {
    sections.push(`Current Medications: ${ctx.currentMedications.map(m => `${m.name}${m.dose ? ` ${m.dose}` : ''}`).join(', ')}`);
  }

  sections.push(`Allergies: ${ctx.allergies?.length ? ctx.allergies.join(', ') : 'NKDA'}`);

  if (ctx.recentLabs?.length) {
    sections.push(`Recent Labs: ${ctx.recentLabs.map(l => `${l.name}: ${l.value} ${l.unit}`).join(', ')}`);
  }

  // Special considerations
  const considerations: string[] = [];
  if (ctx.hasDiabetes) considerations.push('Diabetes');
  if (ctx.hasHypertension) considerations.push('Hypertension');
  if (ctx.hasRenalDisease) considerations.push('Renal Disease');
  if (ctx.hasHepaticDisease) considerations.push('Hepatic Disease');
  if (ctx.isPregnant) considerations.push('PREGNANT');
  if (considerations.length) {
    sections.push(`Special Considerations: ${considerations.join(', ')}`);
  }

  if (ctx.eGFR) {
    sections.push(`eGFR: ${ctx.eGFR} mL/min/1.73m²`);
  }

  return sections.join('\n');
}

const TREATMENT_CLINICAL_GUIDANCE = `TREATMENT RECOMMENDATION GUIDELINES:

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

const TREATMENT_OUTPUT_FORMAT = `REQUIRED OUTPUT FORMAT:
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

// ═══════════════════════════════════════════════════════════════════════════
// EVALUATION CRITERIA (for LLM-as-Judge)
// ═══════════════════════════════════════════════════════════════════════════

export const TREATMENT_EVALUATION_CRITERIA = [
  'Treatment recommendations must cite evidence sources',
  'Medication dosages must be within safe ranges',
  'Contraindications must be comprehensive and accurate',
  'Evidence grades must match cited guidelines',
  'No hallucinated medications or RxNorm codes',
  'Renal/hepatic adjustments must be appropriate for stated function',
  'Drug interactions with current medications must be considered',
  'Allergies must be respected - never recommend allergen',
];

// ═══════════════════════════════════════════════════════════════════════════
// DRUG INTERACTION PROMPT
// ═══════════════════════════════════════════════════════════════════════════

export interface DrugInteractionContext {
  proposedMedication: string;
  currentMedications: string[];
}

export function buildDrugInteractionPrompt(ctx: DrugInteractionContext): string {
  return `${DRUG_INTERACTION_SYSTEM_PROMPT}

PROPOSED MEDICATION: ${ctx.proposedMedication}

CURRENT MEDICATIONS:
${ctx.currentMedications.map(m => `- ${m}`).join('\n')}

${DRUG_INTERACTION_OUTPUT_FORMAT}`;
}

const DRUG_INTERACTION_SYSTEM_PROMPT = `You are a clinical pharmacology expert specializing in drug-drug interactions.
Analyze the proposed medication against the current medication list.

INTERACTION SEVERITY LEVELS:
- LETHAL: Known to cause death, absolutely contraindicated
- SEVERE: Major harm likely, generally avoid
- MODERATE: Clinical significance, monitor closely
- MILD: Minor clinical effect, usually acceptable
- NONE: No known interaction`;

const DRUG_INTERACTION_OUTPUT_FORMAT = `OUTPUT FORMAT:
{
  "interactions": [
    {
      "drug1": "Proposed medication",
      "drug2": "Interacting medication",
      "severity": "LETHAL" | "SEVERE" | "MODERATE" | "MILD" | "NONE",
      "mechanism": "Pharmacological mechanism",
      "clinicalEffect": "What happens clinically",
      "recommendation": "Clinical recommendation"
    }
  ],
  "overallSeverity": "Highest severity found",
  "canProceed": true/false,
  "warnings": ["List of clinical warnings"]
}`;

// ═══════════════════════════════════════════════════════════════════════════
// DOSE VALIDATION PROMPT
// ═══════════════════════════════════════════════════════════════════════════

export interface DoseValidationContext {
  medication: string;
  proposedDose: string;
  patientWeight?: number;
  patientAge?: number;
  eGFR?: number;
  indication?: string;
}

export function buildDoseValidationPrompt(ctx: DoseValidationContext): string {
  return `Validate the following medication dose:

MEDICATION: ${ctx.medication}
PROPOSED DOSE: ${ctx.proposedDose}
${ctx.indication ? `INDICATION: ${ctx.indication}` : ''}

PATIENT FACTORS:
${ctx.patientWeight ? `Weight: ${ctx.patientWeight} kg` : ''}
${ctx.patientAge ? `Age: ${ctx.patientAge}` : ''}
${ctx.eGFR ? `eGFR: ${ctx.eGFR} mL/min/1.73m²` : ''}

Respond with:
{
  "isValid": true/false,
  "recommendedDose": "Appropriate dose if different",
  "minDose": "Minimum effective dose",
  "maxDose": "Maximum safe dose",
  "adjustmentReason": "Why adjustment needed if applicable",
  "warnings": ["Any dose-related warnings"]
}`;
}
