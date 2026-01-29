/**
 * Revenue Gap Auditor Types
 *
 * Types for the Adversarial Auditor that identifies
 * procedures mentioned in clinical notes but not billed.
 *
 * @module services/auditor/types
 */

// ═══════════════════════════════════════════════════════════════════════════════
// PROCEDURE DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * A procedure detected in clinical text
 */
export interface DetectedProcedure {
  /** TISS code if matched */
  tissCode?: string;
  /** CPT code if matched */
  cptCode?: string;
  /** ICD-10 diagnosis code */
  icd10Code?: string;
  /** Human-readable description */
  description: string;
  /** Portuguese description */
  descriptionPortuguese?: string;
  /** Confidence of the detection (0-1) */
  confidence: number;
  /** Original text snippet that triggered detection */
  sourceText: string;
  /** Where it was found */
  sourceLocation: 'subjective' | 'objective' | 'assessment' | 'plan' | 'diagnosis' | 'transcript';
  /** Estimated value in cents */
  estimatedValue: number;
  /** Category of procedure */
  category: 'IMAGING' | 'LABORATORY' | 'PROCEDURE' | 'CONSULTATION' | 'THERAPY' | 'OTHER';
}

/**
 * Result of scanning a clinical note
 */
export interface NoteScanResult {
  /** Note ID */
  noteId: string;
  /** Patient ID */
  patientId: string;
  /** When the note was created */
  noteDate: Date;
  /** Procedures detected in the note */
  detectedProcedures: DetectedProcedure[];
  /** Total scan time in ms */
  scanTimeMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REVENUE GAP
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * A gap between documented care and billed procedures
 */
export interface RevenueGap {
  /** Unique identifier */
  id: string;
  /** Patient ID */
  patientId: string;
  /** Patient name (for display) */
  patientName?: string;
  /** The detected procedure */
  procedure: DetectedProcedure;
  /** Source clinical note ID */
  sourceNoteId: string;
  /** When it was documented */
  documentedAt: Date;
  /** Gap status */
  status: 'OPEN' | 'REVIEWED' | 'BILLED' | 'DISMISSED';
  /** Why it was dismissed (if applicable) */
  dismissalReason?: string;
  /** Who reviewed it */
  reviewedBy?: string;
  /** When it was reviewed */
  reviewedAt?: Date;
  /** Created claim ID if billed */
  claimId?: string;
}

/**
 * Summary of revenue gaps
 */
export interface RevenueGapSummary {
  /** Total number of gaps */
  totalGaps: number;
  /** Total potential value in cents */
  totalPotentialValue: number;
  /** Gaps by status */
  byStatus: {
    open: number;
    reviewed: number;
    billed: number;
    dismissed: number;
  };
  /** Gaps by category */
  byCategory: Record<string, { count: number; value: number }>;
  /** Top procedures by value */
  topProcedures: Array<{
    description: string;
    count: number;
    totalValue: number;
  }>;
  /** Time period */
  periodStart: Date;
  periodEnd: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDITOR CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Configuration for the auditor
 */
export interface AuditorConfig {
  /** How far back to scan (hours) */
  lookbackHours: number;
  /** Minimum confidence for procedure detection */
  minConfidence: number;
  /** Minimum value to flag (in cents) */
  minValueCents: number;
  /** Whether to use LLM for detection */
  useLLM: boolean;
  /** Clinic ID to scope the scan */
  clinicId?: string;
}

/**
 * Default configuration
 */
export const DEFAULT_AUDITOR_CONFIG: AuditorConfig = {
  lookbackHours: 24,
  minConfidence: 0.7,
  minValueCents: 5000, // R$50 minimum
  useLLM: false,
};

// ═══════════════════════════════════════════════════════════════════════════════
// PROCEDURE PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Pattern for detecting procedures in text
 */
export interface ProcedurePattern {
  /** TISS code */
  tissCode: string;
  /** CPT code (US equivalent) */
  cptCode?: string;
  /** Regular expressions to match */
  patterns: RegExp[];
  /** Description */
  description: string;
  /** Portuguese description */
  descriptionPortuguese: string;
  /** Category */
  category: DetectedProcedure['category'];
  /** Average value in cents */
  avgValueCents: number;
  /** Related ICD-10 codes */
  relatedIcd10?: string[];
}
