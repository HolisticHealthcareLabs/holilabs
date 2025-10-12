'use client';

/**
 * Health Metrics Dashboard
 * Track vitals with beautiful charts and data visualization
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ChevronLeftIcon,
  HeartIcon,
  ScaleIcon,
  BeakerIcon,
  FireIcon,
  ArrowTrendingUpIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

interface HealthMetric {
  id: string;
  metricType: 'WEIGHT' | 'BLOOD_PRESSURE' | 'GLUCOSE' | 'TEMPERATURE' | 'HEART_RATE' | 'OXYGEN_SATURATION' | 'OTHER';
  value: number;
  unit: string;
  notes: string | null;
  recordedAt: string;
}

interface MetricsResponse {
  success: boolean;
  data?: {
    metrics: HealthMetric[];
    metricsByType: Record<string, HealthMetric[]>;
    latestMetrics: Record<string, HealthMetric>;
    summary: {
      total: number;
      types: number;
    };
  };
  error?: string;
}

const metricConfig = {
  WEIGHT: {
    label: 'Peso',
    icon: ScaleIcon,
    color: 'blue',
    gradient: 'from-blue-500 to-cyan-500',
    unit: 'kg',
  },
  BLOOD_PRESSURE: {
    label: 'Presión Arterial',
    icon: HeartIcon,
    color: 'red',
    gradient: 'from-red-500 to-pink-500',
    unit: 'mmHg',
  },
  GLUCOSE: {
    label: 'Glucosa',
    icon: BeakerIcon,
    color: 'purple',
    gradient: 'from-purple-500 to-indigo-500',
    unit: 'mg/dL',
  },
  TEMPERATURE: {
    label: 'Temperatura',
    icon: FireIcon,
    color: 'orange',
    gradient: 'from-orange-500 to-red-500',
    unit: '°C',
  },
  HEART_RATE: {
    label: 'Frecuencia Cardíaca',
    icon: HeartIcon,
    color: 'pink',
    gradient: 'from-pink-500 to-rose-500',
    unit: 'bpm',
  },
  OXYGEN_SATURATION: {
    label: 'Saturación de Oxígeno',
    icon: ArrowTrendingUpIcon,
    color: 'green',
    gradient: 'from-green-500 to-emerald-500',
    unit: '%',
  },
  OTHER: {
    label: 'Otro',
    icon: BeakerIcon,
    color: 'gray',
    gradient: 'from-gray-500 to-slate-500',
    unit: '',
  },
};

// Simple line chart component
const MiniChart = ({ data, color }: { data: HealthMetric[]; color: string }) => {
  if (data.length < 2) return null;

  const values = data.slice(0, 7).reverse().map(m => m.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * 100;
    const y = 100 - ((v - min) / range) * 80;
    return `${x},${y + 10}`;
  }).join(' ');

  return (
    <svg className="w-full h-16" viewBox="0 0 100 100" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={`rgb(${color === 'blue' ? '59, 130, 246' : color === 'red' ? '239, 68, 68' : color === 'purple' ? '168, 85, 247' : color === 'orange' ? '249, 115, 22' : color === 'pink' ? '236, 72, 153' : '34, 197, 94'})`}
        strokeWidth="3"
        className="drop-shadow-lg"
      />
      {values.map((v, i) => {
        const x = (i / (values.length - 1)) * 100;
        const y = 100 - ((v - min) / range) * 80 + 10;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="2"
            fill="white"
            stroke={`rgb(${color === 'blue' ? '59, 130, 246' : color === 'red' ? '239, 68, 68' : color === 'purple' ? '168, 85, 247' : color === 'orange' ? '249, 115, 22' : color === 'pink' ? '236, 72, 153' : '34, 197, 94'})`}
            strokeWidth="2"
          />
        );
      })}
    </svg>
  );
};

export default function HealthMetricsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metricsByType, setMetricsByType] = useState<Record<string, HealthMetric[]>>({});
  const [latestMetrics, setLatestMetrics] = useState<Record<string, HealthMetric>>({});
  const [summary, setSummary] = useState({ total: 0, types: 0 });
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMetricType, setSelectedMetricType] = useState<string>('WEIGHT');
  const [metricValue, setMetricValue] = useState('');
  const [metricNotes, setMetricNotes] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/portal/health-metrics');
      const data: MetricsResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar métricas');
      }

      if (data.success && data.data) {
        setMetricsByType(data.data.metricsByType);
        setLatestMetrics(data.data.latestMetrics);
        setSummary(data.data.summary);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error fetching metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMetric = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!metricValue) {
      alert('Por favor ingresa un valor');
      return;
    }

    try {
      setAdding(true);

      const config = metricConfig[selectedMetricType as keyof typeof metricConfig];

      const response = await fetch('/api/portal/health-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metricType: selectedMetricType,
          value: parseFloat(metricValue),
          unit: config.unit,
          notes: metricNotes || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al registrar métrica');
      }

      // Refresh data
      await fetchMetrics();

      // Reset form
      setShowAddModal(false);
      setMetricValue('');
      setMetricNotes('');
      alert('Métrica registrada exitosamente');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al registrar métrica');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/portal/dashboard')}
            className="flex items-center text-gray-600 hover:text-blue-600 mb-4 transition-colors"
          >
            <ChevronLeftIcon className="h-5 w-5 mr-1" />
            Volver al Dashboard
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                =Ê Mis Métricas de Salud
              </h1>
              <p className="text-gray-600">
                {summary.total} registro{summary.total !== 1 ? 's' : ''} · {summary.types} tipo{summary.types !== 1 ? 's' : ''} de métrica{summary.types !== 1 ? 's' : ''}
              </p>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              <PlusIcon className="h-5 w-5" />
              Registrar Métrica
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center mb-6">
            <p className="text-red-800 mb-4">{error}</p>
            <button
              onClick={fetchMetrics}
              className="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Metric Cards */}
        {Object.keys(metricsByType).length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <HeartIcon className="h-10 w-10 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No hay métricas registradas
            </h3>
            <p className="text-gray-600 mb-6">
              Comienza a registrar tus métricas de salud para ver tus progresos
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              Registrar Primera Métrica
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(metricsByType).map(([type, metrics]) => {
              const config = metricConfig[type as keyof typeof metricConfig];
              const latest = latestMetrics[type];
              const Icon = config.icon;

              return (
                <div
                  key={type}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => router.push(`/portal/dashboard/health/${type.toLowerCase()}`)}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 bg-gradient-to-br ${config.gradient} rounded-lg flex items-center justify-center`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-sm text-gray-500">
                      {metrics.length} registro{metrics.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Metric Name */}
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {config.label}
                  </h3>

                  {/* Latest Value */}
                  {latest && (
                    <div className="mb-4">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-gray-900">
                          {latest.value}
                        </span>
                        <span className="text-gray-600">{latest.unit}</span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {format(new Date(latest.recordedAt), "d MMM, HH:mm", {
                          locale: es,
                        })}
                      </p>
                    </div>
                  )}

                  {/* Mini Chart */}
                  <div className="mt-4">
                    <MiniChart data={metrics} color={config.color} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Metric Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  Registrar Métrica de Salud
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  
                </button>
              </div>

              <form onSubmit={handleAddMetric} className="space-y-4">
                {/* Metric Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Métrica
                  </label>
                  <select
                    value={selectedMetricType}
                    onChange={(e) => setSelectedMetricType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {Object.entries(metricConfig).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Value */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor ({metricConfig[selectedMetricType as keyof typeof metricConfig].unit})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={metricValue}
                    onChange={(e) => setMetricValue(e.target.value)}
                    placeholder="Ej: 70.5"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notas (opcional)
                  </label>
                  <textarea
                    value={metricNotes}
                    onChange={(e) => setMetricNotes(e.target.value)}
                    placeholder="Información adicional..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    disabled={adding}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={adding}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {adding ? 'Registrando...' : 'Registrar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
