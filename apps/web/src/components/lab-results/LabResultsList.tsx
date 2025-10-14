'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface LabResult {
  id: string;
  testName: string;
  testCode: string | null;
  category: string | null;
  value: string | null;
  unit: string | null;
  referenceRange: string | null;
  status: 'PRELIMINARY' | 'FINAL' | 'CORRECTED' | 'CANCELLED';
  interpretation: string | null;
  isAbnormal: boolean;
  isCritical: boolean;
  orderingDoctor: string | null;
  performingLab: string | null;
  resultDate: string;
  reviewedDate: string | null;
  notes: string | null;
  attachmentUrl: string | null;
}

interface LabResultsListProps {
  patientId: string;
}

const statusColors = {
  PRELIMINARY: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  FINAL: 'bg-green-100 text-green-800 border-green-300',
  CORRECTED: 'bg-blue-100 text-blue-800 border-blue-300',
  CANCELLED: 'bg-gray-100 text-gray-800 border-gray-300',
};

const statusLabels = {
  PRELIMINARY: 'Preliminar',
  FINAL: 'Final',
  CORRECTED: 'Corregido',
  CANCELLED: 'Cancelado',
};

export default function LabResultsList({ patientId }: LabResultsListProps) {
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [abnormalFilter, setAbnormalFilter] = useState<string>('ALL');
  const [criticalFilter, setCriticalFilter] = useState<string>('ALL');

  // Selected result for detail view
  const [selectedResult, setSelectedResult] = useState<LabResult | null>(null);

  useEffect(() => {
    fetchLabResults();
  }, [patientId, statusFilter, abnormalFilter, criticalFilter]);

  const fetchLabResults = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ patientId });
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (abnormalFilter !== 'ALL') params.append('isAbnormal', abnormalFilter);
      if (criticalFilter !== 'ALL') params.append('isCritical', criticalFilter);

      const response = await fetch(`/api/lab-results?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Error al cargar resultados de laboratorio');
      }

      const data = await response.json();
      setLabResults(data.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (result: LabResult) => {
    setSelectedResult(result);
  };

  const closeDetailView = () => {
    setSelectedResult(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
        <p className="text-sm font-semibold text-red-800">Error</p>
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Resultados de Laboratorio</h2>
        <span className="text-sm text-gray-600">{labResults.length} resultados</span>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">Todos</option>
              <option value="PRELIMINARY">Preliminar</option>
              <option value="FINAL">Final</option>
              <option value="CORRECTED">Corregido</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resultados Anormales
            </label>
            <select
              value={abnormalFilter}
              onChange={(e) => setAbnormalFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">Todos</option>
              <option value="true">Solo Anormales</option>
              <option value="false">Solo Normales</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resultados Críticos
            </label>
            <select
              value={criticalFilter}
              onChange={(e) => setCriticalFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">Todos</option>
              <option value="true">Solo Críticos</option>
              <option value="false">No Críticos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Table */}
      {labResults.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">No se encontraron resultados de laboratorio</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prueba
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rango de Referencia
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Flags
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {labResults.map((result) => (
                  <tr
                    key={result.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleResultClick(result)}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{result.testName}</div>
                        {result.testCode && (
                          <div className="text-xs text-gray-500">LOINC: {result.testCode}</div>
                        )}
                        {result.category && (
                          <div className="text-xs text-gray-500">{result.category}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {result.value || '-'}
                        {result.unit && <span className="ml-1 text-gray-600">{result.unit}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">{result.referenceRange || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[result.status]}`}>
                        {statusLabels[result.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {format(new Date(result.resultDate), 'd MMM yyyy', { locale: es })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(new Date(result.resultDate), 'HH:mm', { locale: es })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {result.isCritical && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-600 text-white">
                            CRÍTICO
                          </span>
                        )}
                        {result.isAbnormal && !result.isCritical && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 border border-orange-300">
                            Anormal
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResultClick(result);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Ver Detalles
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">{selectedResult.testName}</h3>
              <button
                onClick={closeDetailView}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Flags */}
              {(selectedResult.isCritical || selectedResult.isAbnormal) && (
                <div className="flex items-center gap-3">
                  {selectedResult.isCritical && (
                    <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold bg-red-600 text-white">
                      ⚠️ RESULTADO CRÍTICO
                    </span>
                  )}
                  {selectedResult.isAbnormal && !selectedResult.isCritical && (
                    <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-orange-100 text-orange-800 border border-orange-300">
                      Resultado Anormal
                    </span>
                  )}
                </div>
              )}

              {/* Result Value */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm text-blue-700 font-medium mb-1">Resultado</div>
                <div className="text-3xl font-bold text-blue-900">
                  {selectedResult.value || 'N/A'}
                  {selectedResult.unit && <span className="text-xl ml-2 text-blue-700">{selectedResult.unit}</span>}
                </div>
                {selectedResult.referenceRange && (
                  <div className="text-sm text-blue-700 mt-2">
                    Rango de referencia: {selectedResult.referenceRange}
                  </div>
                )}
              </div>

              {/* Interpretation */}
              {selectedResult.interpretation && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Interpretación</h4>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{selectedResult.interpretation}</p>
                </div>
              )}

              {/* Test Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Estado</h4>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[selectedResult.status]}`}>
                    {statusLabels[selectedResult.status]}
                  </span>
                </div>

                {selectedResult.testCode && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Código LOINC</h4>
                    <p className="text-sm text-gray-900">{selectedResult.testCode}</p>
                  </div>
                )}

                {selectedResult.category && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Categoría</h4>
                    <p className="text-sm text-gray-900">{selectedResult.category}</p>
                  </div>
                )}

                {selectedResult.orderingDoctor && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Médico Solicitante</h4>
                    <p className="text-sm text-gray-900">{selectedResult.orderingDoctor}</p>
                  </div>
                )}

                {selectedResult.performingLab && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Laboratorio</h4>
                    <p className="text-sm text-gray-900">{selectedResult.performingLab}</p>
                  </div>
                )}

                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Fecha de Resultado</h4>
                  <p className="text-sm text-gray-900">
                    {format(new Date(selectedResult.resultDate), "d 'de' MMMM, yyyy HH:mm", { locale: es })}
                  </p>
                </div>

                {selectedResult.reviewedDate && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Fecha de Revisión</h4>
                    <p className="text-sm text-gray-900">
                      {format(new Date(selectedResult.reviewedDate), "d 'de' MMMM, yyyy HH:mm", { locale: es })}
                    </p>
                  </div>
                )}
              </div>

              {/* Notes */}
              {selectedResult.notes && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Notas</h4>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 p-3 rounded border border-gray-200">
                    {selectedResult.notes}
                  </p>
                </div>
              )}

              {/* Attachment */}
              {selectedResult.attachmentUrl && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Adjunto</h4>
                  <a
                    href={selectedResult.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    📄 Ver Documento
                  </a>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
              <button
                onClick={closeDetailView}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
