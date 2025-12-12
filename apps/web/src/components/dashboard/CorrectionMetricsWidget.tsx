'use client';

import { useState, useEffect } from 'react';

interface CorrectionMetrics {
  totalCorrections: number;
  avgConfidence: number;
  avgEditDistance: number;
  avgErrorRate: number;
  improvementPercentage: number;
  trendDirection: 'improving' | 'declining' | 'stable';
  customVocabularyTerms?: number;
  mostCommonErrors: Array<{
    originalText: string;
    correctedText: string;
    frequency: number;
  }>;
}

interface CorrectionMetricsWidgetProps {
  className?: string;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
}

export default function CorrectionMetricsWidget({
  className = '',
  dateRange,
}: CorrectionMetricsWidgetProps) {
  const [metrics, setMetrics] = useState<CorrectionMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default to last 30 days if no range provided
  const defaultEndDate = new Date();
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);

  const startDate = dateRange?.startDate || defaultStartDate;
  const endDate = dateRange?.endDate || defaultEndDate;

  useEffect(() => {
    async function fetchMetrics() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          includeVocabulary: 'true',
        });

        const response = await fetch(`/api/ai/training/metrics?${params}`);

        if (!response.ok) {
          throw new Error('Failed to fetch metrics');
        }

        const result = await response.json();

        if (result.success && result.data) {
          setMetrics({
            totalCorrections: result.data.analytics.totalCorrections,
            avgConfidence: result.data.analytics.avgConfidence,
            avgEditDistance: result.data.analytics.avgEditDistance,
            avgErrorRate: result.data.derivedMetrics.avgErrorRate,
            improvementPercentage: result.data.derivedMetrics.improvementPercentage,
            trendDirection: result.data.derivedMetrics.trendDirection,
            customVocabularyTerms: result.data.customVocabulary?.count,
            mostCommonErrors: result.data.analytics.mostCommonErrors.slice(0, 3),
          });
        }
      } catch (err) {
        console.error('Error fetching correction metrics:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, [startDate, endDate]);

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'improving':
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      case 'declining':
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
          </svg>
        );
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-lg border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className={`bg-white rounded-xl shadow-lg border border-gray-200 p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm">No hay métricas de corrección disponibles</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Métricas RLHF</h3>
            <p className="text-xs text-gray-500">Entrenamiento de IA</p>
          </div>
        </div>

        {/* Trend Indicator */}
        <div className="flex items-center gap-2">
          {getTrendIcon(metrics.trendDirection)}
          <span className={`text-sm font-semibold ${
            metrics.trendDirection === 'improving' ? 'text-green-600' :
            metrics.trendDirection === 'declining' ? 'text-red-600' :
            'text-gray-600'
          }`}>
            {metrics.improvementPercentage > 0 ? '+' : ''}
            {metrics.improvementPercentage.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-2xl font-bold text-emerald-600">{metrics.totalCorrections}</p>
          <p className="text-xs text-gray-600 mt-1">Correcciones totales</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-2xl font-bold text-blue-600">
            {(metrics.avgConfidence * 100).toFixed(1)}%
          </p>
          <p className="text-xs text-gray-600 mt-1">Confianza promedio</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-2xl font-bold text-purple-600">
            {metrics.avgEditDistance.toFixed(1)}
          </p>
          <p className="text-xs text-gray-600 mt-1">Distancia de edición</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-2xl font-bold text-orange-600">
            {(metrics.avgErrorRate * 100).toFixed(2)}%
          </p>
          <p className="text-xs text-gray-600 mt-1">Tasa de error</p>
        </div>
      </div>

      {/* Custom Vocabulary */}
      {metrics.customVocabularyTerms !== undefined && metrics.customVocabularyTerms > 0 && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 mb-4 border border-indigo-200">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="text-sm font-semibold text-indigo-900">Vocabulario Médico</span>
          </div>
          <p className="text-2xl font-bold text-indigo-600">{metrics.customVocabularyTerms}</p>
          <p className="text-xs text-indigo-700 mt-1">Términos médicos extraídos</p>
        </div>
      )}

      {/* Top Errors */}
      {metrics.mostCommonErrors.length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Errores más comunes</h4>
          <div className="space-y-2">
            {metrics.mostCommonErrors.map((error, idx) => (
              <div key={idx} className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-yellow-500 text-white rounded-full text-xs font-bold flex items-center justify-center">
                    {error.frequency}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-600 line-through truncate">
                      {error.originalText}
                    </p>
                    <p className="text-xs text-gray-900 font-medium truncate">
                      → {error.correctedText}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RLHF Loop Status */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          <span className="text-xs text-gray-600 font-medium">RLHF Loop activo</span>
          <span className="text-xs text-gray-500">• Última 30 días</span>
        </div>
      </div>
    </div>
  );
}
