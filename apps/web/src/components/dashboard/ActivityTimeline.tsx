/**
 * Activity Timeline Component
 *
 * Hospital-grade activity timeline with:
 * - Visual timeline with connecting lines
 * - Activity type icons and semantic colors
 * - Patient information cards
 * - Expandable activity details
 * - Date grouping
 * - Interactive hover states
 * - Click to navigate to details
 * - Medical context (vitals, prescriptions, notes, appointments)
 * - Dark mode support
 *
 * Inspired by: Epic Activity Feed, GitHub Timeline
 * Part of Phase 1: Clinician Dashboard Redesign
 */

'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/Badge';

/**
 * Activity Interface
 */
export interface Activity {
  id: string;
  type:
    | 'appointment'
    | 'prescription'
    | 'note'
    | 'lab_result'
    | 'vital_sign'
    | 'document'
    | 'message'
    | 'diagnosis';
  action: string;
  description?: string;
  timestamp: Date;
  patientId?: string;
  patientName?: string;
  patientAvatar?: string;
  metadata?: {
    value?: string | number;
    unit?: string;
    status?: 'normal' | 'elevated' | 'critical';
    [key: string]: any;
  };
  actionUrl?: string;
}

/**
 * Activity Timeline Props
 */
interface ActivityTimelineProps {
  activities: Activity[];
  className?: string;
  maxHeight?: string;
  onActivityClick?: (activity: Activity) => void;
  showPatientInfo?: boolean;
  groupByDate?: boolean;
}

/**
 * Activity Timeline Component
 */
export function ActivityTimeline({
  activities,
  className = '',
  maxHeight = '600px',
  onActivityClick,
  showPatientInfo = true,
  groupByDate = true,
}: ActivityTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Activity type configuration
  const activityConfig = {
    appointment: {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      ringColor: 'ring-purple-500',
    },
    prescription: {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      ),
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      ringColor: 'ring-orange-500',
    },
    note: {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      ringColor: 'ring-blue-500',
    },
    lab_result: {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
          />
        </svg>
      ),
      color: 'text-teal-600 dark:text-teal-400',
      bg: 'bg-teal-100 dark:bg-teal-900/30',
      ringColor: 'ring-teal-500',
    },
    vital_sign: {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      ),
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-100 dark:bg-red-900/30',
      ringColor: 'ring-red-500',
    },
    document: {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      ),
      color: 'text-gray-600 dark:text-gray-400',
      bg: 'bg-gray-100 dark:bg-gray-900/30',
      ringColor: 'ring-gray-500',
    },
    message: {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      ),
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-100 dark:bg-green-900/30',
      ringColor: 'ring-green-500',
    },
    diagnosis: {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-100 dark:bg-indigo-900/30',
      ringColor: 'ring-indigo-500',
    },
  };

  // Format time ago
  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Format full timestamp
  const formatFullTimestamp = (date: Date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Group activities by date
  const groupedActivities = useMemo(() => {
    if (!groupByDate) {
      return [{ date: 'All', activities }];
    }

    const groups: Record<string, Activity[]> = {};
    activities.forEach((activity) => {
      const dateKey = activity.timestamp.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(activity);
    });

    return Object.entries(groups)
      .map(([date, activities]) => ({ date, activities }))
      .sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      });
  }, [activities, groupByDate]);

  // Handle activity click
  const handleActivityClick = (activity: Activity) => {
    if (expandedId === activity.id) {
      setExpandedId(null);
    } else {
      setExpandedId(activity.id);
    }
    onActivityClick?.(activity);
  };

  return (
    <div
      className={`bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-lg ${className}`}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
        <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
          Recent Activity
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
          {activities.length} {activities.length === 1 ? 'activity' : 'activities'} in the last 24 hours
        </p>
      </div>

      {/* Timeline */}
      <div className="overflow-y-auto px-6 py-4" style={{ maxHeight }}>
        {activities.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-2">📋</div>
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              No recent activity
            </p>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
              Activity will appear here as you work
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedActivities.map((group, groupIndex) => (
              <div key={groupIndex}>
                {/* Date header */}
                {groupByDate && groupedActivities.length > 1 && (
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-500 uppercase tracking-wider">
                      {group.date}
                    </span>
                    <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
                  </div>
                )}

                {/* Activities */}
                <div className="relative space-y-4">
                  {/* Connecting line */}
                  <div className="absolute left-5 top-0 bottom-0 w-px bg-neutral-200 dark:bg-neutral-800" />

                  {group.activities.map((activity, index) => {
                    const config = activityConfig[activity.type];
                    const isExpanded = expandedId === activity.id;
                    const isLast = index === group.activities.length - 1 && groupIndex === groupedActivities.length - 1;

                    return (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="relative"
                      >
                        {/* Timeline node */}
                        <div
                          className={`absolute left-0 w-10 h-10 rounded-full ${config.bg} border-4 border-white dark:border-neutral-900 flex items-center justify-center z-10`}
                        >
                          <div className={config.color}>{config.icon}</div>
                        </div>

                        {/* Activity card */}
                        <div className="ml-16 group">
                          <div
                            onClick={() => handleActivityClick(activity)}
                            className={`p-4 rounded-lg border transition-all cursor-pointer ${
                              isExpanded
                                ? 'border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/10'
                                : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                            }`}
                          >
                            {/* Header */}
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                                  {activity.action}
                                </h4>
                                {showPatientInfo && activity.patientName && (
                                  <div className="flex items-center gap-2 mt-1">
                                    {activity.patientAvatar ? (
                                      <img
                                        src={activity.patientAvatar}
                                        alt={activity.patientName}
                                        className="w-5 h-5 rounded-full"
                                      />
                                    ) : (
                                      <div className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                                        <span className="text-[10px] font-semibold text-primary-700 dark:text-primary-300">
                                          {activity.patientName.charAt(0)}
                                        </span>
                                      </div>
                                    )}
                                    <span className="text-xs text-neutral-600 dark:text-neutral-400">
                                      {activity.patientName}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-xs text-neutral-500 dark:text-neutral-500">
                                  {formatTimeAgo(activity.timestamp)}
                                </span>
                                <svg
                                  className={`w-4 h-4 text-neutral-400 dark:text-neutral-600 transition-transform ${
                                    isExpanded ? 'rotate-180' : ''
                                  }`}
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
                              </div>
                            </div>

                            {/* Metadata badges */}
                            {activity.metadata && (
                              <div className="flex items-center gap-2 flex-wrap">
                                {activity.metadata.value && (
                                  <Badge
                                    variant={
                                      activity.metadata.status === 'critical'
                                        ? 'vitals-critical'
                                        : activity.metadata.status === 'elevated'
                                        ? 'vitals-elevated'
                                        : 'vitals-normal'
                                    }
                                    size="sm"
                                  >
                                    {activity.metadata.value}
                                    {activity.metadata.unit && ` ${activity.metadata.unit}`}
                                  </Badge>
                                )}
                              </div>
                            )}

                            {/* Expanded details */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                                    {activity.description && (
                                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
                                        {activity.description}
                                      </p>
                                    )}
                                    <div className="text-xs text-neutral-500 dark:text-neutral-500">
                                      {formatFullTimestamp(activity.timestamp)}
                                    </div>
                                    {activity.actionUrl && (
                                      <a
                                        href={activity.actionUrl}
                                        className="inline-flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium mt-2"
                                      >
                                        View details
                                        <svg
                                          className="w-4 h-4"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 5l7 7-7 7"
                                          />
                                        </svg>
                                      </a>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
