/**
 * Deterministic PHI De-Identification Engine
 *
 * Replaces Protected Health Information (PHI) found in raw transcript text
 * with typed tokens for HIPAA / LGPD compliance.
 *
 * Designed to run on the client as a lightweight, regex-heuristic layer
 * that catches PHI that the upstream scribe may not have pre-tagged.
 *
 * Returns a string with embedded token markers (e.g. [DATE], [NAME]) that
 * the caller must parse into safe React elements — never use
 * dangerouslySetInnerHTML with this output.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Clinical / domain terms that look like proper names but must be preserved
// ─────────────────────────────────────────────────────────────────────────────

const CLINICAL_TERMS = new Set([
  'Doctor', 'Patient', 'Atorvastatin', 'Metformin', 'Aspirin', 'Lisinopril',
  'Metoprolol', 'Amlodipine', 'Losartan', 'Simvastatin', 'Omeprazole',
  'Warfarin', 'Furosemide', 'Digoxin', 'Levothyroxine', 'Ibuprofen',
  'Acetaminophen', 'Hydrochlorothiazide', 'Atorvastatin',
  'Coronary', 'Syndrome', 'Acute', 'Chronic', 'Congestive', 'Atrial',
  'Fibrillation', 'Hypertension', 'Diabetes', 'Mellitus', 'Kidney',
  'Troponin', 'Electrocardiogram', 'Echocardiogram', 'Hyperlipidemia',
  'Hypothyroidism', 'Gastroesophageal', 'Reflux',
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
  'American', 'European', 'National', 'General', 'Medical', 'Clinical',
]);

// ─────────────────────────────────────────────────────────────────────────────
// Token labels — also used by the caller for pill rendering
// ─────────────────────────────────────────────────────────────────────────────

export const PHI_TOKENS = ['DATE', 'NAME', 'SSN/MRN', 'PHONE', 'EMAIL'] as const;
export type PhiToken = typeof PHI_TOKENS[number];

// Regex that matches any of the emitted token strings, for splitting
export const PHI_TOKEN_REGEX = /(\[(?:DATE|NAME|SSN\/MRN|PHONE|EMAIL)\])/;

// ─────────────────────────────────────────────────────────────────────────────
// maskPHI
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Scans `text` for common PHI patterns and replaces each with a standard
 * bracketed token.  Returns a plain string — the caller is responsible for
 * safely rendering the tokens as highlighted React elements.
 *
 * Order matters: longer / more specific patterns run first to avoid double
 * substitution.
 */
export function maskPHI(text: string): string {
  let out = text;

  // 1 ── Dates ──────────────────────────────────────────────────────────────

  // ISO date: YYYY-MM-DD
  out = out.replace(/\b\d{4}-\d{2}-\d{2}\b/g, '[DATE]');

  // US date: MM/DD/YYYY or M/D/YY variants
  out = out.replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, '[DATE]');

  // Written date: "March 15, 1958" or "15 March 1958"
  out = out.replace(
    /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}\b/gi,
    '[DATE]'
  );
  out = out.replace(
    /\b\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}\b/gi,
    '[DATE]'
  );

  // 2 ── SSN / MRN ──────────────────────────────────────────────────────────

  // SSN: XXX-XX-XXXX
  out = out.replace(/\b\d{3}[-\s]\d{2}[-\s]\d{4}\b/g, '[SSN/MRN]');

  // MRN patterns: "MRN-001", "MRN:abc123", "#MRN 4567"
  out = out.replace(/\bMRN[-:# ]?\s*[\w\d]+\b/gi, '[SSN/MRN]');

  // 3 ── Phone numbers ───────────────────────────────────────────────────────

  // (XXX) XXX-XXXX, XXX-XXX-XXXX, XXX.XXX.XXXX
  out = out.replace(
    /\b(?:\(?\d{3}\)?[\s\-.]\d{3}[\s\-.]\d{4}|\d{10})\b/g,
    '[PHONE]'
  );

  // 4 ── Email addresses ─────────────────────────────────────────────────────

  out = out.replace(
    /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g,
    '[EMAIL]'
  );

  // 5 ── Proper names (two or three adjacent Title-Case words) ──────────────
  //
  // Heuristic: any sequence of 2–3 consecutive Title-Case words that is NOT
  // a known clinical / calendar term.  Runs LAST so earlier replacements
  // (dates, SSNs) have already consumed their tokens and can't be
  // accidentally re-matched here.

  out = out.replace(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/g, (match) => {
    // Preserve if the whole phrase is a clinical term
    if (CLINICAL_TERMS.has(match)) return match;
    // Preserve if ANY constituent word is a clinical term
    const words = match.split(/\s+/);
    if (words.some((w) => CLINICAL_TERMS.has(w))) return match;
    return '[NAME]';
  });

  return out;
}
