'use client';

import React, { useState } from 'react';
import type { CDSAlert } from '@/lib/cds/types';

interface AlertListProps {
  alerts: CDSAlert[];
  onOverride?: (alert: CDSAlert) => void;
}

const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };

export function AlertList({ alerts, onOverride }: AlertListProps) {
  const sorted = [...alerts].sort(
    (a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3)
  );

  if (sorted.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-[15px] text-[#6e6e73]">No alerts generated.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3" role="list" aria-label="Clinical alerts">
      {sorted.map((alert) => (
        <AlertCard key={alert.id} alert={alert} onOverride={onOverride} />
      ))}
    </div>
  );
}

function AlertCard({ alert, onOverride }: { alert: CDSAlert; onOverride?: (alert: CDSAlert) => void }) {
  const [expanded, setExpanded] = useState(false);

  const severityStyles = {
    critical: {
      badge: 'bg-red-50 text-red-700 ring-red-200',
      border: 'ring-red-200/60',
      icon: 'text-red-500',
    },
    warning: {
      badge: 'bg-amber-50 text-amber-700 ring-amber-200',
      border: 'ring-amber-200/60',
      icon: 'text-amber-500',
    },
    info: {
      badge: 'bg-blue-50 text-blue-700 ring-blue-200',
      border: 'ring-blue-200/60',
      icon: 'text-blue-500',
    },
  };

  const styles = severityStyles[alert.severity] || severityStyles.info;

  return (
    <div
      className={`bg-white rounded-xl ring-1 ${styles.border} shadow-sm overflow-hidden`}
      role="listitem"
    >
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Severity icon */}
          <div className={`flex-shrink-0 mt-0.5 ${styles.icon}`} aria-hidden="true">
            {alert.severity === 'critical' ? (
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            ) : alert.severity === 'warning' ? (
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
              </svg>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className={`inline-flex text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full ring-1 ${styles.badge}`}>
                {alert.severity}
              </span>
              <span className="text-[11px] font-medium text-[#6e6e73] bg-[#f5f5f7] px-2 py-0.5 rounded-full">
                {formatCategory(alert.category)}
              </span>
            </div>

            {/* Summary */}
            <p className="text-[15px] font-semibold text-[#1d1d1f] tracking-[-0.01em]">
              {alert.summary}
            </p>

            {/* Source */}
            <p className="text-[12px] text-[#6e6e73] mt-1">
              Source: {alert.source.label}
            </p>
          </div>

          {/* Expand button */}
          {alert.detail && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex-shrink-0 text-[13px] text-[#0071e3] hover:text-[#0077ed] font-medium transition-colors"
              aria-expanded={expanded}
              aria-label={expanded ? 'Collapse details' : 'Expand details'}
            >
              {expanded ? 'Less' : 'More'}
            </button>
          )}
        </div>

        {/* Expanded detail */}
        {expanded && alert.detail && (
          <div className="mt-3 ml-[30px] pl-3 border-l-2 border-black/[0.06]">
            <p className="text-[14px] text-[#6e6e73] leading-relaxed whitespace-pre-line">
              {alert.detail}
            </p>
          </div>
        )}

        {/* Override chip + action */}
        {alert.overrideReasons && alert.overrideReasons.length > 0 && (
          <div className="mt-3 ml-[30px] flex items-center gap-2">
            <span className="text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full ring-1 ring-amber-200">
              Override available
            </span>
            {onOverride && (
              <button
                onClick={() => onOverride(alert)}
                className="text-[13px] font-medium text-[#0071e3] hover:text-[#0077ed] transition-colors"
                aria-label={`Override alert: ${alert.summary}`}
              >
                Request Override
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function formatCategory(category: string): string {
  return category
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
