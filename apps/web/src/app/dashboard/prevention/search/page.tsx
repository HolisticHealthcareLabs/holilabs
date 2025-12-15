'use client';

/**
 * Prevention Search Page
 *
 * Advanced search interface for prevention plans, templates, and reminders
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Filter,
  X,
  FileText,
  Copy,
  Calendar,
  User,
  TrendingUp,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';

// Simple debounce implementation
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

interface SearchResult {
  type: 'plan' | 'template' | 'reminder';
  id: string;
  title: string;
  description: string | null;
  planType?: string;
  status?: string;
  patientName?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: any;
}

interface Stats {
  totalResults: number;
  byType: {
    plans: number;
    templates: number;
    reminders: number;
  };
}

export default function PreventionSearchPage() {
  const router = useRouter();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search parameters
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    type: 'all',
    planType: '',
    status: '',
    startDate: '',
    endDate: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      performSearch(query);
    }, 500),
    [filters]
  );

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      debouncedSearch(searchQuery);
    } else {
      setResults([]);
      setStats(null);
    }
  }, [searchQuery, debouncedSearch]);

  const performSearch = async (query: string) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('q', query);
      if (filters.type !== 'all') params.set('type', filters.type);
      if (filters.planType) params.set('planType', filters.planType);
      if (filters.status) params.set('status', filters.status);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);

      const response = await fetch(`/api/prevention/search?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to search');
      }

      if (result.success) {
        setResults(result.data.results);
        setStats(result.data.stats);
      }
    } catch (err) {
      console.error('Error searching:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    if (searchQuery.trim().length > 0) {
      performSearch(searchQuery);
    }
  };

  const resetFilters = () => {
    setFilters({
      type: 'all',
      planType: '',
      status: '',
      startDate: '',
      endDate: '',
    });
  };

  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'plan':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'template':
        return <Copy className="w-5 h-5 text-purple-500" />;
      case 'reminder':
        return <Calendar className="w-5 h-5 text-orange-500" />;
    }
  };

  const getResultTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'plan':
        return 'Plan de Prevención';
      case 'template':
        return 'Plantilla';
      case 'reminder':
        return 'Recordatorio';
    }
  };

  const getResultUrl = (result: SearchResult) => {
    switch (result.type) {
      case 'plan':
        return `/dashboard/prevention/plans/${result.id}`;
      case 'template':
        return `/dashboard/prevention/templates`;
      case 'reminder':
        return `/dashboard/prevention/reminders/${result.id}`;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <Search className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Búsqueda Avanzada
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Busca en planes, plantillas y recordatorios de prevención
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, descripción, fuente de guía..."
              className="w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-3 border rounded-lg transition-colors ${
              showFilters
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-300'
                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tipo
                </label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todos</option>
                  <option value="plan">Planes</option>
                  <option value="template">Plantillas</option>
                  <option value="reminder">Recordatorios</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tipo de Plan
                </label>
                <select
                  value={filters.planType}
                  onChange={(e) => setFilters({ ...filters, planType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="CARDIOVASCULAR">Cardiovascular</option>
                  <option value="DIABETES">Diabetes</option>
                  <option value="CANCER">Cáncer</option>
                  <option value="IMMUNIZATION">Inmunización</option>
                  <option value="GENERAL_WELLNESS">Bienestar General</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Estado
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="ACTIVE">Activo</option>
                  <option value="COMPLETED">Completado</option>
                  <option value="PAUSED">Pausado</option>
                  <option value="CANCELLED">Cancelado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fecha Desde
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3 mt-4">
              <button
                onClick={applyFilters}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Aplicar Filtros
              </button>
              <button
                onClick={resetFilters}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Limpiar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {stats.totalResults}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Planes</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
              {stats.byType.plans}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Plantillas</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
              {stats.byType.templates}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Recordatorios</p>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
              {stats.byType.reminders}
            </p>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-300">
                  Error en la búsqueda
                </p>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
              </div>
            </div>
          </div>
        ) : searchQuery.trim().length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              Ingresa un término de búsqueda para comenzar
            </p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              No se encontraron resultados para "{searchQuery}"
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {results.map((result) => (
              <div
                key={`${result.type}-${result.id}`}
                onClick={() => router.push(getResultUrl(result))}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group"
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 mt-1">
                    {getResultIcon(result.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            {getResultTypeLabel(result.type)}
                          </span>
                          {result.status && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                result.status === 'ACTIVE' || result.status === 'active'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {result.status}
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {result.title}
                        </h3>
                        {result.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                            {result.description}
                          </p>
                        )}
                        <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                          {result.patientName && (
                            <div className="flex items-center space-x-1">
                              <User className="w-3 h-3" />
                              <span>{result.patientName}</span>
                            </div>
                          )}
                          {result.planType && (
                            <div className="flex items-center space-x-1">
                              <TrendingUp className="w-3 h-3" />
                              <span>{result.planType}</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(result.updatedAt)}</span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-shrink-0 ml-4" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
