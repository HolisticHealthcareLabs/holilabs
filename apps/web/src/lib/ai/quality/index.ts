/**
 * LLM-as-a-Judge Quality Grading Module
 *
 * Provides async quality grading for AI-generated clinical content
 * using Gemini Flash as the grader LLM.
 *
 * Usage:
 * ```typescript
 * import { queueForQualityGrading, gradeContentDirectly } from '@/lib/ai/quality';
 *
 * // Queue for async grading
 * await queueForQualityGrading(usageId, transcript, generatedNote);
 *
 * // Or grade directly
 * const result = await gradeContentDirectly(transcript, generatedNote);
 * ```
 */

export {
  // Main queue function
  queueForQualityGrading,

  // Direct grading (for testing)
  gradeContentDirectly,

  // Queue management
  getQualityQueue,

  // Dashboard metrics
  getQualityDashboardMetrics,
  type QualityDashboardMetrics,

  // Types
  type QualityGradingJob,
  type QualityGradingJobResult,
} from './grading-job';

export {
  // Rubrics
  SCRIBE_QUALITY_RUBRIC,
  EXTRACTION_QUALITY_RUBRIC,

  // Prompt template
  GRADING_PROMPT_TEMPLATE,

  // Parsing utilities
  parseGradingResult,
  calculateOverallScore,
  determineRecommendation,
  generateGradingSummary,
} from './grading-rubric';
