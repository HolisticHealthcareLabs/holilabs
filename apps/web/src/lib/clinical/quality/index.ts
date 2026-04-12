/**
 * Clinical Quality Module
 *
 * Law 6: LLM-as-a-Judge Quality Loop
 * "You cannot trust AI outputs without measuring them, and humans are too slow to measure everything."
 *
 * Exports:
 * - evaluateAIOutput: Core evaluation function
 * - scheduleEvaluation: Fire-and-forget async evaluation
 * - withEvaluation: Wrapper for automatic quality tracking
 * - getQualityMetrics: Aggregate metrics for dashboards
 */

export {
  evaluateAIOutput,
  scheduleEvaluation,
  withEvaluation,
  getQualityMetrics,
  generateInteractionId,
  type AIEvaluation,
  type FlaggedIssue,
  type EvaluationContext,
  type QualityMetrics,
} from './llm-judge';
