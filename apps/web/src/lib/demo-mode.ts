/**
 * Demo Mode — server-side utility.
 *
 * Reads NEXT_PUBLIC_DEMO_MODE env var. All checks are server-side only
 * (no "use client"). The NEXT_PUBLIC_ prefix makes the value available
 * to client components via process.env at build time.
 */

/** True when the app is running in demo mode */
export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}

/**
 * Feature flags gated by env vars.
 * Server-side only — import in server components or API routes.
 */
export const DEMO_FEATURES = {
  /** FHIR R4 sync to external EHR */
  fhirSync: () => process.env.FEATURE_FHIR_SYNC === 'true',
  /** LiveKit telehealth video */
  telehealth: () => process.env.FEATURE_TELEHEALTH !== 'false',
  /** AI Scribe (Deepgram transcription) */
  aiScribe: () => process.env.FEATURE_AI_SCRIBE !== 'false',
  /** e-Prescriptions */
  prescriptions: () => process.env.FEATURE_PRESCRIPTIONS !== 'false',
  /** Lab integration (HL7/LOINC inbound) */
  labIntegration: () => process.env.FEATURE_LAB_INTEGRATION === 'true',
  /** Billing / insurance claims */
  billing: () => process.env.FEATURE_BILLING === 'true',
} as const;

export type FeatureKey = keyof typeof DEMO_FEATURES;

/** Check a single feature flag */
export function isFeatureEnabled(key: FeatureKey): boolean {
  return DEMO_FEATURES[key]();
}

/** Get all flags as a plain object (for serializing to client) */
export function getAllFeatureFlags(): Record<FeatureKey, boolean> {
  return Object.fromEntries(
    Object.entries(DEMO_FEATURES).map(([k, fn]) => [k, fn()]),
  ) as Record<FeatureKey, boolean>;
}
