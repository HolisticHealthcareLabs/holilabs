'use client';

/**
 * CoPilot Prevention Alerts Component
 *
 * Real-time prevention protocol alerts during AI Scribe sessions.
 * Displays detected conditions and recommendations with one-click actions.
 *
 * Phase 6: Prevention-CoPilot Real-Time Integration
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  BeakerIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  ArrowTopRightOnSquareIcon,
  SparklesIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import type { DetectedConditionLite, RecommendationLite } from '@/lib/prevention/realtime';
import { normalizeConfidence01 } from '@/lib/prevention/realtime';

interface CoPilotPreventionAlertsProps {
  patientId: string;
  conditions: DetectedConditionLite[];
  recommendations: RecommendationLite[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  alertCount: number;
  onCreateOrder: (recommendation: RecommendationLite) => Promise<void>;
  onCreateReferral: (recommendation: RecommendationLite) => Promise<void>;
  onCreateTask: (recommendation: RecommendationLite) => Promise<void>;
  onViewFullHub: () => void;
  lastUpdateMs: number | null;
}

const priorityColors = {
  HIGH: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  MEDIUM: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
  LOW: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
};

const priorityBadgeColors = {
  HIGH: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
  MEDIUM: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  LOW: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
};

export function CoPilotPreventionAlerts({
  patientId,
  conditions,
  recommendations,
  isExpanded,
  onToggleExpand,
  alertCount,
  onCreateOrder,
  onCreateReferral,
  onCreateTask,
  onViewFullHub,
  lastUpdateMs,
}: CoPilotPreventionAlertsProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showAllConditions, setShowAllConditions] = useState(false);
  const [showAllRecommendations, setShowAllRecommendations] = useState(false);

  // Sort recommendations by priority
  const sortedRecommendations = useMemo(() => {
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return [...recommendations].sort(
      (a, b) => (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2)
    );
  }, [recommendations]);

  const hasAlerts = conditions.length > 0 || recommendations.length > 0;

  // Calculate time since last update
  const timeSinceUpdate = useMemo(() => {
    if (!lastUpdateMs) return null;
    const ms = Date.now() - lastUpdateMs;
    if (ms < 1000) return 'just now';
    if (ms < 60000) return `${Math.round(ms / 1000)}s ago`;
    return `${Math.round(ms / 60000)}m ago`;
  }, [lastUpdateMs]);

  // If no alerts, don't render
  if (!hasAlerts) {
    return null;
  }

  // Visible items (show max 3 by default)
  const visibleConditions = showAllConditions ? conditions : conditions.slice(0, 3);
  const visibleRecommendations = showAllRecommendations
    ? sortedRecommendations
    : sortedRecommendations.slice(0, 3);

  const handleAction = async (
    recommendation: RecommendationLite,
    action: 'order' | 'referral' | 'task'
  ) => {
    setActionLoading(recommendation.id);
    try {
      if (action === 'order') {
        await onCreateOrder(recommendation);
      } else if (action === 'referral') {
        await onCreateReferral(recommendation);
      } else {
        await onCreateTask(recommendation);
      }
    } finally {
      setActionLoading(null);
    }
  };

  // Determine primary action based on recommendation type
  const getPrimaryAction = (rec: RecommendationLite): 'order' | 'referral' | 'task' => {
    if (rec.type === 'screening' || rec.type === 'monitoring') return 'order';
    if (rec.title.toLowerCase().includes('refer')) return 'referral';
    return 'task';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/80 to-teal-50/80 dark:from-emerald-900/20 dark:to-teal-900/20 overflow-hidden shadow-sm"
    >
      {/* Header - Always Visible */}
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <ShieldCheckIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            {alertCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
              >
                {alertCount > 9 ? '9+' : alertCount}
              </motion.span>
            )}
          </div>
          <span className="font-medium text-gray-900 dark:text-white text-sm">
            Prevention Alerts
          </span>
          {timeSinceUpdate && (
            <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <ClockIcon className="w-3 h-3" />
              {timeSinceUpdate}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewFullHub();
            }}
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            View Hub
            <ArrowTopRightOnSquareIcon className="w-3 h-3" />
          </button>
          {isExpanded ? (
            <ChevronUpIcon className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDownIcon className="w-4 h-4 text-gray-500" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              {/* Detected Conditions */}
              {conditions.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Detected Conditions ({conditions.length})
                  </h4>
                  <div className="space-y-2">
                    {visibleConditions.map((condition) => (
                      <motion.div
                        key={condition.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between p-2 bg-white/70 dark:bg-gray-800/50 rounded-lg border border-gray-200/50 dark:border-gray-700/50"
                      >
                        <div className="flex items-center gap-2">
                          <SparklesIcon className="w-4 h-4 text-purple-500" />
                          <div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {condition.name}
                            </span>
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                              {condition.category}
                            </span>
                          </div>
                        </div>
                        {(() => {
                          const conf01 = normalizeConfidence01(condition.confidence);
                          return (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            conf01 > 0.8
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                          }`}
                        >
                          {Math.round(conf01 * 100)}%
                        </span>
                          );
                        })()}
                      </motion.div>
                    ))}
                    {conditions.length > 3 && !showAllConditions && (
                      <button
                        onClick={() => setShowAllConditions(true)}
                        className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        Show {conditions.length - 3} more...
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {sortedRecommendations.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Recommendations ({sortedRecommendations.length})
                  </h4>
                  <div className="space-y-2">
                    {visibleRecommendations.map((rec) => {
                      const primaryAction = getPrimaryAction(rec);
                      const isLoading = actionLoading === rec.id;

                      return (
                        <motion.div
                          key={rec.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`p-3 rounded-lg border ${priorityColors[rec.priority]}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${priorityBadgeColors[rec.priority]}`}
                                >
                                  {rec.priority}
                                </span>
                                {rec.uspstfGrade && (
                                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                    USPSTF {rec.uspstfGrade}
                                  </span>
                                )}
                              </div>
                              <h5 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {rec.title}
                              </h5>
                              {rec.description && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
                                  {rec.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 mt-2">
                            {primaryAction === 'order' && (
                              <button
                                onClick={() => handleAction(rec, 'order')}
                                disabled={isLoading}
                                className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors disabled:opacity-50"
                              >
                                <BeakerIcon className="w-3 h-3" />
                                {isLoading ? 'Creating...' : 'Order'}
                              </button>
                            )}
                            {primaryAction === 'referral' && (
                              <button
                                onClick={() => handleAction(rec, 'referral')}
                                disabled={isLoading}
                                className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50"
                              >
                                <DocumentTextIcon className="w-3 h-3" />
                                {isLoading ? 'Creating...' : 'Refer'}
                              </button>
                            )}
                            {primaryAction === 'task' && (
                              <button
                                onClick={() => handleAction(rec, 'task')}
                                disabled={isLoading}
                                className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors disabled:opacity-50"
                              >
                                <ClipboardDocumentListIcon className="w-3 h-3" />
                                {isLoading ? 'Creating...' : 'Assign'}
                              </button>
                            )}
                            {/* Secondary actions shown as smaller buttons */}
                            {primaryAction !== 'order' && (
                              <button
                                onClick={() => handleAction(rec, 'order')}
                                disabled={isLoading}
                                className="p-1 text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                                title="Create Order"
                              >
                                <BeakerIcon className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {primaryAction !== 'referral' && (
                              <button
                                onClick={() => handleAction(rec, 'referral')}
                                disabled={isLoading}
                                className="p-1 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                title="Create Referral"
                              >
                                <DocumentTextIcon className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {primaryAction !== 'task' && (
                              <button
                                onClick={() => handleAction(rec, 'task')}
                                disabled={isLoading}
                                className="p-1 text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                                title="Assign Patient Task"
                              >
                                <ClipboardDocumentListIcon className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                    {sortedRecommendations.length > 3 && !showAllRecommendations && (
                      <button
                        onClick={() => setShowAllRecommendations(true)}
                        className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        Show {sortedRecommendations.length - 3} more...
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
