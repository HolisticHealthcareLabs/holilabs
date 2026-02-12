/**
 * Console Filter Bar Component
 * Provides date range filtering for KPIs
 */

'use client';

import React, { useState, useCallback } from 'react';
import { KPIFilterState } from '@/lib/kpi';

export interface ConsoleFilterBarProps {
  onFilterChange: (filter: KPIFilterState) => void;
  isLoading?: boolean;
}

/**
 * Renders a date range filter bar
 */
export const ConsoleFilterBar: React.FC<ConsoleFilterBarProps> = ({
  onFilterChange,
  isLoading = false,
}) => {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const handleApplyFilter = useCallback(() => {
    onFilterChange({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  }, [startDate, endDate, onFilterChange]);

  const handleReset = useCallback(() => {
    setStartDate('');
    setEndDate('');
    onFilterChange({});
  }, [onFilterChange]);

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setStartDate(e.target.value);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setEndDate(e.target.value);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:gap-3">
        <div className="flex-1">
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Start Date
          </label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={handleStartDateChange}
            disabled={isLoading}
            className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>

        <div className="flex-1">
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            End Date
          </label>
          <input
            id="endDate"
            type="date"
            value={endDate}
            onChange={handleEndDateChange}
            disabled={isLoading}
            className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleApplyFilter}
            disabled={isLoading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-700 dark:hover:bg-blue-800"
          >
            Apply
          </button>
          <button
            onClick={handleReset}
            disabled={isLoading}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};
