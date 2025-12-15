'use client';

import { useState, useEffect } from 'react';
import { X, GitCompare, AlertCircle, Check } from 'lucide-react';
import { ArrowRightIcon as ArrowRight } from '@heroicons/react/24/outline';

interface FieldDifference {
  field: string;
  oldValue: any;
  newValue: any;
  changed: boolean;
}

interface VersionMeta {
  id: string;
  versionNumber: number | string;
  versionLabel: string | null;
  changeLog?: string | null;
  createdBy?: {
    id: string;
    name: string | null;
    email: string | null;
  };
  createdAt: string;
}

interface ComparisonData {
  templateId: string;
  version1: VersionMeta;
  version2: VersionMeta;
  differences: FieldDifference[];
  changedFields: string[];
  summary: {
    totalFields: number;
    changedFields: number;
    unchangedFields: number;
  };
}

interface VersionComparisonProps {
  templateId: string;
  versionId1: string;
  versionId2?: string;
  compareWithCurrent?: boolean;
  onClose?: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  templateName: 'Nombre de Plantilla',
  planType: 'Tipo de Plan',
  description: 'Descripción',
  guidelineSource: 'Fuente de Guía',
  evidenceLevel: 'Nivel de Evidencia',
  targetPopulation: 'Población Objetivo',
  goals: 'Objetivos',
  recommendations: 'Recomendaciones',
  isActive: 'Estado Activo',
};

export default function VersionComparison({
  templateId,
  versionId1,
  versionId2,
  compareWithCurrent = false,
  onClose,
}: VersionComparisonProps) {
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOnlyChanges, setShowOnlyChanges] = useState(false);

  useEffect(() => {
    fetchComparison();
  }, [templateId, versionId1, versionId2, compareWithCurrent]);

  const fetchComparison = async () => {
    try {
      setLoading(true);
      setError(null);

      const body: any = { versionId1 };
      if (compareWithCurrent) {
        body.compareWithCurrent = true;
      } else if (versionId2) {
        body.versionId2 = versionId2;
      }

      const response = await fetch(`/api/prevention/templates/${templateId}/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to compare versions');
      }

      setComparison(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comparison');
    } finally {
      setLoading(false);
    }
  };

  const renderValue = (value: any, field: string): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400 italic">Sin valor</span>;
    }

    if (typeof value === 'boolean') {
      return (
        <span className={value ? 'text-green-600' : 'text-red-600'}>
          {value ? 'Activo' : 'Inactivo'}
        </span>
      );
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-gray-400 italic">Vacío</span>;
      }

      return (
        <div className="space-y-1">
          {value.map((item, index) => (
            <div key={index} className="text-sm bg-gray-50 p-2 rounded border border-gray-200">
              {typeof item === 'object' ? (
                <pre className="text-xs whitespace-pre-wrap">
                  {JSON.stringify(item, null, 2)}
                </pre>
              ) : (
                <span>{String(item)}</span>
              )}
            </div>
          ))}
        </div>
      );
    }

    if (typeof value === 'object') {
      return (
        <pre className="text-xs whitespace-pre-wrap bg-gray-50 p-2 rounded border border-gray-200">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }

    return <span className="text-gray-900">{String(value)}</span>;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Comparando versiones...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-600 font-medium">Error</p>
        </div>
        <p className="text-red-700 text-sm">{error}</p>
        <button
          onClick={fetchComparison}
          className="mt-3 text-sm text-red-700 hover:text-red-800 underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!comparison) {
    return null;
  }

  const displayedDifferences = showOnlyChanges
    ? comparison.differences.filter((d) => d.changed)
    : comparison.differences;

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-7xl mx-auto">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <GitCompare className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Comparación de Versiones</h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Version info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-600 font-medium mb-1">Versión Original</p>
            <p className="text-lg font-semibold text-gray-900">
              Versión {comparison.version1.versionNumber}
            </p>
            {comparison.version1.versionLabel && (
              <p className="text-sm text-gray-600">{comparison.version1.versionLabel}</p>
            )}
            {/* Decorative - low contrast intentional for timestamp */}
            <p className="text-xs text-gray-500 mt-2">
              {formatDate(comparison.version1.createdAt)}
            </p>
            {/* Decorative - low contrast intentional for metadata */}
            {comparison.version1.createdBy && (
              <p className="text-xs text-gray-500">
                por {comparison.version1.createdBy.name || comparison.version1.createdBy.email}
              </p>
            )}
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-sm text-green-600 font-medium mb-1">
              {comparison.version2.versionNumber === 'Current' ? 'Estado Actual' : 'Versión Nueva'}
            </p>
            <p className="text-lg font-semibold text-gray-900">
              {comparison.version2.versionNumber === 'Current'
                ? 'Actual'
                : `Versión ${comparison.version2.versionNumber}`}
            </p>
            {comparison.version2.versionLabel && (
              <p className="text-sm text-gray-600">{comparison.version2.versionLabel}</p>
            )}
            {/* Decorative - low contrast intentional for timestamp */}
            <p className="text-xs text-gray-500 mt-2">
              {formatDate(comparison.version2.createdAt)}
            </p>
            {/* Decorative - low contrast intentional for metadata */}
            {comparison.version2.createdBy && (
              <p className="text-xs text-gray-500">
                por {comparison.version2.createdBy.name || comparison.version2.createdBy.email}
              </p>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="mt-4 flex items-center justify-between bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center space-x-6">
            <div>
              <p className="text-sm text-gray-600">Total de Campos</p>
              <p className="text-2xl font-bold text-gray-900">{comparison.summary.totalFields}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Modificados</p>
              <p className="text-2xl font-bold text-orange-600">
                {comparison.summary.changedFields}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Sin Cambios</p>
              <p className="text-2xl font-bold text-green-600">
                {comparison.summary.unchangedFields}
              </p>
            </div>
          </div>

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyChanges}
              onChange={(e) => setShowOnlyChanges(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Mostrar solo cambios</span>
          </label>
        </div>
      </div>

      {/* Differences */}
      <div className="p-6 max-h-[600px] overflow-y-auto">
        <div className="space-y-4">
          {displayedDifferences.map((diff) => (
            <div
              key={diff.field}
              className={`border rounded-lg overflow-hidden ${
                diff.changed
                  ? 'border-orange-200 bg-orange-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              {/* Field header */}
              <div className="bg-gray-100 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">
                    {FIELD_LABELS[diff.field] || diff.field}
                  </span>
                  {diff.changed ? (
                    <span className="px-2 py-0.5 text-xs font-medium bg-orange-200 text-orange-700 rounded-full">
                      Modificado
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-xs font-medium bg-green-200 text-green-700 rounded-full flex items-center space-x-1">
                      <Check className="w-3 h-3" />
                      <span>Sin cambios</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Values comparison */}
              <div className="grid grid-cols-2 divide-x divide-gray-200">
                {/* Old value */}
                <div className="p-4 bg-blue-50/50">
                  <p className="text-xs text-blue-600 font-medium mb-2">Valor Original</p>
                  <div className="text-sm">{renderValue(diff.oldValue, diff.field)}</div>
                </div>

                {/* New value */}
                <div className={`p-4 ${diff.changed ? 'bg-green-50/50' : 'bg-gray-50/50'}`}>
                  <p className={`text-xs font-medium mb-2 ${diff.changed ? 'text-green-600' : 'text-gray-600'}`}>
                    Valor Nuevo
                  </p>
                  <div className="text-sm">{renderValue(diff.newValue, diff.field)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      {onClose && (
        <div className="border-t border-gray-200 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
}
