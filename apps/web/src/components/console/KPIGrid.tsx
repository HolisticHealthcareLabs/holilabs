/**
 * KPI Grid Component
 * Displays 4 KPI cards in a grid layout
 */

'use client';

import React from 'react';
import { KPICard, KPICardProps } from './KPICard';

export interface KPIGridProps {
  totalEvaluations: Omit<KPICardProps, 'label'>;
  blockRate: Omit<KPICardProps, 'label'>;
  overrideRate: Omit<KPICardProps, 'label'>;
  attestationCompliance: Omit<KPICardProps, 'label'>;
  isLoading?: boolean;
  error?: string | null;
}

/**
 * Renders a grid of 4 KPI cards
 */
export const KPIGrid: React.FC<KPIGridProps> = ({
  totalEvaluations,
  blockRate,
  overrideRate,
  attestationCompliance,
  isLoading = false,
  error = null,
}) => {
  const kpis: Array<{ key: string; label: string; props: Omit<KPICardProps, 'label'> }> = [
    {
      key: 'totalEvaluations',
      label: 'Total Evaluations',
      props: totalEvaluations,
    },
    {
      key: 'blockRate',
      label: 'Block Rate',
      props: blockRate,
    },
    {
      key: 'overrideRate',
      label: 'Override Rate',
      props: overrideRate,
    },
    {
      key: 'attestationCompliance',
      label: 'Attestation Compliance',
      props: attestationCompliance,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <KPICard
          key={kpi.key}
          label={kpi.label}
          isLoading={isLoading}
          error={error || kpi.props.error}
          {...kpi.props}
        />
      ))}
    </div>
  );
};
