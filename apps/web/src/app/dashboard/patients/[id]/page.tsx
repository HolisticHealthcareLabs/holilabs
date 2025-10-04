'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import EPrescribingDrawer from '@/components/patient/EPrescribingDrawer';
import ConsentManager from '@/components/patient/ConsentManager';
import SchedulingModal from '@/components/patient/SchedulingModal';
import DataIngestion from '@/components/patient/DataIngestion';

type Tab = 'personal' | 'clinical' | 'history' | 'documents' | 'consents' | 'ai';

export default function PatientProfile() {
  const params = useParams();
  const patientId = params.id as string;
  const [activeTab, setActiveTab] = useState<Tab>('clinical');
  const [isRxDrawerOpen, setIsRxDrawerOpen] = useState(false);
  const [isSchedulingOpen, setIsSchedulingOpen] = useState(false);
  const [aiContext, setAiContext] = useState<string>('Banda de edad 30-39, Diabetes tipo 2, Medicación activa.');

  // Mock data - in production, fetch from API
  const patient = {
    id: patientId,
    firstName: 'María',
    lastName: 'González García',
    tokenId: 'PT-892a-4f3e-b1c2',
    age: '30-39',
    lastVisit: '2025-Q1',
    region: 'SP',
    alerts: ['Diabetes'],
    medications: [
      { id: '1', name: 'Metformina', dose: '500mg', frequency: '2x/día' },
      { id: '2', name: 'Enalapril', dose: '10mg', frequency: '1x/día' },
    ],
  };

  const fullName = `${patient.firstName} ${patient.lastName}`.trim();
  const displayName = fullName || `Paciente ${patient.tokenId}`;

  const handleContextUpdate = (metadata: any) => {
    // Update AI context with new data
    const timestamp = new Date().toLocaleString('es-ES');
    const newContext = `Contexto actualizado [${timestamp}]: ${aiContext} Nuevos datos: ${metadata.dataType} (${metadata.metrics.map((m: any) => `${m.code} ${m.value}${m.unit}`).join(', ')})`;
    setAiContext(newContext);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with patient info banner - Dentalink style */}
      <div className="bg-gradient-to-r from-primary to-blue-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
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
                <span className="mr-4">Banda de edad: {patient.age}</span>
                <span className="mr-4">Última visita: {patient.lastVisit}</span>
                <span>Región: {patient.region}</span>
              </div>

              {/* Medical Alerts - Interactive Pills */}
              <div className="mt-3 flex space-x-3">
                <button className="bg-yellow-500 px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 hover:bg-yellow-600 transition shadow-sm hover:shadow-md">
                  <span>⚠️</span>
                  <span>Alertas médicas:</span>
                  <span>{patient.alerts.join(', ')}</span>
                </button>
                <button
                  onClick={() => setIsRxDrawerOpen(true)}
                  className="bg-green-500 px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 hover:bg-green-600 transition shadow-sm hover:shadow-md"
                >
                  <span>💊</span>
                  <span>Medicamentos:</span>
                  <span>{patient.medications.map(m => m.name).join(', ')}</span>
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
              <Link
                href={`/dashboard/patients/${patientId}/wallet`}
                className="bg-white text-primary px-4 py-2 rounded hover:bg-gray-100 transition font-medium"
              >
                💼 Billetera Digital
              </Link>
              <button
                onClick={() => setIsSchedulingOpen(true)}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded transition"
              >
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
            <button
              onClick={() => setActiveTab('personal')}
              className={`px-4 py-3 font-medium transition ${
                activeTab === 'personal'
                  ? 'bg-white text-primary rounded-t-lg'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              Datos personales
            </button>
            <button
              onClick={() => setActiveTab('clinical')}
              className={`px-4 py-3 font-medium transition ${
                activeTab === 'clinical'
                  ? 'bg-white text-primary rounded-t-lg'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              Ficha clínica
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-3 font-medium transition ${
                activeTab === 'history'
                  ? 'bg-white text-primary rounded-t-lg'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              Historial
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-4 py-3 font-medium transition ${
                activeTab === 'documents'
                  ? 'bg-white text-primary rounded-t-lg'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              Documentos
            </button>
            <button
              onClick={() => setActiveTab('consents')}
              className={`px-4 py-3 font-medium transition ${
                activeTab === 'consents'
                  ? 'bg-white text-primary rounded-t-lg'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              Consentimientos
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`px-4 py-3 font-medium transition ${
                activeTab === 'ai'
                  ? 'bg-white text-primary rounded-t-lg'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              🤖 IA
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          {activeTab === 'personal' && (
            <div>
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
                  <div className="p-2 bg-gray-50 rounded">{patient.age}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Región</label>
                  <div className="p-2 bg-gray-50 rounded">{patient.region}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Última Visita</label>
                  <div className="p-2 bg-gray-50 rounded">{patient.lastVisit}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'clinical' && (
            <div>
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
                    <ul className="list-disc list-inside space-y-1">
                      {patient.medications.map((med) => (
                        <li key={med.id}>
                          {med.name} {med.dose} - {med.frequency}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Historial Clínico</h2>
                <button className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition">
                  + Nueva Evolución
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
            </div>
          )}

          {activeTab === 'consents' && <ConsentManager />}

          {activeTab === 'ai' && (
            <div>
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
                <DataIngestion patientId={patientId} onContextUpdate={handleContextUpdate} />
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
                    <input
                      type="text"
                      placeholder="Escribe tu pregunta clínica..."
                      className="flex-1 p-2 border border-gray-300 rounded"
                    />
                    <button className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition">
                      Enviar
                    </button>
                  </div>
                </div>
              </div>

              {/* Acknowledgment */}
              <div className="mt-4">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="w-4 h-4" />
                  <span className="text-sm">
                    Reconozco que esta herramienta es solo de apoyo y no reemplaza mi juicio clínico profesional
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating AI Chat Widget */}
      <button className="fixed bottom-6 right-6 w-14 h-14 bg-primary rounded-full shadow-lg flex items-center justify-center text-white text-2xl hover:bg-primary/90 transition">
        💬
      </button>

      {/* E-Prescribing Drawer */}
      <EPrescribingDrawer
        isOpen={isRxDrawerOpen}
        onClose={() => setIsRxDrawerOpen(false)}
        currentMedications={patient.medications}
      />

      {/* Scheduling Modal */}
      <SchedulingModal
        isOpen={isSchedulingOpen}
        onClose={() => setIsSchedulingOpen(false)}
      />
    </div>
  );
}
