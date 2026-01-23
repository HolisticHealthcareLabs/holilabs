/**
 * LLM-as-a-Judge Async Quality Grading Job
 *
 * Implements an asynchronous quality grading pipeline using Gemini Flash
 * to evaluate AI-generated content against the original transcript.
 *
 * Architecture:
 * ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
 * │  Transcription  │────▶│  Quality Queue  │────▶│  Gemini Flash   │
 * │    (Primary)    │     │   (Async Job)   │     │   (Grader LLM)  │
 * └─────────────────┘     └─────────────────┘     └────────┬────────┘
 *                                                          │
 *                                                          ▼
 *                                                 ┌─────────────────┐
 *                                                 │   AIUsage DB    │
 *                                                 │  qualityScore   │
 *                                                 │  gradingNotes   │
 *                                                 └─────────────────┘
 */

import { chat } from '@/lib/ai/chat';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import type { QualityGradingResult, QualityGradingNotes } from '@med-app/types';
import {
  SCRIBE_QUALITY_RUBRIC,
  EXTRACTION_QUALITY_RUBRIC,
  GRADING_PROMPT_TEMPLATE,
  parseGradingResult,
  generateGradingSummary,
} from './grading-rubric';

// ============================================
// TYPES
// ============================================

export interface QualityGradingJob {
  usageId: string;
  transcript: string;
  generatedContent: string;
  contentType: 'clinical_notes' | 'patient_state_extraction' | 'summarization';
  priority?: 'high' | 'normal' | 'low';
}

export interface QualityGradingJobResult {
  usageId: string;
  qualityScore: number;
  gradingNotes: QualityGradingNotes;
  recommendation: QualityGradingResult['recommendation'];
  processingTimeMs: number;
}

// ============================================
// IN-MEMORY QUEUE (Replace with BullMQ in production)
// ============================================

/**
 * Simple in-memory queue for development
 * In production, replace with BullMQ + Redis for:
 * - Job persistence across restarts
 * - Retry with exponential backoff
 * - Rate limiting
 * - Job deduplication
 */
class QualityGradingQueue {
  private queue: QualityGradingJob[] = [];
  private processing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start processing loop
    this.startProcessing();
  }

  /**
   * Add a job to the queue
   */
  async add(job: QualityGradingJob): Promise<void> {
    // Priority ordering: high jobs go to front
    if (job.priority === 'high') {
      this.queue.unshift(job);
    } else {
      this.queue.push(job);
    }

    logger.info({
      event: 'quality_job_queued',
      usageId: job.usageId,
      contentType: job.contentType,
      queueLength: this.queue.length,
    });
  }

  /**
   * Get queue length
   */
  get length(): number {
    return this.queue.length;
  }

  /**
   * Start the processing loop
   */
  private startProcessing(): void {
    if (this.processingInterval) return;

    this.processingInterval = setInterval(async () => {
      if (this.processing || this.queue.length === 0) return;

      this.processing = true;
      const job = this.queue.shift();

      if (job) {
        try {
          await processGradingJob(job);
        } catch (error) {
          logger.error({
            event: 'quality_job_processing_error',
            usageId: job.usageId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      this.processing = false;
    }, 1000); // Process one job per second to avoid rate limits
  }

  /**
   * Stop the processing loop
   */
  stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }
}

// Singleton queue instance
let qualityQueue: QualityGradingQueue | null = null;

function getQualityQueue(): QualityGradingQueue {
  if (!qualityQueue) {
    qualityQueue = new QualityGradingQueue();
  }
  return qualityQueue;
}

// ============================================
// MAIN QUEUE FUNCTION
// ============================================

/**
 * Queue a content item for quality grading
 *
 * @param usageId - The AIUsageLog record ID
 * @param transcript - Original transcript (source of truth)
 * @param generatedContent - AI-generated content to evaluate
 * @param contentType - Type of content being graded
 * @param priority - Job priority
 */
export async function queueForQualityGrading(
  usageId: string,
  transcript: string,
  generatedContent: string,
  contentType: QualityGradingJob['contentType'] = 'clinical_notes',
  priority: QualityGradingJob['priority'] = 'normal'
): Promise<void> {
  const queue = getQualityQueue();

  await queue.add({
    usageId,
    transcript,
    generatedContent,
    contentType,
    priority,
  });
}

// ============================================
// JOB PROCESSING
// ============================================

/**
 * Process a single grading job
 */
async function processGradingJob(
  job: QualityGradingJob
): Promise<QualityGradingJobResult> {
  const startTime = performance.now();

  logger.info({
    event: 'quality_grading_started',
    usageId: job.usageId,
    contentType: job.contentType,
  });

  // Select appropriate rubric based on content type
  const rubric = job.contentType === 'patient_state_extraction'
    ? EXTRACTION_QUALITY_RUBRIC
    : SCRIBE_QUALITY_RUBRIC;

  // Build the grading prompt
  const prompt = GRADING_PROMPT_TEMPLATE
    .replace('{transcript}', job.transcript)
    .replace('{note}', job.generatedContent)
    .replace('${JSON.stringify(SCRIBE_QUALITY_RUBRIC, null, 2)}', JSON.stringify(rubric, null, 2));

  try {
    // Call Gemini Flash for grading (cheapest, fastest)
    const response = await chat({
      provider: 'gemini',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1, // Low temperature for consistency
    });

    if (!response.success || !response.content) {
      throw new Error('Grading LLM call failed');
    }

    // Parse the grading result
    const gradingResult = parseGradingResult(response.content, rubric);

    if (!gradingResult) {
      throw new Error('Failed to parse grading result');
    }

    // Build grading notes
    const gradingNotes: QualityGradingNotes = {
      hallucinations: gradingResult.hallucinations,
      criticalIssues: gradingResult.criticalIssues,
      recommendation: gradingResult.recommendation,
      dimensions: gradingResult.dimensions,
    };

    // Update the AIUsageLog record
    await prisma.aIUsageLog.update({
      where: { id: job.usageId },
      data: {
        qualityScore: gradingResult.overallScore,
        gradingNotes: gradingNotes as unknown as Record<string, unknown>,
        gradedAt: new Date(),
        gradedBy: 'gemini-flash',
      },
    });

    const processingTimeMs = Math.round(performance.now() - startTime);

    logger.info({
      event: 'quality_grading_complete',
      usageId: job.usageId,
      qualityScore: gradingResult.overallScore,
      recommendation: gradingResult.recommendation,
      hallucinationCount: gradingResult.hallucinations.length,
      processingTimeMs,
    });

    // Flag for human review if needed
    if (gradingResult.recommendation === 'review_required' || gradingResult.recommendation === 'fail') {
      await flagForHumanReview(job.usageId, gradingResult);
    }

    return {
      usageId: job.usageId,
      qualityScore: gradingResult.overallScore,
      gradingNotes,
      recommendation: gradingResult.recommendation,
      processingTimeMs,
    };
  } catch (error) {
    const processingTimeMs = Math.round(performance.now() - startTime);

    logger.error({
      event: 'quality_grading_failed',
      usageId: job.usageId,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTimeMs,
    });

    // Update with error state
    await prisma.aIUsageLog.update({
      where: { id: job.usageId },
      data: {
        gradingNotes: {
          error: error instanceof Error ? error.message : 'Unknown error',
          recommendation: 'review_required',
        } as unknown as Record<string, unknown>,
        gradedAt: new Date(),
        gradedBy: 'error',
      },
    });

    throw error;
  }
}

// ============================================
// HUMAN REVIEW FLAGGING
// ============================================

/**
 * Flag a graded item for human review
 */
async function flagForHumanReview(
  usageId: string,
  gradingResult: QualityGradingResult
): Promise<void> {
  logger.warn({
    event: 'quality_flagged_for_review',
    usageId,
    qualityScore: gradingResult.overallScore,
    recommendation: gradingResult.recommendation,
    hallucinations: gradingResult.hallucinations,
    criticalIssues: gradingResult.criticalIssues,
  });

  // In production, this would:
  // 1. Send notification to QA team (email, Slack, etc.)
  // 2. Create a ManualReviewQueueItem record
  // 3. Update a dashboard/metrics system

  // Example: Create a manual review queue item if the model exists
  // await prisma.manualReviewQueueItem.create({
  //   data: {
  //     itemType: 'ai_output_quality',
  //     itemId: usageId,
  //     reason: gradingResult.recommendation === 'fail' ? 'quality_failure' : 'review_required',
  //     priority: gradingResult.criticalIssues.length > 0 ? 'high' : 'normal',
  //     metadata: {
  //       qualityScore: gradingResult.overallScore,
  //       hallucinations: gradingResult.hallucinations,
  //       criticalIssues: gradingResult.criticalIssues,
  //     },
  //   },
  // });
}

// ============================================
// DIRECT GRADING (Non-queued)
// ============================================

/**
 * Grade content directly without queueing (for testing/manual grading)
 */
export async function gradeContentDirectly(
  transcript: string,
  generatedContent: string,
  contentType: QualityGradingJob['contentType'] = 'clinical_notes'
): Promise<QualityGradingResult | null> {
  const rubric = contentType === 'patient_state_extraction'
    ? EXTRACTION_QUALITY_RUBRIC
    : SCRIBE_QUALITY_RUBRIC;

  const prompt = GRADING_PROMPT_TEMPLATE
    .replace('{transcript}', transcript)
    .replace('{note}', generatedContent)
    .replace('${JSON.stringify(SCRIBE_QUALITY_RUBRIC, null, 2)}', JSON.stringify(rubric, null, 2));

  const response = await chat({
    provider: 'gemini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
  });

  if (!response.success || !response.content) {
    return null;
  }

  return parseGradingResult(response.content, rubric);
}

// ============================================
// QUALITY DASHBOARD METRICS
// ============================================

export interface QualityDashboardMetrics {
  averageScore: number;
  scoreDistribution: { range: string; count: number }[];
  topHallucinations: { type: string; count: number }[];
  passRate: number;
  reviewRate: number;
  failRate: number;
  trendLast30Days: { date: string; avgScore: number }[];
}

/**
 * Get quality dashboard metrics
 */
export async function getQualityDashboardMetrics(
  organizationId?: string,
  daysBack: number = 30
): Promise<QualityDashboardMetrics> {
  const since = new Date();
  since.setDate(since.getDate() - daysBack);

  const whereClause = {
    qualityScore: { not: null },
    createdAt: { gte: since },
    ...(organizationId ? { clinicId: organizationId } : {}),
  };

  // Get all graded records
  const records = await prisma.aIUsageLog.findMany({
    where: whereClause,
    select: {
      qualityScore: true,
      gradingNotes: true,
      createdAt: true,
    },
  });

  // Calculate metrics
  const scores = records.map(r => r.qualityScore!).filter(s => s != null);
  const averageScore = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  // Score distribution
  const ranges = [
    { range: '0-50', min: 0, max: 50 },
    { range: '51-60', min: 51, max: 60 },
    { range: '61-70', min: 61, max: 70 },
    { range: '71-80', min: 71, max: 80 },
    { range: '81-90', min: 81, max: 90 },
    { range: '91-100', min: 91, max: 100 },
  ];

  const scoreDistribution = ranges.map(({ range, min, max }) => ({
    range,
    count: scores.filter(s => s >= min && s <= max).length,
  }));

  // Recommendation rates
  const recommendations = records
    .map(r => (r.gradingNotes as QualityGradingNotes | null)?.recommendation)
    .filter(Boolean);

  const passRate = recommendations.length > 0
    ? Math.round((recommendations.filter(r => r === 'pass').length / recommendations.length) * 100)
    : 0;

  const reviewRate = recommendations.length > 0
    ? Math.round((recommendations.filter(r => r === 'review_required').length / recommendations.length) * 100)
    : 0;

  const failRate = recommendations.length > 0
    ? Math.round((recommendations.filter(r => r === 'fail').length / recommendations.length) * 100)
    : 0;

  // Trend (group by day)
  const trendMap = new Map<string, number[]>();
  for (const record of records) {
    const date = record.createdAt.toISOString().split('T')[0];
    if (!trendMap.has(date)) {
      trendMap.set(date, []);
    }
    if (record.qualityScore != null) {
      trendMap.get(date)!.push(record.qualityScore);
    }
  }

  const trendLast30Days = Array.from(trendMap.entries())
    .map(([date, dayScores]) => ({
      date,
      avgScore: Math.round(dayScores.reduce((a, b) => a + b, 0) / dayScores.length),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Top hallucination types (aggregate from gradingNotes)
  const hallucinationCounts = new Map<string, number>();
  for (const record of records) {
    const notes = record.gradingNotes as QualityGradingNotes | null;
    if (notes?.hallucinations) {
      for (const h of notes.hallucinations) {
        // Extract category from hallucination text
        const category = h.includes('medication') ? 'Medication'
          : h.includes('vital') ? 'Vital Signs'
          : h.includes('symptom') ? 'Symptoms'
          : h.includes('diagnosis') ? 'Diagnosis'
          : 'Other';
        hallucinationCounts.set(category, (hallucinationCounts.get(category) || 0) + 1);
      }
    }
  }

  const topHallucinations = Array.from(hallucinationCounts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    averageScore,
    scoreDistribution,
    topHallucinations,
    passRate,
    reviewRate,
    failRate,
    trendLast30Days,
  };
}

// ============================================
// EXPORTS
// ============================================

export {
  getQualityQueue,
  processGradingJob,
  generateGradingSummary,
};
