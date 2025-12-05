/**
 * AI Feedback API
 *
 * POST /api/ai/feedback - Submit feedback on AI-generated content
 * GET  /api/ai/feedback - Get feedback analytics
 *
 * @compliance Phase 2.3: AI Quality Control
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Calculate Levenshtein distance for ML metrics
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * POST /api/ai/feedback
 * Submit feedback on AI-generated content
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const {
      contentType,
      contentId,
      sectionType,
      isCorrect,
      rating,
      originalText,
      editedText,
      aiConfidence,
      patientId,
      sessionId,
      feedbackNotes,
      timeToReview,
    } = body;

    // Validation
    if (!contentType || !contentId || typeof isCorrect !== 'boolean' || !originalText) {
      return NextResponse.json(
        { error: 'Missing required fields: contentType, contentId, isCorrect, originalText' },
        { status: 400 }
      );
    }

    // Calculate edit distance if edited text provided
    let editDistance: number | undefined;
    if (editedText && editedText !== originalText) {
      editDistance = levenshteinDistance(originalText, editedText);
    }

    // Create feedback record
    const feedback = await prisma.aIContentFeedback.create({
      data: {
        contentType,
        contentId,
        sectionType,
        isCorrect,
        rating,
        originalText,
        editedText,
        editDistance,
        aiConfidence,
        clinicianId: session.user.id,
        patientId,
        sessionId,
        feedbackNotes,
        timeToReview,
      },
    });

    console.log(
      `✅ [AI Feedback] Clinician ${session.user.id} marked ${contentType} ${contentId} as ${isCorrect ? 'CORRECT' : 'INCORRECT'}`
    );

    // If feedback is negative and edit distance is significant, auto-flag for review queue
    if (!isCorrect && editDistance && editDistance > 10) {
      console.log(
        `⚠️  [AI Feedback] Significant edit distance (${editDistance}) - may need review queue entry`
      );
    }

    return NextResponse.json({
      success: true,
      feedback: {
        id: feedback.id,
        isCorrect: feedback.isCorrect,
        editDistance: feedback.editDistance,
      },
    });

  } catch (error) {
    console.error('❌ [AI Feedback API] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/feedback
 * Get feedback analytics and recent feedback items
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const contentType = searchParams.get('contentType');
    const contentId = searchParams.get('contentId');
    const clinicianId = searchParams.get('clinicianId') || session.user.id;
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build query filters
    const where: any = {};
    if (contentType) where.contentType = contentType;
    if (contentId) where.contentId = contentId;
    if (clinicianId) where.clinicianId = clinicianId;

    // Fetch feedback items
    const feedbackItems = await prisma.aIContentFeedback.findMany({
      where,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Calculate summary statistics
    const totalFeedback = feedbackItems.length;
    const correctCount = feedbackItems.filter(f => f.isCorrect).length;
    const incorrectCount = feedbackItems.filter(f => !f.isCorrect).length;
    const accuracyRate = totalFeedback > 0 ? correctCount / totalFeedback : 0;

    const avgEditDistance = feedbackItems
      .filter(f => f.editDistance !== null)
      .reduce((sum, f) => sum + (f.editDistance || 0), 0) / Math.max(incorrectCount, 1);

    const avgConfidence = feedbackItems
      .filter(f => f.aiConfidence !== null)
      .reduce((sum, f) => sum + (f.aiConfidence || 0), 0) / totalFeedback || 0;

    const avgConfidenceWhenCorrect = feedbackItems
      .filter(f => f.isCorrect && f.aiConfidence !== null)
      .reduce((sum, f) => sum + (f.aiConfidence || 0), 0) / Math.max(correctCount, 1);

    const avgConfidenceWhenIncorrect = feedbackItems
      .filter(f => !f.isCorrect && f.aiConfidence !== null)
      .reduce((sum, f) => sum + (f.aiConfidence || 0), 0) / Math.max(incorrectCount, 1);

    return NextResponse.json({
      success: true,
      summary: {
        totalFeedback,
        correctCount,
        incorrectCount,
        accuracyRate,
        avgEditDistance: isNaN(avgEditDistance) ? 0 : avgEditDistance,
        avgConfidence: isNaN(avgConfidence) ? 0 : avgConfidence,
        avgConfidenceWhenCorrect: isNaN(avgConfidenceWhenCorrect) ? 0 : avgConfidenceWhenCorrect,
        avgConfidenceWhenIncorrect: isNaN(avgConfidenceWhenIncorrect) ? 0 : avgConfidenceWhenIncorrect,
      },
      items: feedbackItems.map(item => ({
        id: item.id,
        contentType: item.contentType,
        contentId: item.contentId,
        sectionType: item.sectionType,
        isCorrect: item.isCorrect,
        rating: item.rating,
        editDistance: item.editDistance,
        aiConfidence: item.aiConfidence,
        clinician: item.clinician,
        feedbackNotes: item.feedbackNotes,
        timeToReview: item.timeToReview,
        createdAt: item.createdAt,
      })),
    });

  } catch (error) {
    console.error('❌ [AI Feedback API] Error fetching feedback:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
