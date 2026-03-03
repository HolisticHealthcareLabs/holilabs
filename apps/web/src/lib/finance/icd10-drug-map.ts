/**
 * ICD-10 Drug Indication Map
 *
 * Static deterministic mapping of high-cost drugs → valid ICD-10 code prefixes.
 * Used to detect indication mismatches (glosa FIN-001).
 *
 * Covers all drugs present in synthetic seed data (seed-pilot-data.ts,
 * integration-seed.ts, seed-demo-patient.ts).
 *
 * @compliance ANVISA Class I — deterministic logic only, no LLM inference
 * @since 2026-03-03
 */

/**
 * Map of drug name (lowercase) → array of valid ICD-10 code prefixes.
 * Matching is prefix-based: 'I48' matches I48, I48.0, I48.1, etc.
 */
const DRUG_ICD10_MAP: Record<string, string[]> = {
  // DOACs — Atrial Fibrillation (I48), Pulmonary Embolism (I26), DVT (I82)
  rivaroxaban:  ['I48', 'I26', 'I82'],
  apixaban:     ['I48', 'I26', 'I82'],
  edoxaban:     ['I48', 'I26', 'I82'],
  dabigatran:   ['I48', 'I26', 'I82'],

  // Diabetes — Type 2 (E11), Other diabetes (E13)
  metformin:    ['E11', 'E13'],

  // Cardiovascular — Hypertension (I10), Heart failure (I50)
  lisinopril:   ['I10', 'I50'],

  // Lipids — Hyperlipidemia (E78), Family history cardiovascular (Z82.49)
  atorvastatin: ['E78', 'Z82.49'],

  // Thyroid — Hypothyroidism (E03), Postprocedural hypothyroidism (E89)
  levothyroxine: ['E03', 'E89'],

  // GI — GERD (K21), Peptic ulcer (K25)
  omeprazole:   ['K21', 'K25'],

  // Respiratory — Asthma (J45)
  albuterol:    ['J45'],

  // Psychiatric — Depression (F32), Anxiety (F41)
  sertraline:   ['F32', 'F41'],

  // Immunology — Rheumatoid arthritis (M05, M06), Crohn's (K50)
  adalimumab:   ['M05', 'M06', 'K50'],
};

/**
 * Validate that a drug's ICD-10 diagnosis code matches known indications.
 *
 * Non-restrictive by design: if a drug has no mapping, returns true (unknown = allowed).
 * Returns false only when the drug IS mapped AND the code doesn't match any known prefix.
 *
 * @param drugName Drug name (case-insensitive)
 * @param icd10Code Full ICD-10 code (e.g. "E11.9", "I48.0")
 * @returns true if valid (or drug unknown), false if indication mismatch
 */
export function validateICD10Match(drugName: string, icd10Code: string): boolean {
  const validPrefixes = DRUG_ICD10_MAP[drugName.toLowerCase()];

  // No mapping for this drug → non-restrictive, allow it
  if (!validPrefixes) return true;

  // Check if the provided code starts with any valid prefix
  return validPrefixes.some((prefix) => icd10Code.toUpperCase().startsWith(prefix.toUpperCase()));
}

/**
 * Get the list of valid ICD-10 prefixes for a drug, or undefined if unmapped.
 */
export function getValidICD10Prefixes(drugName: string): string[] | undefined {
  return DRUG_ICD10_MAP[drugName.toLowerCase()];
}

/**
 * Check if a drug has a known ICD-10 mapping.
 */
export function hasDrugMapping(drugName: string): boolean {
  return Boolean(DRUG_ICD10_MAP[drugName.toLowerCase()]);
}
