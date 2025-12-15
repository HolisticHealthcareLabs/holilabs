'use client';

/**
 * Bulk Action Toolbar Component
 *
 * Displays bulk action buttons when templates are selected
 * Supports: Activate, Deactivate, Delete, Export
 */

import { useState } from 'react';
import {
  Check,
  X,
  Trash2,
  Download,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

interface BulkActionToolbarProps {
  selectedCount: number;
  selectedIds: string[];
  onClearSelection: () => void;
  onBulkActivate: (ids: string[]) => Promise<void>;
  onBulkDeactivate: (ids: string[]) => Promise<void>;
  onBulkDelete: (ids: string[]) => Promise<void>;
  onBulkExport: (ids: string[], format: 'json' | 'csv') => Promise<void>;
}

export default function BulkActionToolbar({
  selectedCount,
  selectedIds,
  onClearSelection,
  onBulkActivate,
  onBulkDeactivate,
  onBulkDelete,
  onBulkExport,
}: BulkActionToolbarProps) {
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleAction = async (
    action: () => Promise<void>,
    confirmMessage?: string
  ) => {
    if (confirmMessage && !confirm(confirmMessage)) {
      return;
    }

    try {
      setLoading(true);
      await action();
      onClearSelection();
    } catch (error) {
      console.error('Bulk action failed:', error);
      alert(error instanceof Error ? error.message : 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      {/* Bulk Action Toolbar */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-gray-900 dark:bg-gray-800 text-white rounded-xl shadow-2xl border border-gray-700 px-6 py-4">
          <div className="flex items-center space-x-6">
            {/* Selection Counter */}
            <div className="flex items-center space-x-2">
              <Check className="w-5 h-5 text-blue-400" />
              <span className="font-medium">
                {selectedCount} seleccionada{selectedCount !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Divider */}
            <div className="h-8 w-px bg-gray-700"></div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              {/* Activate */}
              <button
                onClick={() =>
                  handleAction(() => onBulkActivate(selectedIds))
                }
                disabled={loading}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                title="Activar seleccionadas"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Activar</span>
              </button>

              {/* Deactivate */}
              <button
                onClick={() =>
                  handleAction(() => onBulkDeactivate(selectedIds))
                }
                disabled={loading}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                title="Desactivar seleccionadas"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <X className="w-4 h-4" />
                )}
                <span>Desactivar</span>
              </button>

              {/* Export JSON */}
              <button
                onClick={() =>
                  handleAction(() => onBulkExport(selectedIds, 'json'))
                }
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                title="Exportar como JSON"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>JSON</span>
              </button>

              {/* Export CSV */}
              <button
                onClick={() =>
                  handleAction(() => onBulkExport(selectedIds, 'csv'))
                }
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                title="Exportar como CSV"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>CSV</span>
              </button>

              {/* Delete */}
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                title="Eliminar seleccionadas"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>Eliminar</span>
              </button>
            </div>

            {/* Divider */}
            <div className="h-8 w-px bg-gray-700"></div>

            {/* Cancel */}
            <button
              onClick={onClearSelection}
              disabled={loading}
              className="text-gray-400 hover:text-white transition-colors text-sm font-medium"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Confirmar Eliminación
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  ¿Está seguro de que desea eliminar {selectedCount} plantilla{selectedCount !== 1 ? 's' : ''}?
                  Esta acción no se puede deshacer.
                </p>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      handleAction(() => onBulkDelete(selectedIds));
                    }}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Eliminando...</span>
                      </span>
                    ) : (
                      'Eliminar'
                    )}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
