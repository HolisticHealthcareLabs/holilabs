/**
 * Quality Metrics Type Definitions
 *
 * Law 6 Compliance: LLM-as-a-Judge Quality Loop
 * Every AI interaction must be graded asynchronously.
 *
 * The Check: "Is every AI interaction logged with quality scores in the database?"
 *
 * Metrics to Track:
 * - hallucinationRate: % of outputs containing fabricated information
 * - completenessScore: % of required fields populated correctly
 * - costPerInteraction: Token cost for primary + judge models
 */

// ═══════════════════════════════════════════════════════════════
// AI EVALUATION (LLM-as-Judge Output)
// ═══════════════════════════════════════════════════════════════

/**
 * AIEvaluation is the output of the LLM-as-Judge evaluation.
 *
 * A second, cheaper model (Gemini Flash) grades the primary model's output
 * against a "Gold Standard" rubric.
 */
export interface AIEvaluation {
  /** 0 = no hallucination, 1 = complete hallucination */
  hallucinationScore: number;

  /** 0 = nothing relevant, 1 = fully complete */
  completenessScore: number;

  /** 0 = clinically inaccurate, 1 = clinically perfect */
  clinicalAccuracyScore: number;

  /** Reasoning for the scores */
  reasoning: string;

  /** Specific issues found during evaluation */
  flaggedIssues: FlaggedIssue[];
}

export interface FlaggedIssue {
  type: 'hallucination' | 'missing_field' | 'clinical_error' | 'formatting';
  description: string;
  severity: 'critical' | 'major' | 'minor';
}

// ═══════════════════════════════════════════════════════════════
// EVALUATION CONTEXT (Input to Judge)
// ═══════════════════════════════════════════════════════════════

/**
 * EvaluationContext provides all information needed for the judge to evaluate.
 */
export interface EvaluationContext {
  /** Type of task being evaluated */
  taskType: string;

  /** The input that was given to the AI */
  input: unknown;

  /** The output that the AI produced */
  output: unknown;

  /** Description of expected schema */
  expectedSchemaDescription?: string;

  /** Gold standard criteria to check against */
  goldStandardCriteria?: string[];
}

// ═══════════════════════════════════════════════════════════════
// AI QUALITY METRICS (Database Model)
// ═══════════════════════════════════════════════════════════════

/**
 * AIQualityMetrics is stored in the database for every AI interaction.
 *
 * This enables tracking quality over time and alerting on regressions.
 */
export interface AIQualityMetrics {
  id: string;
  interactionId: string;
  taskType: string;

  // Quality scores (0-1)
  hallucinationRate?: number;
  completenessScore?: number;
  clinicalAccuracyScore?: number;

  // Issues found
  flaggedIssues?: FlaggedIssue[];
  reasoning?: string;

  // Failure tracking
  evaluationFailed: boolean;
  failureReason?: string;

  // Cost tracking
  primaryModelCost?: number;
  judgeModelCost?: number;
  totalTokensUsed?: number;

  evaluatedAt: string;
}

// ═══════════════════════════════════════════════════════════════
// QUALITY DASHBOARD TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * QualityDashboardMetrics aggregates quality metrics for display.
 */
export interface QualityDashboardMetrics {
  period: {
    start: string;
    end: string;
  };

  // Aggregate scores
  averageHallucinationRate: number;
  averageCompletenessScore: number;
  averageClinicalAccuracyScore: number;

  // Volume metrics
  totalInteractions: number;
  evaluatedInteractions: number;
  evaluationCoveragePercent: number;

  // Issue breakdown
  criticalIssuesCount: number;
  majorIssuesCount: number;
  minorIssuesCount: number;

  // Cost metrics
  totalPrimaryModelCost: number;
  totalJudgeModelCost: number;
  averageCostPerInteraction: number;

  // Fallback metrics
  fallbackActivationRate: number;
  hybridProcessingRate: number;
  aiOnlyRate: number;

  // Latency
  averageAiLatencyMs: number;
  p95AiLatencyMs: number;
  p99AiLatencyMs: number;
}

// ═══════════════════════════════════════════════════════════════
// QUALITY ALERT TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * QualityAlert is triggered when quality metrics exceed thresholds.
 */
export interface QualityAlert {
  id: string;
  type: 'HALLUCINATION_SPIKE' | 'COMPLETENESS_DROP' | 'COST_SPIKE' | 'LATENCY_DEGRADATION';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  metric: string;
  currentValue: number;
  threshold: number;
  affectedTaskTypes: string[];
  triggeredAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
}

/**
 * QualityThresholds define when to trigger alerts.
 */
export interface QualityThresholds {
  maxHallucinationRate: number; // e.g., 0.02 (2%)
  minCompletenessScore: number; // e.g., 0.95 (95%)
  minClinicalAccuracyScore: number; // e.g., 0.98 (98%)
  maxCostPerInteraction: number; // e.g., 0.05 ($0.05)
  maxLatencyMs: number; // e.g., 3000 (3 seconds)
  maxFallbackRate: number; // e.g., 0.10 (10%)
}

export const DEFAULT_QUALITY_THRESHOLDS: QualityThresholds = {
  maxHallucinationRate: 0.02,
  minCompletenessScore: 0.95,
  minClinicalAccuracyScore: 0.98,
  maxCostPerInteraction: 0.05,
  maxLatencyMs: 3000,
  maxFallbackRate: 0.10,
};
