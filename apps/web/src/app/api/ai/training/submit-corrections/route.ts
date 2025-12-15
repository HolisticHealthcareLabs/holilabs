/**
 * AI Training Submission API
 *
 * POST /api/ai/training/submit-corrections - Generate training batch from corrections
 *
 * RLHF Loop Phase 2: Aggregates doctor corrections into structured training data
 * for fine-tuning Deepgram/Whisper/Custom STT models
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { transcriptionCorrectionService } from '@/lib/services/transcription-correction.service';
import { z } from 'zod';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Request validation schema
 */
const SubmitCorrectionsRequestSchema = z.object({
  startDate: z.string().datetime('Invalid start date format'),
  endDate: z.string().datetime('Invalid end date format'),
  language: z.string().default('es-MX').optional(),
  specialty: z.string().optional(),
});

type SubmitCorrectionsRequest = z.infer<typeof SubmitCorrectionsRequestSchema>;

/**
 * POST /api/ai/training/submit-corrections
 * Generate training batch from corrections within date range
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const body = await request.json();

      // Validate request
      const validation = SubmitCorrectionsRequestSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          {
            error: 'Invalid request parameters',
            details: validation.error.format(),
          },
          { status: 400 }
        );
      }

      const { startDate, endDate, language, specialty } = validation.data;

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

      // Check if range is too large (prevent excessive data pull)
      const daysDiff = Math.ceil(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff > 90) {
        return NextResponse.json(
          { error: 'Date range cannot exceed 90 days' },
          { status: 400 }
        );
      }

      // Generate training batch
      const trainingBatch = await transcriptionCorrectionService.createTrainingBatch(
        start,
        end,
        language
      );

      // Filter by specialty if provided
      let filteredCorrections = trainingBatch.corrections;
      if (specialty) {
        filteredCorrections = trainingBatch.corrections.filter(
          (c) => c.context.specialty === specialty
        );
      }

      // Log for monitoring
      logger.info({
        event: 'ai_training_batch_generated',
        userId: context.user.id,
        startDate,
        endDate,
        language,
        specialty,
        totalCorrections: filteredCorrections.length,
      });

      return NextResponse.json({
        success: true,
        data: {
          ...trainingBatch,
          corrections: filteredCorrections,
          metadata: {
            dateRange: { startDate, endDate },
            language,
            specialty: specialty || 'all',
            totalCorrections: filteredCorrections.length,
            generatedAt: new Date().toISOString(),
            generatedBy: {
              id: context.user.id,
              name: `${context.user.firstName} ${context.user.lastName}`,
            },
          },
        },
      });
    } catch (error: any) {
      logger.error({
        event: 'ai_training_batch_generation_failed',
        userId: context.user.id,
        error: error.message,
        stack: error.stack,
      });
      return NextResponse.json(
        {
          error: 'Failed to generate training batch',
          message: error.message,
        },
        { status: 500 }
      );
    }
  }
);
