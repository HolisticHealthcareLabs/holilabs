'use client';

/**
 * AI Confidence Highlight Component
 *
 * Displays AI-generated text with per-sentence confidence highlighting
 * - Color-codes sentences based on confidence level
 * - Shows tooltip with detailed confidence metrics on hover
 * - Flags low-confidence sentences for review
 *
 * @compliance Phase 2.3: AI Quality Control
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

export interface ConfidenceScore {
  id?: string;
  sentenceIndex: number;
  sentenceText: string;
  confidence: number;
  perplexity?: number;
  uncertainty?: number;
  needsReview?: boolean;
  reviewed?: boolean;
}

export interface ConfidenceHighlightProps {
  contentType: string;
  contentId: string;
  sectionType?: string;
  text?: string; // If provided, will split into sentences locally
  scores?: ConfidenceScore[]; // Pre-computed scores
  showLegend?: boolean;
  highlightLowConfidence?: boolean;
  lowConfidenceThreshold?: number;
  onSentenceClick?: (score: ConfidenceScore) => void;
}

export function ConfidenceHighlight({
  contentType,
  contentId,
  sectionType,
  text,
  scores: providedScores,
  showLegend = true,
  highlightLowConfidence = true,
  lowConfidenceThreshold = 0.7,
  onSentenceClick,
}: ConfidenceHighlightProps) {
  const [scores, setScores] = useState<ConfidenceScore[]>(providedScores || []);
  const [isLoading, setIsLoading] = useState(!providedScores);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Fetch confidence scores if not provided
  useEffect(() => {
    if (providedScores) {
      setScores(providedScores);
      setIsLoading(false);
      return;
    }

    const fetchScores = async () => {
      try {
        const params = new URLSearchParams({
          contentType,
          contentId,
        });
        if (sectionType) params.append('sectionType', sectionType);

        const response = await fetch(`/api/ai/confidence?${params}`);
        if (response.ok) {
          const data = await response.json();
          setScores(data.scores || []);
        }
      } catch (error) {
        console.error('Error fetching confidence scores:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchScores();
  }, [contentType, contentId, sectionType, providedScores]);

  // Split text into sentences if provided without scores
  useEffect(() => {
    if (text && scores.length === 0 && !isLoading) {
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
      const mockScores: ConfidenceScore[] = sentences.map((sentence, index) => ({
        sentenceIndex: index,
        sentenceText: sentence.trim(),
        confidence: 0.85, // Mock confidence - in production, this comes from AI model
        needsReview: false,
      }));
      setScores(mockScores);
    }
  }, [text, scores, isLoading]);

  const getConfidenceColor = (confidence: number, needsReview: boolean) => {
    if (needsReview && highlightLowConfidence) {
      return 'bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-700';
    }
    if (confidence >= 0.8) {
      return 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800';
    }
    if (confidence >= 0.6) {
      return 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800';
    }
    return 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800';
  };

  const getConfidenceIcon = (confidence: number, needsReview: boolean) => {
    if (needsReview) {
      return <AlertTriangle className="h-3 w-3 text-red-600 dark:text-red-400" />;
    }
    if (confidence >= 0.8) {
      return <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />;
    }
    if (confidence >= 0.6) {
      return <Info className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />;
    }
    return <AlertTriangle className="h-3 w-3 text-orange-600 dark:text-orange-400" />;
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
      </div>
    );
  }

  if (scores.length === 0) {
    return <div className="text-gray-500 dark:text-gray-400 italic">No text to display</div>;
  }

  const needsReviewCount = scores.filter(s => s.needsReview).length;

  return (
    <div className="space-y-4">
      {/* Legend */}
      {showLegend && (
        <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400 pb-2 border-b border-gray-200 dark:border-gray-700">
          <span className="font-medium">Confidence Level:</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-200 dark:bg-green-800"></div>
            <span>High (&gt;80%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-yellow-200 dark:bg-yellow-800"></div>
            <span>Medium (60-80%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-orange-200 dark:bg-orange-800"></div>
            <span>Low (&lt;60%)</span>
          </div>
          {needsReviewCount > 0 && (
            <div className="flex items-center gap-1 ml-auto">
              <AlertTriangle className="h-3 w-3 text-red-600" />
              <span className="text-red-600 dark:text-red-400 font-medium">
                {needsReviewCount} sentence{needsReviewCount > 1 ? 's' : ''} need review
              </span>
            </div>
          )}
        </div>
      )}

      {/* Highlighted Text */}
      <div className="space-y-1">
        {scores.map((score, index) => {
          const isHovered = hoveredIndex === index;
          const needsReview = score.needsReview || score.confidence < lowConfidenceThreshold;

          return (
            <motion.span
              key={score.id || index}
              className={`
                inline-block relative px-1 py-0.5 rounded border transition-all cursor-pointer
                ${getConfidenceColor(score.confidence, needsReview)}
                ${isHovered ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
                ${onSentenceClick ? 'hover:shadow-md' : ''}
              `}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => onSentenceClick?.(score)}
              whileHover={{ scale: 1.01 }}
            >
              {score.sentenceText}{' '}

              {/* Tooltip on hover */}
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute left-0 top-full mt-2 z-10 w-64 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
                >
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        Sentence {index + 1}
                      </span>
                      {getConfidenceIcon(score.confidence, needsReview)}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Confidence:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {Math.round(score.confidence * 100)}% ({getConfidenceLabel(score.confidence)})
                        </span>
                      </div>

                      {score.perplexity !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Perplexity:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {score.perplexity.toFixed(2)}
                          </span>
                        </div>
                      )}

                      {score.uncertainty !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Uncertainty:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {Math.round(score.uncertainty * 100)}%
                          </span>
                        </div>
                      )}
                    </div>

                    {needsReview && (
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                          <AlertTriangle className="h-3 w-3" />
                          <span className="font-medium">Needs manual review</span>
                        </div>
                      </div>
                    )}

                    {score.reviewed && (
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-3 w-3" />
                          <span className="font-medium">Reviewed</span>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </motion.span>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="flex items-center gap-6 pt-2 text-xs text-gray-600 dark:text-gray-400">
        <div>
          <span className="font-medium">Sentences:</span> {scores.length}
        </div>
        <div>
          <span className="font-medium">Avg Confidence:</span>{' '}
          {Math.round((scores.reduce((sum, s) => sum + s.confidence, 0) / scores.length) * 100)}%
        </div>
        <div>
          <span className="font-medium">Min:</span>{' '}
          {Math.round(Math.min(...scores.map(s => s.confidence)) * 100)}%
        </div>
        <div>
          <span className="font-medium">Max:</span>{' '}
          {Math.round(Math.max(...scores.map(s => s.confidence)) * 100)}%
        </div>
      </div>
    </div>
  );
}
