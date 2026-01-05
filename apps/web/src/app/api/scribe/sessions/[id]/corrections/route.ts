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
 * Calculate Levenshtein distance between two strings
 * Used to measure edit distance for ML error analysis
 */
function calculateLevenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,     // deletion
          dp[i][j - 1] + 1,     // insertion
          dp[i - 1][j - 1] + 1  // substitution
        );
      }
    }
  }

  return dp[m][n];
}

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

      // Calculate Levenshtein distance for ML analysis
      const editDistance = calculateLevenshteinDistance(originalText, correctedText);

      // Log to TranscriptionError model for ML improvement (RLHF Loop)
      await prisma.transcriptionError.create({
        data: {
          sessionId,
          segmentIndex,
          startTime,
          endTime,
          speaker,
          confidence,
          originalText,
          correctedText,
          editDistance,
          correctedBy: context.user.id,
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || null,
        },
      });

      console.log('✅ Correction saved to training queue:', {
        sessionId,
        segmentIndex,
        confidence,
        editDistance,
        speaker,
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
  },
  {
    audit: {
      action: 'UPDATE',
      resource: 'Transcription',
      details: (req, context) => ({
        sessionId: context.params.id,
        accessType: 'TRANSCRIPT_CORRECTION',
      }),
    },
  }
);
