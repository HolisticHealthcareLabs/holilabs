/**
 * Traffic Light Evaluation Prompt Templates
 *
 * PROMPT-NATIVE ARCHITECTURE:
 * The Traffic Light system's blocking logic is defined in prompts.
 * This enables:
 * - Regulatory rules can be updated without deployments
 * - Auditable decision logic for LGPD/HIPAA compliance
 * - A/B testing of different rule strictness levels
 */

// ═══════════════════════════════════════════════════════════════════════════
// TRAFFIC LIGHT EVALUATION PROMPT
// ═══════════════════════════════════════════════════════════════════════════

export interface TrafficLightPromptContext {
  patientId: string;
  action: 'order' | 'prescription' | 'procedure' | 'diagnosis' | 'billing';
  payload: Record<string, unknown>;
  patientContext: {
    allergies?: string[];
    currentMedications?: string[];
    diagnoses?: string[];
    labResults?: Array<{ name: string; value: number; unit: string; date: string }>;
    renalFunction?: { eGFR: number; creatinine: number };
    isPregnant?: boolean;
  };
}

export function buildTrafficLightPrompt(ctx: TrafficLightPromptContext): string {
  return `${TRAFFIC_LIGHT_SYSTEM_PROMPT}

ACTION: ${ctx.action.toUpperCase()}

PAYLOAD:
${JSON.stringify(ctx.payload, null, 2)}

PATIENT CONTEXT:
- Allergies: ${ctx.patientContext.allergies?.join(', ') || 'NKDA'}
- Current Medications: ${ctx.patientContext.currentMedications?.join(', ') || 'None'}
- Active Diagnoses: ${ctx.patientContext.diagnoses?.join(', ') || 'None documented'}
${ctx.patientContext.renalFunction ? `- Renal Function: eGFR ${ctx.patientContext.renalFunction.eGFR}, Cr ${ctx.patientContext.renalFunction.creatinine}` : ''}
${ctx.patientContext.isPregnant ? '- PREGNANCY STATUS: PREGNANT' : ''}

${TRAFFIC_LIGHT_RULES}

${TRAFFIC_LIGHT_OUTPUT_FORMAT}`;
}

const TRAFFIC_LIGHT_SYSTEM_PROMPT = `You are a Clinical Assurance System evaluating actions for safety and compliance.
Your job is to assign a Traffic Light signal (RED, YELLOW, GREEN) based on rule violations.

CRITICAL RESPONSIBILITY:
- RED signals BLOCK the action - use only for genuine safety/compliance issues
- YELLOW signals WARN but allow with justification
- GREEN signals allow the action to proceed

FALSE POSITIVES HURT WORKFLOW - only flag genuine issues.
FALSE NEGATIVES RISK PATIENT SAFETY - never miss dangerous situations.`;

const TRAFFIC_LIGHT_RULES = `EVALUATION RULES:

═══════════════════════════════════════════════════════════════════════════
CLINICAL RULES (Patient Safety)
═══════════════════════════════════════════════════════════════════════════

RED (Hard Block - Supervisor Required):
- LETHAL drug-drug interaction detected
- Documented allergy to prescribed medication
- Contraindicated medication for pregnancy (Category X)
- Dose exceeds known lethal threshold

YELLOW (Soft Block - Justification Required):
- SEVERE drug-drug interaction detected
- Dose exceeds maximum recommended (but not lethal)
- Off-label use without documented indication
- Missing required monitoring labs
- Renal dose adjustment needed but not applied

GREEN:
- No clinical safety issues detected
- Appropriate for patient condition

═══════════════════════════════════════════════════════════════════════════
ADMINISTRATIVE RULES (Documentation)
═══════════════════════════════════════════════════════════════════════════

YELLOW (Documentation Required):
- Missing informed consent for procedure
- Missing LGPD data consent
- Incomplete documentation (missing required fields)
- Authorization expired or expiring within 24h

GREEN:
- All documentation complete

═══════════════════════════════════════════════════════════════════════════
BILLING RULES (Revenue Integrity - Brazilian TISS)
═══════════════════════════════════════════════════════════════════════════

RED (Hard Block - Will Cause Glosa):
- Invalid TISS code for procedure
- Procedure explicitly excluded by patient's plan
- OPME without required prior authorization

YELLOW (High Glosa Risk):
- CID-10 code doesn't support procedure (compatibility issue)
- Missing supporting documentation for audit
- High historical glosa rate for this code combination

GREEN:
- Billing codes valid and supported`;

const TRAFFIC_LIGHT_OUTPUT_FORMAT = `OUTPUT FORMAT:
{
  "color": "RED" | "YELLOW" | "GREEN",
  "signals": [
    {
      "ruleId": "Unique rule identifier",
      "ruleName": "Human-readable rule name",
      "category": "CLINICAL" | "ADMINISTRATIVE" | "BILLING",
      "color": "RED" | "YELLOW" | "GREEN",
      "message": "English explanation",
      "messagePortuguese": "Explicação em português",
      "regulatoryReference": "ANVISA RDC, ANS normative, or TISS code",
      "evidence": ["Specific evidence from patient context"],
      "estimatedGlosaRisk": {
        "probability": 0.0-1.0,
        "estimatedAmount": "R$ value at risk",
        "denialCode": "Expected glosa code"
      },
      "suggestedCorrection": "How to fix the issue"
    }
  ],
  "canOverride": true/false,
  "overrideRequires": "justification" | "supervisor" | "blocked",
  "totalGlosaRisk": {
    "probability": 0.0-1.0,
    "totalAmountAtRisk": "R$ sum",
    "highestRiskCode": "Most risky code"
  }
}

RULES:
- Color = worst color from all signals (RED > YELLOW > GREEN)
- Every signal MUST have Portuguese translation (LGPD requirement)
- Include regulatory reference for audit trail
- Estimate glosa risk for BILLING category signals`;

// ═══════════════════════════════════════════════════════════════════════════
// ALLERGY CHECK PROMPT
// ═══════════════════════════════════════════════════════════════════════════

export interface AllergyCheckContext {
  medication: string;
  documentedAllergies: string[];
}

export function buildAllergyCheckPrompt(ctx: AllergyCheckContext): string {
  return `Check if the medication has allergy concerns:

MEDICATION: ${ctx.medication}

DOCUMENTED ALLERGIES:
${ctx.documentedAllergies.map(a => `- ${a}`).join('\n')}

Consider:
1. Direct match (medication IS the allergen)
2. Cross-reactivity (e.g., penicillin → amoxicillin)
3. Drug class allergies (e.g., "sulfa drugs")
4. Excipient allergies (e.g., lactose, gluten)

OUTPUT:
{
  "hasAllergyRisk": true/false,
  "matchType": "direct" | "cross-reactive" | "class" | "excipient" | "none",
  "allergen": "The matched allergen",
  "severity": "LETHAL" | "SEVERE" | "MODERATE" | "MILD",
  "recommendation": "Clinical recommendation",
  "canOverride": true/false
}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// CLINICAL ALERT AGGREGATION PROMPT
// ═══════════════════════════════════════════════════════════════════════════

export const ALERT_AGGREGATION_PROMPT = `Given multiple clinical signals, determine the aggregate risk level and prioritize alerts.

AGGREGATION RULES:
1. Overall color = worst color (RED > YELLOW > GREEN)
2. Sort signals by: severity (descending), then category (CLINICAL > BILLING > ADMINISTRATIVE)
3. Deduplicate similar alerts
4. Combine related billing signals into single glosa risk assessment

PRIORITIZATION:
- Patient safety alerts always first
- Actionable alerts before informational
- Higher probability issues before lower`;
