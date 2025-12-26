'use client';

/**
 * FHIR Resource Filters
 * Filter controls for resource type and date range
 */

import { useState, useEffect } from 'react';
import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface FhirResourceFiltersProps {
  resourceTypeCounts: Record<string, number>;
  selectedTypes: string[];
  dateRange: { start?: string; end?: string };
  onFilterChange: (
    selectedTypes: string[],
    dateRange: { start?: string; end?: string }
  ) => void;
  disabled?: boolean;
}

export default function FhirResourceFilters({
  resourceTypeCounts,
  selectedTypes,
  dateRange,
  onFilterChange,
  disabled = false,
}: FhirResourceFiltersProps) {
  const [localSelectedTypes, setLocalSelectedTypes] = useState<string[]>(selectedTypes);
  const [localDateRange, setLocalDateRange] = useState(dateRange);
  const [showFilters, setShowFilters] = useState(false);

  // Update local state when props change
  useEffect(() => {
    setLocalSelectedTypes(selectedTypes);
  }, [selectedTypes]);

  useEffect(() => {
    setLocalDateRange(dateRange);
  }, [dateRange]);

  const handleTypeToggle = (type: string) => {
    const newSelectedTypes = localSelectedTypes.includes(type)
      ? localSelectedTypes.filter((t) => t !== type)
      : [...localSelectedTypes, type];

    setLocalSelectedTypes(newSelectedTypes);
    onFilterChange(newSelectedTypes, localDateRange);
  };

  const handleDateChange = (field: 'start' | 'end', value: string) => {
    const newDateRange = {
      ...localDateRange,
      [field]: value || undefined,
    };

    setLocalDateRange(newDateRange);
    onFilterChange(localSelectedTypes, newDateRange);
  };

  const handleClearFilters = () => {
    setLocalSelectedTypes([]);
    setLocalDateRange({});
    onFilterChange([], {});
  };

  const hasActiveFilters =
    localSelectedTypes.length > 0 ||
    localDateRange.start ||
    localDateRange.end;

  const resourceTypes = Object.keys(resourceTypeCounts).sort();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-gray-700 font-medium hover:text-gray-900"
          disabled={disabled}
        >
          <FunnelIcon className="w-5 h-5" />
          <span>Filtros</span>
          {hasActiveFilters && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-blue-600 rounded-full">
              {localSelectedTypes.length +
                (localDateRange.start ? 1 : 0) +
                (localDateRange.end ? 1 : 0)}
            </span>
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            disabled={disabled}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Filter Controls */}
      {showFilters && (
        <div className="space-y-6 pt-4 border-t border-gray-200">
          {/* Resource Type Filters */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Tipo de Recurso
            </h3>
            <div className="space-y-2">
              {resourceTypes.map((type) => (
                <label
                  key={type}
                  className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={localSelectedTypes.includes(type)}
                    onChange={() => handleTypeToggle(type)}
                    disabled={disabled}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="flex-1 text-sm text-gray-700">
                    {getResourceTypeLabel(type)}
                  </span>
                  <span className="text-xs text-gray-500 font-medium">
                    {resourceTypeCounts[type]}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Date Range Filters */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Rango de Fechas
            </h3>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="filter-date-start"
                  className="block text-sm text-gray-700 mb-1"
                >
                  Desde
                </label>
                <input
                  id="filter-date-start"
                  type="date"
                  value={localDateRange.start?.split('T')[0] || ''}
                  onChange={(e) => {
                    const isoDate = e.target.value
                      ? new Date(e.target.value).toISOString()
                      : '';
                    handleDateChange('start', isoDate);
                  }}
                  disabled={disabled}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label
                  htmlFor="filter-date-end"
                  className="block text-sm text-gray-700 mb-1"
                >
                  Hasta
                </label>
                <input
                  id="filter-date-end"
                  type="date"
                  value={localDateRange.end?.split('T')[0] || ''}
                  onChange={(e) => {
                    const isoDate = e.target.value
                      ? new Date(e.target.value + 'T23:59:59').toISOString()
                      : '';
                    handleDateChange('end', isoDate);
                  }}
                  disabled={disabled}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Quick Date Filters */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Accesos Rápidos
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  const start = new Date();
                  start.setDate(start.getDate() - 7);
                  handleDateChange('start', start.toISOString());
                  handleDateChange('end', new Date().toISOString());
                }}
                disabled={disabled}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                Últimos 7 días
              </button>
              <button
                onClick={() => {
                  const start = new Date();
                  start.setMonth(start.getMonth() - 1);
                  handleDateChange('start', start.toISOString());
                  handleDateChange('end', new Date().toISOString());
                }}
                disabled={disabled}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                Último mes
              </button>
              <button
                onClick={() => {
                  const start = new Date();
                  start.setMonth(start.getMonth() - 3);
                  handleDateChange('start', start.toISOString());
                  handleDateChange('end', new Date().toISOString());
                }}
                disabled={disabled}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                Últimos 3 meses
              </button>
              <button
                onClick={() => {
                  const start = new Date();
                  start.setFullYear(start.getFullYear() - 1);
                  handleDateChange('start', start.toISOString());
                  handleDateChange('end', new Date().toISOString());
                }}
                disabled={disabled}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                Último año
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Filter Tags */}
      {!showFilters && hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mt-3">
          {localSelectedTypes.map((type) => (
            <span
              key={type}
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
            >
              {getResourceTypeLabel(type)}
              <button
                onClick={() => handleTypeToggle(type)}
                disabled={disabled}
                className="hover:bg-blue-200 rounded-full p-0.5"
                aria-label={`Quitar filtro de ${getResourceTypeLabel(type)}`}
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </span>
          ))}

          {localDateRange.start && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              Desde: {new Date(localDateRange.start).toLocaleDateString('es-MX')}
              <button
                onClick={() => handleDateChange('start', '')}
                disabled={disabled}
                className="hover:bg-blue-200 rounded-full p-0.5"
                aria-label="Quitar filtro de fecha desde"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </span>
          )}

          {localDateRange.end && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              Hasta: {new Date(localDateRange.end).toLocaleDateString('es-MX')}
              <button
                onClick={() => handleDateChange('end', '')}
                disabled={disabled}
                className="hover:bg-blue-200 rounded-full p-0.5"
                aria-label="Quitar filtro de fecha hasta"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getResourceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    Observation: 'Observaciones',
    Encounter: 'Consultas',
    Patient: 'Paciente',
    Condition: 'Condiciones',
    Procedure: 'Procedimientos',
    MedicationRequest: 'Medicamentos',
    DiagnosticReport: 'Reportes Diagnósticos',
    Immunization: 'Inmunizaciones',
    AllergyIntolerance: 'Alergias',
  };

  return labels[type] || type;
}
