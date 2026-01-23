/**
 * PatientState JSON Extractor
 *
 * Transforms raw transcripts into structured PatientState JSON objects
 * that can be consumed by the Prevention Hub's JSON-Logic rule engine.
 *
 * This module implements the critical data contract between AI Scribe
 * and Prevention Hub agents.
 *
 * @see @med-app/types for PatientState interface
 */

import { z } from 'zod';
import type { PatientState, PainPoint, VitalSigns } from '@med-app/types';
import { createEmptyPatientState } from '@med-app/types';
import { chat } from '@/lib/ai/chat';
import logger from '@/lib/logger';

// ============================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================

const PainPointSchema = z.object({
  location: z.string(),
  severity: z.number().min(1).max(10),
  description: z.string(),
  duration: z.string().optional(),
  characteristics: z.array(z.string()).optional(),
});

const VitalSignsSchema = z.object({
  bp_systolic: z.number().optional(),
  bp_diastolic: z.number().optional(),
  heart_rate: z.number().optional(),
  temperature: z.number().optional(),
  weight_kg: z.number().optional(),
  height_cm: z.number().optional(),
  a1c: z.number().optional(),
  ldl: z.number().optional(),
  hdl: z.number().optional(),
  creatinine: z.number().optional(),
  respiratory_rate: z.number().optional(),
  oxygen_saturation: z.number().optional(),
});

const PatientStateSchema = z.object({
  vitals: VitalSignsSchema,
  meds: z.array(z.string()),
  conditions: z.array(z.string()),
  symptoms: z.array(z.string()),
  painPoints: z.array(PainPointSchema),
  timestamp: z.string(),
  confidence: z.number().min(0).max(1),
});

// ============================================
// EXTRACTION PROMPT
// ============================================

const EXTRACTION_PROMPT = `You are a medical data extraction specialist. Extract structured medical information from the following clinical transcript.

IMPORTANT RULES:
1. Only extract information explicitly mentioned in the transcript
2. Do NOT hallucinate or invent any medical data
3. Use ICD-10 codes for conditions when possible (e.g., "E11.9" for Type 2 Diabetes)
4. Normalize medication names to generic names (e.g., "Glucophage" → "metformin")
5. Convert all vital sign values to standard units (BP in mmHg, temp in Celsius, weight in kg)
6. Pain severity should be on 1-10 scale
7. If a value is mentioned but unclear, do not include it

TRANSCRIPT:
---
{transcript}
---

Extract the following and return as JSON (no markdown, just raw JSON):
{
  "vitals": {
    "bp_systolic": number or null,
    "bp_diastolic": number or null,
    "heart_rate": number or null,
    "temperature": number or null (Celsius),
    "weight_kg": number or null,
    "height_cm": number or null,
    "a1c": number or null,
    "ldl": number or null,
    "hdl": number or null,
    "creatinine": number or null,
    "respiratory_rate": number or null,
    "oxygen_saturation": number or null
  },
  "meds": ["medication1", "medication2"],
  "conditions": ["ICD-10 code or condition name"],
  "symptoms": ["symptom1", "symptom2"],
  "painPoints": [
    {
      "location": "body part",
      "severity": 1-10,
      "description": "description of pain",
      "duration": "how long (optional)",
      "characteristics": ["sharp", "dull", "throbbing"] (optional)
    }
  ]
}

Return ONLY valid JSON with no explanations.`;

// ============================================
// FALLBACK REGEX-BASED EXTRACTION
// ============================================

/**
 * Deterministic fallback extraction using regex patterns
 * Used when LLM extraction fails or for validation
 */
function extractWithRegex(transcript: string): Partial<PatientState> {
  const lowerTranscript = transcript.toLowerCase();
  const result: Partial<PatientState> = {
    vitals: {},
    meds: [],
    conditions: [],
    symptoms: [],
    painPoints: [],
  };

  // Blood pressure patterns (e.g., "120/80", "pressão 140 por 90")
  const bpPattern = /(\d{2,3})\s*[\/por]\s*(\d{2,3})/gi;
  const bpMatch = bpPattern.exec(transcript);
  if (bpMatch) {
    result.vitals!.bp_systolic = parseInt(bpMatch[1]);
    result.vitals!.bp_diastolic = parseInt(bpMatch[2]);
  }

  // Heart rate patterns
  const hrPatterns = [
    /(?:heart rate|hr|fc|frequência cardíaca|pulso)[:\s]*(\d{2,3})/gi,
    /(\d{2,3})\s*(?:bpm|batimentos)/gi,
  ];
  for (const pattern of hrPatterns) {
    const match = pattern.exec(lowerTranscript);
    if (match) {
      result.vitals!.heart_rate = parseInt(match[1]);
      break;
    }
  }

  // Temperature patterns
  const tempPatterns = [
    /(?:temperature|temp|temperatura)[:\s]*(\d{2}(?:\.\d)?)/gi,
    /(\d{2}(?:\.\d)?)\s*(?:°c|celsius|graus)/gi,
  ];
  for (const pattern of tempPatterns) {
    const match = pattern.exec(lowerTranscript);
    if (match) {
      result.vitals!.temperature = parseFloat(match[1]);
      break;
    }
  }

  // A1C patterns
  const a1cPattern = /(?:a1c|hemoglobina glicada)[:\s]*(\d{1,2}(?:\.\d)?)/gi;
  const a1cMatch = a1cPattern.exec(lowerTranscript);
  if (a1cMatch) {
    result.vitals!.a1c = parseFloat(a1cMatch[1]);
  }

  // Common medications (Portuguese and English)
  const medicationPatterns = [
    'metformin', 'metformina', 'glucophage',
    'lisinopril', 'losartan', 'losartana',
    'atorvastatin', 'atorvastatina', 'lipitor',
    'omeprazol', 'omeprazole', 'pantoprazol',
    'aspirin', 'aspirina', 'aas',
    'insulin', 'insulina',
    'levothyroxine', 'levotiroxina',
    'amlodipine', 'amlodipino',
  ];

  result.meds = medicationPatterns.filter(med =>
    lowerTranscript.includes(med.toLowerCase())
  );

  // Common symptoms
  const symptomPatterns = [
    { pattern: /dor de cabeça|headache|cefaleia/gi, symptom: 'headache' },
    { pattern: /fadiga|fatigue|cansaço|tired/gi, symptom: 'fatigue' },
    { pattern: /tontura|dizziness|vertigo/gi, symptom: 'dizziness' },
    { pattern: /náusea|nausea/gi, symptom: 'nausea' },
    { pattern: /falta de ar|shortness of breath|dispneia/gi, symptom: 'dyspnea' },
    { pattern: /dor no peito|chest pain|dor torácica/gi, symptom: 'chest_pain' },
    { pattern: /tosse|cough/gi, symptom: 'cough' },
    { pattern: /febre|fever/gi, symptom: 'fever' },
    { pattern: /sede excessiva|increased thirst|polidipsia/gi, symptom: 'polydipsia' },
    { pattern: /urinar frequente|frequent urination|poliúria/gi, symptom: 'polyuria' },
  ];

  for (const { pattern, symptom } of symptomPatterns) {
    if (pattern.test(lowerTranscript)) {
      result.symptoms!.push(symptom);
    }
  }

  // Pain point extraction
  const painPatterns = [
    { pattern: /dor nas costas|back pain|lombalgia/gi, location: 'lower_back' },
    { pattern: /dor no joelho|knee pain/gi, location: 'knee' },
    { pattern: /dor abdominal|abdominal pain|dor no abdômen/gi, location: 'abdomen' },
    { pattern: /dor no ombro|shoulder pain/gi, location: 'shoulder' },
  ];

  for (const { pattern, location } of painPatterns) {
    if (pattern.test(lowerTranscript)) {
      result.painPoints!.push({
        location,
        severity: 5, // Default severity when not specified
        description: 'Extracted from transcript',
      });
    }
  }

  // ICD-10 condition mapping based on keywords
  const conditionPatterns = [
    { pattern: /diabetes|diabético|dm2/gi, condition: 'E11.9' }, // Type 2 DM
    { pattern: /hipertensão|hypertension|pressão alta/gi, condition: 'I10' }, // HTN
    { pattern: /hiperlipidemia|cholesterol alto|dislipidemia/gi, condition: 'E78.5' },
    { pattern: /asma|asthma/gi, condition: 'J45.9' },
    { pattern: /dpoc|copd/gi, condition: 'J44.9' },
    { pattern: /insuficiência cardíaca|heart failure/gi, condition: 'I50.9' },
    { pattern: /fibrilação atrial|atrial fibrillation|afib/gi, condition: 'I48.91' },
  ];

  for (const { pattern, condition } of conditionPatterns) {
    if (pattern.test(lowerTranscript)) {
      result.conditions!.push(condition);
    }
  }

  return result;
}

// ============================================
// MAIN EXTRACTION FUNCTION
// ============================================

export interface ExtractionOptions {
  useLLM?: boolean; // Whether to use LLM (default: true)
  validateWithRegex?: boolean; // Cross-validate with regex (default: true)
  provider?: 'gemini' | 'claude'; // LLM provider (default: gemini for cost)
}

/**
 * Extract PatientState from a clinical transcript
 *
 * Uses a two-phase approach:
 * 1. LLM extraction with Gemini Flash (cheap, fast)
 * 2. Regex-based validation/fallback for critical fields
 *
 * @param transcript - Raw transcript text
 * @param transcriptConfidence - Confidence score from transcription (0-1)
 * @param options - Extraction options
 * @returns Validated PatientState object
 */
export async function extractPatientState(
  transcript: string,
  transcriptConfidence: number = 0.9,
  options: ExtractionOptions = {}
): Promise<PatientState> {
  const {
    useLLM = true,
    validateWithRegex = true,
    provider = 'gemini',
  } = options;

  const startTime = performance.now();

  // If transcript is too short, return empty state
  if (transcript.trim().length < 50) {
    logger.warn({ event: 'extraction_skipped_short_transcript' });
    return createEmptyPatientState(0);
  }

  let extractedState: Partial<PatientState> = {};

  // Phase 1: LLM extraction
  if (useLLM) {
    try {
      const response = await chat({
        provider,
        messages: [
          {
            role: 'user',
            content: EXTRACTION_PROMPT.replace('{transcript}', transcript),
          },
        ],
        temperature: 0.1, // Low temperature for consistency
      });

      if (response.success && response.content) {
        // Parse JSON from response
        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);

          // Validate with Zod
          const validation = PatientStateSchema.safeParse({
            ...parsed,
            timestamp: new Date().toISOString(),
            confidence: transcriptConfidence,
          });

          if (validation.success) {
            extractedState = validation.data;
            logger.info({
              event: 'llm_extraction_success',
              provider,
              vitalsCount: Object.keys(parsed.vitals || {}).filter(k => parsed.vitals[k] != null).length,
              medsCount: (parsed.meds || []).length,
              conditionsCount: (parsed.conditions || []).length,
            });
          } else {
            logger.warn({
              event: 'llm_extraction_validation_failed',
              errors: validation.error.errors,
            });
          }
        }
      }
    } catch (error) {
      logger.error({
        event: 'llm_extraction_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Phase 2: Regex-based extraction/validation
  if (validateWithRegex || !extractedState.vitals) {
    const regexState = extractWithRegex(transcript);

    // If LLM extraction failed, use regex as fallback
    if (!extractedState.vitals || Object.keys(extractedState.vitals).length === 0) {
      extractedState = {
        ...extractedState,
        vitals: regexState.vitals || {},
        meds: regexState.meds || [],
        conditions: regexState.conditions || [],
        symptoms: regexState.symptoms || [],
        painPoints: regexState.painPoints || [],
      };
      logger.info({ event: 'regex_fallback_used' });
    } else {
      // Cross-validate: prefer LLM values but fill gaps with regex
      extractedState.vitals = {
        ...regexState.vitals,
        ...extractedState.vitals, // LLM values take precedence
      };

      // Merge arrays (deduplicate)
      extractedState.meds = [...new Set([
        ...(extractedState.meds || []),
        ...(regexState.meds || []),
      ])];
      extractedState.conditions = [...new Set([
        ...(extractedState.conditions || []),
        ...(regexState.conditions || []),
      ])];
      extractedState.symptoms = [...new Set([
        ...(extractedState.symptoms || []),
        ...(regexState.symptoms || []),
      ])];
    }
  }

  // Build final PatientState
  const finalState: PatientState = {
    vitals: extractedState.vitals || {},
    meds: extractedState.meds || [],
    conditions: extractedState.conditions || [],
    symptoms: extractedState.symptoms || [],
    painPoints: extractedState.painPoints || [],
    timestamp: new Date().toISOString(),
    confidence: transcriptConfidence,
  };

  const processingTime = Math.round(performance.now() - startTime);

  logger.info({
    event: 'patient_state_extraction_complete',
    processingTimeMs: processingTime,
    vitalsExtracted: Object.keys(finalState.vitals).filter(k => (finalState.vitals as Record<string, unknown>)[k] != null).length,
    medsExtracted: finalState.meds.length,
    conditionsExtracted: finalState.conditions.length,
    symptomsExtracted: finalState.symptoms.length,
    painPointsExtracted: finalState.painPoints.length,
  });

  return finalState;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Validate a PatientState object
 */
export function validatePatientState(state: unknown): state is PatientState {
  const result = PatientStateSchema.safeParse(state);
  return result.success;
}

/**
 * Merge two PatientState objects (newer values take precedence)
 */
export function mergePatientStates(
  older: PatientState,
  newer: PatientState
): PatientState {
  return {
    vitals: { ...older.vitals, ...newer.vitals },
    meds: [...new Set([...older.meds, ...newer.meds])],
    conditions: [...new Set([...older.conditions, ...newer.conditions])],
    symptoms: [...new Set([...older.symptoms, ...newer.symptoms])],
    painPoints: [...older.painPoints, ...newer.painPoints],
    timestamp: newer.timestamp,
    confidence: newer.confidence,
  };
}

/**
 * Get a summary of changes between two PatientStates
 */
export function getPatientStateDiff(
  before: PatientState,
  after: PatientState
): { added: Partial<PatientState>; removed: Partial<PatientState> } {
  const added: Partial<PatientState> = {
    meds: after.meds.filter(m => !before.meds.includes(m)),
    conditions: after.conditions.filter(c => !before.conditions.includes(c)),
    symptoms: after.symptoms.filter(s => !before.symptoms.includes(s)),
  };

  const removed: Partial<PatientState> = {
    meds: before.meds.filter(m => !after.meds.includes(m)),
    conditions: before.conditions.filter(c => !after.conditions.includes(c)),
    symptoms: before.symptoms.filter(s => !after.symptoms.includes(s)),
  };

  return { added, removed };
}

// ============================================
// EXPORTS
// ============================================

export {
  PatientStateSchema,
  VitalSignsSchema,
  PainPointSchema,
  extractWithRegex,
};
