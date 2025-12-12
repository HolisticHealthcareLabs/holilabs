/**
 * Correction Aggregation Job
 *
 * RLHF Loop Phase 2: Background job that aggregates doctor corrections
 * and prepares training batches for ML model improvement
 *
 * Runs daily to process accumulated corrections from the previous day
 */

import { prisma } from '@/lib/prisma';
import { transcriptionCorrectionService } from '@/lib/services/transcription-correction.service';
import logger from '@/lib/logger';

interface AggregationResult {
  success: boolean;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  totalCorrections: number;
  customVocabularyTerms: number;
  errorRate: number;
  improvementPercentage: number;
}

/**
 * Aggregate corrections from the previous day
 */
export async function aggregateDailyCorrections(): Promise<{
  processed: boolean;
  results: AggregationResult | null;
  error?: string;
}> {
  try {
    // Calculate date range (previous day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const startDate = yesterday;
    const endDate = today;

    logger.info({
      event: 'correction_aggregation_start',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    // Get corrections count
    const correctionsCount = await prisma.transcriptionError.count({
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
    });

    logger.info({
      event: 'correction_aggregation_count',
      totalCorrections: correctionsCount,
    });

    // If no corrections, skip processing
    if (correctionsCount === 0) {
      logger.info({
        event: 'correction_aggregation_skipped',
        reason: 'no_corrections',
      });

      return {
        processed: false,
        results: null,
      };
    }

    // Generate training batch
    const trainingBatch = await transcriptionCorrectionService.createTrainingBatch(
      startDate,
      endDate
    );

    // Generate custom vocabulary
    const customVocabulary = await transcriptionCorrectionService.generateCustomVocabulary(
      startDate,
      endDate
    );

    // Get analytics
    const analytics = await transcriptionCorrectionService.getAnalytics(
      startDate,
      endDate
    );

    // Calculate improvement metrics
    const avgErrorRate =
      analytics.improvementTrend.length > 0
        ? analytics.improvementTrend.reduce((sum, t) => sum + t.errorRate, 0) /
          analytics.improvementTrend.length
        : 0;

    const latestErrorRate =
      analytics.improvementTrend.length > 0
        ? analytics.improvementTrend[analytics.improvementTrend.length - 1].errorRate
        : 0;

    const earliestErrorRate =
      analytics.improvementTrend.length > 0
        ? analytics.improvementTrend[0].errorRate
        : 0;

    const improvementPercentage =
      earliestErrorRate > 0
        ? ((earliestErrorRate - latestErrorRate) / earliestErrorRate) * 100
        : 0;

    // Log analytics
    logger.info({
      event: 'correction_aggregation_analytics',
      totalCorrections: analytics.totalCorrections,
      avgConfidence: analytics.avgConfidence,
      avgEditDistance: analytics.avgEditDistance,
      avgErrorRate,
      improvementPercentage,
      customVocabularyTerms: customVocabulary.length,
      topErrors: analytics.mostCommonErrors.slice(0, 5),
      errorsBySpecialty: analytics.errorsBySpecialty,
    });

    // Export training data (save to file system or send to external service)
    const trainingDataJSON = await transcriptionCorrectionService.exportCorrectionsAsJSON(
      startDate,
      endDate
    );

    // TODO: Phase 2.2 - Send training data to ML pipeline
    // This could be:
    // 1. Upload to S3/GCS for ML training
    // 2. POST to external ML API
    // 3. Store in database for manual review
    // For now, we just log that it's ready

    logger.info({
      event: 'correction_aggregation_training_data_ready',
      trainingDataSize: trainingDataJSON.length,
      vocabularySize: customVocabulary.length,
      note: 'Training data ready for ML pipeline integration',
    });

    const results: AggregationResult = {
      success: true,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      totalCorrections: analytics.totalCorrections,
      customVocabularyTerms: customVocabulary.length,
      errorRate: avgErrorRate,
      improvementPercentage,
    };

    logger.info({
      event: 'correction_aggregation_complete',
      results,
    });

    return {
      processed: true,
      results,
    };
  } catch (error) {
    logger.error({
      event: 'correction_aggregation_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      processed: false,
      results: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Aggregate corrections for a custom date range
 * Useful for backfilling or manual aggregation
 */
export async function aggregateCorrectionsRange(
  startDate: Date,
  endDate: Date
): Promise<{
  processed: boolean;
  results: AggregationResult | null;
  error?: string;
}> {
  try {
    logger.info({
      event: 'correction_aggregation_range_start',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    // Get corrections count
    const correctionsCount = await prisma.transcriptionError.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    if (correctionsCount === 0) {
      logger.info({
        event: 'correction_aggregation_range_skipped',
        reason: 'no_corrections',
      });

      return {
        processed: false,
        results: null,
      };
    }

    // Get analytics
    const analytics = await transcriptionCorrectionService.getAnalytics(
      startDate,
      endDate
    );

    // Generate custom vocabulary
    const customVocabulary = await transcriptionCorrectionService.generateCustomVocabulary(
      startDate,
      endDate
    );

    // Calculate metrics
    const avgErrorRate =
      analytics.improvementTrend.length > 0
        ? analytics.improvementTrend.reduce((sum, t) => sum + t.errorRate, 0) /
          analytics.improvementTrend.length
        : 0;

    const latestErrorRate =
      analytics.improvementTrend.length > 0
        ? analytics.improvementTrend[analytics.improvementTrend.length - 1].errorRate
        : 0;

    const earliestErrorRate =
      analytics.improvementTrend.length > 0
        ? analytics.improvementTrend[0].errorRate
        : 0;

    const improvementPercentage =
      earliestErrorRate > 0
        ? ((earliestErrorRate - latestErrorRate) / earliestErrorRate) * 100
        : 0;

    const results: AggregationResult = {
      success: true,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      totalCorrections: analytics.totalCorrections,
      customVocabularyTerms: customVocabulary.length,
      errorRate: avgErrorRate,
      improvementPercentage,
    };

    logger.info({
      event: 'correction_aggregation_range_complete',
      results,
    });

    return {
      processed: true,
      results,
    };
  } catch (error) {
    logger.error({
      event: 'correction_aggregation_range_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      processed: false,
      results: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
