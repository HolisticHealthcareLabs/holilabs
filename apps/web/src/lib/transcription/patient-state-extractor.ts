/**
 * PatientState Extractor
 *
 * Extracts structured clinical data from medical transcripts using AI.
 * Uses Gemini Flash for fast, cheap extraction with processWithFallback pattern.
 *
 * Input: Raw transcript text (from Deepgram or other source)
 * Output: Structured PatientState with vitals, medications, symptoms, etc.
 *
 * This follows the Hybrid Core pattern (Law 4):
 * - AI extracts unstructured → structured
 * - Deterministic fallback if AI fails
 * - All outputs validated via Zod schemas
 */

import { z } from 'zod';
import { processWithFallback, type ProcessingResult } from '@/lib/clinical/process-with-fallback';
import logger from '@/lib/logger';

// ═══════════════════════════════════════════════════════════════
// SCHEMAS
// ═══════════════════════════════════════════════════════════════

/**
 * Pain point schema
 */
const painPointSchema = z.object({
  location: z.string().describe('Body location of pain'),
  severity: z.number().min(0).max(10).describe('Pain severity 0-10'),
  description: z.string().optional().describe('Pain description'),
  duration: z.string().optional().describe('How long pain has been present'),
});

/**
 * Vital sign schema
 */
const vitalSignSchema = z.object({
  systolicBp: z.number().optional().describe('Systolic blood pressure mmHg'),
  diastolicBp: z.number().optional().describe('Diastolic blood pressure mmHg'),
  heartRate: z.number().optional().describe('Heart rate BPM'),
  temperature: z.number().optional().describe('Temperature in Celsius'),
  oxygenSaturation: z.number().optional().describe('SpO2 percentage'),
  respiratoryRate: z.number().optional().describe('Breaths per minute'),
  weight: z.number().optional().describe('Weight in kg'),
  height: z.number().optional().describe('Height in cm'),
});

/**
 * Lab value mentioned in transcript
 */
const labValueSchema = z.object({
  name: z.string().describe('Lab test name'),
  value: z.number().describe('Lab value'),
  unit: z.string().optional().describe('Unit of measurement'),
  isAbnormal: z.boolean().optional().describe('Whether value is outside normal range'),
});

/**
 * Medication mentioned in transcript
 */
const mentionedMedicationSchema = z.object({
  name: z.string().describe('Medication name'),
  dose: z.string().optional().describe('Dosage'),
  frequency: z.string().optional().describe('How often taken'),
  isNew: z.boolean().optional().describe('Whether newly prescribed'),
  isDiscontinued: z.boolean().optional().describe('Whether being stopped'),
});

/**
 * Full PatientState schema
 */
export const patientStateSchema = z.object({
  // Chief complaint
  chiefComplaint: z.string().optional().describe('Primary reason for visit'),

  // Vitals extracted from transcript
  vitals: vitalSignSchema.optional(),

  // Current medications mentioned
  medications: z.array(mentionedMedicationSchema).default([]),

  // Conditions/diagnoses mentioned
  conditions: z.array(z.string()).default([]),

  // Symptoms described
  symptoms: z.array(z.string()).default([]),

  // Pain points
  painPoints: z.array(painPointSchema).default([]),

  // Lab values mentioned
  labs: z.array(labValueSchema).default([]),

  // Allergies mentioned
  allergies: z.array(z.string()).default([]),

  // Social history elements
  socialHistory: z.object({
    smokingStatus: z.enum(['never', 'former', 'current', 'unknown']).optional(),
    alcoholUse: z.string().optional(),
    exerciseFrequency: z.string().optional(),
    occupation: z.string().optional(),
  }).optional(),

  // Follow-up instructions mentioned
  followUp: z.object({
    recommended: z.boolean().optional(),
    timeframe: z.string().optional(),
    reason: z.string().optional(),
  }).optional(),

  // Extraction quality indicator
  extractionQuality: z.enum(['complete', 'partial', 'uncertain']).default('uncertain'),

  // Confidence in extraction (0-1)
  confidence: z.number().min(0).max(1).default(0.5),
});

export type PatientState = z.infer<typeof patientStateSchema>;

// ═══════════════════════════════════════════════════════════════
// EXTRACTION PROMPT
// ═══════════════════════════════════════════════════════════════

const EXTRACTION_PROMPT = `You are a medical data extraction assistant. Extract structured clinical information from the following medical consultation transcript.

INSTRUCTIONS:
- Extract ONLY information explicitly mentioned in the transcript
- Do NOT infer or assume information not stated
- Convert values to standard units (BP in mmHg, temp in Celsius, weight in kg)
- Set extractionQuality to:
  - "complete" if most expected clinical data is present
  - "partial" if some data is missing but core info is there
  - "uncertain" if transcript is ambiguous or very limited
- Set confidence based on clarity of the transcript (0-1)

TRANSCRIPT:
`;

// ═══════════════════════════════════════════════════════════════
// MAIN EXTRACTOR
// ═══════════════════════════════════════════════════════════════

/**
 * Extract PatientState from a medical transcript
 *
 * @param transcript - Raw transcript text from Deepgram or other source
 * @param options - Optional configuration
 * @returns ProcessingResult with PatientState
 *
 * @example
 * const result = await extractPatientState(
 *   "Doctor: What brings you in today?\nPatient: I've had chest pain for 2 days..."
 * );
 *
 * console.log(result.data.chiefComplaint); // "chest pain"
 * console.log(result.data.painPoints); // [{ location: "chest", severity: 6, duration: "2 days" }]
 */
export async function extractPatientState(
  transcript: string,
  options?: {
    clinicId?: string;
    language?: string;
  }
): Promise<ProcessingResult<PatientState>> {
  const startTime = Date.now();

  logger.info({
    event: 'patient_state_extraction_start',
    transcriptLength: transcript.length,
    language: options?.language,
  });

  // Build the full prompt
  const prompt = EXTRACTION_PROMPT + transcript;

  // Use processWithFallback for reliable extraction
  const result = await processWithFallback(
    prompt,
    patientStateSchema,
    () => createEmptyPatientState(),
    {
      task: 'clinical-notes', // Uses scribe flag
      confidenceThreshold: 0.6,
      timeoutMs: 10000,
      clinicId: options?.clinicId,
      systemPrompt: `You are a medical data extraction specialist.
Extract structured clinical data from medical transcripts.
Return valid JSON matching the schema. Be conservative - only extract what is explicitly stated.`,
    }
  );

  const extractionTimeMs = Date.now() - startTime;

  logger.info({
    event: 'patient_state_extraction_complete',
    method: result.method,
    confidence: result.confidence,
    extractionQuality: result.data.extractionQuality,
    extractionTimeMs,
    symptomsCount: result.data.symptoms.length,
    medicationsCount: result.data.medications.length,
    conditionsCount: result.data.conditions.length,
  });

  return result;
}

/**
 * Extract PatientState from speaker-segmented transcript
 * More accurate as it can distinguish doctor/patient speech
 */
export async function extractPatientStateFromSegments(
  segments: Array<{ speaker: string; text: string; role?: string }>,
  options?: {
    clinicId?: string;
    language?: string;
  }
): Promise<ProcessingResult<PatientState>> {
  // Format segments with speaker labels
  const formattedTranscript = segments
    .map((seg) => {
      const label = seg.role || seg.speaker;
      return `${label}: ${seg.text}`;
    })
    .join('\n');

  return extractPatientState(formattedTranscript, options);
}

// ═══════════════════════════════════════════════════════════════
// FALLBACK
// ═══════════════════════════════════════════════════════════════

/**
 * Create an empty PatientState as fallback
 * MUST NEVER FAIL - this is the safety net
 */
function createEmptyPatientState(): PatientState {
  return {
    chiefComplaint: undefined,
    vitals: undefined,
    medications: [],
    conditions: [],
    symptoms: [],
    painPoints: [],
    labs: [],
    allergies: [],
    socialHistory: undefined,
    followUp: undefined,
    extractionQuality: 'uncertain',
    confidence: 0,
  };
}

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Merge multiple PatientState objects (e.g., from multiple transcript segments)
 */
export function mergePatientStates(...states: PatientState[]): PatientState {
  const merged = createEmptyPatientState();

  for (const state of states) {
    // Take first non-empty chief complaint
    if (!merged.chiefComplaint && state.chiefComplaint) {
      merged.chiefComplaint = state.chiefComplaint;
    }

    // Merge vitals (prefer later values)
    if (state.vitals) {
      merged.vitals = { ...merged.vitals, ...state.vitals };
    }

    // Merge arrays (deduplicate)
    merged.medications.push(...state.medications);
    merged.conditions.push(...state.conditions);
    merged.symptoms.push(...state.symptoms);
    merged.painPoints.push(...state.painPoints);
    merged.labs.push(...state.labs);
    merged.allergies.push(...state.allergies);

    // Merge social history
    if (state.socialHistory) {
      merged.socialHistory = { ...merged.socialHistory, ...state.socialHistory };
    }

    // Merge follow-up
    if (state.followUp) {
      merged.followUp = { ...merged.followUp, ...state.followUp };
    }
  }

  // Deduplicate simple arrays
  merged.conditions = [...new Set(merged.conditions)];
  merged.symptoms = [...new Set(merged.symptoms)];
  merged.allergies = [...new Set(merged.allergies)];

  // Set quality based on content richness
  const hasContent =
    merged.chiefComplaint ||
    merged.vitals ||
    merged.medications.length > 0 ||
    merged.symptoms.length > 0;

  merged.extractionQuality = hasContent ? 'partial' : 'uncertain';
  merged.confidence = hasContent ? 0.6 : 0.3;

  return merged;
}

/**
 * Validate PatientState completeness for clinical use
 */
export function validatePatientStateCompleteness(state: PatientState): {
  isComplete: boolean;
  missingFields: string[];
  recommendations: string[];
} {
  const missingFields: string[] = [];
  const recommendations: string[] = [];

  if (!state.chiefComplaint) {
    missingFields.push('chiefComplaint');
    recommendations.push('Ask patient about primary reason for visit');
  }

  if (!state.vitals || Object.keys(state.vitals).length === 0) {
    missingFields.push('vitals');
    recommendations.push('Record vital signs');
  }

  if (state.medications.length === 0) {
    missingFields.push('medications');
    recommendations.push('Review current medications');
  }

  if (state.allergies.length === 0) {
    recommendations.push('Confirm allergy status (NKDA if none)');
  }

  return {
    isComplete: missingFields.length === 0,
    missingFields,
    recommendations,
  };
}
