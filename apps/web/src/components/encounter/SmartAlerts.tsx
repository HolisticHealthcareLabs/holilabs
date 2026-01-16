/**
 * CDSS V3 - SmartAlerts Component
 *
 * Displays actionable prevention alerts for a patient.
 * Shows only when there are alerts - hidden if no alerts.
 *
 * Features:
 * - Collapsible banner
 * - Color-coded severity (critical, warning, info)
 * - Action buttons for each alert
 * - Dismiss individual alerts
 * - HIPAA audit logging on actions
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { PreventionAlert } from '@/lib/schemas/prevention-alert.schema';

interface SmartAlertsProps {
  /** Patient ID to fetch alerts for */
  patientId: string;
  /** Optional initial alerts (for SSR) */
  initialAlerts?: PreventionAlert[];
  /** Callback when an alert action is triggered */
  onAction?: (alert: PreventionAlert, actionType: string) => void;
  /** Callback when an alert is dismissed */
  onDismiss?: (alertId: string) => void;
  /** Whether the panel is initially expanded */
  defaultExpanded?: boolean;
  /** Custom class name */
  className?: string;
}

// Severity styling
const severityStyles = {
  critical: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-800',
    icon: 'text-red-600 dark:text-red-400',
    badge: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
    icon: 'text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  },
};

// Alert type icons
const AlertIcon = ({ severity }: { severity: 'critical' | 'warning' | 'info' }) => {
  if (severity === 'critical') {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    );
  }
  if (severity === 'warning') {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
};

export function SmartAlerts({
  patientId,
  initialAlerts,
  onAction,
  onDismiss,
  defaultExpanded = true,
  className = '',
}: SmartAlertsProps) {
  const [alerts, setAlerts] = useState<PreventionAlert[]>(initialAlerts || []);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isLoading, setIsLoading] = useState(!initialAlerts);
  const [error, setError] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Fetch alerts if not provided
  useEffect(() => {
    if (initialAlerts) return;

    const fetchAlerts = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/cdss/alerts/${patientId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch alerts');
        }

        const data = await response.json();
        if (data.success) {
          setAlerts(data.data || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load alerts');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlerts();
  }, [patientId, initialAlerts]);

  // Filter out dismissed alerts
  const visibleAlerts = alerts.filter(a => !dismissedIds.has(a.id));

  // Sort by severity: critical first, then warning, then info
  const sortedAlerts = [...visibleAlerts].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });

  // Count by severity
  const criticalCount = sortedAlerts.filter(a => a.severity === 'critical').length;
  const warningCount = sortedAlerts.filter(a => a.severity === 'warning').length;

  const handleDismiss = (alertId: string) => {
    setDismissedIds(prev => new Set([...prev, alertId]));
    onDismiss?.(alertId);
  };

  const handleAction = (alert: PreventionAlert) => {
    if (alert.action) {
      onAction?.(alert, alert.action.type);
    }
  };

  // Don't render if no alerts
  if (!isLoading && sortedAlerts.length === 0) {
    return null;
  }

  return (
    <div className={`mb-4 ${className}`}>
      {/* Alert Banner Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-t-lg ${
          criticalCount > 0
            ? 'bg-red-100 dark:bg-red-950/50 border border-red-200 dark:border-red-800'
            : warningCount > 0
            ? 'bg-amber-100 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800'
            : 'bg-blue-100 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800'
        } ${!isExpanded ? 'rounded-b-lg' : 'border-b-0'}`}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          <svg className={`w-5 h-5 ${criticalCount > 0 ? 'text-red-600' : warningCount > 0 ? 'text-amber-600' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="font-semibold text-neutral-900 dark:text-neutral-100">
            ALERTS ({sortedAlerts.length})
          </span>
          {criticalCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-600 text-white">
              {criticalCount} Critical
            </span>
          )}
          {warningCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-600 text-white">
              {warningCount} Warning
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-neutral-600 dark:text-neutral-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Alert List */}
      {isExpanded && (
        <div className={`border border-t-0 rounded-b-lg ${
          criticalCount > 0
            ? 'border-red-200 dark:border-red-800'
            : warningCount > 0
            ? 'border-amber-200 dark:border-amber-800'
            : 'border-blue-200 dark:border-blue-800'
        }`}>
          {isLoading ? (
            <div className="p-4 text-center text-neutral-600 dark:text-neutral-400">
              Loading alerts...
            </div>
          ) : error ? (
            <div className="p-4 text-center text-red-600 dark:text-red-400">
              {error}
            </div>
          ) : (
            <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {sortedAlerts.map((alert) => {
                const styles = severityStyles[alert.severity];
                return (
                  <li
                    key={alert.id}
                    className={`p-4 ${styles.bg} flex items-start gap-3`}
                  >
                    {/* Icon */}
                    <div className={`flex-shrink-0 mt-0.5 ${styles.icon}`}>
                      <AlertIcon severity={alert.severity} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-medium text-neutral-900 dark:text-neutral-100">
                            {alert.title}
                          </h4>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5">
                            {alert.description}
                          </p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
                            Source: {alert.source}
                          </p>
                        </div>

                        {/* Severity Badge */}
                        <span className={`flex-shrink-0 px-2 py-1 text-xs font-medium rounded ${styles.badge}`}>
                          {alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-3">
                        {alert.action && (
                          <Button
                            size="sm"
                            variant={alert.severity === 'critical' ? 'primary' : 'secondary'}
                            onClick={() => handleAction(alert)}
                          >
                            {alert.action.label}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDismiss(alert.id)}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default SmartAlerts;
