/**
 * AI Insights Panel Component
 *
 * Hospital-grade AI insights with:
 * - Clinical recommendations powered by AI
 * - Risk prediction and alerts
 * - Patient cohort analysis
 * - Treatment optimization suggestions
 * - Medication interaction warnings
 * - Diagnostic support
 * - Cost optimization insights
 * - Evidence-based citations
 * - Confidence scores
 * - Interactive accept/dismiss actions
 *
 * Inspired by: Epic Sepsis Model, Cerner Clinical Intelligence
 * Part of Phase 1: Clinician Dashboard Redesign
 */

'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

/**
 * AI Insight Interface
 */
export interface AIInsight {
  id: string;
  type:
    | 'risk_alert'
    | 'recommendation'
    | 'optimization'
    | 'interaction_warning'
    | 'diagnostic_support'
    | 'cost_saving';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  confidence: number; // 0-100
  category: 'clinical' | 'operational' | 'financial';
  patientId?: string;
  patientName?: string;
  evidence?: {
    source: string;
    citation: string;
    url?: string;
  }[];
  actionable: boolean;
  actions?: {
    label: string;
    type: 'primary' | 'secondary';
    onClick: () => void;
  }[];
  metadata?: Record<string, any>;
  dismissed?: boolean;
  accepted?: boolean;
}

/**
 * AI Insights Props
 */
interface AIInsightsProps {
  className?: string;
  maxHeight?: string;
  onInsightAction?: (insightId: string, action: 'accept' | 'dismiss') => void;
  showConfidence?: boolean;
  showEvidence?: boolean;
}

/**
 * AI Insights Component
 */
export function AIInsights({
  className = '',
  maxHeight = '600px',
  onInsightAction,
  showConfidence = true,
  showEvidence = true,
}: AIInsightsProps) {
  const [insights, setInsights] = useState<AIInsight[]>([
    {
      id: '1',
      type: 'risk_alert',
      priority: 'critical',
      title: 'High Sepsis Risk Detected',
      description:
        'Patient María González shows early signs of sepsis: elevated lactate (3.2 mmol/L), tachycardia (HR 115), fever (38.9°C). Immediate intervention recommended.',
      confidence: 87,
      category: 'clinical',
      patientId: 'p1',
      patientName: 'María González',
      actionable: true,
      actions: [
        { label: 'Start Sepsis Protocol', type: 'primary', onClick: () => {} },
        { label: 'Review Details', type: 'secondary', onClick: () => {} },
      ],
      evidence: [
        {
          source: 'Seymour et al.',
          citation: 'JAMA 2016 - qSOFA Score for Sepsis Prediction',
          url: 'https://pubmed.gov',
        },
      ],
    },
    {
      id: '2',
      type: 'interaction_warning',
      priority: 'high',
      title: 'Drug Interaction Warning',
      description:
        'Carlos Silva: Prescribed warfarin interacts with current aspirin regimen. Increased bleeding risk detected.',
      confidence: 95,
      category: 'clinical',
      patientId: 'p2',
      patientName: 'Carlos Silva',
      actionable: true,
      actions: [
        { label: 'Adjust Dosage', type: 'primary', onClick: () => {} },
        { label: 'View Interactions', type: 'secondary', onClick: () => {} },
      ],
      evidence: [
        {
          source: 'FDA Drug Safety Database',
          citation: 'Major interaction: Warfarin + Aspirin',
        },
      ],
    },
    {
      id: '3',
      type: 'recommendation',
      priority: 'medium',
      title: 'Preventive Care Reminder',
      description:
        '12 patients due for annual wellness visits this month. Early scheduling improves outcomes and reduces no-show rates.',
      confidence: 92,
      category: 'operational',
      actionable: true,
      actions: [
        { label: 'Schedule Visits', type: 'primary', onClick: () => {} },
        { label: 'View List', type: 'secondary', onClick: () => {} },
      ],
    },
    {
      id: '4',
      type: 'diagnostic_support',
      priority: 'medium',
      title: 'Differential Diagnosis Suggestion',
      description:
        'Ana Martínez: Symptoms consistent with hypothyroidism (fatigue, weight gain, cold intolerance). Consider TSH screening.',
      confidence: 78,
      category: 'clinical',
      patientId: 'p3',
      patientName: 'Ana Martínez',
      actionable: true,
      actions: [
        { label: 'Order TSH Test', type: 'primary', onClick: () => {} },
        { label: 'Review Symptoms', type: 'secondary', onClick: () => {} },
      ],
      evidence: [
        {
          source: 'UpToDate',
          citation: 'Clinical manifestations of hypothyroidism',
        },
      ],
    },
    {
      id: '5',
      type: 'cost_saving',
      priority: 'low',
      title: 'Generic Alternative Available',
      description:
        'Switch 8 patients from brand-name statins to generic atorvastatin. Potential savings: $4,200/year with equivalent efficacy.',
      confidence: 98,
      category: 'financial',
      actionable: true,
      actions: [
        { label: 'Review Patients', type: 'primary', onClick: () => {} },
        { label: 'View Savings', type: 'secondary', onClick: () => {} },
      ],
    },
  ]);

  const [filter, setFilter] = useState<'all' | 'clinical' | 'operational' | 'financial'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter insights
  const filteredInsights = useMemo(() => {
    let filtered = insights.filter((i) => !i.dismissed);

    if (filter !== 'all') {
      filtered = filtered.filter((i) => i.category === filter);
    }

    return filtered.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [insights, filter]);

  // Type configuration
  const typeConfig = {
    risk_alert: {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      ),
      color: 'text-error-600 dark:text-error-400',
      bg: 'bg-error-100 dark:bg-error-900/30',
      borderColor: 'border-error-200 dark:border-error-800',
    },
    recommendation: {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      ),
      color: 'text-primary-600 dark:text-primary-400',
      bg: 'bg-primary-100 dark:bg-primary-900/30',
      borderColor: 'border-primary-200 dark:border-primary-800',
    },
    optimization: {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      borderColor: 'border-purple-200 dark:border-purple-800',
    },
    interaction_warning: {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      color: 'text-warning-600 dark:text-warning-400',
      bg: 'bg-warning-100 dark:bg-warning-900/30',
      borderColor: 'border-warning-200 dark:border-warning-800',
    },
    diagnostic_support: {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
      ),
      color: 'text-teal-600 dark:text-teal-400',
      bg: 'bg-teal-100 dark:bg-teal-900/30',
      borderColor: 'border-teal-200 dark:border-teal-800',
    },
    cost_saving: {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-100 dark:bg-green-900/30',
      borderColor: 'border-green-200 dark:border-green-800',
    },
  };

  // Priority badge variants
  const priorityBadgeVariant = {
    critical: 'risk-critical' as const,
    high: 'risk-high' as const,
    medium: 'risk-medium' as const,
    low: 'risk-low' as const,
  };

  // Handle actions
  const handleAccept = (insightId: string) => {
    setInsights((prev) =>
      prev.map((i) => (i.id === insightId ? { ...i, accepted: true } : i))
    );
    onInsightAction?.(insightId, 'accept');
  };

  const handleDismiss = (insightId: string) => {
    setInsights((prev) =>
      prev.map((i) => (i.id === insightId ? { ...i, dismissed: true } : i))
    );
    onInsightAction?.(insightId, 'dismiss');
  };

  // Confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-success-600 dark:text-success-400';
    if (confidence >= 70) return 'text-primary-600 dark:text-primary-400';
    if (confidence >= 50) return 'text-warning-600 dark:text-warning-400';
    return 'text-error-600 dark:text-error-400';
  };

  return (
    <div
      className={`bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-lg ${className}`}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-primary-500 to-purple-600 rounded-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              AI Clinical Insights
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Powered by advanced medical AI models
            </p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2">
          {(['all', 'clinical', 'operational', 'financial'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                filter === tab
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Insights list */}
      <div className="overflow-y-auto p-4 space-y-3" style={{ maxHeight }}>
        {filteredInsights.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-2">✨</div>
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              No insights available
            </p>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
              AI is analyzing your patient data
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredInsights.map((insight, index) => {
              const config = typeConfig[insight.type];
              const isExpanded = expandedId === insight.id;

              return (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className={`group relative border-l-4 ${config.borderColor} bg-gradient-to-r from-neutral-50 to-white dark:from-neutral-800 dark:to-neutral-900 rounded-lg shadow-sm hover:shadow-md transition-all overflow-hidden`}
                >
                  <div className="p-4">
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-2">
                      <div className={`flex-shrink-0 p-2 rounded-lg ${config.bg}`}>
                        <div className={config.color}>{config.icon}</div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                            {insight.title}
                          </h4>
                          <Badge variant={priorityBadgeVariant[insight.priority]} size="sm">
                            {insight.priority}
                          </Badge>
                        </div>

                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                          {insight.description}
                        </p>

                        {/* Patient info */}
                        {insight.patientName && (
                          <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-500 mb-2">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                            {insight.patientName}
                          </div>
                        )}

                        {/* Confidence score */}
                        {showConfidence && (
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs text-neutral-500 dark:text-neutral-500">
                              Confidence:
                            </span>
                            <div className="flex-1 h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden max-w-[120px]">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  insight.confidence >= 90
                                    ? 'bg-success-500'
                                    : insight.confidence >= 70
                                    ? 'bg-primary-500'
                                    : insight.confidence >= 50
                                    ? 'bg-warning-500'
                                    : 'bg-error-500'
                                }`}
                                style={{ width: `${insight.confidence}%` }}
                              />
                            </div>
                            <span className={`text-xs font-semibold ${getConfidenceColor(insight.confidence)}`}>
                              {insight.confidence}%
                            </span>
                          </div>
                        )}

                        {/* Actions */}
                        {insight.actionable && insight.actions && (
                          <div className="flex items-center gap-2 flex-wrap">
                            {insight.actions.map((action, idx) => (
                              <Button
                                key={idx}
                                variant={action.type === 'primary' ? 'primary' : 'secondary'}
                                size="xs"
                                onClick={action.onClick}
                              >
                                {action.label}
                              </Button>
                            ))}
                            <Button variant="ghost" size="xs" onClick={() => handleDismiss(insight.id)}>
                              Dismiss
                            </Button>
                          </div>
                        )}

                        {/* Evidence (expandable) */}
                        {showEvidence && insight.evidence && insight.evidence.length > 0 && (
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : insight.id)}
                            className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium mt-2"
                          >
                            View evidence ({insight.evidence.length})
                            <svg
                              className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </button>
                        )}

                        {/* Expanded evidence */}
                        <AnimatePresence>
                          {isExpanded && insight.evidence && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
                                {insight.evidence.map((ev, idx) => (
                                  <div
                                    key={idx}
                                    className="text-xs text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 rounded p-2"
                                  >
                                    <p className="font-semibold">{ev.source}</p>
                                    <p>{ev.citation}</p>
                                    {ev.url && (
                                      <a
                                        href={ev.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary-600 dark:text-primary-400 hover:underline"
                                      >
                                        Read more →
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  {/* AI indicator */}
                  <div className="absolute top-2 right-2 opacity-20 group-hover:opacity-40 transition">
                    <svg className="w-6 h-6 text-primary-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
