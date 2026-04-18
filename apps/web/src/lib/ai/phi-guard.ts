/**
 * PHI Guard — runtime tripwire for LLM call sites
 *
 * Defense in depth. Every external LLM call should pass user-provided text
 * through assertNoPHI() before sending. If a high-confidence PHI pattern
 * (CPF, email, DNI, CURP, MRN tag) appears, the call throws — preventing
 * raw PHI from leaving the trust boundary.
 *
 * Use after de-identification, NOT instead of it. The de-id pipeline
 * (`deidentifyTranscriptOrThrow`, `hybridDeidentify`) does the actual
 * redaction. This guard catches regressions where someone forgets.
 *
 * Conservative on purpose: only matches patterns with low false-positive
 * rate. We don't try to detect names — that's what de-id does.
 *
 * @compliance LGPD Art. 46, HIPAA Safe Harbor §164.514(b)(2)
 */

interface PhiPattern {
  name: string;
  regex: RegExp;
}

const HIGH_CONFIDENCE_PHI_PATTERNS: readonly PhiPattern[] = [
  { name: 'BR_CPF', regex: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/ },
  { name: 'EMAIL', regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}\b/i },
  { name: 'AR_DNI', regex: /\b\d{2}\.\d{3}\.\d{3}\b/ },
  { name: 'MRN_TAG', regex: /\bMRN[\s:=#]+\d{4,}/i },
  { name: 'MX_CURP', regex: /\b[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d\b/ },
] as const;

export class PhiVetoError extends Error {
  readonly patternName: string;
  readonly callsite: string;

  constructor(patternName: string, callsite: string) {
    super(
      `[CYRUS_VETO] PHI_PATTERN_DETECTED type=${patternName} callsite=${callsite} ` +
        `— refusing to send raw PHI to external LLM. Run input through ` +
        `deidentifyTranscriptOrThrow() or hybridDeidentify() first.`
    );
    this.name = 'PhiVetoError';
    this.patternName = patternName;
    this.callsite = callsite;
  }
}

/**
 * Throw if `text` contains a high-confidence PHI pattern.
 *
 * @param text - User-provided content about to be sent to an external LLM
 * @param callsite - Identifier for the call site (e.g., "transcribe.soap-prompt")
 *                   logged in the error to help operators trace which path leaked
 * @throws PhiVetoError if any high-confidence pattern matches
 */
export function assertNoPHI(text: string, callsite: string): void {
  if (!text) return;
  for (const pattern of HIGH_CONFIDENCE_PHI_PATTERNS) {
    if (pattern.regex.test(text)) {
      throw new PhiVetoError(pattern.name, callsite);
    }
  }
}

/**
 * Non-throwing variant — returns the matched pattern name or null.
 * Useful for logging/metrics without aborting the call.
 *
 * @param text - Content to scan
 * @returns Pattern name if PHI detected, null if clean
 */
export function detectPHI(text: string): string | null {
  if (!text) return null;
  for (const pattern of HIGH_CONFIDENCE_PHI_PATTERNS) {
    if (pattern.regex.test(text)) {
      return pattern.name;
    }
  }
  return null;
}
