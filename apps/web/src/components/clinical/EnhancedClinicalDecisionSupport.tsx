'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Enhanced Clinical Decision Support Component
 *
 * Phase 2 Complete: Clinical Decision Support
 * Real-time clinical alerts using production APIs:
 * - Allergy contraindications
 * - Lab result abnormalities
 * - Vital sign critical alerts
 * - Preventive care reminders
 * - Drug interactions
 */

export interface UnifiedAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category:
    | 'drug_interaction'
    | 'contraindication'
    | 'lab_result'
    | 'vital_sign'
    | 'preventive_care';
  title: string;
  message: string;
  recommendation?: string;
  priority: 'high' | 'medium' | 'low';
  actionRequired: boolean;
  dismissible: boolean;
  source: string;
  timestamp: Date;
  metadata?: any;
}

export interface ClinicalDecisionSupportProps {
  patientId: string;
  vitals?: {
    heartRate?: number;
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    respiratoryRate?: number;
    temperature?: number;
    oxygenSaturation?: number;
  };
  refreshInterval?: number; // Auto-refresh interval in ms (default: 60000 = 1 min)
  className?: string;
}

const ALERT_COLORS = {
  critical: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-300 dark:border-red-700',
    text: 'text-red-800 dark:text-red-300',
    icon: '🚨',
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-300 dark:border-yellow-700',
    text: 'text-yellow-800 dark:text-yellow-300',
    icon: '⚠️',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-300 dark:border-blue-700',
    text: 'text-blue-800 dark:text-blue-300',
    icon: 'ℹ️',
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  drug_interaction: 'Drug Interaction',
  contraindication: 'Allergy Contraindication',
  lab_result: 'Lab Result',
  vital_sign: 'Vital Sign',
  preventive_care: 'Preventive Care',
};

export function EnhancedClinicalDecisionSupport({
  patientId,
  vitals,
  refreshInterval = 60000,
  className = '',
}: ClinicalDecisionSupportProps) {
  const [alerts, setAlerts] = useState<UnifiedAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [summary, setSummary] = useState<any>(null);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/clinical/decision-support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          vitals,
          includeAllergyCheck: true,
          includeLabCheck: true,
          includeVitalCheck: !!vitals,
          includePreventiveCare: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch clinical alerts');
      }

      const data = await response.json();
      setAlerts(data.alerts || []);
      setSummary(data.summary || null);
    } catch (err) {
      console.error('Clinical decision support error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      fetchAlerts();

      // Auto-refresh
      if (refreshInterval > 0) {
        const interval = setInterval(fetchAlerts, refreshInterval);
        return () => clearInterval(interval);
      }
    }
  }, [patientId, vitals, refreshInterval]);

  const handleDismiss = (alertId: string) => {
    setDismissedAlerts((prev) => new Set([...prev, alertId]));
  };

  const handleAcknowledge = (alertId: string) => {
    // TODO: Send acknowledgement to backend
    handleDismiss(alertId);
  };

  const visibleAlerts = alerts.filter((alert) => !dismissedAlerts.has(alert.id));
  const criticalAlerts = visibleAlerts.filter((a) => a.type === 'critical');
  const warningAlerts = visibleAlerts.filter((a) => a.type === 'warning');
  const infoAlerts = visibleAlerts.filter((a) => a.type === 'info');

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 ${className}`}>
        <div className="flex items-center justify-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="text-gray-600 dark:text-gray-400">Loading clinical alerts...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 rounded-lg shadow-lg p-6 ${className}`}>
        <div className="flex items-center space-x-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="text-lg font-bold text-red-800 dark:text-red-300">
              Error Loading Clinical Alerts
            </h3>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Summary Card */}
      {summary && visibleAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-lg p-4 border border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-3xl">🎯</span>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Clinical Decision Support
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {summary.critical > 0 && (
                    <span className="font-bold text-red-600 dark:text-red-400">
                      {summary.critical} CRITICAL
                    </span>
                  )}
                  {summary.critical > 0 && summary.warnings > 0 && ' • '}
                  {summary.warnings > 0 && (
                    <span className="text-yellow-600 dark:text-yellow-400">
                      {summary.warnings} warnings
                    </span>
                  )}
                  {(summary.critical > 0 || summary.warnings > 0) && summary.info > 0 && ' • '}
                  {summary.info > 0 && (
                    <span className="text-blue-600 dark:text-blue-400">{summary.info} info</span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={fetchAlerts}
              className="px-3 py-1 text-sm bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Refresh alerts"
            >
              🔄 Refresh
            </button>
          </div>

          {/* Category breakdown */}
          {summary.byCategory && (
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(summary.byCategory).map(
                ([category, count]: [string, any]) =>
                  count > 0 && (
                    <span
                      key={category}
                      className="px-2 py-1 text-xs bg-white/50 dark:bg-gray-800/50 rounded-full"
                    >
                      {CATEGORY_LABELS[category]}: {count}
                    </span>
                  )
              )}
            </div>
          )}
        </div>
      )}

      {/* Alerts List */}
      {visibleAlerts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Active Alerts</h3>
            {visibleAlerts.length > 3 && (
              <button
                onClick={() => setShowAllAlerts(!showAllAlerts)}
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                {showAllAlerts ? 'Show less' : `Show all (${visibleAlerts.length})`}
              </button>
            )}
          </div>

          <div className="space-y-3">
            {(showAllAlerts ? visibleAlerts : visibleAlerts.slice(0, 5)).map((alert) => {
              const colors = ALERT_COLORS[alert.type];
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`p-4 border-2 rounded-lg ${colors.bg} ${colors.border}`}
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl flex-shrink-0">{colors.icon}</span>
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center flex-wrap gap-2 mb-1">
                            <h4 className={`font-bold ${colors.text}`}>{alert.title}</h4>
                            {alert.actionRequired && (
                              <span className="text-xs px-2 py-0.5 bg-red-600 text-white rounded-full">
                                Action Required
                              </span>
                            )}
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                alert.priority === 'high'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                                  : alert.priority === 'medium'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                              }`}
                            >
                              {alert.priority.toUpperCase()}
                            </span>
                            <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                              {CATEGORY_LABELS[alert.category]}
                            </span>
                          </div>
                        </div>
                        {alert.dismissible && (
                          <button
                            onClick={() => handleDismiss(alert.id)}
                            className={`ml-4 ${colors.text} hover:opacity-70 transition-opacity flex-shrink-0`}
                            title="Dismiss alert"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        )}
                      </div>

                      {/* Message */}
                      <p className={`text-sm ${colors.text} mb-2`}>{alert.message}</p>

                      {/* Recommendation */}
                      {alert.recommendation && (
                        <div
                          className={`text-sm ${colors.text} bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg mb-2`}
                        >
                          <div className="font-medium mb-1">📋 Recommendation:</div>
                          <div>{alert.recommendation}</div>
                        </div>
                      )}

                      {/* Metadata */}
                      {alert.metadata && (
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                          {alert.metadata.allergen && (
                            <span>Allergen: {alert.metadata.allergen} • </span>
                          )}
                          {alert.metadata.labTest && <span>Test: {alert.metadata.labTest} • </span>}
                          {alert.metadata.vitalSign && (
                            <span>Vital: {alert.metadata.vitalSign} • </span>
                          )}
                          <span>Source: {alert.source}</span>
                        </div>
                      )}

                      {/* Actions */}
                      {alert.actionRequired && (
                        <div className="flex space-x-2 mt-3">
                          <button
                            onClick={() => handleAcknowledge(alert.id)}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                          >
                            Acknowledge & Review
                          </button>
                          {alert.dismissible && (
                            <button
                              onClick={() => handleDismiss(alert.id)}
                              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
                            >
                              Already Reviewed
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {visibleAlerts.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center">
          <div className="text-6xl mb-4">✓</div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            No Active Clinical Alerts
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            The system is continuously monitoring patient data for clinical decision support
          </p>
          <button
            onClick={fetchAlerts}
            className="mt-4 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Refresh
          </button>
        </div>
      )}
    </div>
  );
}
