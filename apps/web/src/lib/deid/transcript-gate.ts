import { anonymizePatientData } from '@/lib/presidio';

/**
 * Single enforced gate for transcript handling.
 *
 * Hard guarantee: when REQUIRE_DEIDENTIFICATION=true, callers MUST NOT:
 * - persist raw transcripts
 * - emit raw transcripts to the frontend
 * - send raw transcripts to any LLM
 */
export async function deidentifyTranscriptOrThrow(rawText: string): Promise<string> {
  // IMPORTANT: Read from process.env at call-time (not from cached env)
  // so tests can toggle strictness and so this gate doesn't depend on env
  // validation side-effects at import time.
  // Default to strict in production, but allow local dev to run without Presidio
  // unless explicitly forced on via REQUIRE_DEIDENTIFICATION=true.
  const strictEnv = process.env.REQUIRE_DEIDENTIFICATION;
  const strict =
    strictEnv !== undefined ? strictEnv === 'true' : (process.env.NODE_ENV || 'development') === 'production';

  if (!rawText) return rawText;

  try {
    const text = await anonymizePatientData(rawText);
    return text;
  } catch (e) {
    if (strict) {
      const msg = e instanceof Error ? e.message : 'De-identification failed';
      throw new Error(`De-identification required but failed: ${msg}`);
    }
    // Non-strict mode: allow caller to proceed (development override only).
    return rawText;
  }
}


