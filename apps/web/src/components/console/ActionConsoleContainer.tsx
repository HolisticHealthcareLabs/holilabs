/**
 * Action Console Container
 * Integrates KPI dashboard with filtering and override reasons ranking
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { KPIFilterState, KPIResult, OverrideReason } from '@/lib/kpi';
import { ConsoleFilterBar } from './ConsoleFilterBar';
import { KPIGrid } from './KPIGrid';
import { OverrideReasonsRanking } from './OverrideReasonsRanking';

interface KPIData {
  totalEvaluations: KPIResult;
  blockRate: KPIResult;
  overrideRate: KPIResult;
  attestationCompliance: KPIResult;
}

export interface ActionConsoleContainerProps {
  initialStartDate?: string;
  initialEndDate?: string;
}

/**
 * Main Action Console Container
 */
export const ActionConsoleContainer: React.FC<ActionConsoleContainerProps> = ({
  initialStartDate,
  initialEndDate,
}) => {
  const [filter, setFilter] = useState<KPIFilterState>({
    startDate: initialStartDate,
    endDate: initialEndDate,
  });

  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [overrideReasons, setOverrideReasons] = useState<OverrideReason[]>([]);
  const [kpiLoading, setKpiLoading] = useState(false);
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [kpiError, setKpiError] = useState<string | null>(null);
  const [overrideError, setOverrideError] = useState<string | null>(null);

  // Fetch KPI data
  const fetchKPIs = useCallback(async (filterState: KPIFilterState): Promise<void> => {
    setKpiLoading(true);
    setKpiError(null);

    try {
      const params = new URLSearchParams();
      if (filterState.startDate) {
        params.append('startDate', filterState.startDate);
      }
      if (filterState.endDate) {
        params.append('endDate', filterState.endDate);
      }

      const response = await fetch(`/api/kpi?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch KPIs: ${response.statusText}`);
      }

      const data: KPIData = await response.json();
      setKpiData(data);
    } catch (error) {
      console.error('[ActionConsole] KPI fetch error:', error);
      setKpiError(error instanceof Error ? error.message : 'Failed to load KPIs');
    } finally {
      setKpiLoading(false);
    }
  }, []);

  // Fetch override reasons
  const fetchOverrideReasons = useCallback(async (filterState: KPIFilterState): Promise<void> => {
    setOverrideLoading(true);
    setOverrideError(null);

    try {
      const params = new URLSearchParams();
      if (filterState.startDate) {
        params.append('startDate', filterState.startDate);
      }
      if (filterState.endDate) {
        params.append('endDate', filterState.endDate);
      }

      const response = await fetch(`/api/kpi/overrides?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch overrides: ${response.statusText}`);
      }

      const data: OverrideReason[] = await response.json();
      setOverrideReasons(data);
    } catch (error) {
      console.error('[ActionConsole] Override fetch error:', error);
      setOverrideError(error instanceof Error ? error.message : 'Failed to load override reasons');
    } finally {
      setOverrideLoading(false);
    }
  }, []);

  // Fetch both KPIs and override reasons when filter changes
  const handleFilterChange = useCallback(
    async (newFilter: KPIFilterState): Promise<void> => {
      setFilter(newFilter);
      await Promise.all([
        fetchKPIs(newFilter),
        fetchOverrideReasons(newFilter),
      ]);
    },
    [fetchKPIs, fetchOverrideReasons]
  );

  // Initial fetch on mount
  useEffect(() => {
    void handleFilterChange(filter);
  }, []); // Empty dependency array for initial load only

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Action Console
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Real-time visibility into DOAC safety rule evaluations
        </p>
      </div>

      {/* Filter Bar */}
      <ConsoleFilterBar
        onFilterChange={handleFilterChange}
        isLoading={kpiLoading || overrideLoading}
      />

      {/* KPI Grid */}
      {kpiData && (
        <KPIGrid
          totalEvaluations={{
            value: kpiData.totalEvaluations.value,
            unit: kpiData.totalEvaluations.unit,
            tooltip: 'Total rule evaluations performed in selected period',
          }}
          blockRate={{
            value: kpiData.blockRate.value,
            unit: kpiData.blockRate.unit,
            tooltip: 'Percentage of evaluations that resulted in blocks. Target: <5%',
          }}
          overrideRate={{
            value: kpiData.overrideRate.value,
            unit: kpiData.overrideRate.unit,
            tooltip: 'Percentage of blocked/flagged evaluations that were overridden. Target: <10%',
          }}
          attestationCompliance={{
            value: kpiData.attestationCompliance.value,
            unit: kpiData.attestationCompliance.unit,
            tooltip: 'Percentage of flagged items with attestation submitted. Target: >95%',
          }}
          isLoading={kpiLoading}
          error={kpiError}
        />
      )}

      {/* Override Reasons Ranking */}
      <OverrideReasonsRanking
        reasons={overrideReasons}
        isLoading={overrideLoading}
        error={overrideError}
      />
    </div>
  );
};
