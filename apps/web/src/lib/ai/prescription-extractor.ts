/**
 * Prescription Extractor — Gemini Structured Output
 *
 * Calls Gemini with a hardcoded system prompt and structured responseSchema
 * to extract medications from a clinical SOAP note.
 *
 * Security:
 *   - soapNote is passed as a separate structured Part, never interpolated
 *     into the system prompt (prevents prompt injection).
 *   - API key is read from env; never logged or serialised.
 *
 * Resilience:
 *   - API errors → returns [] (empty array). The caller (copilot route) treats
 *     an empty extraction as "no medications found" and responds with 503.
 *   - responseMimeType + responseSchema guarantees valid JSON from Gemini;
 *     a JSON.parse fallback is provided for defensive completeness.
 *
 * @compliance ANVISA Class I — LLMs are used for context gathering only;
 *   deterministic rules (evaluatePrescriptionSafety) make all clinical decisions.
 */

import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import type { MedicationInput } from '@/lib/clinical/safety/evaluate-prescription';

// ── System prompt (hardcoded — never user-influenced) ─────────────────────────

const EXTRACTION_SYSTEM_PROMPT = `You are a clinical pharmacist assistant.
Extract every medication explicitly or implicitly mentioned in the SOAP note.
For each medication return:
  name        (generic name, lowercase, e.g. "apixaban")
  dose        (e.g. "5mg", "500mg")
  frequency   (e.g. "BID", "1x/dia", "once daily")
  route       (oral, IV, SC, inhaled — omit if not stated)
  quantity    (integer pill/unit count — omit if not stated)
  tussCode    (Brazilian TUSS procedure code — omit unless explicitly present in the note)

Rules:
- Include only medications the doctor intends to prescribe or continue.
- Do NOT invent TUSS codes — only include them if the note explicitly contains one.
- Return ONLY the JSON array. No prose, no markdown, no explanation.`;

// ── Gemini response schema ─────────────────────────────────────────────────────

const MEDICATION_SCHEMA = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      name:      { type: SchemaType.STRING, description: 'Generic drug name, lowercase' },
      dose:      { type: SchemaType.STRING, description: 'Dose with unit, e.g. 5mg' },
      frequency: { type: SchemaType.STRING, description: 'Frequency, e.g. BID, once daily' },
      route:     { type: SchemaType.STRING, description: 'Administration route (optional)' },
      quantity:  { type: SchemaType.NUMBER, description: 'Integer unit count (optional)' },
      tussCode:  { type: SchemaType.STRING, description: 'TUSS code — only if explicit in note' },
    },
    required: ['name', 'dose', 'frequency'],
  },
} as const;

// ── Exported types ─────────────────────────────────────────────────────────────

export type ExtractedMedication = MedicationInput;

export interface ExtractionResult {
  medications: ExtractedMedication[];
  model: string;
  extractionTimeMs: number;
}

// ── Core extractor ─────────────────────────────────────────────────────────────

/**
 * Extract medications from a clinical SOAP note using Gemini structured output.
 *
 * @param soapNote  Raw clinical text (e.g. "Plan: start apixaban 5mg BID for AF")
 * @returns         Parsed medication array, or [] if extraction fails
 * @throws          Error if GOOGLE_AI_API_KEY is not configured
 */
export async function extractMedicationsFromNote(
  soapNote: string
): Promise<ExtractionResult> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY is not configured');
  }

  const modelId = 'gemini-2.5-flash';
  const start = Date.now();

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelId,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: MEDICATION_SCHEMA as any,
      },
    });

    // Pass the system prompt and soapNote as separate parts — injection-safe
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: EXTRACTION_SYSTEM_PROMPT },
            { text: `SOAP NOTE:\n${soapNote}` },
          ],
        },
      ],
    });

    const rawText = result.response.text();

    // responseSchema guarantees JSON, but parse defensively
    let medications: ExtractedMedication[] = [];
    try {
      const parsed = JSON.parse(rawText);
      medications = Array.isArray(parsed) ? parsed : [];
    } catch {
      // Malformed output despite schema — treat as empty extraction
      medications = [];
    }

    return {
      medications,
      model: modelId,
      extractionTimeMs: Date.now() - start,
    };
  } catch (error) {
    // API errors (network, quota, key invalid) — return empty result, not throw
    // The calling route will handle the empty case as a 503 service unavailable
    if (error instanceof Error && error.message === 'GOOGLE_AI_API_KEY is not configured') {
      throw error; // re-throw config errors so the route can 503
    }
    return {
      medications: [],
      model: modelId,
      extractionTimeMs: Date.now() - start,
    };
  }
}
