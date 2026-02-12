/**
 * Override Reasons Ranking Component
 * Displays override reasons ranked by frequency
 */

'use client';

import React from 'react';
import { OverrideReason } from '@/lib/kpi';

export interface OverrideReasonsRankingProps {
  reasons: OverrideReason[];
  isLoading?: boolean;
  error?: string | null;
}

/**
 * Renders a ranked list of override reasons with counts and percentages
 */
export const OverrideReasonsRanking: React.FC<OverrideReasonsRankingProps> = ({
  reasons,
  isLoading = false,
  error = null,
}) => {
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/30">
        <h3 className="text-sm font-medium text-red-900 dark:text-red-200">Override Reasons</h3>
        <p className="mt-2 text-xs text-red-700 dark:text-red-300">{error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">Override Reasons</h3>
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-4 flex-1 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-4 w-12 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (reasons.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">Override Reasons</h3>
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">No override data available</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Override Reasons (Ranked)</h3>

      <div className="mt-4 space-y-4">
        {reasons.map((reason, index) => {
          const maxCount = Math.max(...reasons.map((r) => r.count));
          const barWidth = (reason.count / maxCount) * 100;

          return (
            <div key={reason.reasonCode}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {index + 1}. {reason.reasonLabel}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {reason.count} ({reason.percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className="h-full rounded-full bg-blue-600 dark:bg-blue-500"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        Total overrides: {reasons.reduce((sum, r) => sum + r.count, 0)}
      </p>
    </div>
  );
};
