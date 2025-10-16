'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface PainAssessment {
  id: string;
  painScore: number;
  assessedAt: string | Date;
  painType?: string;
  location?: string;
  description?: string;
  interventionsGiven?: string[];
}

interface PainTrendChartProps {
  assessments: PainAssessment[];
  className?: string;
  showInterventions?: boolean;
}

export default function PainTrendChart({
  assessments,
  className = '',
  showInterventions = true,
}: PainTrendChartProps) {
  // Transform data for chart
  const chartData = assessments
    .map((assessment) => ({
      date: typeof assessment.assessedAt === 'string'
        ? parseISO(assessment.assessedAt)
        : assessment.assessedAt,
      painScore: assessment.painScore,
      fullDate: assessment.assessedAt,
      location: assessment.location || 'N/A',
      description: assessment.description || '',
      interventions: assessment.interventionsGiven || [],
      hasIntervention: (assessment.interventionsGiven || []).length > 0,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (assessments.length === 0) {
    return (
      <div className={`bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center ${className}`}>
        <div className="text-5xl mb-3">📊</div>
        <h3 className="text-lg font-bold text-gray-700 mb-2">Sin datos de dolor</h3>
        <p className="text-sm text-gray-500">
          Las evaluaciones de dolor aparecerán aquí una vez registradas.
        </p>
      </div>
    );
  }

  // Calculate statistics
  const currentPain = chartData[chartData.length - 1]?.painScore || 0;
  const previousPain = chartData[chartData.length - 2]?.painScore;
  const avgPain = Math.round(
    chartData.reduce((sum, d) => sum + d.painScore, 0) / chartData.length
  );
  const maxPain = Math.max(...chartData.map((d) => d.painScore));
  const minPain = Math.min(...chartData.map((d) => d.painScore));

  const painTrend = previousPain !== undefined
    ? currentPain - previousPain
    : 0;

  const trendIcon = painTrend < 0 ? '📉' : painTrend > 0 ? '📈' : '➡️';
  const trendColor = painTrend < 0
    ? 'text-green-600'
    : painTrend > 0
    ? 'text-red-600'
    : 'text-gray-600';

  const trendText = painTrend < 0
    ? `Mejorando (-${Math.abs(painTrend)} puntos)`
    : painTrend > 0
    ? `Empeorando (+${painTrend} puntos)`
    : 'Sin cambios';

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload[0]) return null;

    const data = payload[0].payload;
    return (
      <div className="bg-white border-2 border-blue-300 rounded-lg shadow-lg p-4 max-w-xs">
        <div className="font-bold text-blue-900 mb-2">
          {format(data.date, "dd 'de' MMM, yyyy - HH:mm", { locale: es })}
        </div>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-red-600">
              {data.painScore}/10
            </span>
            <span className="text-sm text-gray-600">
              {data.painScore === 0 ? 'Sin dolor' :
               data.painScore <= 3 ? 'Dolor leve' :
               data.painScore <= 6 ? 'Dolor moderado' :
               data.painScore <= 8 ? 'Dolor intenso' : 'Dolor severo'}
            </span>
          </div>
          {data.location && data.location !== 'N/A' && (
            <div className="text-sm">
              <span className="font-semibold">Ubicación:</span> {data.location}
            </div>
          )}
          {data.description && (
            <div className="text-sm">
              <span className="font-semibold">Nota:</span> {data.description}
            </div>
          )}
          {showInterventions && data.interventions.length > 0 && (
            <div className="text-sm border-t border-gray-200 pt-2 mt-2">
              <span className="font-semibold">💊 Intervenciones:</span>
              <ul className="list-disc list-inside text-xs mt-1">
                {data.interventions.map((int: string, i: number) => (
                  <li key={i}>{int}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-xl shadow-sm p-6 ${className}`}>
      {/* Header with Statistics */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <span className="mr-2">📊</span>
          Tendencia del Dolor - Últimos {assessments.length} registros
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* Current Pain */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-3">
            <div className="text-xs text-blue-700 font-semibold mb-1">Dolor Actual</div>
            <div className="text-3xl font-bold text-blue-900">{currentPain}/10</div>
          </div>

          {/* Average Pain */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-3">
            <div className="text-xs text-purple-700 font-semibold mb-1">Promedio</div>
            <div className="text-3xl font-bold text-purple-900">{avgPain}/10</div>
          </div>

          {/* Max Pain */}
          <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-3">
            <div className="text-xs text-red-700 font-semibold mb-1">Máximo</div>
            <div className="text-3xl font-bold text-red-900">{maxPain}/10</div>
          </div>

          {/* Min Pain */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-3">
            <div className="text-xs text-green-700 font-semibold mb-1">Mínimo</div>
            <div className="text-3xl font-bold text-green-900">{minPain}/10</div>
          </div>

          {/* Trend */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-3">
            <div className="text-xs text-gray-700 font-semibold mb-1">Tendencia</div>
            <div className={`text-2xl font-bold flex items-center space-x-1 ${trendColor}`}>
              <span>{trendIcon}</span>
              <span className="text-sm">{trendText}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPain" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="date"
              tickFormatter={(date) => format(date, 'dd/MM', { locale: es })}
              stroke="#6B7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              domain={[0, 10]}
              ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
              stroke="#6B7280"
              style={{ fontSize: '12px' }}
              label={{ value: 'Escala de Dolor', angle: -90, position: 'insideLeft', style: { fontSize: '12px', fill: '#6B7280' } }}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Pain severity zones */}
            <ReferenceLine y={3} stroke="#FCD34D" strokeDasharray="3 3" />
            <ReferenceLine y={7} stroke="#FB923C" strokeDasharray="3 3" />

            {/* Pain area and line */}
            <Area
              type="monotone"
              dataKey="painScore"
              stroke="#EF4444"
              strokeWidth={3}
              fill="url(#colorPain)"
            />
            <Line
              type="monotone"
              dataKey="painScore"
              stroke="#DC2626"
              strokeWidth={3}
              dot={{ fill: '#DC2626', r: 6 }}
              activeDot={{ r: 8, fill: '#991B1B' }}
            />

            {/* Mark interventions */}
            {showInterventions && chartData.filter(d => d.hasIntervention).map((point, i) => (
              <ReferenceLine
                key={i}
                x={point.date.getTime()}
                stroke="#10B981"
                strokeWidth={2}
                strokeDasharray="5 5"
                label={{
                  value: '💊',
                  position: 'top',
                  style: { fontSize: '16px' }
                }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-gray-600">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-100 border border-green-400 rounded"></div>
          <span>0-3: Dolor leve</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-yellow-100 border border-yellow-400 rounded"></div>
          <span>4-6: Dolor moderado</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-orange-100 border border-orange-400 rounded"></div>
          <span>7-8: Dolor intenso</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-100 border border-red-600 rounded"></div>
          <span>9-10: Dolor severo</span>
        </div>
        {showInterventions && (
          <div className="flex items-center space-x-2">
            <span>💊</span>
            <span>Intervención aplicada</span>
          </div>
        )}
      </div>
    </div>
  );
}
