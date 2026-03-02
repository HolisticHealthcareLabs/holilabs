'use client';

import { useState, useCallback } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare, ChevronRight } from 'lucide-react';

interface AlertFeedbackProps {
  assuranceEventId: string;
  onFeedbackSubmitted?: (feedbackType: string) => void;
  compact?: boolean;
}

type FeedbackType = 'THUMBS_UP' | 'THUMBS_DOWN' | 'CORRECTION' | 'COMMENT';

/**
 * Inline feedback widget for CDS alert actions.
 *
 * Renders thumbs-up/down buttons with optional correction text input.
 * Calls POST /api/assurance/feedback to record clinician feedback
 * for the Clinical Ground Truth flywheel.
 */
export function AlertFeedback({
  assuranceEventId,
  onFeedbackSubmitted,
  compact = false,
}: AlertFeedbackProps) {
  const [submitted, setSubmitted] = useState<FeedbackType | null>(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const [freeText, setFreeText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitFeedback = useCallback(
    async (feedbackType: FeedbackType, text?: string) => {
      if (submitting) return;
      setSubmitting(true);
      setError(null);

      try {
        const res = await fetch('/api/assurance/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assuranceEventId,
            feedbackType,
            ...(text ? { freeText: text } : {}),
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${res.status}`);
        }

        setSubmitted(feedbackType);
        setShowTextInput(false);
        onFeedbackSubmitted?.(feedbackType);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to submit');
      } finally {
        setSubmitting(false);
      }
    },
    [assuranceEventId, submitting, onFeedbackSubmitted]
  );

  if (submitted) {
    const labels: Record<FeedbackType, string> = {
      THUMBS_UP: 'Helpful',
      THUMBS_DOWN: 'Not helpful',
      CORRECTION: 'Correction sent',
      COMMENT: 'Comment sent',
    };
    return (
      <span className="text-xs text-green-600 flex items-center gap-1">
        <ThumbsUp className="w-3 h-3" />
        {labels[submitted]}
      </span>
    );
  }

  return (
    <div className={`flex items-center ${compact ? 'gap-1' : 'gap-2'}`}>
      <button
        onClick={() => submitFeedback('THUMBS_UP')}
        disabled={submitting}
        className="p-1 rounded hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors disabled:opacity-50"
        title="Helpful"
        aria-label="Mark as helpful"
      >
        <ThumbsUp className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      </button>

      <button
        onClick={() => submitFeedback('THUMBS_DOWN')}
        disabled={submitting}
        className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
        title="Not helpful"
        aria-label="Mark as not helpful"
      >
        <ThumbsDown className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      </button>

      <button
        onClick={() => setShowTextInput(!showTextInput)}
        disabled={submitting}
        className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-50"
        title="Add correction or comment"
        aria-label="Add correction or comment"
      >
        <MessageSquare className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      </button>

      {showTextInput && (
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="Correction or comment..."
            className="text-xs border border-gray-200 rounded px-2 py-1 w-48 focus:outline-none focus:ring-1 focus:ring-blue-400"
            maxLength={2000}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && freeText.trim()) {
                submitFeedback('CORRECTION', freeText.trim());
              }
            }}
          />
          <button
            onClick={() => {
              if (freeText.trim()) {
                submitFeedback('CORRECTION', freeText.trim());
              }
            }}
            disabled={submitting || !freeText.trim()}
            className="p-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            aria-label="Submit feedback"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
