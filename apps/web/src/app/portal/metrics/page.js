"use strict";
/**
 * Health Metrics Page
 *
 * Beautiful health tracking dashboard with vital signs and trends
 */
'use client';
/**
 * Health Metrics Page
 *
 * Beautiful health tracking dashboard with vital signs and trends
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MetricsPage;
const react_1 = require("react");
const framer_motion_1 = require("framer-motion");
function MetricsPage() {
    const [data, setData] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const [selectedPeriod, setSelectedPeriod] = (0, react_1.useState)(30);
    (0, react_1.useEffect)(() => {
        fetchMetrics();
    }, [selectedPeriod]);
    const fetchMetrics = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/portal/metrics?days=${selectedPeriod}`);
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Error al cargar métricas');
            }
            setData(result.data);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
        }
        finally {
            setLoading(false);
        }
    };
    const getTrendIcon = (trend) => {
        if (trend === 'up') {
            return (<svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18"/>
        </svg>);
        }
        if (trend === 'down') {
            return (<svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
        </svg>);
        }
        return (<svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14"/>
      </svg>);
    };
    const getTrendColor = (trend, metric) => {
        // For most metrics, down is good (BP, HR, weight)
        // For oxygen saturation, up is good
        if (metric === 'oxygenSaturation') {
            if (trend === 'up')
                return 'text-green-600';
            if (trend === 'down')
                return 'text-red-600';
        }
        else {
            if (trend === 'up')
                return 'text-red-600';
            if (trend === 'down')
                return 'text-green-600';
        }
        return 'text-gray-600';
    };
    const getStatusColor = (metric, value) => {
        if (!value)
            return 'gray';
        switch (metric) {
            case 'bloodPressure':
                // Systolic value check
                if (value < 120)
                    return 'green';
                if (value < 140)
                    return 'yellow';
                return 'red';
            case 'heartRate':
                if (value >= 60 && value <= 100)
                    return 'green';
                if (value >= 50 && value <= 110)
                    return 'yellow';
                return 'red';
            case 'temperature':
                if (value >= 36.1 && value <= 37.2)
                    return 'green';
                if (value >= 35.5 && value <= 37.5)
                    return 'yellow';
                return 'red';
            case 'oxygenSaturation':
                if (value >= 95)
                    return 'green';
                if (value >= 90)
                    return 'yellow';
                return 'red';
            default:
                return 'green';
        }
    };
    if (loading) {
        return (<div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-8 h-8 text-green-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
          </div>
          <p className="text-gray-600 font-medium">Cargando métricas...</p>
        </div>
      </div>);
    }
    if (error) {
        return (<div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
            Error al cargar
          </h2>
          <p className="text-gray-600 mb-6 text-center">{error}</p>
          <button onClick={() => fetchMetrics()} className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all">
            Reintentar
          </button>
        </div>
      </div>);
    }
    const hasData = data?.metrics && data.metrics.length > 0;
    return (<div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            Mis Métricas de Salud
          </h1>
          <p className="text-gray-600">
            Monitorea tus signos vitales y tendencias de salud
          </p>
        </div>

        {/* Period Selector */}
        <div className="mb-8 flex gap-3 overflow-x-auto pb-2">
          {[7, 14, 30, 90].map((days) => (<button key={days} onClick={() => setSelectedPeriod(days)} className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition-all ${selectedPeriod === days
                ? 'bg-green-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
              {days === 7
                ? 'Última semana'
                : days === 14
                    ? '2 semanas'
                    : days === 30
                        ? 'Último mes'
                        : '3 meses'}
            </button>))}
        </div>

        {!hasData ? (<div className="bg-white rounded-2xl shadow-md border border-gray-200 p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              No hay datos de métricas
            </h3>
            <p className="text-gray-600 mb-6">
              Los signos vitales se registran durante tus consultas médicas.
            </p>
          </div>) : (<>
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {/* Blood Pressure */}
              <framer_motion_1.motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${getStatusColor('bloodPressure', data?.summary.bloodPressure.systolic || null) === 'green'
                ? 'from-green-400 to-green-600'
                : getStatusColor('bloodPressure', data?.summary.bloodPressure.systolic || null) === 'yellow'
                    ? 'from-yellow-400 to-yellow-600'
                    : 'from-red-400 to-red-600'}`}>
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Presión Arterial</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {data?.summary.bloodPressure.systolic || '-'}/
                        {data?.summary.bloodPressure.diastolic || '-'}
                      </p>
                      <p className="text-xs text-gray-500">{data?.summary.bloodPressure.unit}</p>
                    </div>
                  </div>
                  {getTrendIcon(data?.summary.bloodPressure.trend || 'stable')}
                </div>
              </framer_motion_1.motion.div>

              {/* Heart Rate */}
              <framer_motion_1.motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${getStatusColor('heartRate', data?.summary.heartRate.value || null) === 'green'
                ? 'from-red-400 to-red-600'
                : getStatusColor('heartRate', data?.summary.heartRate.value || null) === 'yellow'
                    ? 'from-yellow-400 to-yellow-600'
                    : 'from-red-400 to-red-600'}`}>
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Frecuencia Cardíaca</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {data?.summary.heartRate.value || '-'}
                      </p>
                      <p className="text-xs text-gray-500">{data?.summary.heartRate.unit}</p>
                    </div>
                  </div>
                  {getTrendIcon(data?.summary.heartRate.trend || 'stable')}
                </div>
              </framer_motion_1.motion.div>

              {/* Temperature */}
              <framer_motion_1.motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${getStatusColor('temperature', data?.summary.temperature.value || null) === 'green'
                ? 'from-blue-400 to-blue-600'
                : getStatusColor('temperature', data?.summary.temperature.value || null) === 'yellow'
                    ? 'from-yellow-400 to-yellow-600'
                    : 'from-red-400 to-red-600'}`}>
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Temperatura</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {data?.summary.temperature.value || '-'}
                      </p>
                      <p className="text-xs text-gray-500">{data?.summary.temperature.unit}</p>
                    </div>
                  </div>
                  {getTrendIcon(data?.summary.temperature.trend || 'stable')}
                </div>
              </framer_motion_1.motion.div>

              {/* Oxygen Saturation */}
              <framer_motion_1.motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${getStatusColor('oxygenSaturation', data?.summary.oxygenSaturation.value || null) === 'green'
                ? 'from-cyan-400 to-cyan-600'
                : getStatusColor('oxygenSaturation', data?.summary.oxygenSaturation.value || null) === 'yellow'
                    ? 'from-yellow-400 to-yellow-600'
                    : 'from-red-400 to-red-600'}`}>
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Saturación O₂</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {data?.summary.oxygenSaturation.value || '-'}
                      </p>
                      <p className="text-xs text-gray-500">{data?.summary.oxygenSaturation.unit}</p>
                    </div>
                  </div>
                  {getTrendIcon(data?.summary.oxygenSaturation.trend || 'stable')}
                </div>
              </framer_motion_1.motion.div>

              {/* Respiratory Rate */}
              <framer_motion_1.motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-purple-400 to-purple-600">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Frecuencia Resp.</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {data?.summary.respiratoryRate.value || '-'}
                      </p>
                      <p className="text-xs text-gray-500">{data?.summary.respiratoryRate.unit}</p>
                    </div>
                  </div>
                  {getTrendIcon(data?.summary.respiratoryRate.trend || 'stable')}
                </div>
              </framer_motion_1.motion.div>

              {/* Weight */}
              <framer_motion_1.motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-orange-400 to-orange-600">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Peso</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {data?.summary.weight.value || '-'}
                      </p>
                      <p className="text-xs text-gray-500">{data?.summary.weight.unit}</p>
                    </div>
                  </div>
                  {getTrendIcon(data?.summary.weight.trend || 'stable')}
                </div>
              </framer_motion_1.motion.div>
            </div>

            {/* Info Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-blue-900 mb-3">
                📊 Sobre tus métricas
              </h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>
                    Los signos vitales se registran durante tus consultas médicas
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>
                    Las tendencias te ayudan a ver cómo evoluciona tu salud
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>
                    Consulta con tu médico si notas cambios significativos
                  </span>
                </li>
              </ul>
            </div>
          </>)}
      </div>
    </div>);
}
//# sourceMappingURL=page.js.map