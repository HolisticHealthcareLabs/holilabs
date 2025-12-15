'use client';

import { useState, useEffect } from 'react';
import { Clock, User, FileText, Eye, GitCompare } from 'lucide-react';
import { TagIcon as Tag, ArrowPathIcon as RotateCcw } from '@heroicons/react/24/outline';

interface Version {
  id: string;
  versionNumber: number;
  versionLabel: string | null;
  changeLog: string | null;
  changedFields: string[] | null;
  createdBy: {
    id: string;
    name: string | null;
    email: string | null;
  };
  createdAt: string;
}

interface VersionHistoryProps {
  templateId: string;
  onViewVersion?: (versionId: string) => void;
  onRevertToVersion?: (versionId: string) => void;
  onCompareVersions?: (versionId1: string, versionId2?: string) => void;
}

export default function VersionHistory({
  templateId,
  onViewVersion,
  onRevertToVersion,
  onCompareVersions,
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [templateName, setTemplateName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);

  useEffect(() => {
    fetchVersions();
  }, [templateId]);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/prevention/templates/${templateId}/versions`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch versions');
      }

      setVersions(result.data.versions);
      setTemplateName(result.data.templateName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load versions');
    } finally {
      setLoading(false);
    }
  };

  const handleRevert = async (versionId: string, versionNumber: number) => {
    if (!confirm(`¿Revertir a la versión ${versionNumber}? Esto creará una copia de seguridad automática del estado actual.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/prevention/templates/${templateId}/revert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId, createSnapshot: true }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to revert');
      }

      alert('Plantilla revertida exitosamente');

      if (onRevertToVersion) {
        onRevertToVersion(versionId);
      }

      // Refresh versions
      await fetchVersions();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al revertir');
    }
  };

  const handleToggleCompareSelection = (versionId: string) => {
    setSelectedForCompare((prev) => {
      if (prev.includes(versionId)) {
        return prev.filter((id) => id !== versionId);
      }
      if (prev.length >= 2) {
        return [prev[1], versionId];
      }
      return [...prev, versionId];
    });
  };

  const handleCompare = () => {
    if (selectedForCompare.length === 2 && onCompareVersions) {
      onCompareVersions(selectedForCompare[0], selectedForCompare[1]);
      setSelectedForCompare([]);
    } else if (selectedForCompare.length === 1 && onCompareVersions) {
      onCompareVersions(selectedForCompare[0]);
      setSelectedForCompare([]);
    }
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

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return formatDate(dateString);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchVersions}
          className="mt-2 text-sm text-red-700 hover:text-red-800 underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
        <Clock className="mx-auto h-12 w-12 text-gray-400 mb-3" />
        <p className="text-gray-600">No hay versiones guardadas aún</p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Las versiones se crean automáticamente cuando realizas cambios significativos
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Historial de Versiones
          </h3>
          <p className="text-sm text-gray-600">{templateName}</p>
        </div>
        {selectedForCompare.length > 0 && (
          <button
            onClick={handleCompare}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <GitCompare className="w-4 h-4" />
            <span>
              Comparar {selectedForCompare.length === 1 ? 'con actual' : selectedForCompare.length}
            </span>
          </button>
        )}
      </div>

      {/* Version Timeline */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

        {/* Version items */}
        <div className="space-y-4">
          {versions.map((version, index) => {
            const isLatest = index === 0;
            const isSelected = selectedForCompare.includes(version.id);

            return (
              <div
                key={version.id}
                className={`relative pl-10 pb-4 ${
                  isSelected ? 'bg-blue-50 -ml-2 -mr-2 pl-12 pr-4 py-3 rounded-lg' : ''
                }`}
              >
                {/* Timeline dot */}
                <div
                  className={`absolute left-2.5 w-3 h-3 rounded-full ${
                    isLatest
                      ? 'bg-green-500 ring-4 ring-green-100'
                      : isSelected
                      ? 'bg-blue-600 ring-4 ring-blue-100'
                      : 'bg-gray-300'
                  }`}
                />

                {/* Version card */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                  {/* Version header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-lg font-semibold text-gray-900">
                            Versión {version.versionNumber}
                          </span>
                          {isLatest && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                              Última
                            </span>
                          )}
                          {version.versionLabel && (
                            <Tag className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        {version.versionLabel && (
                          <p className="text-sm text-gray-600 mt-0.5">
                            {version.versionLabel}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Compare checkbox */}
                    <button
                      onClick={() => handleToggleCompareSelection(version.id)}
                      className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {isSelected ? '✓ Seleccionado' : 'Comparar'}
                    </button>
                  </div>

                  {/* Change log */}
                  {version.changeLog && (
                    <div className="mb-3 flex items-start space-x-2">
                      <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-700">{version.changeLog}</p>
                    </div>
                  )}

                  {/* Changed fields */}
                  {version.changedFields && version.changedFields.length > 0 && (
                    <div className="mb-3">
                      {/* Decorative - low contrast intentional for label */}
                      <p className="text-xs text-gray-500 mb-1">Campos modificados:</p>
                      <div className="flex flex-wrap gap-1">
                        {version.changedFields.map((field) => (
                          <span
                            key={field}
                            className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                          >
                            {field}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  {/* Decorative - low contrast intentional for metadata */}
                  <div className="flex items-center space-x-4 text-xs text-gray-500 mb-3">
                    <div className="flex items-center space-x-1">
                      <User className="w-3 h-3" />
                      <span>{version.createdBy.name || version.createdBy.email}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{getRelativeTime(version.createdAt)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 pt-2 border-t border-gray-100">
                    {onViewVersion && (
                      <button
                        onClick={() => onViewVersion(version.id)}
                        className="flex items-center space-x-1 px-3 py-1.5 text-xs text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Ver</span>
                      </button>
                    )}
                    {!isLatest && (
                      <button
                        onClick={() => handleRevert(version.id, version.versionNumber)}
                        className="flex items-center space-x-1 px-3 py-1.5 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Revertir</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer info */}
      <div className="text-center pt-4 border-t border-gray-200">
        {/* Decorative - low contrast intentional for count badge */}
        <p className="text-sm text-gray-500">
          {versions.length} versión{versions.length !== 1 ? 'es' : ''} guardada
          {versions.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}
