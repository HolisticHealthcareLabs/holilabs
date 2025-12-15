'use client';

/**
 * Prevention Analytics Dashboard
 *
 * Displays comprehensive analytics and insights about prevention plans
 */

import { useState, useEffect, useRef } from 'react';
import {
  BarChart3,
  TrendingUp,
  Activity,
  Target,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Download,
  Filter,
  FileText,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface AnalyticsData {
  overview: {
    totalPlans: number;
    activePlans: number;
    completedPlans: number;
    deactivatedPlans: number;
    completionRate: number;
    totalGoals: number;
    completedGoals: number;
    goalCompletionRate: number;
    averageDaysToComplete: number;
  };
  plansByStatus: Record<string, number>;
  plansByType: Record<string, number>;
  goalsByCategory: Array<{
    category: string;
    total: number;
    completed: number;
    completionRate: number;
  }>;
  timeline: Array<{
    month: string;
    count: number;
  }>;
  topInterventions: Array<{
    category: string;
    count: number;
  }>;
  completionReasons: Record<string, number>;
  deactivationReasons: Record<string, number>;
  recentActivity: {
    newPlans: number;
    completions: number;
    period: string;
  };
}

export default function PreventionAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    start: '',
    end: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    };

    checkDarkMode();

    // Watch for changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      let url = '/api/prevention/analytics';
      const params = new URLSearchParams();

      if (dateRange.start) params.append('startDate', dateRange.start);
      if (dateRange.end) params.append('endDate', dateRange.end);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setAnalytics(result.data);
      } else {
        setError(result.error || 'Failed to load analytics');
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const applyDateFilter = () => {
    fetchAnalytics();
  };

  const clearDateFilter = () => {
    setDateRange({ start: '', end: '' });
    setTimeout(() => fetchAnalytics(), 0);
  };

  const exportToCSV = () => {
    if (!analytics) return;

    try {
      setIsExporting(true);

      // Create CSV content
      let csvContent = 'data:text/csv;charset=utf-8,';

      // Header
      csvContent += 'Analíticas de Prevención\n';
      csvContent += `Generado: ${new Date().toLocaleDateString('es-MX')}\n`;
      if (dateRange.start || dateRange.end) {
        csvContent += `Rango: ${dateRange.start || 'Inicio'} - ${dateRange.end || 'Hoy'}\n`;
      }
      csvContent += '\n';

      // Overview metrics
      csvContent += 'RESUMEN GENERAL\n';
      csvContent += 'Métrica,Valor\n';
      csvContent += `Total de Planes,${analytics.overview.totalPlans}\n`;
      csvContent += `Planes Activos,${analytics.overview.activePlans}\n`;
      csvContent += `Planes Completados,${analytics.overview.completedPlans}\n`;
      csvContent += `Planes Desactivados,${analytics.overview.deactivatedPlans}\n`;
      csvContent += `Tasa de Completitud,${analytics.overview.completionRate}%\n`;
      csvContent += `Total de Metas,${analytics.overview.totalGoals}\n`;
      csvContent += `Metas Completadas,${analytics.overview.completedGoals}\n`;
      csvContent += `Tasa de Completitud de Metas,${analytics.overview.goalCompletionRate}%\n`;
      csvContent += `Promedio de Días para Completar,${analytics.overview.averageDaysToComplete}\n`;
      csvContent += '\n';

      // Plans by Status
      csvContent += 'PLANES POR ESTADO\n';
      csvContent += 'Estado,Cantidad\n';
      Object.entries(analytics.plansByStatus).forEach(([status, count]) => {
        const labelMap: Record<string, string> = {
          ACTIVE: 'Activos',
          COMPLETED: 'Completados',
          DEACTIVATED: 'Desactivados',
        };
        csvContent += `${labelMap[status]},${count}\n`;
      });
      csvContent += '\n';

      // Plans by Type
      csvContent += 'PLANES POR TIPO\n';
      csvContent += 'Tipo,Cantidad\n';
      Object.entries(analytics.plansByType).forEach(([type, count]) => {
        csvContent += `${type},${count}\n`;
      });
      csvContent += '\n';

      // Goal Completion by Category
      csvContent += 'METAS POR CATEGORÍA\n';
      csvContent += 'Categoría,Total,Completadas,Tasa de Completitud\n';
      analytics.goalsByCategory.forEach((cat) => {
        csvContent += `${formatCategoryName(cat.category)},${cat.total},${cat.completed},${Math.round(cat.completionRate)}%\n`;
      });
      csvContent += '\n';

      // Top Interventions
      csvContent += 'INTERVENCIONES MÁS COMUNES\n';
      csvContent += 'Posición,Categoría,Cantidad\n';
      analytics.topInterventions.forEach((intervention, idx) => {
        csvContent += `${idx + 1},${formatCategoryName(intervention.category)},${intervention.count}\n`;
      });
      csvContent += '\n';

      // Timeline
      if (analytics.timeline.length > 0) {
        csvContent += 'TENDENCIA DE CREACIÓN DE PLANES\n';
        csvContent += 'Mes,Cantidad\n';
        analytics.timeline.forEach((point) => {
          csvContent += `${point.month},${point.count}\n`;
        });
        csvContent += '\n';
      }

      // Completion Reasons
      if (Object.keys(analytics.completionReasons).length > 0) {
        csvContent += 'MOTIVOS DE COMPLETITUD\n';
        csvContent += 'Motivo,Cantidad\n';
        Object.entries(analytics.completionReasons).forEach(([reason, count]) => {
          csvContent += `${formatReasonLabel(reason)},${count}\n`;
        });
        csvContent += '\n';
      }

      // Deactivation Reasons
      if (Object.keys(analytics.deactivationReasons).length > 0) {
        csvContent += 'MOTIVOS DE DESACTIVACIÓN\n';
        csvContent += 'Motivo,Cantidad\n';
        Object.entries(analytics.deactivationReasons).forEach(([reason, count]) => {
          csvContent += `${formatReasonLabel(reason)},${count}\n`;
        });
      }

      // Create download link
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `analytics-prevention-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert('CSV exportado exitosamente');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Error al exportar CSV. Por favor intente de nuevo.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = async () => {
    if (!dashboardRef.current || !analytics) return;

    try {
      setIsExporting(true);

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Add title
      pdf.setFontSize(20);
      pdf.setTextColor(59, 130, 246); // Blue
      pdf.text('Analíticas de Prevención', 15, 20);

      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Generado: ${new Date().toLocaleDateString('es-MX')}`, 15, 27);

      if (dateRange.start || dateRange.end) {
        const rangeText = `Rango: ${dateRange.start || 'Inicio'} - ${dateRange.end || 'Hoy'}`;
        pdf.text(rangeText, 15, 32);
      }

      // Overview metrics
      let yPos = 40;
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Resumen General', 15, yPos);

      yPos += 8;
      pdf.setFontSize(10);
      pdf.text(`Total de Planes: ${analytics.overview.totalPlans}`, 20, yPos);
      yPos += 6;
      pdf.text(`Planes Activos: ${analytics.overview.activePlans}`, 20, yPos);
      yPos += 6;
      pdf.text(`Tasa de Completitud: ${analytics.overview.completionRate}%`, 20, yPos);
      yPos += 6;
      pdf.text(`Promedio de Días: ${analytics.overview.averageDaysToComplete}`, 20, yPos);
      yPos += 6;
      pdf.text(`Total de Metas: ${analytics.overview.totalGoals}`, 20, yPos);
      yPos += 6;
      pdf.text(`Metas Completadas: ${analytics.overview.completedGoals}`, 20, yPos);

      // Plans by Status
      yPos += 12;
      pdf.setFontSize(14);
      pdf.text('Planes por Estado', 15, yPos);
      yPos += 8;
      pdf.setFontSize(10);

      Object.entries(analytics.plansByStatus).forEach(([status, count]) => {
        const labelMap: Record<string, string> = {
          ACTIVE: 'Activos',
          COMPLETED: 'Completados',
          DEACTIVATED: 'Desactivados',
        };
        pdf.text(`${labelMap[status]}: ${count}`, 20, yPos);
        yPos += 6;
      });

      // Plans by Type
      yPos += 6;
      pdf.setFontSize(14);
      pdf.text('Planes por Tipo', 15, yPos);
      yPos += 8;
      pdf.setFontSize(10);

      Object.entries(analytics.plansByType).forEach(([type, count]) => {
        pdf.text(`${type}: ${count}`, 20, yPos);
        yPos += 6;
      });

      // Top Interventions
      if (yPos > 240) {
        pdf.addPage();
        yPos = 20;
      }

      yPos += 6;
      pdf.setFontSize(14);
      pdf.text('Intervenciones Más Comunes', 15, yPos);
      yPos += 8;
      pdf.setFontSize(10);

      analytics.topInterventions.slice(0, 6).forEach((intervention, idx) => {
        pdf.text(`${idx + 1}. ${formatCategoryName(intervention.category)}: ${intervention.count}`, 20, yPos);
        yPos += 6;
      });

      // Save PDF
      const fileName = `analytics-prevention-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      alert('PDF exportado exitosamente');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Error al exportar PDF. Por favor intente de nuevo.');
    } finally {
      setIsExporting(false);
    }
  };

  const formatCategoryName = (category: string) => {
    const names: Record<string, string> = {
      medication: 'Medicación',
      screening: 'Tamizaje',
      monitoring: 'Monitoreo',
      lifestyle: 'Estilo de Vida',
      education: 'Educación',
      referral: 'Referencia',
      immunization: 'Inmunización',
      counseling: 'Consejería',
    };
    return names[category] || category;
  };

  const formatReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      all_goals_met: 'Todas las metas cumplidas',
      patient_declined: 'Paciente declinó',
      transitioned_protocol: 'Transición a otro protocolo',
      no_longer_indicated: 'Ya no indicado',
      patient_transferred: 'Paciente transferido',
      duplicate_protocol: 'Protocolo duplicado',
      patient_declined_followup: 'Declinó seguimiento',
      superseded: 'Reemplazado',
      bulk_archive: 'Archivo en bloque',
    };
    return labels[reason] || reason;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando analíticas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-200 mb-2">Error</h3>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              <button
                onClick={fetchAnalytics}
                className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BarChart3 className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Analíticas de Prevención
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Métricas y tendencias de protocolos de prevención • Holi Labs
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
              >
                <Filter className="w-4 h-4" />
                <span>Filtros</span>
              </button>
              <button
                onClick={exportToCSV}
                disabled={isExporting || !analytics}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Exportando...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Exportar CSV</span>
                  </>
                )}
              </button>
              <button
                onClick={exportToPDF}
                disabled={isExporting || !analytics}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Exportando...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Exportar PDF</span>
                  </>
                )}
              </button>
              <button
                onClick={fetchAnalytics}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
              >
                <Activity className="w-4 h-4" />
                <span>Actualizar</span>
              </button>
            </div>
          </div>

          {/* Date Filter */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-end space-x-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Fecha Desde
                  </label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Fecha Hasta
                  </label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={applyDateFilter}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Aplicar
                </button>
                <button
                  onClick={clearDateFilter}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
                >
                  Limpiar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-6" ref={dashboardRef}>
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Total Plans */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Total</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {analytics.overview.totalPlans}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Planes de Prevención</div>
          </div>

          {/* Active Plans */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Activos</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {analytics.overview.activePlans}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {analytics.overview.totalPlans > 0
                ? `${Math.round((analytics.overview.activePlans / analytics.overview.totalPlans) * 100)}% del total`
                : 'Sin datos'}
            </div>
          </div>

          {/* Completion Rate */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Target className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Tasa</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {analytics.overview.completionRate}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Tasa de Completitud</div>
          </div>

          {/* Average Days */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Promedio</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {analytics.overview.averageDaysToComplete}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Días para Completar</div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Actividad Reciente
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {analytics.recentActivity.period}
              </p>
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {analytics.recentActivity.newPlans}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Nuevos Planes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {analytics.recentActivity.completions}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Completados</div>
              </div>
            </div>
          </div>
        </div>

        {/* Data Insights */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <span>Insights y Recomendaciones</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Completion Rate Insight */}
            {analytics.overview.completionRate >= 70 ? (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-green-900 dark:text-green-200 text-sm mb-1">
                      Excelente Tasa de Completitud
                    </h4>
                    <p className="text-xs text-green-700 dark:text-green-300">
                      {analytics.overview.completionRate}% de los planes se completan exitosamente. ¡Continúa con las mejores prácticas actuales!
                    </p>
                  </div>
                </div>
              </div>
            ) : analytics.overview.completionRate >= 50 ? (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-yellow-900 dark:text-yellow-200 text-sm mb-1">
                      Oportunidad de Mejora
                    </h4>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300">
                      Tasa de completitud: {analytics.overview.completionRate}%. Considera revisar barreras para la adherencia.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-900 dark:text-red-200 text-sm mb-1">
                      Requiere Atención
                    </h4>
                    <p className="text-xs text-red-700 dark:text-red-300">
                      Tasa de completitud baja ({analytics.overview.completionRate}%). Evalúa factores que impiden la finalización.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Active Plans Insight */}
            {analytics.overview.activePlans > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 dark:text-blue-200 text-sm mb-1">
                      Planes en Curso
                    </h4>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      {analytics.overview.activePlans} planes activos requieren seguimiento. Promedio de {analytics.overview.averageDaysToComplete} días para completar.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Top Intervention Insight */}
            {analytics.topInterventions.length > 0 && (
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Target className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-purple-900 dark:text-purple-200 text-sm mb-1">
                      Intervención Principal
                    </h4>
                    <p className="text-xs text-purple-700 dark:text-purple-300">
                      {formatCategoryName(analytics.topInterventions[0].category)} es la intervención más común ({analytics.topInterventions[0].count} metas).
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Goal Completion Insight */}
            {analytics.overview.goalCompletionRate > 0 && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-emerald-900 dark:text-emerald-200 text-sm mb-1">
                      Progreso de Metas
                    </h4>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                      {analytics.overview.completedGoals} de {analytics.overview.totalGoals} metas completadas ({analytics.overview.goalCompletionRate}%).
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Activity Insight */}
            {analytics.recentActivity.newPlans > 0 && (
              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-indigo-900 dark:text-indigo-200 text-sm mb-1">
                      Tendencia Positiva
                    </h4>
                    <p className="text-xs text-indigo-700 dark:text-indigo-300">
                      {analytics.recentActivity.newPlans} nuevos planes en los últimos 7 días. Sistema activo y en uso.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Deactivation Warning */}
            {analytics.overview.deactivatedPlans > analytics.overview.completedPlans && (
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-orange-900 dark:text-orange-200 text-sm mb-1">
                      Alerta de Desactivaciones
                    </h4>
                    <p className="text-xs text-orange-700 dark:text-orange-300">
                      Más planes desactivados que completados. Investiga las razones para mejorar retención.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Plans by Status */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>Planes por Estado</span>
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={Object.entries(analytics.plansByStatus).map(([status, count]) => {
                    const labelMap: Record<string, string> = {
                      ACTIVE: 'Activos',
                      COMPLETED: 'Completados',
                      DEACTIVATED: 'Desactivados',
                    };
                    return {
                      name: labelMap[status] || status,
                      value: count,
                      status,
                    };
                  })}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {Object.entries(analytics.plansByStatus).map(([status], index) => {
                    const colorMap: Record<string, string> = {
                      ACTIVE: '#10b981',
                      COMPLETED: '#3b82f6',
                      DEACTIVATED: '#6b7280',
                    };
                    return <Cell key={`cell-${index}`} fill={colorMap[status] || '#6b7280'} />;
                  })}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                    border: '1px solid',
                    borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                    borderRadius: '0.5rem',
                    color: isDarkMode ? '#ffffff' : '#000000',
                  }}
                />
                <Legend
                  wrapperStyle={{
                    color: isDarkMode ? '#9ca3af' : '#4b5563',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Plans by Type */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
              <Target className="w-5 h-5" />
              <span>Planes por Tipo</span>
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={Object.entries(analytics.plansByType).map(([type, count]) => ({
                    name: type,
                    value: count,
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {Object.entries(analytics.plansByType).map(([type], index) => {
                    const colorMap: Record<string, string> = {
                      CARDIOVASCULAR: '#ef4444',
                      DIABETES: '#a855f7',
                      COMPREHENSIVE: '#3b82f6',
                    };
                    return <Cell key={`cell-${index}`} fill={colorMap[type] || '#6b7280'} />;
                  })}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                    border: '1px solid',
                    borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                    borderRadius: '0.5rem',
                    color: isDarkMode ? '#ffffff' : '#000000',
                  }}
                />
                <Legend
                  wrapperStyle={{
                    color: isDarkMode ? '#9ca3af' : '#4b5563',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Goal Completion by Category */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>Metas por Categoría</span>
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={analytics.goalsByCategory
                  .slice(0, 6)
                  .map((cat) => ({
                    category: formatCategoryName(cat.category),
                    completionRate: Math.round(cat.completionRate),
                    completed: cat.completed,
                    total: cat.total,
                  }))}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDarkMode ? '#374151' : '#e5e7eb'}
                />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                  tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280' }}
                />
                <YAxis
                  type="category"
                  dataKey="category"
                  stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                  tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                    border: '1px solid',
                    borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                    borderRadius: '0.5rem',
                    color: isDarkMode ? '#ffffff' : '#000000',
                  }}
                  formatter={(value, name, props) => [
                    `${value}% (${props.payload.completed}/${props.payload.total})`,
                    'Completitud',
                  ]}
                />
                <Bar dataKey="completionRate" fill="#10b981" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top Interventions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Intervenciones Más Comunes</span>
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={analytics.topInterventions
                  .slice(0, 6)
                  .map((intervention) => ({
                    category: formatCategoryName(intervention.category),
                    count: intervention.count,
                  }))}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDarkMode ? '#374151' : '#e5e7eb'}
                />
                <XAxis
                  type="number"
                  stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                  tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280' }}
                />
                <YAxis
                  type="category"
                  dataKey="category"
                  stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                  tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                    border: '1px solid',
                    borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                    borderRadius: '0.5rem',
                    color: isDarkMode ? '#ffffff' : '#000000',
                  }}
                  formatter={(value) => [`${value} metas`, 'Total']}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Timeline Chart */}
        {analytics.timeline.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Tendencia de Creación de Planes</span>
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart
                data={analytics.timeline.map((point) => ({
                  month: point.month,
                  count: point.count,
                  monthLabel: `${point.month.substring(5)}/${point.month.substring(2, 4)}`,
                }))}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDarkMode ? '#374151' : '#e5e7eb'}
                />
                <XAxis
                  dataKey="monthLabel"
                  stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                  tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280' }}
                />
                <YAxis
                  stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                  tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                    border: '1px solid',
                    borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                    borderRadius: '0.5rem',
                    color: isDarkMode ? '#ffffff' : '#000000',
                  }}
                  labelFormatter={(value) => `Mes: ${value}`}
                  formatter={(value) => [`${value} planes`, 'Creados']}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCount)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Completion & Deactivation Reasons */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Completion Reasons */}
          {Object.keys(analytics.completionReasons).length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Motivos de Completitud
              </h3>
              <div className="space-y-3">
                {Object.entries(analytics.completionReasons).map(([reason, count]) => (
                  <div key={reason} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {formatReasonLabel(reason)}
                    </span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deactivation Reasons */}
          {Object.keys(analytics.deactivationReasons).length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Motivos de Desactivación
              </h3>
              <div className="space-y-3">
                {Object.entries(analytics.deactivationReasons).map(([reason, count]) => (
                  <div key={reason} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {formatReasonLabel(reason)}
                    </span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
