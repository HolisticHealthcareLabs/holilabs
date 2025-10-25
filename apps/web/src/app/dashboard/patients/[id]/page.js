"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PatientProfile;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const link_1 = __importDefault(require("next/link"));
const EPrescribingDrawer_1 = __importDefault(require("@/components/patient/EPrescribingDrawer"));
const ConsentManager_1 = __importDefault(require("@/components/patient/ConsentManager"));
const SchedulingModal_1 = __importDefault(require("@/components/patient/SchedulingModal"));
const DataIngestion_1 = __importDefault(require("@/components/patient/DataIngestion"));
const ClinicalNotesEditor_1 = __importDefault(require("@/components/patient/ClinicalNotesEditor"));
function PatientProfile() {
    const params = (0, navigation_1.useParams)();
    const patientId = params.id;
    const [activeTab, setActiveTab] = (0, react_1.useState)('clinical');
    const [isRxDrawerOpen, setIsRxDrawerOpen] = (0, react_1.useState)(false);
    const [isSchedulingOpen, setIsSchedulingOpen] = (0, react_1.useState)(false);
    const [isClinicalNotesOpen, setIsClinicalNotesOpen] = (0, react_1.useState)(false);
    const [aiContext, setAiContext] = (0, react_1.useState)('Cargando contexto del paciente...');
    // Real data from API
    const [patient, setPatient] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    // Fetch patient data from API
    (0, react_1.useEffect)(() => {
        async function fetchPatient() {
            try {
                const response = await fetch(`/api/patients/${patientId}`);
                const data = await response.json();
                if (response.ok) {
                    setPatient(data.data);
                    // Build AI context from real data
                    const age = new Date().getFullYear() - new Date(data.data.dateOfBirth).getFullYear();
                    const ageBand = data.data.ageBand || `${Math.floor(age / 10) * 10}-${Math.floor(age / 10) * 10 + 9}`;
                    const medList = data.data.medications?.map((m) => m.name).join(', ') || 'Ninguna';
                    setAiContext(`Banda de edad ${ageBand}, Medicación activa: ${medList}`);
                }
                else {
                    setError(data.error || 'Failed to load patient');
                }
            }
            catch (err) {
                setError(err.message || 'Network error');
            }
            finally {
                setLoading(false);
            }
        }
        fetchPatient();
    }, [patientId]);
    const handleContextUpdate = (metadata) => {
        // Update AI context with new data
        const timestamp = new Date().toLocaleString('es-ES');
        const newContext = `Contexto actualizado [${timestamp}]: ${aiContext} Nuevos datos: ${metadata.dataType} (${metadata.metrics.map((m) => `${m.code} ${m.value}${m.unit}`).join(', ')})`;
        setAiContext(newContext);
    };
    // Loading state
    if (loading) {
        return (<div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-primary mb-4"/>
          <h3 className="text-xl font-bold text-gray-800">Cargando paciente...</h3>
        </div>
      </div>);
    }
    // Error state
    if (error || !patient) {
        return (<div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Error al cargar paciente</h3>
          <p className="text-gray-600 mb-4">{error || 'Paciente no encontrado'}</p>
          <link_1.default href="/dashboard/patients" className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition">
            Volver a pacientes
          </link_1.default>
        </div>
      </div>);
    }
    const fullName = `${patient.firstName} ${patient.lastName}`.trim();
    const displayName = fullName || `Paciente ${patient.tokenId}`;
    return (<div className="min-h-screen bg-gray-50">
      {/* Header with patient info banner - Dentalink style */}
      <div className="bg-gradient-to-r from-primary to-blue-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          {/* Back Button */}
          <link_1.default href="/dashboard/patients" className="inline-flex items-center space-x-2 text-white/90 hover:text-white transition-colors mb-4 group">
            <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
            <span className="font-medium">Regresar a Pacientes</span>
          </link_1.default>

          <div className="flex items-start space-x-4">
            {/* Patient Avatar */}
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center text-4xl backdrop-blur">
              👤
            </div>

            {/* Patient Info */}
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-2">
                <h1 className="text-2xl font-bold">{displayName}</h1>
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                  ID: {patient.tokenId}
                </span>
              </div>
              <div className="text-sm opacity-90">
                <span className="mr-4">Banda de edad: {patient.ageBand || 'N/A'}</span>
                <span className="mr-4">
                  Última visita: {patient.appointments?.[0]?.startTime ? new Date(patient.appointments[0].startTime).toLocaleDateString('es-ES') : 'N/A'}
                </span>
                <span>Región: {patient.region || patient.state || 'N/A'}</span>
              </div>

              {/* Medical Alerts - Interactive Pills */}
              <div className="mt-3 flex space-x-3">
                {patient.medications && patient.medications.length > 0 && (<button onClick={() => setIsRxDrawerOpen(true)} className="bg-green-500 px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 hover:bg-green-600 transition shadow-sm hover:shadow-md">
                    <span>💊</span>
                    <span>Medicamentos:</span>
                    <span>{patient.medications.slice(0, 2).map((m) => m.name).join(', ')}</span>
                    {patient.medications.length > 2 && <span>+{patient.medications.length - 2}</span>}
                  </button>)}
                {patient.appointments && patient.appointments.length > 0 && (<button className="bg-blue-500 px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 hover:bg-blue-600 transition shadow-sm hover:shadow-md">
                    <span>📅</span>
                    <span>Próxima cita: {new Date(patient.appointments[0].startTime).toLocaleDateString('es-ES')}</span>
                  </button>)}
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
              <link_1.default href={`/dashboard/patients/${patientId}/wallet`} className="bg-white text-primary px-4 py-2 rounded hover:bg-gray-100 transition font-medium">
                💼 Billetera Digital
              </link_1.default>
              <button onClick={() => setIsSchedulingOpen(true)} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded transition">
                📄 Dar cita
              </button>
              <button className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded transition">
                💳 Recibir pago
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation - Dentalink style */}
        <div className="container mx-auto px-4">
          <nav className="flex space-x-1 -mb-px">
            <button onClick={() => setActiveTab('personal')} className={`px-4 py-3 font-medium transition ${activeTab === 'personal'
            ? 'bg-white text-primary rounded-t-lg'
            : 'text-white/80 hover:text-white hover:bg-white/10'}`}>
              Datos personales
            </button>
            <button onClick={() => setActiveTab('clinical')} className={`px-4 py-3 font-medium transition ${activeTab === 'clinical'
            ? 'bg-white text-primary rounded-t-lg'
            : 'text-white/80 hover:text-white hover:bg-white/10'}`}>
              Ficha clínica
            </button>
            <button onClick={() => setActiveTab('history')} className={`px-4 py-3 font-medium transition ${activeTab === 'history'
            ? 'bg-white text-primary rounded-t-lg'
            : 'text-white/80 hover:text-white hover:bg-white/10'}`}>
              Historial
            </button>
            <button onClick={() => setActiveTab('documents')} className={`px-4 py-3 font-medium transition ${activeTab === 'documents'
            ? 'bg-white text-primary rounded-t-lg'
            : 'text-white/80 hover:text-white hover:bg-white/10'}`}>
              Documentos
            </button>
            <button onClick={() => setActiveTab('consents')} className={`px-4 py-3 font-medium transition ${activeTab === 'consents'
            ? 'bg-white text-primary rounded-t-lg'
            : 'text-white/80 hover:text-white hover:bg-white/10'}`}>
              Consentimientos
            </button>
            <button onClick={() => setActiveTab('ai')} className={`px-4 py-3 font-medium transition ${activeTab === 'ai'
            ? 'bg-white text-primary rounded-t-lg'
            : 'text-white/80 hover:text-white hover:bg-white/10'}`}>
              🤖 IA
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          {activeTab === 'personal' && (<div>
              <h2 className="text-xl font-bold mb-4">Datos Personales</h2>
              <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
                <p className="text-yellow-800">
                  ℹ️ Los datos personales están pseudonimizados. Solo se muestra información generalizada.
                </p>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Token ID</label>
                  <div className="p-2 bg-gray-50 rounded">{patient.tokenId}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Banda de Edad</label>
                  <div className="p-2 bg-gray-50 rounded">{patient.ageBand || 'N/A'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Región</label>
                  <div className="p-2 bg-gray-50 rounded">{patient.region || patient.state || 'N/A'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Última Visita</label>
                  <div className="p-2 bg-gray-50 rounded">
                    {patient.appointments?.[0]?.startTime
                ? new Date(patient.appointments[0].startTime).toLocaleDateString('es-ES')
                : 'N/A'}
                  </div>
                </div>
              </div>
            </div>)}

          {activeTab === 'clinical' && (<div>
              <h2 className="text-xl font-bold mb-4">Ficha Clínica</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Antecedentes Médicos</h3>
                  <div className="p-4 bg-gray-50 rounded">
                    <ul className="list-disc list-inside space-y-1">
                      <li>Diabetes tipo 2 diagnosticada en 2020-Q3</li>
                      <li>Hipertensión controlada</li>
                    </ul>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Medicamentos Actuales</h3>
                  <div className="p-4 bg-gray-50 rounded">
                    {patient.medications && patient.medications.length > 0 ? (<ul className="list-disc list-inside space-y-1">
                        {patient.medications.map((med) => (<li key={med.id}>
                            {med.name} {med.dose} - {med.frequency}
                          </li>))}
                      </ul>) : (<p className="text-gray-500">No hay medicamentos activos registrados.</p>)}
                  </div>
                </div>
              </div>
            </div>)}

          {activeTab === 'history' && (<div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Historial Clínico</h2>
                <button onClick={() => setIsClinicalNotesOpen(true)} className="px-6 py-3 bg-gradient-to-r from-primary to-purple-700 text-white rounded-lg hover:shadow-lg transition font-bold">
                  📝 Nueva Nota Clínica
                </button>
              </div>

              {/* Timeline of clinical notes - Dentalink style */}
              <div className="space-y-4">
                <div className="border-l-4 border-primary pl-4 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">Dr. M. Soria (#419)</span>
                    <span className="text-sm text-gray-500">Escrita el 28 de mayo de 2025 12:26</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">(a través de Administrador - Clínica Dentalente)</div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="font-medium">Plan de tratamiento #339:</p>
                    <p>Acción realizada: Control y Examen Periódico</p>
                    <p className="mt-2 text-gray-700">Paciente presenta buena evolución en control glucémico...</p>
                  </div>
                </div>

                <div className="border-l-4 border-gray-300 pl-4 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">Dra. A. González (#152)</span>
                    <span className="text-sm text-gray-500">Escrita el 20 de febrero de 2025 15:03</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="font-medium">Plan de tratamiento #190:</p>
                    <p>Acción avanzada (50%): Control y Examen Periódico</p>
                  </div>
                </div>
              </div>
            </div>)}

          {activeTab === 'consents' && <ConsentManager_1.default />}

          {activeTab === 'ai' && (<div>
              <h2 className="text-xl font-bold mb-4">🤖 Asistente de IA Clínica</h2>

              {/* CDS Disclaimer */}
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-6">
                <h3 className="font-bold text-yellow-900 mb-2">⚠️ Aviso Importante: Apoyo a la Decisión Clínica</h3>
                <p className="text-yellow-800 text-sm">
                  Este sistema proporciona apoyo a la decisión clínica (CDS) y NO es un dispositivo diagnóstico.
                  Las recomendaciones deben ser revisadas por un profesional médico calificado.
                  El usuario debe reconocer y aceptar esta limitación antes de usar el sistema.
                </p>
              </div>

              {/* Data Ingestion Component */}
              <div className="mb-8">
                <DataIngestion_1.default patientId={patientId} onContextUpdate={handleContextUpdate}/>
              </div>

              {/* Model Selection */}
              <div className="mb-6">
                <label className="block font-medium mb-2">Seleccionar Modelo LLM</label>
                <select className="w-full p-2 border border-gray-300 rounded">
                  <option>Claude 3.5 Sonnet (Anthropic)</option>
                  <option>GPT-4 (OpenAI)</option>
                  <option>Gemini Pro (Google)</option>
                  <option>Local Clinical Model</option>
                </select>
              </div>

              {/* Chat Interface */}
              <div className="border border-gray-300 rounded-lg">
                <div className="bg-gray-50 border-b border-gray-300 p-3">
                  <span className="font-medium">Chat con Contexto del Paciente</span>
                </div>
                <div className="h-96 p-4 overflow-y-auto space-y-4">
                  <div className="bg-blue-50 p-3 rounded-lg max-w-xl">
                    <p className="text-sm font-medium text-blue-900 mb-1">Sistema</p>
                    <p className="text-sm">
                      {aiContext}
                      {'\n\n'}
                      ¿En qué puedo ayudarte?
                    </p>
                  </div>
                </div>
                <div className="border-t border-gray-300 p-3">
                  <div className="flex space-x-2">
                    <input type="text" placeholder="Escribe tu pregunta clínica..." className="flex-1 p-2 border border-gray-300 rounded"/>
                    <button className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition">
                      Enviar
                    </button>
                  </div>
                </div>
              </div>

              {/* Acknowledgment */}
              <div className="mt-4">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="w-4 h-4"/>
                  <span className="text-sm">
                    Reconozco que esta herramienta es solo de apoyo y no reemplaza mi juicio clínico profesional
                  </span>
                </label>
              </div>
            </div>)}
        </div>
      </div>

      {/* Floating AI Chat Widget */}
      <button className="fixed bottom-6 right-6 w-14 h-14 bg-primary rounded-full shadow-lg flex items-center justify-center text-white text-2xl hover:bg-primary/90 transition">
        💬
      </button>

      {/* E-Prescribing Drawer */}
      <EPrescribingDrawer_1.default isOpen={isRxDrawerOpen} onClose={() => setIsRxDrawerOpen(false)} currentMedications={patient?.medications || []} patientId={patientId} clinicianId={patient?.assignedClinicianId || ''}/>

      {/* Scheduling Modal */}
      <SchedulingModal_1.default isOpen={isSchedulingOpen} onClose={() => setIsSchedulingOpen(false)}/>

      {/* Clinical Notes Editor */}
      {isClinicalNotesOpen && (<ClinicalNotesEditor_1.default patientId={patientId} clinicianId={patient?.assignedClinicianId || ''} patientName={displayName} onClose={() => setIsClinicalNotesOpen(false)} onSave={() => {
                setIsClinicalNotesOpen(false);
                // Refresh patient data to show new note
                window.location.reload();
            }}/>)}
    </div>);
}
//# sourceMappingURL=page.js.map