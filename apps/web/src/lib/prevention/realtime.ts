/**
 * Prevention Realtime Event Contracts (single source of truth)
 *
 * Used by:
 * - Co-Pilot realtime prevention panel
 * - Prevention Hub realtime hooks / notifications
 *
 * Goals:
 * - One canonical payload shape
 * - JSON-safe (no Date objects)
 * - Consistent confidence semantics (0..1)
 */

export type PreventionPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export type PreventionRecommendationType =
  | 'screening'
  | 'intervention'
  | 'lifestyle'
  | 'medication'
  | 'monitoring';

export type DetectedConditionLite = {
  id: string;
  name: string;
  category: string;
  /** Confidence as 0..1 */
  confidence: number;
  icd10Codes?: string[];
};

export type RecommendationLite = {
  id: string;
  type: PreventionRecommendationType;
  title: string;
  description: string;
  priority: PreventionPriority;
  guidelineSource: string;
  uspstfGrade?: string;
};

export type PreventionConditionDetectedPayload = {
  patientId: string;
  encounterId?: string;
  conditions: DetectedConditionLite[];
  /** ISO timestamp */
  timestamp: string;
};

export type PreventionFindingsProcessedPayload = {
  patientId: string;
  encounterId?: string;
  conditions: DetectedConditionLite[];
  recommendations: RecommendationLite[];
  processingTimeMs: number;
  /** ISO timestamp */
  timestamp: string;
};

export function normalizeConfidence01(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  const normalized = n > 1 ? n / 100 : n; // accept 0..100 or 0..1
  return Math.max(0, Math.min(1, normalized));
}

