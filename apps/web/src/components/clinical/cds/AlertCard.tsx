/**
 * Alert Card Component
 *
 * Displays individual clinical decision support alerts
 * Medical naming: "Alert" (standard clinical terminology for notifications requiring action)
 *
 * Features:
 * - Severity-based styling (Critical, Warning, Info)
 * - Expandable detail view
 * - Action buttons (Accept, Override, Dismiss)
 * - Source attribution
 * - Evidence strength badge
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CDSAlert } from '@/lib/cds/types';

interface AlertCardProps {
  alert: CDSAlert;
  onAccept?: (alertId: string) => void;
  onOverride?: (alertId: string, reason: string) => void;
  onDismiss?: (alertId: string) => void;
  compact?: boolean;
}

const severityConfig = {
  critical: {
    bg: 'bg-red-50 dark:bg-red-950/20',
    border: 'border-red-200 dark:border-red-800',
    icon: '🚨',
    iconBg: 'bg-red-100 dark:bg-red-900',
    text: 'text-red-900 dark:text-red-100',
    badge: 'bg-red-600 text-white',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    border: 'border-amber-200 dark:border-amber-800',
    icon: '⚠️',
    iconBg: 'bg-amber-100 dark:bg-amber-900',
    text: 'text-amber-900 dark:text-amber-100',
    badge: 'bg-amber-600 text-white',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'ℹ️',
    iconBg: 'bg-blue-100 dark:bg-blue-900',
    text: 'text-blue-900 dark:text-blue-100',
    badge: 'bg-blue-600 text-white',
  },
};

const categoryLabels: Record<string, string> = {
  'drug-interaction': 'Drug Interaction',
  'allergy': 'Allergy Alert',
  'guideline-recommendation': 'Clinical Guideline',
  'lab-abnormal': 'Lab Result',
  'preventive-care': 'Preventive Care',
  'duplicate-therapy': 'Duplicate Therapy',
  'contraindication': 'Contraindication',
  'dosing-guidance': 'Dosing',
};

export function AlertCard({
  alert,
  onAccept,
  onOverride,
  onDismiss,
  compact = false,
}: AlertCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  const config = severityConfig[alert.severity];
  const categoryLabel = categoryLabels[alert.category] || alert.category;

  const handleOverride = () => {
    if (overrideReason.trim()) {
      onOverride?.(alert.id, overrideReason);
      setShowOverrideDialog(false);
      setOverrideReason('');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`
        relative rounded-lg border-2
        ${config.bg} ${config.border} ${config.text}
        transition-all duration-200
        ${isExpanded ? 'shadow-lg' : 'shadow-sm hover:shadow-md'}
      `}
    >
      {/* Header */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer"
        onClick={() => !compact && setIsExpanded(!isExpanded)}
      >
        {/* Severity Icon */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-full ${config.iconBg} flex items-center justify-center text-xl`}>
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Category & Severity Badge */}
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${config.badge}`}>
              {categoryLabel}
            </span>
            {alert.severity === 'critical' && (
              <span className="text-xs font-bold text-red-600 dark:text-red-400 animate-pulse">
                ACTION REQUIRED
              </span>
            )}
          </div>

          {/* Summary */}
          <h3 className="font-semibold text-sm sm:text-base leading-tight mb-1">
            {alert.summary}
          </h3>

          {/* Source */}
          <div className="flex items-center gap-2 text-xs opacity-75">
            <span>{alert.source.label}</span>
            {alert.timestamp && (
              <>
                <span>•</span>
                <time>{new Date(alert.timestamp).toLocaleTimeString()}</time>
              </>
            )}
          </div>
        </div>

        {/* Expand Icon */}
        {!compact && (
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            className="flex-shrink-0 text-xl opacity-60"
          >
            ▼
          </motion.div>
        )}
      </div>

      {/* Expanded Detail */}
      <AnimatePresence>
        {isExpanded && alert.detail && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-current/10">
              {/* Detail Text */}
              <div className="mt-3 text-sm whitespace-pre-wrap leading-relaxed">
                {alert.detail}
              </div>

              {/* Suggestions */}
              {alert.suggestions && alert.suggestions.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-semibold uppercase opacity-75 mb-2">
                    Recommended Actions
                  </h4>
                  <div className="space-y-2">
                    {alert.suggestions.map((suggestion, idx) => (
                      <div
                        key={idx}
                        className={`
                          flex items-center gap-2 text-sm p-2 rounded
                          ${suggestion.isRecommended
                            ? 'bg-white/50 dark:bg-black/20 border border-current/20'
                            : 'opacity-75'
                          }
                        `}
                      >
                        {suggestion.isRecommended && (
                          <span className="text-green-600 dark:text-green-400">✓</span>
                        )}
                        <span>{suggestion.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Links */}
              {alert.links && alert.links.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-semibold uppercase opacity-75 mb-2">
                    References
                  </h4>
                  <div className="space-y-1">
                    {alert.links.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm underline hover:no-underline"
                      >
                        📄 {link.label}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-4 flex flex-wrap gap-2">
                {onAccept && (
                  <button
                    onClick={() => onAccept(alert.id)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded transition-colors"
                  >
                    Accept Recommendation
                  </button>
                )}

                {onOverride && alert.overrideReasons && !showOverrideDialog && (
                  <button
                    onClick={() => setShowOverrideDialog(true)}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded transition-colors"
                  >
                    Override
                  </button>
                )}

                {onDismiss && (
                  <button
                    onClick={() => onDismiss(alert.id)}
                    className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white text-sm font-medium rounded transition-colors"
                  >
                    Dismiss
                  </button>
                )}
              </div>

              {/* Override Dialog */}
              {showOverrideDialog && alert.overrideReasons && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 bg-white/50 dark:bg-black/20 rounded border border-current/20"
                >
                  <h4 className="font-semibold text-sm mb-2">Override Reason</h4>
                  <select
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-sm mb-3"
                  >
                    <option value="">Select reason...</option>
                    {alert.overrideReasons.map((reason, idx) => (
                      <option key={idx} value={reason}>
                        {reason}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={handleOverride}
                      disabled={!overrideReason}
                      className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white text-sm font-medium rounded transition-colors"
                    >
                      Confirm Override
                    </button>
                    <button
                      onClick={() => {
                        setShowOverrideDialog(false);
                        setOverrideReason('');
                      }}
                      className="px-3 py-1.5 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm font-medium rounded transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
