/**
 * AI Confidence Scores API
 *
 * POST /api/ai/confidence - Store sentence-level confidence scores
 * GET  /api/ai/confidence - Retrieve confidence scores for content
 *
 * @compliance Phase 2.3: AI Quality Control
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * POST /api/ai/confidence
 * Store per-sentence confidence scores for AI-generated content
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
      sentences, // Array of { index, text, confidence, perplexity, uncertainty, tokenScores }
      model,
      modelVersion,
      confidenceThreshold = 0.7, // Flag for review if below this
    } = body;

    // Validation
    if (!contentType || !contentId || !sentences || !Array.isArray(sentences)) {
      return NextResponse.json(
        { error: 'Missing required fields: contentType, contentId, sentences' },
        { status: 400 }
      );
    }

    // Create confidence score records for each sentence
    const confidenceRecords = await Promise.all(
      sentences.map((sentence: any) =>
        prisma.aISentenceConfidence.create({
          data: {
            contentType,
            contentId,
            sectionType,
            sentenceIndex: sentence.index,
            sentenceText: sentence.text,
            confidence: sentence.confidence,
            perplexity: sentence.perplexity,
            uncertainty: sentence.uncertainty,
            tokenScores: sentence.tokenScores,
            model: model || 'unknown',
            modelVersion,
            needsReview: sentence.confidence < confidenceThreshold,
          },
        })
      )
    );

    // Count how many need review
    const needsReviewCount = confidenceRecords.filter(r => r.needsReview).length;

    logger.info({
      event: 'ai_confidence_stored',
      contentType,
      contentId,
      sentenceCount: confidenceRecords.length,
      needsReviewCount,
      userId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      stored: confidenceRecords.length,
      needsReview: needsReviewCount,
      ids: confidenceRecords.map(r => r.id),
    });

  } catch (error: any) {
    logger.error({
      event: 'ai_confidence_store_failed',
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/confidence
 * Retrieve confidence scores for content
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
    const sectionType = searchParams.get('sectionType');
    const needsReview = searchParams.get('needsReview') === 'true';

    if (!contentType || !contentId) {
      return NextResponse.json(
        { error: 'Missing required query params: contentType, contentId' },
        { status: 400 }
      );
    }

    // Build query filters
    const where: any = {
      contentType,
      contentId,
    };
    if (sectionType) where.sectionType = sectionType;
    if (needsReview) where.needsReview = true;

    // Fetch confidence scores
    const scores = await prisma.aISentenceConfidence.findMany({
      where,
      orderBy: {
        sentenceIndex: 'asc',
      },
    });

    // Calculate summary stats
    const avgConfidence = scores.reduce((sum, s) => sum + s.confidence, 0) / scores.length || 0;
    const minConfidence = Math.min(...scores.map(s => s.confidence));
    const maxConfidence = Math.max(...scores.map(s => s.confidence));
    const needsReviewCount = scores.filter(s => s.needsReview).length;

    return NextResponse.json({
      success: true,
      summary: {
        totalSentences: scores.length,
        avgConfidence,
        minConfidence,
        maxConfidence,
        needsReviewCount,
      },
      scores: scores.map(s => ({
        id: s.id,
        sentenceIndex: s.sentenceIndex,
        sentenceText: s.sentenceText,
        confidence: s.confidence,
        perplexity: s.perplexity,
        uncertainty: s.uncertainty,
        tokenScores: s.tokenScores,
        needsReview: s.needsReview,
        reviewed: s.reviewed,
        reviewedBy: s.reviewedBy,
        reviewedAt: s.reviewedAt,
      })),
    });

  } catch (error: any) {
    logger.error({
      event: 'ai_confidence_fetch_failed',
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
