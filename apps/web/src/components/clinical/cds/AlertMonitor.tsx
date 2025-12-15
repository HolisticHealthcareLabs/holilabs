/**
 * Alert Monitor Component
 *
 * Real-time clinical alert monitoring panel
 * Medical naming: "Monitor" (continuous observation of clinical parameters)
 *
 * Features:
 * - Live alert stream with auto-refresh
 * - Priority filtering (Critical, Warning, Info)
 * - Category filtering (Drug, Allergy, Lab, Preventive)
 * - Search/filter capabilities
 * - Alert statistics dashboard
 * - Sound notifications for critical alerts
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCard } from './AlertCard';
import type { CDSAlert, CDSHookType } from '@/lib/cds/types';

interface AlertMonitorProps {
  patientId: string;
  hookType?: CDSHookType;
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
  enableSound?: boolean;
  onAlertAction?: (action: 'accept' | 'override' | 'dismiss', alertId: string, reason?: string) => void;
  className?: string;
}

type FilterType = 'all' | 'critical' | 'warning' | 'info';
type CategoryFilter = 'all' | 'drug-interaction' | 'allergy' | 'lab-abnormal' | 'preventive-care' | 'guideline-recommendation';

export function AlertMonitor({
  patientId,
  hookType = 'patient-view',
  autoRefresh = true,
  refreshInterval = 60000, // 1 minute
  enableSound = true,
  onAlertAction,
  className = '',
}: AlertMonitorProps) {
  const [alerts, setAlerts] = useState<CDSAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [previousAlertCount, setPreviousAlertCount] = useState(0);

  // Fetch alerts from API
  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/cds/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          hookType,
          context: {
            patientId,
            // Context will be enriched by the API from patient data
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      const newAlerts = data.data?.alerts || data.data?.cards || [];

      // Play sound for new critical alerts
      if (enableSound && newAlerts.length > previousAlertCount) {
        const newCriticalAlerts = newAlerts.filter(
          (alert: CDSAlert) => alert.severity === 'critical'
        ).length;
        const oldCriticalAlerts = alerts.filter(
          (alert) => alert.severity === 'critical'
        ).length;

        if (newCriticalAlerts > oldCriticalAlerts) {
          playAlertSound();
        }
      }

      setAlerts(newAlerts);
      setPreviousAlertCount(newAlerts.length);
      setLastUpdate(new Date());
      setLoading(false);
    } catch (err) {
      console.error('Error fetching CDS alerts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch alerts');
      setLoading(false);
    }
  }, [patientId, hookType, enableSound, previousAlertCount, alerts]);

  // Auto-refresh
  useEffect(() => {
    fetchAlerts();

    if (autoRefresh) {
      const interval = setInterval(fetchAlerts, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchAlerts, autoRefresh, refreshInterval]);

  // Play alert sound
  const playAlertSound = () => {
    // Browser notification sound
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBi6F0/XTgjMGHm7A7+SJQQ0PVqzn77BdGAg+ltryxnYqBSh+z/LVizkHGGa57OihUhMKTKXh8bllHwU2jdLyx3koBSd9zvPXizcHGGe67OehUxQKTKXh8bllHwU2jdLy');
    audio.play().catch(() => {
      // Ignore if autoplay is blocked
    });
  };

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      // Severity filter
      if (filter !== 'all' && alert.severity !== filter) return false;

      // Category filter
      if (categoryFilter !== 'all' && alert.category !== categoryFilter) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          alert.summary.toLowerCase().includes(query) ||
          alert.detail?.toLowerCase().includes(query) ||
          alert.category.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [alerts, filter, categoryFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: alerts.length,
      critical: alerts.filter((a) => a.severity === 'critical').length,
      warning: alerts.filter((a) => a.severity === 'warning').length,
      info: alerts.filter((a) => a.severity === 'info').length,
    };
  }, [alerts]);

  // Handle alert actions
  const handleAlertAction = (
    action: 'accept' | 'override' | 'dismiss',
    alertId: string,
    reason?: string
  ) => {
    // Remove alert from UI
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));

    // Notify parent
    onAlertAction?.(action, alertId, reason);
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Alert Monitor
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Real-time clinical decision support alerts
            </p>
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchAlerts}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded transition-colors flex items-center gap-2"
          >
            <span className={loading ? 'animate-spin' : ''}>🔄</span>
            Refresh
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <button
            onClick={() => setFilter('all')}
            className={`p-3 rounded-lg border-2 transition-all ${
              filter === 'all'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
            }`}
          >
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.total}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Total Alerts
            </div>
          </button>

          <button
            onClick={() => setFilter('critical')}
            className={`p-3 rounded-lg border-2 transition-all ${
              filter === 'critical'
                ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-red-300'
            }`}
          >
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {stats.critical}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Critical
            </div>
          </button>

          <button
            onClick={() => setFilter('warning')}
            className={`p-3 rounded-lg border-2 transition-all ${
              filter === 'warning'
                ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-amber-300'
            }`}
          >
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {stats.warning}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Warning
            </div>
          </button>

          <button
            onClick={() => setFilter('info')}
            className={`p-3 rounded-lg border-2 transition-all ${
              filter === 'info'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
            }`}
          >
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.info}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Info
            </div>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
          >
            <option value="all">All Categories</option>
            <option value="drug-interaction">Drug Interactions</option>
            <option value="allergy">Allergies</option>
            <option value="lab-abnormal">Lab Results</option>
            <option value="preventive-care">Preventive Care</option>
            <option value="guideline-recommendation">Guidelines</option>
          </select>

          {/* Search */}
          <input
            type="search"
            placeholder="Search alerts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
          />
        </div>

        {/* Last Update */}
        {lastUpdate && (
          {/* Decorative - low contrast intentional for timestamp metadata */}
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Alert List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && alerts.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin text-4xl mb-2">⏳</div>
              <p className="text-gray-600 dark:text-gray-400">Loading alerts...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-900 dark:text-red-100 font-semibold">
              Error loading alerts
            </p>
            <p className="text-red-700 dark:text-red-300 text-sm mt-1">{error}</p>
          </div>
        )}

        {!loading && !error && filteredAlerts.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No Alerts
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {alerts.length === 0
                  ? 'All clinical parameters within normal limits'
                  : 'No alerts match your current filters'}
              </p>
            </div>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {filteredAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onAccept={(id) => handleAlertAction('accept', id)}
              onOverride={(id, reason) => handleAlertAction('override', id, reason)}
              onDismiss={(id) => handleAlertAction('dismiss', id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
