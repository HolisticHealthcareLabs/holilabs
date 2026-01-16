'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface TranscriptSegment {
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
  correctedAt?: string; // ISO timestamp when segment was corrected
  correctedBy?: string; // User ID who corrected it
  originalText?: string; // Original AI-generated text before correction
}

interface TranscriptViewerProps {
  segments: TranscriptSegment[];
  onSegmentCorrect?: (index: number, newText: string, originalText: string) => void;
  readonly?: boolean;
}

export default function TranscriptViewer({
  segments,
  onSegmentCorrect,
  readonly = false
}: TranscriptViewerProps) {
  const { t: tRaw } = useLanguage();
  const t = (key: string) => tRaw(`copilot.${key}`);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showTrainingFeedback, setShowTrainingFeedback] = useState(false);
  const [lastCorrectedIndex, setLastCorrectedIndex] = useState<number | null>(null);
  const [totalCorrections, setTotalCorrections] = useState(0);

  // Count corrections on mount and when segments change
  useEffect(() => {
    const corrected = segments.filter(s => s.correctedAt).length;
    setTotalCorrections(corrected);
  }, [segments]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-green-100 text-green-700 border-green-300';
    if (confidence >= 0.85) return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    return 'bg-red-100 text-red-700 border-red-300';
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.9) return '✓ High';
    if (confidence >= 0.85) return '⚠ Review';
    return '⚠ Low - Please verify';
  };

  const handleStartEdit = (index: number, text: string) => {
    if (readonly) return;
    setEditingIndex(index);
    setEditText(text);
  };

  const handleSaveEdit = (index: number, originalText: string) => {
    if (editText.trim() && editText !== originalText) {
      onSegmentCorrect?.(index, editText.trim(), originalText);

      // Show training feedback
      setLastCorrectedIndex(index);
      setShowTrainingFeedback(true);
      setTotalCorrections(prev => prev + 1);

      // Auto-hide feedback after 5 seconds
      setTimeout(() => {
        setShowTrainingFeedback(false);
        setLastCorrectedIndex(null);
      }, 5000);
    }
    setEditingIndex(null);
    setEditText('');
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditText('');
  };

  if (!segments || segments.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
        {/* Decorative - low contrast intentional for empty state icon */}
        <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
        <p className="font-medium">{t('transcriptEmptyTitle')}</p>
        {/* Decorative - low contrast intentional for empty state helper text */}
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t('transcriptEmptySubtitle')}</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-3 max-h-[600px] overflow-y-auto pr-2">
      {/* Training Feedback Toast */}
      {showTrainingFeedback && (
        <div className="sticky top-0 z-50 mb-4 animate-fade-in">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-lg p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-green-900 mb-1">{t('transcriptCorrectionSavedTitle')}</h4>
                <p className="text-sm text-green-800 leading-relaxed">{t('transcriptCorrectionSavedBody')}</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-green-700">
                  <span className="font-semibold">🧠 {t('transcriptRlhfLabel')}</span>
                  <span className="bg-green-200 px-2 py-1 rounded">{t('transcriptRlhfActive')}</span>
                </div>
              </div>
              <button
                onClick={() => setShowTrainingFeedback(false)}
                className="flex-shrink-0 text-green-600 hover:text-green-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {segments.map((segment, idx) => {
        const isLowConfidence = segment.confidence < 0.85;
        const isEditing = editingIndex === idx;
        const isHovered = hoveredIndex === idx;
        const isCorrected = !!segment.correctedAt;
        const isJustCorrected = lastCorrectedIndex === idx;

        return (
          <div
            key={idx}
            onMouseEnter={() => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
            className={`relative group p-4 rounded-lg border-2 transition-all ${
              isJustCorrected
                ? 'bg-green-50 border-green-400 shadow-lg animate-pulse'
                : isEditing
                ? 'bg-blue-50 border-blue-400 shadow-lg'
                : isCorrected
                ? 'bg-emerald-50 border-emerald-300 hover:border-emerald-400'
                : isLowConfidence
                ? 'bg-yellow-50 border-yellow-300 hover:border-yellow-400'
                : segment.speaker === 'Doctor'
                ? 'bg-blue-50 border-blue-200 hover:border-blue-300'
                : 'bg-gray-50 border-gray-200 hover:border-gray-300'
            }`}
          >
            {/* Corrected Badge */}
            {isCorrected && !isEditing && (
              <div className="absolute -top-2 left-4 bg-green-500 text-white text-xs px-3 py-1 rounded-full font-bold shadow-md flex items-center gap-1">
                <span>✓</span>
                <span>Corregido por médico</span>
              </div>
            )}

            {/* Low Confidence Warning Banner */}
            {isLowConfidence && !isEditing && !isCorrected && (
              <div className="absolute -top-2 left-4 bg-yellow-500 text-white text-xs px-3 py-1 rounded-full font-bold shadow-md flex items-center gap-1">
                <span>⚠️</span>
                <span>Baja confianza - Revisar</span>
              </div>
            )}

            {/* Speaker Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                    segment.speaker === 'Doctor'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-600 text-white'
                  }`}
                >
                  {segment.speaker}
                </span>
                {/* Decorative - low contrast intentional for timestamp badge */}
                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-white dark:bg-gray-700 px-2 py-1 rounded">
                  {formatTime(segment.startTime)} → {formatTime(segment.endTime)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Confidence Badge */}
                <span
                  className={`text-xs px-3 py-1 rounded-full font-bold border-2 ${getConfidenceColor(
                    segment.confidence
                  )}`}
                  title={getConfidenceBadge(segment.confidence)}
                >
                  {Math.round(segment.confidence * 100)}%
                </span>

                {/* Edit Button */}
                {!readonly && !isEditing && isHovered && (
                  <button
                    onClick={() => handleStartEdit(idx, segment.text)}
                    className="text-xs px-3 py-1 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transition-colors flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    {t('transcriptEdit')}
                  </button>
                )}
              </div>
            </div>

            {/* Transcript Text or Editor */}
            {isEditing ? (
              <div className="space-y-3">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full p-3 border-2 border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 leading-relaxed min-h-[100px] resize-y"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') handleCancelEdit();
                    if (e.key === 'Enter' && e.metaKey) handleSaveEdit(idx, segment.text);
                  }}
                />

                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                    {t('transcriptQuickSaveHint')}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {t('transcriptCancel')}
                    </button>
                    <button
                      onClick={() => handleSaveEdit(idx, segment.text)}
                      className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-md flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {t('transcriptSaveCorrection')}
                    </button>
                  </div>
                </div>

                {/* Original text for reference */}
                <div className="p-3 bg-gray-100 border-l-4 border-gray-400 rounded">
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold mb-1">{t('transcriptOriginalAi')}</p>
                  <p className="text-sm text-gray-700 italic">{segment.text}</p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-gray-900 leading-relaxed text-[15px]">{segment.text}</p>

                {/* Confidence Details (for low confidence) */}
                {isLowConfidence && (
                  <div className="mt-3 p-2 bg-yellow-100 border-l-4 border-yellow-500 rounded text-xs">
                    <p className="font-semibold text-yellow-800">
                      ⚠️ {t('transcriptLowConfidenceTitle')} ({Math.round(segment.confidence * 100)}%)
                    </p>
                    <p className="text-yellow-700 mt-1">
                      {t('transcriptLowConfidenceBody')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Summary Stats with Training Metrics */}
      <div className="sticky bottom-0 bg-gradient-to-r from-gray-50 to-gray-100 border-t-2 border-gray-300 p-4 rounded-lg mt-4">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{segments.length}</p>
            {/* Decorative - low contrast intentional for statistics label */}
            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">{t('transcriptStatsSegments')}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-500">
              {segments.filter(s => s.confidence >= 0.9).length}
            </p>
            {/* Decorative - low contrast intentional for statistics label */}
            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">{t('transcriptStatsHighConfidence')}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-500">
              {segments.filter(s => s.confidence < 0.85 && !s.correctedAt).length}
            </p>
            {/* Decorative - low contrast intentional for statistics label */}
            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">{t('transcriptStatsNeedsReview')}</p>
          </div>
          <div className="relative">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">{totalCorrections}</p>
            {/* Decorative - low contrast intentional for statistics label */}
            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">{t('transcriptStatsCorrected')}</p>
            {totalCorrections > 0 && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse" title={t('transcriptStatsContributing')} />
            )}
          </div>
        </div>

        {/* Training Loop Indicator */}
        {totalCorrections > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
            {/* Decorative - low contrast intentional for training loop metadata */}
            <div className="flex items-center justify-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="font-semibold">{t('transcriptRlhfActiveLabel')}</span>
              <span>{t('transcriptRlhfActiveBody').replace('{n}', String(totalCorrections)).replace('{s}', totalCorrections !== 1 ? 's' : '')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
