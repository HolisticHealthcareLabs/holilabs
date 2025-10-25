"use strict";
/**
 * Patient Dashboard
 *
 * Main landing page for authenticated patients
 * Features:
 * - Welcome message with time-based greeting
 * - Quick stats cards
 * - Upcoming appointments
 * - Recent medications
 * - Quick actions
 * - Health metrics summary
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PatientDashboardPage;
const navigation_1 = require("next/navigation");
const patient_session_1 = require("@/lib/auth/patient-session");
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12)
        return 'Buenos días';
    if (hour < 19)
        return 'Buenas tardes';
    return 'Buenas noches';
}
async function PatientDashboardPage() {
    const patientUser = await (0, patient_session_1.getCurrentPatient)();
    if (!patientUser) {
        (0, navigation_1.redirect)('/portal/login');
    }
    const greeting = getGreeting();
    const firstName = patientUser.patient.firstName;
    return (<div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
          {greeting}, {firstName}
        </h1>
        <p className="text-gray-600">
          {(0, date_fns_1.format)(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: locale_1.es })}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Upcoming Appointments */}
        <a href="/portal/dashboard/appointments/schedule" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
            <span className="text-2xl font-bold text-gray-900">2</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Citas Próximas</h3>
          <p className="text-xs text-gray-500">Siguiente: En 3 días</p>
        </a>

        {/* Active Medications */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>
              </svg>
            </div>
            <span className="text-2xl font-bold text-gray-900">4</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Medicamentos Activos</h3>
          <p className="text-xs text-gray-500">Adherencia: 95%</p>
        </div>

        {/* Notifications */}
        <a href="/portal/dashboard/notifications" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-red-300 transition-all cursor-pointer group">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
              </svg>
            </div>
            <span className="text-2xl font-bold text-gray-900">5</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Notificaciones</h3>
          <p className="text-xs text-gray-500">3 sin leer</p>
        </a>

        {/* Documents */}
        <a href="/portal/dashboard/documents/upload" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-orange-300 transition-all cursor-pointer group">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
              </svg>
            </div>
            <span className="text-2xl font-bold text-gray-900">12</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Documentos</h3>
          <p className="text-xs text-gray-500">Clic para subir nuevos</p>
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Appointments */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Próximas Citas</h2>
              <a href="/portal/appointments" className="text-sm font-semibold text-green-600 hover:text-green-700">
                Ver todas →
              </a>
            </div>

            <div className="space-y-3">
              {/* Appointment 1 */}
              <div className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 hover:border-green-200 hover:bg-green-50 transition-all cursor-pointer">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Consulta de seguimiento</h3>
                  <p className="text-sm text-gray-600 mt-1">Dr. Juan Pérez - Medicina General</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                      Lun, 14 Oct
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      10:00 AM
                    </span>
                  </div>
                </div>
                <span className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  En 3 días
                </span>
              </div>

              {/* Appointment 2 */}
              <div className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 hover:border-green-200 hover:bg-green-50 transition-all cursor-pointer">
                <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Laboratorio - Análisis de sangre</h3>
                  <p className="text-sm text-gray-600 mt-1">Lab. Central - Dr. María López</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                      Vie, 18 Oct
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      7:00 AM
                    </span>
                  </div>
                </div>
                <span className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  En 7 días
                </span>
              </div>
            </div>
          </div>

          {/* Recent Medications */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Mis Medicamentos</h2>
              <a href="/portal/medications" className="text-sm font-semibold text-green-600 hover:text-green-700">
                Ver todos →
              </a>
            </div>

            <div className="space-y-3">
              {[
            { name: 'Metformina', dose: '500mg', frequency: '2 veces al día', time: '8:00 AM, 8:00 PM' },
            { name: 'Enalapril', dose: '10mg', frequency: '1 vez al día', time: '8:00 AM' },
        ].map((med) => (<div key={med.name} className="flex items-center gap-4 p-4 rounded-lg border border-gray-200">
                  <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{med.name}</h3>
                    <p className="text-sm text-gray-600">{med.dose} - {med.frequency}</p>
                    <p className="text-xs text-gray-500 mt-1">⏰ {med.time}</p>
                  </div>
                </div>))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Acciones Rápidas</h2>
            <div className="space-y-2">
              <a href="/portal/dashboard/appointments/schedule" className="flex items-center gap-3 p-3 bg-white rounded-lg hover:shadow-md transition-all">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
                  </svg>
                </div>
                <span className="font-medium text-gray-900">Agendar Cita</span>
              </a>

              <a href="/portal/dashboard/notifications" className="flex items-center gap-3 p-3 bg-white rounded-lg hover:shadow-md transition-all">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                  </svg>
                </div>
                <span className="font-medium text-gray-900">Ver Notificaciones</span>
              </a>

              <a href="/portal/dashboard/documents/upload" className="flex items-center gap-3 p-3 bg-white rounded-lg hover:shadow-md transition-all">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                  </svg>
                </div>
                <span className="font-medium text-gray-900">Subir Documento</span>
              </a>

              <a href="/portal/dashboard/messages" className="flex items-center gap-3 p-3 bg-white rounded-lg hover:shadow-md transition-all">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
                  </svg>
                </div>
                <span className="font-medium text-gray-900">Enviar Mensaje</span>
              </a>
            </div>
          </div>

          {/* Health Tip */}
          <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-lg">💡</span>
              </div>
              <h3 className="font-bold text-gray-900">Consejo del día</h3>
            </div>
            <p className="text-sm text-gray-700">
              Recuerda tomar tus medicamentos a la misma hora todos los días para mantener niveles
              constantes en tu cuerpo.
            </p>
          </div>
        </div>
      </div>
    </div>);
}
//# sourceMappingURL=page.js.map