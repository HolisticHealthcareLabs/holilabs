/**
 * Medical Records List Component
 *
 * Interactive, client-side component for viewing medical records
 * Features:
 * - Real-time search
 * - Advanced filtering (date, status)
 * - Pagination with loading states
 * - Responsive grid layout
 * - Error handling with retry
 * - Empty states
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

// TODO: Renamed from 'Record' to avoid conflict with TypeScript's built-in Record type
interface MedicalRecord {
  id: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  chiefComplaint: string | null;
  diagnoses: any;
  vitalSigns: any;
  status: string;
  signedAt: Date | null;
  createdAt: Date;
  clinician: {
    id: string;
    firstName: string;
    lastName: string;
    specialty: string | null;
  };
}

interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING_REVIEW: 'bg-yellow-100 text-yellow-700',
  SIGNED: 'bg-green-100 text-green-700',
  AMENDED: 'bg-blue-100 text-blue-700',
  ADDENDUM: 'bg-purple-100 text-purple-700',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  PENDING_REVIEW: 'Pendiente',
  SIGNED: 'Firmado',
  AMENDED: 'Enmendado',
  ADDENDUM: 'Adenda',
};

export default function MedicalRecordsList() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch records
  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(search && { search }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(status && { status }),
      });

      const response = await fetch(`/api/portal/records?${params}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al cargar registros');
      }

      setRecords(data.data.records);
      setPagination(data.data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  }, [search, startDate, endDate, status, currentPage]);

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, startDate, endDate, status]);

  // Loading skeleton
  if (isLoading && records.length === 0) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse"
          >
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  // Error state with retry
  if (error && records.length === 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
        <svg
          className="w-12 h-12 text-red-500 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar registros</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchRecords}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              🔍 Buscar
            </label>
            <input
              id="search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Síntomas, diagnóstico, tratamiento..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-gray-900"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              📋 Estado
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-gray-900"
            >
              <option value="">Todos</option>
              <option value="SIGNED">Firmados</option>
              <option value="PENDING_REVIEW">Pendientes</option>
              <option value="DRAFT">Borradores</option>
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
              📅 Desde
            </label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-gray-900"
            />
          </div>
        </div>

        {/* Active Filters Display */}
        {(search || status || startDate) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {search && (
              <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                🔍 {search}
                <button
                  onClick={() => setSearch('')}
                  className="hover:text-green-900"
                >
                  ×
                </button>
              </span>
            )}
            {status && (
              <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                📋 {STATUS_LABELS[status]}
                <button
                  onClick={() => setStatus('')}
                  className="hover:text-blue-900"
                >
                  ×
                </button>
              </span>
            )}
            {startDate && (
              <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm">
                📅 Desde {format(new Date(startDate), 'dd MMM yyyy', { locale: es })}
                <button
                  onClick={() => setStartDate('')}
                  className="hover:text-purple-900"
                >
                  ×
                </button>
              </span>
            )}
            <button
              onClick={() => {
                setSearch('');
                setStatus('');
                setStartDate('');
                setEndDate('');
              }}
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Results Count */}
      {pagination && (
        <div className="text-sm text-gray-600">
          Mostrando {records.length} de {pagination.totalCount} registros
        </div>
      )}

      {/* Records Grid */}
      {records.length === 0 ? (
        // Empty State
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
          <svg
            className="w-16 h-16 text-gray-400 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No se encontraron registros
          </h3>
          <p className="text-gray-600">
            {search || status || startDate
              ? 'Intenta ajustar los filtros de búsqueda'
              : 'Aún no tienes registros médicos'}
          </p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-1 gap-4">
            {records.map((record, index) => (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  href={`/portal/records/${record.id}`}
                  className="block bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-green-200 transition-all"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {record.chiefComplaint || 'Consulta Médica'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Dr. {record.clinician.firstName} {record.clinician.lastName}
                        {record.clinician.specialty && (
                          <span className="text-gray-400"> · {record.clinician.specialty}</span>
                        )}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        STATUS_COLORS[record.status] || 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {STATUS_LABELS[record.status] || record.status}
                    </span>
                  </div>

                  {/* Preview */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {record.subjective && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1">Síntomas</p>
                        <p className="text-sm text-gray-700 line-clamp-2">{record.subjective}</p>
                      </div>
                    )}
                    {record.assessment && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1">Diagnóstico</p>
                        <p className="text-sm text-gray-700 line-clamp-2">{record.assessment}</p>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        {format(new Date(record.createdAt), 'dd MMM yyyy', { locale: es })}
                      </span>
                      {record.signedAt && (
                        <span className="flex items-center gap-1 text-green-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          Firmado
                        </span>
                      )}
                    </div>
                    <span className="text-green-600 font-medium flex items-center gap-1">
                      Ver detalles
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={!pagination.hasPrevPage || isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Anterior
          </button>

          <span className="text-sm text-gray-600">
            Página {pagination.page} de {pagination.totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => p + 1)}
            disabled={!pagination.hasNextPage || isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Siguiente
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && records.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 flex items-center gap-3">
            <svg
              className="animate-spin h-6 w-6 text-green-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="text-gray-700 font-medium">Cargando...</span>
          </div>
        </div>
      )}
    </div>
  );
}
