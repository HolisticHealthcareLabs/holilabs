import type { RuleId } from '../../index';

export type SafetyAlertVariant = 'BLOCK' | 'SOFT_NUDGE' | 'INFO';

export interface SafetyAlertProps {
  severity: SafetyAlertVariant;
  ruleId: RuleId;
  ruleName: string;
  clinicalRationale: string;
  onAcknowledge?: () => void;
  onOverride?: (reason: string) => void;
  /** Slot: Elena's clinical rationale detail */
  rationaleSlot?: React.ReactNode;
  /** Slot: Victor's revenue impact badge */
  financeBadgeSlot?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// LGPD Consent Ledger (RUTH: immutable audit heuristic)
// The timestamp field is the hard gate: null = no consent = microphone locked.
// ---------------------------------------------------------------------------

export interface ConsentRecord {
  granted: boolean;
  timestamp: string | null;
  method: 'verbal' | 'digital';
}

// ---------------------------------------------------------------------------
// Clinical Entity Extraction (ELENA: negative space heuristic)
// Pruned entities are flagged 'rejected', never deleted, so the downstream
// LLM prompt can explicitly exclude them from context.
// ---------------------------------------------------------------------------

export type EntityCategory = 'ICD-10' | 'ATC' | 'LOINC' | 'SNOMED';
export type EntityConfidence = 'high' | 'medium' | 'low';
export type EntityStatus = 'active' | 'rejected';

export interface ClinicalEntity {
  id: string;
  category: EntityCategory;
  code: string;
  label: string;
  confidence: EntityConfidence;
  status: EntityStatus;
}
