/**
 * Scribe Session Corrections API
 *
 * POST /api/scribe/sessions/:id/corrections - Save transcript segment correction
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * POST /api/scribe/sessions/:id/corrections
 * Save a correction to a transcript segment
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const sessionId = context.params.id;
      const body = await request.json();

      const {
        segmentIndex,
        originalText,
        correctedText,
        confidence,
        speaker,
        startTime,
        endTime,
      } = body;

      // Validate required fields
      if (
        segmentIndex === undefined ||
        !originalText ||
        !correctedText ||
        confidence === undefined
      ) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        );
      }

      // Verify session belongs to this clinician
      const session = await prisma.scribeSession.findFirst({
        where: {
          id: sessionId,
          clinicianId: context.user.id,
        },
        include: {
          transcription: true,
        },
      });

      if (!session) {
        return NextResponse.json(
          { error: 'Session not found or access denied' },
          { status: 404 }
        );
      }

      if (!session.transcription) {
        return NextResponse.json(
          { error: 'No transcription found for this session' },
          { status: 404 }
        );
      }

      // Get current segments
      const segments = session.transcription.segments as any[];

      if (!Array.isArray(segments) || segmentIndex >= segments.length) {
        return NextResponse.json(
          { error: 'Invalid segment index' },
          { status: 400 }
        );
      }

      // Update the segment with corrected text
      const updatedSegments = [...segments];
      updatedSegments[segmentIndex] = {
        ...updatedSegments[segmentIndex],
        text: correctedText,
        originalText: originalText, // Store original for reference
        correctedAt: new Date().toISOString(),
        correctedBy: context.user.id,
      };

      // Update transcription in database
      await prisma.transcription.update({
        where: { id: session.transcription.id },
        data: {
          segments: updatedSegments,
          updatedAt: new Date(),
        },
      });

      // TODO: Phase 1.3 - Log to TranscriptionError model for ML improvement
      // For now, we'll log to console for tracking
      console.log('📝 Transcript correction saved:', {
        sessionId,
        segmentIndex,
        confidence,
        speaker,
        originalLength: originalText.length,
        correctedLength: correctedText.length,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        data: {
          segmentIndex,
          correctedText,
          updatedAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      console.error('Error saving correction:', error);
      return NextResponse.json(
        { error: 'Failed to save correction', message: error.message },
        { status: 500 }
      );
    }
  }
);
