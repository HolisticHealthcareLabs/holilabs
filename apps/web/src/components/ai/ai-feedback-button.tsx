'use client';

/**
 * AI Feedback Button Component
 *
 * Allows clinicians to provide quick feedback on AI-generated content
 * - "This is correct" / "This is incorrect"
 * - Optional inline editing for corrections
 * - Tracks time to review for analytics
 *
 * @compliance Phase 2.3: AI Quality Control
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Edit2, MessageSquare, Loader2 } from 'lucide-react';

export interface AIFeedbackButtonProps {
  contentType: 'soap_note' | 'diagnosis' | 'prescription' | 'transcription';
  contentId: string;
  sectionType?: string;
  originalText: string;
  aiConfidence?: number;
  patientId?: string;
  sessionId?: string;
  onFeedbackSubmitted?: (feedback: {
    isCorrect: boolean;
    editedText?: string;
    rating?: number;
  }) => void;
  compact?: boolean;
  disabled?: boolean;
}

export function AIFeedbackButton({
  contentType,
  contentId,
  sectionType,
  originalText,
  aiConfidence,
  patientId,
  sessionId,
  onFeedbackSubmitted,
  compact = false,
  disabled = false,
}: AIFeedbackButtonProps) {
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);
  const [showEditMode, setShowEditMode] = useState(false);
  const [editedText, setEditedText] = useState(originalText);
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewStartTime] = useState(Date.now());

  const submitFeedback = async (isCorrect: boolean, edited?: string) => {
    setIsSubmitting(true);

    try {
      const timeToReview = Date.now() - reviewStartTime;

      const response = await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType,
          contentId,
          sectionType,
          isCorrect,
          rating: rating > 0 ? rating : undefined,
          originalText,
          editedText: edited,
          aiConfidence,
          patientId,
          sessionId,
          feedbackNotes: notes || undefined,
          timeToReview,
        }),
      });

      if (response.ok) {
        setFeedbackGiven(isCorrect);
        onFeedbackSubmitted?.({
          isCorrect,
          editedText: edited,
          rating: rating > 0 ? rating : undefined,
        });
      } else {
        console.error('Failed to submit feedback');
        alert('Failed to submit feedback. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Error submitting feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCorrect = () => {
    submitFeedback(true);
  };

  const handleIncorrect = () => {
    setShowEditMode(true);
  };

  const handleSubmitCorrection = () => {
    submitFeedback(false, editedText !== originalText ? editedText : undefined);
    setShowEditMode(false);
  };

  const handleCancelEdit = () => {
    setShowEditMode(false);
    setEditedText(originalText);
    setNotes('');
    setRating(0);
  };

  // Already submitted feedback
  if (feedbackGiven !== null && !showEditMode) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`flex items-center gap-2 ${
          feedbackGiven
            ? 'text-green-600 dark:text-green-400'
            : 'text-orange-600 dark:text-orange-400'
        }`}
      >
        {feedbackGiven ? (
          <Check className="h-4 w-4" />
        ) : (
          <Edit2 className="h-4 w-4" />
        )}
        <span className="text-sm font-medium">
          {feedbackGiven ? 'Marked as correct' : 'Correction submitted'}
        </span>
      </motion.div>
    );
  }

  // Edit mode for corrections
  if (showEditMode) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="space-y-3 p-4 border border-orange-200 dark:border-orange-800 rounded-lg bg-orange-50 dark:bg-orange-950/20"
      >
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-orange-900 dark:text-orange-100">
            Provide Correction
          </h4>
          <button
            onClick={handleCancelEdit}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            disabled={isSubmitting}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Corrected Text (optional)
          </label>
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            rows={4}
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What was incorrect? How can the AI improve?"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            rows={2}
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Rate AI Quality (optional)
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className={`h-6 w-6 rounded ${
                  star <= rating
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                }`}
                disabled={isSubmitting}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSubmitCorrection}
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white text-sm font-medium rounded-md transition-colors"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Submit Correction
              </>
            )}
          </button>
          <button
            onClick={handleCancelEdit}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md transition-colors"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    );
  }

  // Initial feedback buttons
  if (compact) {
    return (
      <div className="flex gap-2">
        <button
          onClick={handleCorrect}
          disabled={disabled || isSubmitting}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/20 rounded border border-green-200 dark:border-green-800 transition-colors disabled:opacity-50"
          title="Mark as correct"
        >
          <Check className="h-3 w-3" />
          Correct
        </button>
        <button
          onClick={handleIncorrect}
          disabled={disabled || isSubmitting}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/20 rounded border border-orange-200 dark:border-orange-800 transition-colors disabled:opacity-50"
          title="Provide correction"
        >
          <X className="h-3 w-3" />
          Incorrect
        </button>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="flex flex-col gap-3 p-4 border border-gray-200 dark:border-gray-800 rounded-lg bg-gray-50 dark:bg-gray-900/50"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            How accurate is this AI-generated content?
          </span>
        </div>

        {aiConfidence !== undefined && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>AI Confidence:</span>
            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  aiConfidence >= 0.8
                    ? 'bg-green-500'
                    : aiConfidence >= 0.6
                    ? 'bg-yellow-500'
                    : 'bg-orange-500'
                }`}
                style={{ width: `${aiConfidence * 100}%` }}
              />
            </div>
            <span className="font-medium">{Math.round(aiConfidence * 100)}%</span>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleCorrect}
            disabled={disabled || isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium rounded-md transition-colors"
          >
            <Check className="h-4 w-4" />
            This is Correct
          </button>
          <button
            onClick={handleIncorrect}
            disabled={disabled || isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white text-sm font-medium rounded-md transition-colors"
          >
            <X className="h-4 w-4" />
            This is Incorrect
          </button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Your feedback helps improve AI accuracy
        </p>
      </motion.div>
    </AnimatePresence>
  );
}
