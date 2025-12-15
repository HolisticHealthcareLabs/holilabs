/**
 * Alert History Component
 *
 * Historical clinical alert log with audit trail
 * Medical naming: "History" (chronological record of clinical events)
 *
 * Features:
 * - Chronological alert timeline
 * - Filter by date range, severity, and category
 * - Action audit trail (who accepted/overrode/dismissed)
 * - Export functionality
 * - Pagination for large datasets
 * - Search by patient or alert content
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CDSAlert } from '@/lib/cds/types';

interface AlertHistoryEntry {
  id: string;
  alert: CDSAlert;
  action: 'accepted' | 'overridden' | 'dismissed' | 'expired';
  actionBy: string;
  actionAt: Date;
  reason?: string;
  patientId: string;
  patientName?: string;
}

interface AlertHistoryProps {
  patientId?: string;
  className?: string;
}

type DateFilter = 'today' | 'week' | 'month' | 'all';
type ActionFilter = 'all' | 'accepted' | 'overridden' | 'dismissed' | 'expired';

const actionConfig = {
  accepted: {
    icon: '✅',
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-950/20',
    label: 'Accepted',
  },
  overridden: {
    icon: '⚠️',
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-950/20',
    label: 'Overridden',
  },
  dismissed: {
    icon: '❌',
    color: 'text-gray-600 dark:text-gray-400',
    bg: 'bg-gray-50 dark:bg-gray-800',
    label: 'Dismissed',
  },
  expired: {
    icon: '⏱️',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    label: 'Expired',
  },
};

export function AlertHistory({
  patientId,
  className = '',
}: AlertHistoryProps) {
  const [entries, setEntries] = useState<AlertHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>('week');
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Fetch alert history
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);

        // Mock data for now - replace with actual API call
        const mockEntries: AlertHistoryEntry[] = [
          {
            id: '1',
            alert: {
              id: 'alert-1',
              summary: 'Drug-Drug Interaction: Warfarin + Aspirin',
              detail: 'Increased risk of bleeding when combining anticoagulants',
              severity: 'critical',
              indicator: 'critical',
              category: 'drug-interaction',
              source: { label: 'ONCHigh Drug Database', url: '' },
              timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            },
            action: 'overridden',
            actionBy: 'Dr. Sarah Chen',
            actionAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            reason: 'Patient has been stable on this combination for 3 months',
            patientId: 'patient-123',
            patientName: 'John Doe',
          },
          {
            id: '2',
            alert: {
              id: 'alert-2',
              summary: 'Hypertension: BP 165/95 - Review medication',
              detail: 'Blood pressure above target range',
              severity: 'warning',
              indicator: 'warning',
              category: 'guideline-recommendation',
              source: { label: 'WHO PEN Protocol', url: '' },
              timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
            },
            action: 'accepted',
            actionBy: 'Dr. Maria Rodriguez',
            actionAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
            patientId: 'patient-456',
            patientName: 'Jane Smith',
          },
          {
            id: '3',
            alert: {
              id: 'alert-3',
              summary: 'Preventive Care: Annual flu vaccine due',
              detail: 'Patient eligible for seasonal influenza vaccination',
              severity: 'info',
              indicator: 'info',
              category: 'preventive-care',
              source: { label: 'PAHO Prevention Guidelines', url: '' },
              timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            },
            action: 'accepted',
            actionBy: 'Dr. Sarah Chen',
            actionAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
            patientId: 'patient-789',
            patientName: 'Carlos Martinez',
          },
          {
            id: '4',
            alert: {
              id: 'alert-4',
              summary: 'Lab Alert: HbA1c 9.2% - Diabetes control needed',
              detail: 'Elevated HbA1c indicates poor glycemic control',
              severity: 'critical',
              indicator: 'critical',
              category: 'lab-abnormal',
              source: { label: 'WHO PEN Protocol', url: '' },
              timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
            },
            action: 'accepted',
            actionBy: 'Dr. James Wilson',
            actionAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
            patientId: 'patient-321',
            patientName: 'Maria Garcia',
          },
          {
            id: '5',
            alert: {
              id: 'alert-5',
              summary: 'Allergy Alert: Penicillin documented',
              detail: 'Patient has documented penicillin allergy',
              severity: 'critical',
              indicator: 'critical',
              category: 'allergy',
              source: { label: 'Patient Chart', url: '' },
              timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
            },
            action: 'dismissed',
            actionBy: 'Dr. Sarah Chen',
            actionAt: new Date(Date.now() - 72 * 60 * 60 * 1000),
            reason: 'Different antibiotic class prescribed',
            patientId: 'patient-654',
            patientName: 'Ahmed Hassan',
          },
        ];

        setEntries(mockEntries);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching alert history:', error);
        setLoading(false);
      }
    };

    fetchHistory();
  }, [patientId]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // Date filter
      const entryDate = entry.actionAt;
      const now = new Date();

      if (dateFilter === 'today') {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (entryDate < todayStart) return false;
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (entryDate < weekAgo) return false;
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (entryDate < monthAgo) return false;
      }

      // Action filter
      if (actionFilter !== 'all' && entry.action !== actionFilter) return false;

      // Patient filter
      if (patientId && entry.patientId !== patientId) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          entry.alert.summary.toLowerCase().includes(query) ||
          entry.patientName?.toLowerCase().includes(query) ||
          entry.actionBy.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [entries, dateFilter, actionFilter, patientId, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);
  const paginatedEntries = filteredEntries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Statistics
  const stats = useMemo(() => {
    return {
      total: filteredEntries.length,
      accepted: filteredEntries.filter((e) => e.action === 'accepted').length,
      overridden: filteredEntries.filter((e) => e.action === 'overridden').length,
      dismissed: filteredEntries.filter((e) => e.action === 'dismissed').length,
    };
  }, [filteredEntries]);

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Alert History
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Clinical decision support audit trail
            </p>
          </div>

          {/* Export Button */}
          <button
            onClick={() => {
              // TODO: Implement export functionality
              console.log('Export history');
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors flex items-center gap-2"
          >
            📥 Export
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {stats.total}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Total Actions
            </div>
          </div>
          <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded">
            <div className="text-lg font-bold text-green-600 dark:text-green-400">
              {stats.accepted}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Accepted
            </div>
          </div>
          <div className="p-2 bg-orange-50 dark:bg-orange-950/20 rounded">
            <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
              {stats.overridden}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Overridden
            </div>
          </div>
          <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <div className="text-lg font-bold text-gray-600 dark:text-gray-400">
              {stats.dismissed}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Dismissed
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value as DateFilter);
              setCurrentPage(1);
            }}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-sm"
          >
            <option value="today">Today</option>
            <option value="week">Past Week</option>
            <option value="month">Past Month</option>
            <option value="all">All Time</option>
          </select>

          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value as ActionFilter);
              setCurrentPage(1);
            }}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-sm"
          >
            <option value="all">All Actions</option>
            <option value="accepted">Accepted</option>
            <option value="overridden">Overridden</option>
            <option value="dismissed">Dismissed</option>
            <option value="expired">Expired</option>
          </select>

          {/* Search */}
          <input
            type="search"
            placeholder="Search alerts, patients, or doctors..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-sm"
          />
        </div>
      </div>

      {/* History Timeline */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin text-4xl mb-2">⏳</div>
              <p className="text-gray-600 dark:text-gray-400">Loading history...</p>
            </div>
          </div>
        )}

        {!loading && paginatedEntries.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No History Found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                No alerts match your current filters
              </p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {paginatedEntries.map((entry) => {
              const config = actionConfig[entry.action];

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`
                    border-l-4 rounded-r-lg p-4
                    bg-white dark:bg-gray-800
                    border-gray-200 dark:border-gray-700
                    hover:shadow-md transition-shadow
                  `}
                  style={{
                    borderLeftColor: entry.alert.severity === 'critical' ? '#dc2626'
                      : entry.alert.severity === 'warning' ? '#f59e0b'
                      : '#3b82f6',
                  }}
                >
                  {/* Entry Header */}
                  <div className="flex items-start gap-3 mb-2">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full ${config.bg} flex items-center justify-center text-lg`}>
                      {config.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-semibold ${config.color}`}>
                          {config.label}
                        </span>
                        {/* Decorative - low contrast intentional for relative timestamp */}
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatRelativeTime(entry.actionAt)}
                        </span>
                      </div>

                      <h3 className="font-medium text-sm text-gray-900 dark:text-white mb-1">
                        {entry.alert.summary}
                      </h3>

                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        {!patientId && entry.patientName && (
                          <>
                            <span>👤 {entry.patientName}</span>
                            <span>•</span>
                          </>
                        )}
                        <span>👨‍⚕️ {entry.actionBy}</span>
                        <span>•</span>
                        <span className="capitalize">{entry.alert.category.replace('-', ' ')}</span>
                      </div>
                    </div>

                    {/* Decorative - low contrast intentional for timestamp metadata */}
                    <time className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400">
                      {entry.actionAt.toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </time>
                  </div>

                  {/* Reason */}
                  {entry.reason && (
                    <div className="ml-11 text-sm text-gray-600 dark:text-gray-400 italic">
                      Reason: {entry.reason}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6 pb-4">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
            >
              Previous
            </button>

            <span className="text-sm text-gray-600 dark:text-gray-400">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
