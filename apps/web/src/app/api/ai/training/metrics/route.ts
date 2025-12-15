/**
 * AI Training Metrics API
 *
 * GET /api/ai/training/metrics - Get correction analytics and improvement trends
 *
 * RLHF Loop Phase 2: Provides visibility into correction patterns, error rates,
 * and AI improvement over time
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { transcriptionCorrectionService } from '@/lib/services/transcription-correction.service';
import { z } from 'zod';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Query parameters validation schema
 */
const MetricsQuerySchema = z.object({
  startDate: z.string().datetime('Invalid start date format'),
  endDate: z.string().datetime('Invalid end date format'),
  includeVocabulary: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
});

/**
 * GET /api/ai/training/metrics
 * Get correction analytics for dashboard and monitoring
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const { searchParams } = new URL(request.url);

      // Extract query parameters
      const queryParams = {
        startDate: searchParams.get('startDate'),
        endDate: searchParams.get('endDate'),
        includeVocabulary: searchParams.get('includeVocabulary'),
      };

      // Validate query parameters
      const validation = MetricsQuerySchema.safeParse(queryParams);
      if (!validation.success) {
        return NextResponse.json(
          {
            error: 'Invalid query parameters',
            details: validation.error.format(),
          },
          { status: 400 }
        );
      }

      const { startDate, endDate, includeVocabulary } = validation.data;

      // Parse dates
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Validate date range
      if (start >= end) {
        return NextResponse.json(
          { error: 'Start date must be before end date' },
          { status: 400 }
        );
      }

      // Get analytics
      const analytics = await transcriptionCorrectionService.getAnalytics(
        start,
        end
      );

      // Optionally include custom vocabulary
      let customVocabulary: string[] | undefined;
      if (includeVocabulary) {
        customVocabulary = await transcriptionCorrectionService.generateCustomVocabulary(
          start,
          end
        );
      }

      // Calculate additional metrics
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

      // Log for monitoring
      logger.info({
        event: 'ai_training_metrics_requested',
        userId: context.user.id,
        startDate,
        endDate,
        totalCorrections: analytics.totalCorrections,
        avgErrorRate: avgErrorRate.toFixed(4),
        improvementPercentage: improvementPercentage.toFixed(2) + '%',
      });

      return NextResponse.json({
        success: true,
        data: {
          analytics,
          customVocabulary: customVocabulary
            ? { terms: customVocabulary, count: customVocabulary.length }
            : undefined,
          derivedMetrics: {
            avgErrorRate: parseFloat(avgErrorRate.toFixed(4)),
            latestErrorRate: parseFloat(latestErrorRate.toFixed(4)),
            earliestErrorRate: parseFloat(earliestErrorRate.toFixed(4)),
            improvementPercentage: parseFloat(improvementPercentage.toFixed(2)),
            trendDirection:
              improvementPercentage > 5
                ? 'improving'
                : improvementPercentage < -5
                ? 'declining'
                : 'stable',
          },
          metadata: {
            dateRange: { startDate, endDate },
            generatedAt: new Date().toISOString(),
            requestedBy: {
              id: context.user.id,
              name: `${context.user.firstName} ${context.user.lastName}`,
            },
          },
        },
      });
    } catch (error: any) {
      logger.error({
        event: 'ai_training_metrics_fetch_failed',
        userId: context.user.id,
        error: error.message,
        stack: error.stack,
      });
      return NextResponse.json(
        {
          error: 'Failed to fetch training metrics',
          message: error.message,
        },
        { status: 500 }
      );
    }
  }
);
