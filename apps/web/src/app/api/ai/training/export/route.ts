/**
 * AI Training Export API
 *
 * GET /api/ai/training/export - Export corrections as JSON or CSV
 *
 * RLHF Loop Phase 2: Enables export of correction data for external ML training
 * pipelines, data analysis, and model fine-tuning workflows
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
const ExportQuerySchema = z.object({
  startDate: z.string().datetime('Invalid start date format'),
  endDate: z.string().datetime('Invalid end date format'),
  format: z.enum(['json', 'csv']).default('json'),
});

/**
 * GET /api/ai/training/export
 * Export corrections in JSON or CSV format for external ML training
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
      };

      // Validate query parameters
      const validation = ExportQuerySchema.safeParse(queryParams);
      if (!validation.success) {
        return NextResponse.json(
          {
            error: 'Invalid query parameters',
            details: validation.error.format(),
          },
          { status: 400 }
        );
      }

      const { startDate, endDate, format } = validation.data;

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

      // Check if range is too large (prevent excessive data export)
      const daysDiff = Math.ceil(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff > 365) {
        return NextResponse.json(
          { error: 'Date range cannot exceed 365 days for export' },
          { status: 400 }
        );
      }

      // Generate filename
      const dateStr = start.toISOString().split('T')[0];
      const filename = `corrections_${dateStr}_to_${end.toISOString().split('T')[0]}.${format}`;

      // Export based on format
      let content: string;
      let contentType: string;

      if (format === 'json') {
        content = await transcriptionCorrectionService.exportCorrectionsAsJSON(
          start,
          end
        );
        contentType = 'application/json';
      } else {
        content = await transcriptionCorrectionService.exportCorrectionsAsCSV(
          start,
          end
        );
        contentType = 'text/csv';
      }

      // Log export for audit trail
      logger.info({
        event: 'corrections_exported',
        startDate,
        endDate,
        format,
        filename,
        sizeBytes: content.length,
        userId: context.user.id,
        userName: `${context.user.firstName} ${context.user.lastName}`,
      });

      // Return file with appropriate headers
      return new NextResponse(content, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    } catch (error: any) {
      logger.error({
        event: 'corrections_export_failed',
        userId: context.user.id,
        error: error.message,
        stack: error.stack,
      });
      return NextResponse.json(
        {
          error: 'Failed to export corrections',
          message: error.message,
        },
        { status: 500 }
      );
    }
  }
);
