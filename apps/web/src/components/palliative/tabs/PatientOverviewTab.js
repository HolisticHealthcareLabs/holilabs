"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PatientOverviewTab;
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
const link_1 = __importDefault(require("next/link"));
function PatientOverviewTab({ patient, latestPainAssessment, latestQoLAssessment, activeCarePlans = [], }) {
    const dob = typeof patient.dateOfBirth === 'string' ? (0, date_fns_1.parseISO)(patient.dateOfBirth) : patient.dateOfBirth;
    const age = (0, date_fns_1.differenceInYears)(new Date(), dob);
    const painScore = latestPainAssessment?.painScore;
    const qolScore = latestQoLAssessment?.overallQoL;
    const getPainColor = (score) => {
        if (score === undefined)
            return 'gray';
        if (score <= 3)
            return 'green';
        if (score <= 6)
            return 'yellow';
        if (score <= 8)
            return 'orange';
        return 'red';
    };
    const getQoLColor = (score) => {
        if (score === undefined)
            return 'gray';
        if (score >= 8)
            return 'green';
        if (score >= 6)
            return 'blue';
        if (score >= 4)
            return 'yellow';
        return 'red';
    };
    const painColor = getPainColor(painScore);
    const qolColor = getQoLColor(qolScore);
    return (<div className="space-y-6">
      {/* Patient Status Cards - Epic/Cerner style */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Latest Pain Score */}
        <div className={`bg-gradient-to-br from-${painColor}-50 to-${painColor}-100 border-2 border-${painColor}-300 rounded-xl p-5 shadow-md hover:shadow-lg transition-shadow`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-sm font-bold text-${painColor}-900 uppercase`}>Dolor Actual</h3>
            <span className="text-3xl">😣</span>
          </div>
          {latestPainAssessment ? (<>
              <div className={`text-5xl font-black text-${painColor}-700 mb-2`}>
                {painScore}/10
              </div>
              <div className={`text-xs text-${painColor}-700`}>
                {latestPainAssessment.location && `📍 ${latestPainAssessment.location}`}
              </div>
              <div className={`text-xs text-${painColor}-600 mt-2`}>
                Evaluado: {(0, date_fns_1.format)(typeof latestPainAssessment.assessedAt === 'string'
                ? (0, date_fns_1.parseISO)(latestPainAssessment.assessedAt)
                : latestPainAssessment.assessedAt, "dd/MM 'a las' HH:mm", { locale: locale_1.es })}
              </div>
            </>) : (<div className="text-gray-500 text-sm">
              <div className="text-3xl mb-2">—</div>
              <div>Sin evaluación reciente</div>
            </div>)}
        </div>

        {/* Latest Quality of Life Score */}
        <div className={`bg-gradient-to-br from-${qolColor}-50 to-${qolColor}-100 border-2 border-${qolColor}-300 rounded-xl p-5 shadow-md hover:shadow-lg transition-shadow`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-sm font-bold text-${qolColor}-900 uppercase`}>Calidad de Vida</h3>
            <span className="text-3xl">💫</span>
          </div>
          {latestQoLAssessment ? (<>
              <div className={`text-5xl font-black text-${qolColor}-700 mb-2`}>
                {qolScore}/10
              </div>
              <div className={`text-xs text-${qolColor}-700 space-y-1 mt-2`}>
                <div>🏃 Físico: {latestQoLAssessment.physicalWellbeing}/10</div>
                <div>💚 Emocional: {latestQoLAssessment.emotionalWellbeing}/10</div>
              </div>
            </>) : (<div className="text-gray-500 text-sm">
              <div className="text-3xl mb-2">—</div>
              <div>Sin evaluación reciente</div>
            </div>)}
        </div>

        {/* Active Care Plans */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300 rounded-xl p-5 shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-purple-900 uppercase">Planes Activos</h3>
            <span className="text-3xl">📋</span>
          </div>
          <div className="text-5xl font-black text-purple-700 mb-2">
            {activeCarePlans.length}
          </div>
          {activeCarePlans.length > 0 ? (<div className="text-xs text-purple-700 space-y-1">
              {activeCarePlans.slice(0, 2).map((plan) => (<div key={plan.id} className="truncate">
                  • {plan.title}
                </div>))}
              {activeCarePlans.length > 2 && (<div className="font-semibold">+{activeCarePlans.length - 2} más</div>)}
            </div>) : (<div className="text-purple-600 text-xs">Sin planes activos</div>)}
        </div>
      </div>

      {/* Patient Demographics - Epic style */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          <span className="mr-2">👤</span>
          Información Demográfica
        </h3>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Nombre Completo</div>
            <div className="text-base font-semibold text-gray-900">
              {patient.firstName} {patient.lastName}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Edad</div>
            <div className="text-base font-semibold text-gray-900">{age} años</div>
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Sexo</div>
            <div className="text-base font-semibold text-gray-900">{patient.gender || 'No especificado'}</div>
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase mb-1">MRN</div>
            <div className="text-base font-mono font-semibold text-blue-900">{patient.mrn}</div>
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Token ID</div>
            <div className="text-base font-mono font-semibold text-purple-900">{patient.tokenId}</div>
          </div>

          {patient.cns && (<div>
              <div className="text-xs font-semibold text-gray-500 uppercase mb-1">CNS (Cartão Nacional de Saúde)</div>
              <div className="text-base font-mono font-semibold text-gray-900">{patient.cns}</div>
            </div>)}

          {patient.cpf && (<div>
              <div className="text-xs font-semibold text-gray-500 uppercase mb-1">CPF</div>
              <div className="text-base font-mono font-semibold text-gray-900">{patient.cpf}</div>
            </div>)}

          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Fecha de Nacimiento</div>
            <div className="text-base font-semibold text-gray-900">
              {(0, date_fns_1.format)(dob, "dd 'de' MMMM, yyyy", { locale: locale_1.es })}
            </div>
          </div>

          {patient.phone && (<div>
              <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Teléfono</div>
              <div className="text-base font-semibold text-gray-900">{patient.phone}</div>
            </div>)}

          {patient.email && (<div>
              <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Email</div>
              <div className="text-base font-semibold text-gray-900">{patient.email}</div>
            </div>)}
        </div>
      </div>

      {/* Palliative Care Status */}
      {patient.isPalliativeCare && (<div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center">
            <span className="mr-2">🕊️</span>
            Estado de Cuidados Paliativos
          </h3>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-4">
            {patient.primaryDiagnosis && (<div>
                <div className="text-xs font-semibold text-purple-700 uppercase mb-1">Diagnóstico Principal</div>
                <div className="text-base font-semibold text-gray-900">{patient.primaryDiagnosis}</div>
              </div>)}

            {patient.diagnosisDate && (<div>
                <div className="text-xs font-semibold text-purple-700 uppercase mb-1">Fecha de Diagnóstico</div>
                <div className="text-base font-semibold text-gray-900">
                  {(0, date_fns_1.format)(typeof patient.diagnosisDate === 'string' ? (0, date_fns_1.parseISO)(patient.diagnosisDate) : patient.diagnosisDate, "dd/MM/yyyy", { locale: locale_1.es })}
                </div>
              </div>)}

            {patient.ecogPerformanceStatus !== undefined && (<div>
                <div className="text-xs font-semibold text-purple-700 uppercase mb-1">ECOG Performance Status</div>
                <div className="text-base font-semibold text-gray-900">{patient.ecogPerformanceStatus}/4</div>
              </div>)}

            {patient.karnofskyScore !== undefined && (<div>
                <div className="text-xs font-semibold text-purple-700 uppercase mb-1">Karnofsky Score</div>
                <div className="text-base font-semibold text-gray-900">{patient.karnofskyScore}%</div>
              </div>)}
          </div>

          {/* Advanced Directives */}
          <div className="mt-4 pt-4 border-t border-purple-200">
            <div className="flex flex-wrap gap-2">
              {patient.hasDNR && (<div className="px-3 py-1 bg-red-100 border-2 border-red-500 text-red-900 rounded-full text-xs font-bold flex items-center space-x-1">
                  <span>⛔</span>
                  <span>DNR (No Resucitar)</span>
                </div>)}
              {patient.hasDNI && (<div className="px-3 py-1 bg-red-100 border-2 border-red-500 text-red-900 rounded-full text-xs font-bold flex items-center space-x-1">
                  <span>⛔</span>
                  <span>DNI (No Intubar)</span>
                </div>)}
              {patient.hasAdvanceDirective && (<div className="px-3 py-1 bg-blue-100 border-2 border-blue-500 text-blue-900 rounded-full text-xs font-bold flex items-center space-x-1">
                  <span>📄</span>
                  <span>Directivas Anticipadas en Archivo</span>
                </div>)}
            </div>
          </div>
        </div>)}

      {/* Care Team */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          <span className="mr-2">👥</span>
          Equipo de Atención
        </h3>

        <div className="space-y-3">
          {patient.assignedClinician && (<div className="flex items-center space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center text-2xl">
                👨‍⚕️
              </div>
              <div>
                <div className="text-xs font-semibold text-blue-700 uppercase">Médico Tratante</div>
                <div className="text-base font-bold text-gray-900">
                  Dr. {patient.assignedClinician.firstName} {patient.assignedClinician.lastName}
                </div>
                {patient.assignedClinician.specialty && (<div className="text-xs text-gray-600">{patient.assignedClinician.specialty}</div>)}
              </div>
            </div>)}

          {patient.primaryCaregiverId && (<div className="flex items-center space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center text-2xl">
                👤
              </div>
              <div>
                <div className="text-xs font-semibold text-green-700 uppercase">Cuidador Principal</div>
                <div className="text-base font-bold text-gray-900">
                  Asignado (ID: {patient.primaryCaregiverId.slice(0, 8)}...)
                </div>
              </div>
            </div>)}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          <span className="mr-2">⚡</span>
          Acciones Rápidas
        </h3>

        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
          <link_1.default href={`/dashboard/scribe?patientId=${patient.id}`} className="px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold text-center">
            📝 Nueva Nota SOAP
          </link_1.default>

          <button className="px-4 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold">
            🩺 Evaluar Dolor
          </button>

          <button className="px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold">
            💊 Prescribir Medicamento
          </button>

          <button className="px-4 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold">
            🚨 Alerta Urgente
          </button>
        </div>
      </div>
    </div>);
}
//# sourceMappingURL=PatientOverviewTab.js.map