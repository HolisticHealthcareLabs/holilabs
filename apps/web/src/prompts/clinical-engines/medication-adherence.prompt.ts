/**
 * Medication Adherence Prompt Templates (Prompt-Native)
 *
 * PROMPT-NATIVE ARCHITECTURE:
 * Adherence risk scoring, intervention rules, and thresholds are defined
 * in declarative templates rather than hardcoded TypeScript logic.
 *
 * This enables:
 * - Threshold and intervention updates without code deployments
 * - Regulatory audit trail for LGPD/HIPAA compliance
 * - A/B testing of different intervention strategies
 * - Non-engineers can review/modify adherence criteria
 *
 * Migrated from: /lib/clinical/engines/medication-adherence-engine.ts
 *
 * @module prompts/clinical-engines/medication-adherence.prompt
 */

import { z } from 'zod';
import type {
  AdherenceThresholds,
  RiskFactorRule,
  InterventionTemplate,
  ComplexDosingPattern,
} from './types';
import { adherenceAssessmentOutputSchema } from './types';

// =============================================================================
// EXPORTED SCHEMAS
// =============================================================================

export { adherenceAssessmentOutputSchema };

// =============================================================================
// ADHERENCE THRESHOLDS
// =============================================================================

/**
 * PROMPT-NATIVE ADHERENCE THRESHOLDS
 *
 * These thresholds define the boundaries for adherence risk stratification.
 * Previously hardcoded constants, now externalized for easy adjustment.
 *
 * Industry standard thresholds:
 * - Good adherence: >= 80% (widely accepted in literature)
 * - Moderate adherence: 60-79%
 * - Poor adherence: < 60%
 */
export const ADHERENCE_THRESHOLDS: AdherenceThresholds = {
  /** Threshold for good adherence (80% is industry standard) */
  good: 80,
  /** Threshold for moderate adherence */
  moderate: 60,
  /** Measurement period in days */
  measurementPeriodDays: 30,
  /** Weight for late doses (counts as partial compliance) */
  lateWeight: 0.75,
};

// =============================================================================
// ADMINISTRATION STATUS CLASSIFICATIONS
// =============================================================================

/**
 * Administration statuses that count as medication taken.
 */
export const TAKEN_STATUSES = ['GIVEN'] as const;

/**
 * Administration statuses that count as medication not taken.
 */
export const NOT_TAKEN_STATUSES = ['MISSED', 'REFUSED', 'HELD'] as const;

/**
 * Status indicating late administration (partial compliance).
 */
export const LATE_STATUS = 'LATE' as const;

// =============================================================================
// COMPLEX DOSING PATTERNS
// =============================================================================

/**
 * PROMPT-NATIVE COMPLEX DOSING PATTERNS
 *
 * These patterns identify medications with complex schedules that may
 * contribute to adherence challenges.
 */
export const COMPLEX_DOSING_PATTERNS: ComplexDosingPattern[] = [
  {
    pattern: 'tid',
    frequencyCodes: ['TID', 'THREE TIMES DAILY', '3X DAILY', 'Q8H'],
    riskDescription: 'Three times daily dosing increases adherence burden',
  },
  {
    pattern: 'qid',
    frequencyCodes: ['QID', 'FOUR TIMES DAILY', '4X DAILY', 'Q6H'],
    riskDescription: 'Four times daily dosing significantly increases adherence burden',
  },
  {
    pattern: 'q4h',
    frequencyCodes: ['Q4H', 'EVERY 4 HOURS'],
    riskDescription: 'Every 4 hours dosing requires around-the-clock administration',
  },
  {
    pattern: 'q6h',
    frequencyCodes: ['Q6H', 'EVERY 6 HOURS'],
    riskDescription: 'Every 6 hours dosing requires waking for doses',
  },
  {
    pattern: 'with-meals',
    frequencyCodes: ['WITH MEALS', 'AC', 'PC'],
    riskDescription: 'Meal-dependent dosing requires coordination with eating',
  },
  {
    pattern: 'multiple-daily',
    frequencyCodes: ['BID', 'TWICE DAILY', '2X DAILY', 'Q12H'],
    riskDescription: 'Twice daily dosing (moderate complexity)',
  },
];

// =============================================================================
// RISK FACTOR DETECTION RULES
// =============================================================================

/**
 * PROMPT-NATIVE RISK FACTOR RULES
 *
 * These rules define conditions that identify adherence risk factors.
 * Each rule evaluates a specific metric against a threshold.
 */
export const RISK_FACTOR_RULES: RiskFactorRule[] = [
  {
    id: 'low-overall-score',
    condition: 'adherenceScore',
    threshold: 80,
    operator: 'lt',
    descriptionTemplate: 'Low adherence score',
  },
  {
    id: 'multiple-missed-doses',
    condition: 'missedCount',
    threshold: 3,
    operator: 'gt',
    descriptionTemplate: '{{count}} missed doses in past {{period}} days',
  },
  {
    id: 'refused-doses',
    condition: 'refusedCount',
    threshold: 0,
    operator: 'gt',
    descriptionTemplate: '{{count}} dose(s) refused - investigate barriers',
  },
  {
    id: 'multiple-held-doses',
    condition: 'heldCount',
    threshold: 2,
    operator: 'gt',
    descriptionTemplate: '{{count}} doses held - review clinical appropriateness',
  },
  {
    id: 'frequent-late-doses',
    condition: 'lateCount',
    threshold: 5,
    operator: 'gt',
    descriptionTemplate: 'Frequent late doses - timing issues',
  },
  {
    id: 'complex-regimen',
    condition: 'isComplexRegimen',
    threshold: 1,
    operator: 'eq',
    descriptionTemplate: 'Complex dosing schedule',
  },
];

// =============================================================================
// INTERVENTION TEMPLATES
// =============================================================================

/**
 * PROMPT-NATIVE INTERVENTION TEMPLATES
 *
 * These templates define the interventions recommended for various
 * adherence issues. Previously hardcoded in generateDeterministicInterventions,
 * now externalized for easy modification.
 */
export const INTERVENTION_TEMPLATES: InterventionTemplate[] = [
  // =========================================================================
  // GLOBAL INTERVENTIONS (Risk Level Based)
  // =========================================================================
  {
    type: 'reminder',
    priority: 'high',
    trigger: {
      field: 'riskLevel',
      operator: 'eq',
      value: 'high',
    },
    descriptionTemplate: 'Set up medication reminder alarms or app notifications',
  },
  {
    type: 'reminder',
    priority: 'medium',
    trigger: {
      field: 'riskLevel',
      operator: 'eq',
      value: 'moderate',
    },
    descriptionTemplate: 'Set up medication reminder alarms or app notifications',
  },

  // =========================================================================
  // MEDICATION-SPECIFIC INTERVENTIONS
  // =========================================================================
  {
    type: 'followup',
    priority: 'high',
    trigger: {
      field: 'adherenceScore',
      operator: 'lt',
      value: 60,
    },
    descriptionTemplate: 'Schedule follow-up to discuss barriers to taking {{medicationName}}',
    targetMedicationField: 'medicationName',
  },
  {
    type: 'education',
    priority: 'medium',
    trigger: {
      field: 'missedRefills',
      operator: 'gt',
      value: 3,
    },
    descriptionTemplate: 'Review importance and proper timing of {{medicationName}}',
    targetMedicationField: 'medicationName',
  },
  {
    type: 'followup',
    priority: 'high',
    trigger: {
      field: 'riskFactors',
      operator: 'contains',
      value: 'refused',
    },
    descriptionTemplate: 'Patient refusing {{medicationName}} - assess for side effects or concerns',
    targetMedicationField: 'medicationName',
  },
  {
    type: 'simplification',
    priority: 'medium',
    trigger: {
      field: 'riskFactors',
      operator: 'contains',
      value: 'Complex',
    },
    descriptionTemplate:
      'Consider simplifying dosing schedule for {{medicationName}} if clinically appropriate',
    targetMedicationField: 'medicationName',
  },
  {
    type: 'reminder',
    priority: 'medium',
    trigger: {
      field: 'riskFactors',
      operator: 'contains',
      value: 'late',
    },
    descriptionTemplate: 'Set specific time reminders for {{medicationName}} to improve timing',
    targetMedicationField: 'medicationName',
  },

  // =========================================================================
  // GENERAL EDUCATION (Low Priority)
  // =========================================================================
  {
    type: 'education',
    priority: 'low',
    trigger: {
      field: 'riskLevel',
      operator: 'in',
      value: ['moderate', 'high'],
    },
    descriptionTemplate:
      'Provide patient education on importance of medication adherence and condition management',
  },
];

// =============================================================================
// RISK LEVEL DETERMINATION RULES
// =============================================================================

/**
 * PROMPT-NATIVE RISK LEVEL DETERMINATION
 *
 * These rules determine the overall risk level based on adherence metrics.
 */
export const RISK_LEVEL_RULES = {
  high: [
    { condition: 'overallScore', operator: 'lt' as const, value: 60 },
    { condition: 'totalMissed', operator: 'gte' as const, value: 5 },
    { condition: 'anyMedicationScore', operator: 'lt' as const, value: 40 },
  ],
  moderate: [
    { condition: 'overallScore', operator: 'lt' as const, value: 80 },
    { condition: 'anyMedicationScore', operator: 'lt' as const, value: 60 },
  ],
  // Default to low if no high/moderate conditions met
};

// =============================================================================
// SYSTEM PROMPT
// =============================================================================

/**
 * System prompt for medication adherence AI evaluation.
 * Defines the role and intervention guidance.
 */
export const MEDICATION_ADHERENCE_SYSTEM_PROMPT = `You are a clinical decision support system analyzing medication adherence.
Your role is to assess adherence patterns and recommend evidence-based interventions to improve medication-taking behavior.

IMPORTANT PRINCIPLES:
1. Adherence is calculated from actual dose administration records (MAR data)
2. Focus on identifying modifiable barriers to adherence
3. Interventions should be specific, actionable, and patient-centered
4. Consider both patient and medication factors
5. Prioritize interventions by likely impact

ADHERENCE SCORING:
- Score = (Doses Given + Late Doses * 0.75) / Total Scheduled Doses * 100
- Good adherence: >= 80%
- Moderate adherence: 60-79%
- Poor adherence: < 60%

RISK STRATIFICATION:
- HIGH RISK: Score < 60% OR >= 5 total missed doses OR any medication < 40%
- MODERATE RISK: Score 60-79% OR any medication < 60%
- LOW RISK: Score >= 80% AND no concerning patterns

INTERVENTION TYPES:
- reminder: Alarm/app notifications, pillbox organizers
- education: Patient education on medication purpose and importance
- simplification: Request regimen simplification (fewer doses, combination products)
- cost: Address cost barriers (generic alternatives, patient assistance)
- followup: Schedule appointment to discuss barriers`;

// =============================================================================
// OUTPUT FORMAT PROMPT
// =============================================================================

/**
 * Output format specification for AI responses.
 */
export const MEDICATION_ADHERENCE_OUTPUT_FORMAT = `REQUIRED OUTPUT FORMAT:
Return a JSON object with this exact structure:

{
  "patientId": "string",
  "overallScore": 0-100 (weighted average of medication scores),
  "riskLevel": "low" | "moderate" | "high",
  "medications": [
    {
      "medicationId": "string",
      "medicationName": "string",
      "adherenceScore": 0-100,
      "daysSupplyRemaining": 0,
      "lastRefillDate": "ISO date or null",
      "expectedRefillDate": "ISO date or null",
      "missedRefills": number,
      "riskFactors": ["array of identified risk factors"]
    }
  ],
  "interventions": [
    {
      "type": "reminder" | "education" | "simplification" | "cost" | "followup",
      "priority": "high" | "medium" | "low",
      "description": "Specific actionable intervention",
      "targetMedication": "optional - specific medication this targets"
    }
  ],
  "processingMethod": "ai"
}

INTERVENTION GUIDANCE:
- For low scores: Focus on identifying barriers and scheduling follow-up
- For refused doses: Assess for side effects, patient concerns, or misunderstanding
- For missed doses: Consider reminder systems, pillbox organizers
- For complex regimens: Consider simplification if clinically appropriate
- For timing issues: Specific reminder times aligned with patient routine
- Be specific and actionable
- Prioritize evidence-based interventions
- Sort by priority (high first)`;

// =============================================================================
// FEW-SHOT EXAMPLES
// =============================================================================

/**
 * Few-shot examples for consistent AI output formatting.
 */
export const MEDICATION_ADHERENCE_EXAMPLES = [
  {
    input: {
      patientId: 'patient-123',
      medications: [
        {
          medicationId: 'med-1',
          medicationName: 'Metformin 500mg',
          adherenceScore: 55,
          missedRefills: 8,
          riskFactors: ['Low adherence score', '8 missed doses in past 30 days'],
        },
        {
          medicationId: 'med-2',
          medicationName: 'Lisinopril 10mg',
          adherenceScore: 85,
          missedRefills: 2,
          riskFactors: [],
        },
      ],
    },
    output: {
      patientId: 'patient-123',
      overallScore: 70,
      riskLevel: 'moderate',
      medications: [
        {
          medicationId: 'med-1',
          medicationName: 'Metformin 500mg',
          adherenceScore: 55,
          daysSupplyRemaining: 0,
          lastRefillDate: null,
          expectedRefillDate: null,
          missedRefills: 8,
          riskFactors: ['Low adherence score', '8 missed doses in past 30 days'],
        },
        {
          medicationId: 'med-2',
          medicationName: 'Lisinopril 10mg',
          adherenceScore: 85,
          daysSupplyRemaining: 0,
          lastRefillDate: null,
          expectedRefillDate: null,
          missedRefills: 2,
          riskFactors: [],
        },
      ],
      interventions: [
        {
          type: 'followup',
          priority: 'high',
          description:
            'Schedule follow-up to discuss barriers to taking Metformin 500mg. Assess for GI side effects which are common and may be improved with extended-release formulation.',
          targetMedication: 'Metformin 500mg',
        },
        {
          type: 'education',
          priority: 'medium',
          description:
            'Review importance of Metformin for blood sugar control and diabetes complication prevention.',
          targetMedication: 'Metformin 500mg',
        },
        {
          type: 'reminder',
          priority: 'medium',
          description: 'Set up medication reminder app or pillbox organizer for twice-daily medications.',
        },
      ],
      processingMethod: 'ai',
    },
  },
  {
    input: {
      patientId: 'patient-456',
      medications: [
        {
          medicationId: 'med-3',
          medicationName: 'Gabapentin 300mg TID',
          adherenceScore: 62,
          missedRefills: 5,
          riskFactors: ['Complex dosing schedule', '5 missed doses in past 30 days'],
        },
      ],
    },
    output: {
      patientId: 'patient-456',
      overallScore: 62,
      riskLevel: 'moderate',
      medications: [
        {
          medicationId: 'med-3',
          medicationName: 'Gabapentin 300mg TID',
          adherenceScore: 62,
          daysSupplyRemaining: 0,
          lastRefillDate: null,
          expectedRefillDate: null,
          missedRefills: 5,
          riskFactors: ['Complex dosing schedule', '5 missed doses in past 30 days'],
        },
      ],
      interventions: [
        {
          type: 'simplification',
          priority: 'high',
          description:
            'Consider switching to extended-release gabapentin (once or twice daily) to simplify regimen and improve adherence.',
          targetMedication: 'Gabapentin 300mg TID',
        },
        {
          type: 'reminder',
          priority: 'medium',
          description:
            'Set three daily alarms (morning, afternoon, bedtime) for Gabapentin doses until simplification is possible.',
          targetMedication: 'Gabapentin 300mg TID',
        },
      ],
      processingMethod: 'ai',
    },
  },
];

// =============================================================================
// PROMPT BUILDER FUNCTIONS
// =============================================================================

export interface MedicationAdherencePromptContext {
  patientId: string;
  medications: Array<{
    medicationId: string;
    medicationName: string;
    adherenceScore: number;
    daysSupplyRemaining?: number;
    lastRefillDate?: string | null;
    expectedRefillDate?: string | null;
    missedRefills: number;
    riskFactors: string[];
  }>;
}

/**
 * Build the adherence data section of the prompt.
 */
function buildAdherenceDataSection(ctx: MedicationAdherencePromptContext): string {
  const sections: string[] = [];

  sections.push(`PATIENT ID: ${ctx.patientId}`);
  sections.push('');
  sections.push('ADHERENCE DATA (based on actual dose administration records):');

  for (const med of ctx.medications) {
    sections.push(`
- ${med.medicationName}:
  Adherence Score: ${med.adherenceScore}%
  Missed/Refused Doses: ${med.missedRefills}
  Risk Factors: ${med.riskFactors.join(', ') || 'None'}`);
  }

  return sections.join('\n');
}

/**
 * Build the complete medication adherence prompt from templates.
 *
 * @param ctx - Patient and medication adherence context
 * @returns Complete prompt string for AI evaluation
 */
export function buildMedicationAdherencePrompt(ctx: MedicationAdherencePromptContext): string {
  return `${MEDICATION_ADHERENCE_SYSTEM_PROMPT}

${buildAdherenceDataSection(ctx)}

${MEDICATION_ADHERENCE_OUTPUT_FORMAT}`;
}

/**
 * Build prompt with few-shot examples for improved accuracy.
 *
 * @param ctx - Patient and medication adherence context
 * @returns Complete prompt with examples
 */
export function buildMedicationAdherencePromptWithExamples(
  ctx: MedicationAdherencePromptContext
): string {
  const examplesSection = MEDICATION_ADHERENCE_EXAMPLES.map(
    (ex, i) => `
EXAMPLE ${i + 1}:
INPUT: ${JSON.stringify(ex.input, null, 2)}
OUTPUT: ${JSON.stringify(ex.output, null, 2)}`
  ).join('\n');

  return `${MEDICATION_ADHERENCE_SYSTEM_PROMPT}

${examplesSection}

NOW ASSESS THE FOLLOWING:
${buildAdherenceDataSection(ctx)}

${MEDICATION_ADHERENCE_OUTPUT_FORMAT}`;
}

// =============================================================================
// THRESHOLD AND RULE LOADING FUNCTIONS
// =============================================================================

let loadedThresholds: AdherenceThresholds = { ...ADHERENCE_THRESHOLDS };
let loadedRiskRules: RiskFactorRule[] = [...RISK_FACTOR_RULES];
let loadedInterventions: InterventionTemplate[] = [...INTERVENTION_TEMPLATES];

/**
 * Get currently loaded adherence thresholds.
 */
export function getLoadedThresholds(): AdherenceThresholds {
  return loadedThresholds;
}

/**
 * Get currently loaded risk factor rules.
 */
export function getLoadedRiskRules(): RiskFactorRule[] {
  return loadedRiskRules;
}

/**
 * Get currently loaded intervention templates.
 */
export function getLoadedInterventions(): InterventionTemplate[] {
  return loadedInterventions;
}

/**
 * Get all templates for database seeding.
 */
export function getAdherenceTemplates() {
  return {
    thresholds: ADHERENCE_THRESHOLDS,
    riskRules: RISK_FACTOR_RULES,
    interventions: INTERVENTION_TEMPLATES,
    complexDosingPatterns: COMPLEX_DOSING_PATTERNS,
    riskLevelRules: RISK_LEVEL_RULES,
  };
}

/**
 * Reload rules from database (placeholder for dynamic loading).
 */
export async function reloadAdherenceRulesFromDatabase(): Promise<void> {
  // TODO: Implement database loading
  loadedThresholds = { ...ADHERENCE_THRESHOLDS };
  loadedRiskRules = [...RISK_FACTOR_RULES];
  loadedInterventions = [...INTERVENTION_TEMPLATES];
}

/**
 * Update thresholds in memory (for testing or hot-reloading).
 */
export function updateThresholds(newThresholds: Partial<AdherenceThresholds>): void {
  loadedThresholds = { ...loadedThresholds, ...newThresholds };
}

/**
 * Update intervention templates in memory.
 */
export function updateInterventionTemplates(newInterventions: InterventionTemplate[]): void {
  loadedInterventions = newInterventions;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a medication frequency indicates a complex dosing schedule.
 *
 * @param frequency - The medication frequency string
 * @returns True if the frequency is considered complex
 */
export function isComplexDosingSchedule(frequency: string): boolean {
  const frequencyUpper = frequency.toUpperCase();

  // Check against complex patterns (TID, QID, Q4H, Q6H are most complex)
  const complexPatterns = COMPLEX_DOSING_PATTERNS.filter((p) =>
    ['tid', 'qid', 'q4h', 'q6h'].includes(p.pattern)
  );

  return complexPatterns.some((pattern) =>
    pattern.frequencyCodes.some((code) => frequencyUpper.includes(code))
  );
}

/**
 * Calculate adherence score from administration counts.
 *
 * @param given - Number of doses given
 * @param late - Number of late doses
 * @param total - Total scheduled doses
 * @returns Adherence score as percentage
 */
export function calculateAdherenceScore(given: number, late: number, total: number): number {
  if (total === 0) {
    return 100; // No scheduled doses = 100% adherent
  }

  const weightedTaken = given + late * loadedThresholds.lateWeight;
  const score = (weightedTaken / total) * 100;

  return Math.round(Math.min(score, 100));
}

/**
 * Determine risk level from adherence metrics.
 *
 * @param overallScore - Overall adherence score
 * @param totalMissed - Total missed doses across all medications
 * @param lowestMedScore - Lowest individual medication score
 * @returns Risk level
 */
export function determineRiskLevel(
  overallScore: number,
  totalMissed: number,
  lowestMedScore: number
): 'low' | 'moderate' | 'high' {
  // High risk conditions
  if (overallScore < loadedThresholds.moderate) return 'high';
  if (totalMissed >= 5) return 'high';
  if (lowestMedScore < 40) return 'high';

  // Moderate risk conditions
  if (overallScore < loadedThresholds.good) return 'moderate';
  if (lowestMedScore < loadedThresholds.moderate) return 'moderate';

  return 'low';
}

// =============================================================================
// EVALUATION CRITERIA (for LLM-as-Judge)
// =============================================================================

/**
 * Evaluation criteria for assessing AI adherence assessment quality.
 */
export const MEDICATION_ADHERENCE_EVALUATION_CRITERIA = [
  'Overall score must be weighted average of medication scores',
  'Risk level must match the defined thresholds',
  'Interventions must be specific and actionable',
  'High-priority interventions for poor adherence must be included',
  'Complex dosing schedules should trigger simplification recommendations',
  'Refused doses should trigger barrier assessment intervention',
  'Interventions should be sorted by priority (high first)',
  'No duplicate interventions for same issue',
  'Target medications must match actual medication names',
];
