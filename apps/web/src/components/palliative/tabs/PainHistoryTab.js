"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PainHistoryTab;
const react_1 = require("react");
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
const PainTrendChart_1 = __importDefault(require("../PainTrendChart"));
function PainHistoryTab({ painAssessments, patientId, onRefresh, }) {
    const [selectedAssessment, setSelectedAssessment] = (0, react_1.useState)(null);
    const [view, setView] = (0, react_1.useState)('chart');
    const getPainTypeLabel = (type) => {
        const labels = {
            ACUTE: 'Agudo',
            CHRONIC: 'Crónico',
            BREAKTHROUGH: 'Irruptivo',
            NEUROPATHIC: 'Neuropático',
            VISCERAL: 'Visceral',
            SOMATIC: 'Somático',
        };
        return type ? labels[type] || type : 'No especificado';
    };
    const getPainLevelLabel = (score) => {
        if (score === 0)
            return 'Sin dolor';
        if (score <= 3)
            return 'Dolor leve';
        if (score <= 6)
            return 'Dolor moderado';
        if (score <= 8)
            return 'Dolor intenso';
        return 'Dolor severo';
    };
    const getPainLevelColor = (score) => {
        if (score === 0)
            return 'green';
        if (score <= 3)
            return 'yellow';
        if (score <= 6)
            return 'orange';
        if (score <= 8)
            return 'red';
        return 'red';
    };
    // Sort assessments by date (most recent first)
    const sortedAssessments = [...painAssessments].sort((a, b) => {
        const dateA = typeof a.assessedAt === 'string' ? (0, date_fns_1.parseISO)(a.assessedAt) : a.assessedAt;
        const dateB = typeof b.assessedAt === 'string' ? (0, date_fns_1.parseISO)(b.assessedAt) : b.assessedAt;
        return dateB.getTime() - dateA.getTime();
    });
    return (<div className="space-y-6">
      {/* Header with view toggle */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center">
            <span className="mr-2">📊</span>
            Historial de Dolor ({painAssessments.length} evaluaciones)
          </h3>
          <div className="flex space-x-3">
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button onClick={() => setView('chart')} className={`px-4 py-2 text-sm font-semibold transition-colors ${view === 'chart'
            ? 'bg-blue-500 text-white'
            : 'bg-white text-gray-700 hover:bg-gray-100'}`}>
                📈 Gráfico
              </button>
              <button onClick={() => setView('list')} className={`px-4 py-2 text-sm font-semibold transition-colors ${view === 'list'
            ? 'bg-blue-500 text-white'
            : 'bg-white text-gray-700 hover:bg-gray-100'}`}>
                📋 Lista
              </button>
            </div>
            <button onClick={onRefresh} className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold">
              ➕ Nueva Evaluación
            </button>
          </div>
        </div>
      </div>

      {painAssessments.length === 0 ? (<div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
          <div className="text-6xl mb-4">😣</div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">Sin evaluaciones de dolor</h3>
          <p className="text-gray-500 mb-4">
            No hay evaluaciones de dolor registradas para este paciente.
          </p>
          <button onClick={onRefresh} className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold">
            ➕ Crear Primera Evaluación
          </button>
        </div>) : (<>
          {/* Chart View */}
          {view === 'chart' && (<PainTrendChart_1.default assessments={painAssessments} showInterventions={true}/>)}

          {/* List View */}
          {view === 'list' && (<div className="space-y-4">
              {sortedAssessments.map((assessment) => {
                    const isExpanded = selectedAssessment === assessment.id;
                    const painColor = getPainLevelColor(assessment.painScore);
                    const assessedDate = typeof assessment.assessedAt === 'string'
                        ? (0, date_fns_1.parseISO)(assessment.assessedAt)
                        : assessment.assessedAt;
                    return (<div key={assessment.id} className={`bg-white border-2 ${isExpanded ? `border-${painColor}-400` : 'border-gray-200'} rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden`}>
                    {/* Assessment Header */}
                    <button onClick={() => setSelectedAssessment(isExpanded ? null : assessment.id)} className="w-full p-5 text-left flex items-start space-x-4 hover:bg-gray-50 transition-colors">
                      {/* Pain Score Badge */}
                      <div className={`flex-shrink-0 w-20 h-20 bg-gradient-to-br from-${painColor}-400 to-${painColor}-600 rounded-xl flex flex-col items-center justify-center text-white shadow-lg`}>
                        <div className="text-3xl font-black">{assessment.painScore}</div>
                        <div className="text-xs font-bold">/10</div>
                      </div>

                      {/* Assessment Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="text-lg font-bold text-gray-900">
                              {getPainLevelLabel(assessment.painScore)}
                            </h4>
                            <div className="text-sm text-gray-600">
                              {(0, date_fns_1.format)(assessedDate, "EEEE, dd 'de' MMMM, yyyy 'a las' HH:mm", { locale: locale_1.es })}
                            </div>
                          </div>
                          {assessment.painType && (<span className="px-3 py-1 bg-purple-100 border border-purple-300 text-purple-900 text-xs font-bold rounded-full">
                              {getPainTypeLabel(assessment.painType)}
                            </span>)}
                        </div>

                        {assessment.location && (<div className="text-sm text-gray-700 mb-2">
                            <span className="font-semibold">📍 Ubicación:</span> {assessment.location}
                          </div>)}

                        {assessment.description && (<p className="text-sm text-gray-700 line-clamp-2">{assessment.description}</p>)}

                        {assessment.interventionsGiven && assessment.interventionsGiven.length > 0 && (<div className="flex items-center space-x-2 mt-2">
                            <span className="text-green-600 font-semibold text-sm">💊</span>
                            <span className="text-sm text-green-700">
                              {assessment.interventionsGiven.length} intervención(es) aplicada(s)
                            </span>
                          </div>)}
                      </div>

                      {/* Expand/Collapse Icon */}
                      <div className="text-2xl flex-shrink-0">
                        {isExpanded ? '🔼' : '🔽'}
                      </div>
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (<div className="px-5 pb-5 space-y-4 border-t border-gray-200 pt-4">
                        <div className="grid md:grid-cols-2 gap-6">
                          {/* Characteristics */}
                          <div className="space-y-3">
                            <h5 className="text-sm font-bold text-gray-900">🔍 Características del Dolor</h5>

                            {assessment.quality && assessment.quality.length > 0 && (<div>
                                <div className="text-xs font-semibold text-gray-600 mb-1">Calidad:</div>
                                <div className="flex flex-wrap gap-1">
                                  {assessment.quality.map((q, i) => (<span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                      {q}
                                    </span>))}
                                </div>
                              </div>)}

                            {assessment.timing && (<div>
                                <div className="text-xs font-semibold text-gray-600 mb-1">Temporalidad:</div>
                                <div className="text-sm text-gray-900">{assessment.timing}</div>
                              </div>)}

                            {assessment.aggravatingFactors && assessment.aggravatingFactors.length > 0 && (<div>
                                <div className="text-xs font-semibold text-gray-600 mb-1">Factores Agravantes:</div>
                                <ul className="text-sm text-gray-900 list-disc list-inside">
                                  {assessment.aggravatingFactors.map((f, i) => (<li key={i}>{f}</li>))}
                                </ul>
                              </div>)}

                            {assessment.relievingFactors && assessment.relievingFactors.length > 0 && (<div>
                                <div className="text-xs font-semibold text-gray-600 mb-1">Factores Aliviantes:</div>
                                <ul className="text-sm text-gray-900 list-disc list-inside">
                                  {assessment.relievingFactors.map((f, i) => (<li key={i}>{f}</li>))}
                                </ul>
                              </div>)}
                          </div>

                          {/* Impact */}
                          <div className="space-y-3">
                            <h5 className="text-sm font-bold text-gray-900">💥 Impacto del Dolor</h5>

                            {assessment.functionalImpact && (<div>
                                <div className="text-xs font-semibold text-gray-600 mb-1">Impacto Funcional:</div>
                                <div className="text-sm text-gray-900">{assessment.functionalImpact}</div>
                              </div>)}

                            {assessment.sleepImpact && (<div>
                                <div className="text-xs font-semibold text-gray-600 mb-1">Impacto en el Sueño:</div>
                                <div className="text-sm text-gray-900">{assessment.sleepImpact}</div>
                              </div>)}

                            {assessment.moodImpact && (<div>
                                <div className="text-xs font-semibold text-gray-600 mb-1">Impacto en el Estado de Ánimo:</div>
                                <div className="text-sm text-gray-900">{assessment.moodImpact}</div>
                              </div>)}
                          </div>
                        </div>

                        {/* Interventions & Response */}
                        {assessment.interventionsGiven && assessment.interventionsGiven.length > 0 && (<div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <h5 className="text-sm font-bold text-green-900 mb-2">💊 Intervenciones Aplicadas</h5>
                            <ul className="space-y-1">
                              {assessment.interventionsGiven.map((intervention, i) => (<li key={i} className="text-sm text-green-900 flex items-start space-x-2">
                                  <span className="text-green-600 font-bold flex-shrink-0">✓</span>
                                  <span>{intervention}</span>
                                </li>))}
                            </ul>
                            {assessment.responseToTreatment && (<div className="mt-3 pt-3 border-t border-green-300">
                                <div className="text-xs font-semibold text-green-800 mb-1">Respuesta al Tratamiento:</div>
                                <div className="text-sm text-green-900">{assessment.responseToTreatment}</div>
                              </div>)}
                          </div>)}

                        {/* Notes */}
                        {assessment.notes && (<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h5 className="text-sm font-bold text-blue-900 mb-2">📝 Notas Adicionales</h5>
                            <p className="text-sm text-blue-900">{assessment.notes}</p>
                          </div>)}

                        {/* Metadata */}
                        <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-200">
                          <span>Evaluado por ID: {assessment.assessedBy}</span>
                          <span>ID de Evaluación: {assessment.id.slice(0, 12)}...</span>
                        </div>
                      </div>)}
                  </div>);
                })}
            </div>)}
        </>)}
    </div>);
}
//# sourceMappingURL=PainHistoryTab.js.map