/**
 * KPI Card Component
 * Displays a single KPI metric with tooltip and styling
 */

'use client';

import React from 'react';

export interface KPICardProps {
  label: string;
  value: number | string;
  unit: 'count' | 'percentage';
  tooltip?: string;
  trend?: 'up' | 'down' | 'neutral';
  isLoading?: boolean;
  error?: string | null;
}

/**
 * Renders a single KPI card with value, label, and optional tooltip
 */
export const KPICard: React.FC<KPICardProps> = ({
  label,
  value,
  unit,
  tooltip,
  trend = 'neutral',
  isLoading = false,
  error = null,
}) => {
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/30">
        <h3 className="text-sm font-medium text-red-900 dark:text-red-200">{label}</h3>
        <p className="mt-2 text-xs text-red-700 dark:text-red-300">{error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="mt-2 h-8 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  }

  const formattedValue = typeof value === 'number' && unit === 'percentage' ? value.toFixed(1) : value;
  const unitDisplay = unit === 'percentage' ? '%' : '';

  const trendColor =
    trend === 'up'
      ? 'text-green-600 dark:text-green-400'
      : trend === 'down'
        ? 'text-red-600 dark:text-red-400'
        : 'text-gray-600 dark:text-gray-400';

  const CardContent = (
    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {formattedValue}
              <span className="text-lg text-gray-600 dark:text-gray-400">{unitDisplay}</span>
            </p>
            {trend !== 'neutral' && (
              <span className={`text-sm font-medium ${trendColor}`}>
                {trend === 'up' ? '↑' : '↓'}
              </span>
            )}
          </div>
        </div>
        {tooltip && (
          <div className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" title={tooltip}>
            <svg
              className="h-5 w-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );

  return CardContent;
};
