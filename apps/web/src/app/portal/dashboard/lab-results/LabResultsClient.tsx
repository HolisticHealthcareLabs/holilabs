'use client';

/**
 * Lab Results Client Component
 *
 * Interactive client-side component for lab results visualization
 * Includes charts, filtering, and trend analysis
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface LabResult {
  id: string;
  testName: string;
  testCode: string;
  value: number;
  unit: string;
  referenceMin: number;
  referenceMax: number;
  date: string;
  status: 'normal' | 'high' | 'low' | 'critical';
  doctorNotes?: string;
  category: string;
}

interface LabResultsClientProps {
  initialResults: LabResult[];
  patientName: string;
}

export default function LabResultsClient({
  initialResults,
  patientName,
}: LabResultsClientProps) {
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Group results by test type for trend analysis
  const groupedResults = useMemo(() => {
    const groups: Record<string, LabResult[]> = {};
    initialResults.forEach((result) => {
      if (!groups[result.testName]) {
        groups[result.testName] = [];
      }
      groups[result.testName].push(result);
    });

    // Sort each group by date
    Object.keys(groups).forEach((testName) => {
      groups[testName].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    });

    return groups;
  }, [initialResults]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(initialResults.map((r) => r.category));
    return ['all', ...Array.from(cats)];
  }, [initialResults]);

  // Filter results
  const filteredResults = useMemo(() => {
    return initialResults.filter((result) => {
      const matchesCategory =
        filterCategory === 'all' || result.category === filterCategory;
      const matchesStatus =
        filterStatus === 'all' || result.status === filterStatus;
      return matchesCategory && matchesStatus;
    });
  }, [initialResults, filterCategory, filterStatus]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'low':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'normal':
        return '✓';
      case 'high':
        return '↑';
      case 'low':
        return '↓';
      case 'critical':
        return '⚠';
      default:
        return '●';
    }
  };

  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      Hematología: '🩸',
      Química: '⚗️',
      Hormonas: '🧬',
      Inmunología: '🛡️',
      Microbiología: '🦠',
      Metabolismo: '⚡',
      Coagulación: '💉',
    };
    return icons[category] || '🧪';
  };

  if (initialResults.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🧪</div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No hay resultados de laboratorio
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          Tus resultados aparecerán aquí cuando tu médico los cargue al sistema.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Category Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Categoría
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'Todas las categorías' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Estado
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">Todos los estados</option>
              <option value="normal">Normal</option>
              <option value="high">Alto</option>
              <option value="low">Bajo</option>
              <option value="critical">Crítico</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatePresence>
          {filteredResults.map((result, index) => (
            <motion.div
              key={result.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{getCategoryIcon(result.category)}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                      {result.testName}
                    </h3>
                    {/* Meta info - low contrast intentional */}
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {result.testCode} • {format(new Date(result.date), "d 'de' MMMM, yyyy", { locale: es })}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                    result.status
                  )}`}
                >
                  {getStatusIcon(result.status)} {result.status.toUpperCase()}
                </span>
              </div>

              {/* Value & Range */}
              <div className="mb-4">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    {result.value}
                  </span>
                  {/* Decorative - low contrast intentional for unit label */}
                  <span className="text-lg text-gray-600 dark:text-gray-400">
                    {result.unit}
                  </span>
                </div>

                {/* Reference Range Bar */}
                <div className="relative pt-2">
                  {/* Decorative - low contrast intentional for reference range text */}
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>Rango: {result.referenceMin} - {result.referenceMax} {result.unit}</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        result.status === 'normal'
                          ? 'bg-green-500'
                          : result.status === 'critical'
                          ? 'bg-red-500'
                          : 'bg-orange-500'
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          ((result.value - result.referenceMin) /
                            (result.referenceMax - result.referenceMin)) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Doctor's Notes */}
              {result.doctorNotes && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 mt-0.5">💬</span>
                    <div>
                      <p className="text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1">
                        Comentario del médico:
                      </p>
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        {result.doctorNotes}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Trend Button */}
              {groupedResults[result.testName] && groupedResults[result.testName].length > 1 && (
                <button
                  onClick={() => setSelectedTest(result.testName)}
                  className="mt-4 w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium text-sm"
                >
                  📈 Ver Tendencia ({groupedResults[result.testName].length} resultados)
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Trend Modal */}
      <AnimatePresence>
        {selectedTest && groupedResults[selectedTest] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedTest(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Tendencia: {selectedTest}
                  </h2>
                  <button
                    onClick={() => setSelectedTest(null)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Simple Trend Visualization (line chart placeholder) */}
                <div className="space-y-4">
                  {groupedResults[selectedTest].map((result, idx) => (
                    <div
                      key={result.id}
                      className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                    >
                      {/* Decorative - low contrast intentional for date and unit labels in trend visualization */}
                      <div className="flex-shrink-0 w-32 text-sm text-gray-600 dark:text-gray-400">
                        {format(new Date(result.date), "dd MMM yyyy", { locale: es })}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-8 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                result.status === 'normal'
                                  ? 'bg-green-500'
                                  : result.status === 'critical'
                                  ? 'bg-red-500'
                                  : 'bg-orange-500'
                              }`}
                              style={{
                                width: `${Math.min(
                                  100,
                                  ((result.value - result.referenceMin) /
                                    (result.referenceMax - result.referenceMin)) *
                                    100
                                )}%`,
                              }}
                            />
                          </div>
                          <div className="flex-shrink-0 w-24 text-right">
                            <span className="text-lg font-bold text-gray-900 dark:text-white">
                              {result.value}
                            </span>
                            <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                              {result.unit}
                            </span>
                          </div>
                          <span
                            className={`flex-shrink-0 px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                              result.status
                            )}`}
                          >
                            {getStatusIcon(result.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
