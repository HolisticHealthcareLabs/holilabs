/**
 * KPI Card Component
 * Displays a single KPI metric with tooltip and styling
 */

'use client';

import React from 'react';
import Tooltip from '@/components/common/Tooltip';
import type { KPIDictionaryEntry } from '@/lib/kpi/kpi-dictionary';

export interface KPICardProps {
  label: string;
  value: number | string;
  unit: 'count' | 'percentage';
  tooltip?: string;
  definition?: KPIDictionaryEntry;
  trend?: 'up' | 'down' | 'neutral';
  isLoading?: boolean;
  error?: string | null;
}

function DefinitionContent({ definition }: { definition: KPIDictionaryEntry }) {
  return (
    <div className="space-y-1.5 text-xs">
      <div>
        <span className="font-semibold text-gray-300">Query ID:</span>{' '}
        <span className="font-mono">{definition.queryId}</span>
      </div>
      <div>
        <span className="font-semibold text-gray-300">Numerator:</span>{' '}
        {definition.numerator}
      </div>
      <div>
        <span className="font-semibold text-gray-300">Denominator:</span>{' '}
        {definition.denominator}
      </div>
      <div>
        <span className="font-semibold text-gray-300">Source:</span>{' '}
        {definition.sourceModel}
      </div>
    </div>
  );
}

/**
 * Renders a single KPI card with value, label, and optional tooltip
 */
export const KPICard: React.FC<KPICardProps> = ({
  label,
  value,
  unit,
  tooltip,
  definition,
  trend = 'neutral',
  isLoading = false,
  error = null,
}) => {
  if (error) {
    return (
      <div className="p-6 dark:border-red-800 dark:bg-red-900/30" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', backgroundColor: 'var(--surface-danger)' }}>
        <h3 className="text-sm font-medium dark:text-red-200" style={{ color: 'var(--text-danger)' }}>{label}</h3>
        <p className="mt-2 text-xs text-red-700 dark:text-red-300">{error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 dark:border-gray-700 dark:bg-gray-900" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', backgroundColor: 'var(--surface-primary)' }}>
        <div className="h-4 w-24 animate-pulse dark:bg-gray-700" style={{ borderRadius: 'var(--radius-md)', backgroundColor: 'var(--border-default)' }} />
        <div className="mt-2 h-8 w-16 animate-pulse dark:bg-gray-700" style={{ borderRadius: 'var(--radius-md)', backgroundColor: 'var(--border-default)' }} />
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

  const InfoIcon = (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
        clipRule="evenodd"
      />
    </svg>
  );

  return (
    <div className="p-6 dark:border-gray-700 dark:bg-gray-900" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', backgroundColor: 'var(--surface-primary)' }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium dark:text-gray-400" style={{ color: 'var(--text-secondary)' }}>{label}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-3xl font-bold dark:text-white" style={{ color: 'var(--text-primary)' }}>
              {formattedValue}
              <span className="text-lg dark:text-gray-400" style={{ color: 'var(--text-secondary)' }}>{unitDisplay}</span>
            </p>
            {trend !== 'neutral' && (
              <span className={`text-sm font-medium ${trendColor}`}>
                {trend === 'up' ? '↑' : '↓'}
              </span>
            )}
          </div>
        </div>
        {definition ? (
          <Tooltip
            content={<DefinitionContent definition={definition} />}
            position="bottom"
            maxWidth="300px"
          >
            <div className="hover:text-gray-600 dark:hover:text-gray-300 cursor-help" style={{ color: 'var(--text-muted)' }}>
              {InfoIcon}
            </div>
          </Tooltip>
        ) : tooltip ? (
          <div className="hover:text-gray-600 dark:hover:text-gray-300" style={{ color: 'var(--text-muted)' }} title={tooltip}>
            {InfoIcon}
          </div>
        ) : null}
      </div>
    </div>
  );
};
