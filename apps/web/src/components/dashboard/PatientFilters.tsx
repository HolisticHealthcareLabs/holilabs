'use client';

/**
 * Smart Patient Filters
 * Advanced filtering and search for provider dashboard
 * FREE - No external libraries needed
 *
 * Features:
 * - Search by name, ID, phone, email
 * - Filter by risk level
 * - Filter by conditions
 * - Filter by appointment status
 * - Sort options
 * - Saved filter presets
 * - Clear all filters
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface FilterOptions {
  search: string;
  riskLevels: string[];
  conditions: string[];
  appointmentStatus: string[];
  sortBy: 'name' | 'lastVisit' | 'riskLevel' | 'nextAppointment';
  sortOrder: 'asc' | 'desc';
}

interface PatientFiltersProps {
  onFilterChange: (filters: FilterOptions) => void;
  activeCount?: number;
}

export default function PatientFilters({ onFilterChange, activeCount = 0 }: PatientFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    riskLevels: [],
    conditions: [],
    appointmentStatus: [],
    sortBy: 'name',
    sortOrder: 'asc',
  });

  const riskLevelOptions = [
    { value: 'HIGH', label: 'High Risk', color: 'bg-red-100 text-red-700', count: 3 },
    { value: 'MEDIUM', label: 'Medium Risk', color: 'bg-yellow-100 text-yellow-700', count: 4 },
    { value: 'LOW', label: 'Low Risk', color: 'bg-green-100 text-green-700', count: 3 },
  ];

  const conditionOptions = [
    { value: 'diabetes', label: 'Diabetes', count: 4 },
    { value: 'hypertension', label: 'Hypertension', count: 5 },
    { value: 'asthma', label: 'Asthma', count: 2 },
    { value: 'heart', label: 'Heart Disease', count: 2 },
  ];

  const appointmentStatusOptions = [
    { value: 'upcoming', label: 'Upcoming Appointments', count: 6 },
    { value: 'overdue', label: 'Overdue for Visit', count: 2 },
    { value: 'recent', label: 'Recently Seen', count: 4 },
  ];

  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'lastVisit', label: 'Last Visit' },
    { value: 'riskLevel', label: 'Risk Level' },
    { value: 'nextAppointment', label: 'Next Appointment' },
  ];

  const handleToggle = (filterType: keyof FilterOptions, value: string) => {
    const newFilters = { ...filters };

    if (filterType === 'search' || filterType === 'sortBy' || filterType === 'sortOrder') {
      newFilters[filterType] = value as any;
    } else {
      const currentArray = newFilters[filterType] as string[];
      if (currentArray.includes(value)) {
        newFilters[filterType] = currentArray.filter(v => v !== value) as any;
      } else {
        newFilters[filterType] = [...currentArray, value] as any;
      }
    }

    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleClearAll = () => {
    const clearedFilters: FilterOptions = {
      search: '',
      riskLevels: [],
      conditions: [],
      appointmentStatus: [],
      sortBy: 'name',
      sortOrder: 'asc',
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const activeFilterCount =
    filters.riskLevels.length +
    filters.conditions.length +
    filters.appointmentStatus.length +
    (filters.search ? 1 : 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      {/* Search Bar and Toggle */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative">
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search patients by name, ID, phone..."
            value={filters.search}
            onChange={(e) => handleToggle('search', e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          Filters
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>

        {activeFilterCount > 0 && (
          <button
            onClick={handleClearAll}
            className="text-sm text-gray-600 hover:text-gray-900 font-medium"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Expanded Filters */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-4 border-t border-gray-200 space-y-6">
              {/* Risk Level Filters */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Risk Level</h4>
                <div className="flex flex-wrap gap-2">
                  {riskLevelOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleToggle('riskLevels', option.value)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        filters.riskLevels.includes(option.value)
                          ? option.color + ' ring-2 ring-offset-2 ring-blue-500'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {option.label}
                      <span className="ml-2 text-xs opacity-75">({option.count})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Condition Filters */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Conditions</h4>
                <div className="flex flex-wrap gap-2">
                  {conditionOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleToggle('conditions', option.value)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        filters.conditions.includes(option.value)
                          ? 'bg-purple-100 text-purple-700 ring-2 ring-offset-2 ring-purple-500'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {option.label}
                      <span className="ml-2 text-xs opacity-75">({option.count})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Appointment Status Filters */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Appointment Status</h4>
                <div className="flex flex-wrap gap-2">
                  {appointmentStatusOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleToggle('appointmentStatus', option.value)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        filters.appointmentStatus.includes(option.value)
                          ? 'bg-blue-100 text-blue-700 ring-2 ring-offset-2 ring-blue-500'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {option.label}
                      <span className="ml-2 text-xs opacity-75">({option.count})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort Options */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Sort By</h4>
                <div className="flex items-center gap-3">
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleToggle('sortBy', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => handleToggle('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    title={filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                  >
                    {filters.sortOrder === 'asc' ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Filters Summary */}
      {activeFilterCount > 0 && !isExpanded && (
        <div className="flex flex-wrap gap-2 mt-3">
          {filters.riskLevels.map((level) => (
            <span
              key={level}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full"
            >
              Risk: {level}
              <button
                onClick={() => handleToggle('riskLevels', level)}
                className="hover:bg-blue-200 rounded-full p-0.5"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
                </svg>
              </button>
            </span>
          ))}
          {filters.conditions.map((condition) => (
            <span
              key={condition}
              className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full"
            >
              {condition}
              <button
                onClick={() => handleToggle('conditions', condition)}
                className="hover:bg-purple-200 rounded-full p-0.5"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
