"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AnalyticsPage;
const react_1 = require("react");
const framer_motion_1 = require("framer-motion");
const link_1 = __importDefault(require("next/link"));
function AnalyticsPage() {
    const [analytics, setAnalytics] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [timeRange, setTimeRange] = (0, react_1.useState)('30d');
    (0, react_1.useEffect)(() => {
        fetchAnalytics();
    }, [timeRange]);
    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/analytics/dashboard?range=${timeRange}`);
            if (!response.ok)
                throw new Error('Failed to fetch analytics');
            const data = await response.json();
            setAnalytics(data);
        }
        catch (error) {
            console.error('Error fetching analytics:', error);
        }
        finally {
            setLoading(false);
        }
    };
    if (loading) {
        return (<div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>);
    }
    if (!analytics) {
        return (<div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No hay datos disponibles</p>
        </div>
      </div>);
    }
    const getGrowthColor = (growth) => {
        if (growth > 0)
            return 'text-green-600';
        if (growth < 0)
            return 'text-red-600';
        return 'text-gray-600';
    };
    const getGrowthIcon = (growth) => {
        if (growth > 0)
            return '↑';
        if (growth < 0)
            return '↓';
        return '→';
    };
    return (<div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analíticas</h1>
          <p className="text-gray-500 mt-1">
            Vista general de tu práctica médica
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1">
          {[
            { value: '7d', label: '7 días' },
            { value: '30d', label: '30 días' },
            { value: '90d', label: '90 días' },
            { value: 'all', label: 'Todo' },
        ].map((option) => (<button key={option.value} onClick={() => setTimeRange(option.value)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${timeRange === option.value
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'}`}>
              {option.label}
            </button>))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <framer_motion_1.motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">
              👥
            </div>
            <span className={`text-sm font-medium ${getGrowthColor(analytics.trends.patientsGrowth)}`}>
              {getGrowthIcon(analytics.trends.patientsGrowth)} {Math.abs(analytics.trends.patientsGrowth)}%
            </span>
          </div>
          <h3 className="text-sm text-gray-500 mb-1">Total Pacientes</h3>
          <p className="text-3xl font-bold text-gray-900">{analytics.overview.totalPatients}</p>
          <p className="text-xs text-gray-500 mt-2">
            {analytics.overview.activePatients} activos
          </p>
        </framer_motion_1.motion.div>

        <framer_motion_1.motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl">
              🩺
            </div>
            <span className={`text-sm font-medium ${getGrowthColor(analytics.trends.consultationsGrowth)}`}>
              {getGrowthIcon(analytics.trends.consultationsGrowth)} {Math.abs(analytics.trends.consultationsGrowth)}%
            </span>
          </div>
          <h3 className="text-sm text-gray-500 mb-1">Consultas</h3>
          <p className="text-3xl font-bold text-gray-900">{analytics.overview.totalConsultations}</p>
          <p className="text-xs text-gray-500 mt-2">
            Últimos {timeRange === 'all' ? 'todos' : timeRange.replace('d', ' días')}
          </p>
        </framer_motion_1.motion.div>

        <framer_motion_1.motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl">
              💊
            </div>
          </div>
          <h3 className="text-sm text-gray-500 mb-1">Prescripciones</h3>
          <p className="text-3xl font-bold text-gray-900">{analytics.overview.totalPrescriptions}</p>
          <p className="text-xs text-gray-500 mt-2">
            {(analytics.overview.totalPrescriptions / Math.max(analytics.overview.totalConsultations, 1)).toFixed(1)} por consulta
          </p>
        </framer_motion_1.motion.div>

        <framer_motion_1.motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center text-2xl">
              📋
            </div>
            <span className={`text-sm font-medium ${getGrowthColor(analytics.trends.formsGrowth)}`}>
              {getGrowthIcon(analytics.trends.formsGrowth)} {Math.abs(analytics.trends.formsGrowth)}%
            </span>
          </div>
          <h3 className="text-sm text-gray-500 mb-1">Formularios</h3>
          <p className="text-3xl font-bold text-gray-900">{analytics.overview.completedForms}</p>
          <p className="text-xs text-gray-500 mt-2">
            de {analytics.overview.totalForms} enviados
          </p>
        </framer_motion_1.motion.div>
      </div>

      {/* Form Completion Rate */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Tasa de Completado de Formularios</h2>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Completados</span>
              <span className="text-sm font-medium text-gray-900">
                {analytics.formCompletionRate.completed} / {analytics.formCompletionRate.sent} ({analytics.formCompletionRate.rate}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="bg-green-600 h-3 rounded-full transition-all" style={{ width: `${analytics.formCompletionRate.rate}%` }}/>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{analytics.formCompletionRate.sent}</p>
              <p className="text-xs text-gray-500">Enviados</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{analytics.formCompletionRate.completed}</p>
              <p className="text-xs text-gray-500">Completados</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{analytics.formCompletionRate.pending}</p>
              <p className="text-xs text-gray-500">Pendientes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Actividad Reciente</h2>
          {analytics.recentActivity.length === 0 ? (<p className="text-sm text-gray-500 text-center py-8">
              No hay actividad reciente
            </p>) : (<div className="space-y-4">
              {analytics.recentActivity.slice(0, 7).map((activity, index) => (<div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(activity.date).toLocaleDateString('es-ES', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>🩺 {activity.consultations}</span>
                    <span>👤 {activity.newPatients}</span>
                    <span>📋 {activity.formsSent}</span>
                  </div>
                </div>))}
            </div>)}
        </div>

        {/* Top Diagnoses */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Diagnósticos Más Frecuentes</h2>
          {analytics.topDiagnoses.length === 0 ? (<p className="text-sm text-gray-500 text-center py-8">
              No hay diagnósticos registrados
            </p>) : (<div className="space-y-3">
              {analytics.topDiagnoses.slice(0, 5).map((diagnosis, index) => (<div key={diagnosis.code} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{diagnosis.name}</p>
                    <p className="text-xs text-gray-500">{diagnosis.code}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                      {diagnosis.count}
                    </span>
                  </div>
                </div>))}
            </div>)}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Acciones Rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <link_1.default href="/dashboard/patients" className="flex items-center gap-3 p-4 bg-white rounded-lg hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-xl">
              👥
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Ver Pacientes</p>
              <p className="text-xs text-gray-500">{analytics.overview.totalPatients} registrados</p>
            </div>
          </link_1.default>

          <link_1.default href="/dashboard/forms/sent" className="flex items-center gap-3 p-4 bg-white rounded-lg hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-xl">
              📋
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Formularios</p>
              <p className="text-xs text-gray-500">{analytics.formCompletionRate.pending} pendientes</p>
            </div>
          </link_1.default>

          <link_1.default href="/dashboard/billing" className="flex items-center gap-3 p-4 bg-white rounded-lg hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-xl">
              💰
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Facturación</p>
              <p className="text-xs text-gray-500">Exportar datos</p>
            </div>
          </link_1.default>
        </div>
      </div>
    </div>);
}
//# sourceMappingURL=page.js.map