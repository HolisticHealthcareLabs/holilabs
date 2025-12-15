/**
 * AI Training Vocabulary API
 *
 * GET /api/ai/training/vocabulary - Generate custom medical vocabulary
 *
 * RLHF Loop Phase 2: Extracts medical terms from corrections to build custom
 * vocabulary for Deepgram/Whisper STT models, improving medical terminology accuracy
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
const VocabularyQuerySchema = z.object({
  startDate: z.string().datetime('Invalid start date format'),
  endDate: z.string().datetime('Invalid end date format'),
  format: z.enum(['json', 'text']).default('json'),
  minFrequency: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(100))
    .optional(),
});

/**
 * GET /api/ai/training/vocabulary
 * Generate custom medical vocabulary from corrections
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const { searchParams } = new URL(request.url);

      // Extract query parameters
      const queryParams = {
        startDate: searchParams.get('startDate'),
        endDate: searchParams.get('endDate'),
        format: searchParams.get('format') || 'json',
        minFrequency: searchParams.get('minFrequency'),
      };

      // Validate query parameters
      const validation = VocabularyQuerySchema.safeParse(queryParams);
      if (!validation.success) {
        return NextResponse.json(
          {
            error: 'Invalid query parameters',
            details: validation.error.format(),
          },
          { status: 400 }
        );
      }

      const { startDate, endDate, format, minFrequency } = validation.data;

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

      // Generate custom vocabulary
      const vocabulary = await transcriptionCorrectionService.generateCustomVocabulary(
        start,
        end
      );

      // Apply frequency filter if specified
      // (This would require counting term frequencies in the service layer,
      // but for now we return all unique terms)
      const filteredVocabulary = vocabulary;

      // Log vocabulary generation
      logger.info({
        event: 'ai_custom_vocabulary_generated',
        userId: context.user.id,
        startDate,
        endDate,
        totalTerms: vocabulary.length,
        filteredTerms: filteredVocabulary.length,
        minFrequency: minFrequency || 'none',
      });

      // Return based on format
      if (format === 'text') {
        // Plain text format (one term per line) for easy import to STT systems
        const content = filteredVocabulary.join('\n');
        const filename = `medical_vocabulary_${start.toISOString().split('T')[0]}.txt`;

        return new NextResponse(content, {
          status: 200,
          headers: {
            'Content-Type': 'text/plain',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        });
      }

      // JSON format with metadata
      return NextResponse.json({
        success: true,
        data: {
          vocabulary: filteredVocabulary,
          metadata: {
            totalTerms: filteredVocabulary.length,
            dateRange: { startDate, endDate },
            language: 'es-MX', // Assuming Spanish medical terms
            generatedAt: new Date().toISOString(),
            generatedBy: {
              id: context.user.id,
              name: `${context.user.firstName} ${context.user.lastName}`,
            },
          },
          usage: {
            deepgram: {
              description: 'Add to Deepgram custom vocabulary for improved medical term recognition',
              endpoint: 'https://api.deepgram.com/v1/projects/{project_id}/models/{model_id}/vocabulary',
            },
            whisper: {
              description: 'Include in prompt/context for Whisper API calls',
              example: 'Use these medical terms: ' + filteredVocabulary.slice(0, 10).join(', ') + '...',
            },
          },
        },
      });
    } catch (error: any) {
      logger.error({
        event: 'ai_vocabulary_generation_failed',
        userId: context.user.id,
        error: error.message,
        stack: error.stack,
      });
      return NextResponse.json(
        {
          error: 'Failed to generate vocabulary',
          message: error.message,
        },
        { status: 500 }
      );
    }
  }
);
