'use client';
export const dynamic = 'force-dynamic';


import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PreventionHubSidebar } from '@/components/prevention/PreventionHubSidebar';

// Mock patient data
const PATIENTS = [
  {
    id: 'pt-001',
    name: 'María González',
    age: '45-54',
    ageNumeric: 50,
    gender: 'female' as const,
    condition: 'Diabetes Tipo 2',
    lastVisit: '2025-01-15',
    status: 'active',
    emoji: '👩',
    summary: 'Paciente con diabetes tipo 2, hipertensión controlada. Última HbA1c: 7.2%',
    medications: [
      { name: 'Metformin 1000mg', startDate: new Date('2023-06-15') },
      { name: 'Lisinopril 10mg', startDate: new Date('2024-01-20') },
      { name: 'Atorvastatin 20mg', startDate: new Date('2024-03-10') },
    ],
    icd10Codes: ['E11.9', 'I10'], // Type 2 diabetes, Essential hypertension
    labValues: {
      hba1c: 7.2,
      ldl: 120,
      systolicBP: 135,
      diastolicBP: 85,
    } as Record<string, number>,
  },
  {
    id: 'pt-002',
    name: 'Carlos Silva',
    age: '60-69',
    ageNumeric: 65,
    gender: 'male' as const,
    condition: 'Post-IAM',
    lastVisit: '2025-01-10',
    status: 'monitoring',
    emoji: '👨',
    summary: 'Recuperación post-infarto. Función cardiaca estable. EF: 45%',
    medications: [
      { name: 'Aspirin 81mg', startDate: new Date('2024-08-01') },
      { name: 'Atorvastatin 80mg', startDate: new Date('2024-08-01') },
      { name: 'Metoprolol 50mg', startDate: new Date('2024-08-01') },
      { name: 'Lisinopril 20mg', startDate: new Date('2024-08-05') },
    ],
    icd10Codes: ['I21.9', 'I25.10', 'I50.9'], // MI, Coronary artery disease, Heart failure
    labValues: {
      ldl: 85,
      systolicBP: 128,
      diastolicBP: 78,
      ejectionFraction: 45,
    } as Record<string, number>,
  },
  {
    id: 'pt-003',
    name: 'Ana Rodríguez',
    age: '30-39',
    ageNumeric: 35,
    gender: 'female' as const,
    condition: 'Asma',
    lastVisit: '2025-01-20',
    status: 'stable',
    emoji: '👩‍🦰',
    summary: 'Asma moderada persistente. Buen control con tratamiento actual',
    medications: [
      { name: 'Fluticasone inhaler', startDate: new Date('2022-03-10') },
      { name: 'Albuterol inhaler PRN', startDate: new Date('2022-03-10') },
    ],
    icd10Codes: ['J45.40'], // Moderate persistent asthma
    labValues: {} as Record<string, number>,
  },
  {
    id: 'pt-004',
    name: 'Fatima Hassan',
    age: '25-34',
    ageNumeric: 28,
    gender: 'female' as const,
    condition: 'Sickle Cell Disease',
    lastVisit: '2025-01-18',
    status: 'monitoring',
    emoji: '👩🏾',
    summary: 'Enfermedad de células falciformes (HbSS). Actualmente embarazada (16 semanas). Dolor controlado con hidroxiurea.',
    medications: [
      { name: 'Hydroxyurea 500mg', startDate: new Date('2020-05-10') },
      { name: 'Folic acid 5mg', startDate: new Date('2024-10-15') },
    ],
    icd10Codes: ['D57.1', 'Z34.00'], // Sickle cell disease with crisis, Pregnant state
    labValues: {
      hemoglobin: 9.2,
      fetalHemoglobin: 18.5,
    } as Record<string, number>,
    isPregnant: true,
  },
];

const LLM_MODELS = [
  { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI', icon: '🤖' },
  { id: 'claude-3', name: 'Claude 3 Opus', provider: 'Anthropic', icon: '🧠' },
  { id: 'gemini-pro', name: 'Gemini Pro', provider: 'Google', icon: '✨' },
  { id: 'local', name: 'Modelo Local Clínico', provider: 'Local', icon: '🏥' },
];

type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
};

export default function AICopilotPage() {
  const router = useRouter();
  const [selectedPatient, setSelectedPatient] = useState(PATIENTS[0]);
  const [selectedModel, setSelectedModel] = useState(LLM_MODELS[0]);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'system',
      content: `Contexto del paciente cargado: ${selectedPatient.name}, ${selectedPatient.age} años, ${selectedPatient.condition}. ${selectedPatient.summary}`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showApiSetup, setShowApiSetup] = useState(false);
  const [clinicalNoteContext, setClinicalNoteContext] = useState('');

  // Initialize clinical context when patient is selected
  useEffect(() => {
    // Build initial clinical context from patient summary
    const initialContext = `${selectedPatient.summary}`;
    setClinicalNoteContext(initialContext);
  }, [selectedPatient]);

  const handleSendMessage = () => {
    if (!input.trim() || !isConnected) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages([...messages, userMessage]);

    // Accumulate clinical context for prevention hub detection
    setClinicalNoteContext((prev) => prev + '\n' + input);

    setInput('');

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `[${selectedModel.name}] Respuesta simulada para: "${input}". En producción, esto llamará a la API real del LLM seleccionado con el contexto del paciente ${selectedPatient.name}.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);

      // Add AI response to clinical context as well
      setClinicalNoteContext((prev) => prev + '\n' + aiMessage.content);
    }, 1000);
  };

  const handleConnectAPI = () => {
    if (apiKey.trim()) {
      setIsConnected(true);
      setShowApiSetup(false);
      const systemMsg: Message = {
        id: Date.now().toString(),
        role: 'system',
        content: `✅ Conectado a ${selectedModel.name}. API Key: ${apiKey.substring(0, 8)}...`,
        timestamp: new Date(),
      };
      setMessages([...messages, systemMsg]);
    }
  };

  const handleProtocolApply = async (protocol: any) => {
    try {
      // Show loading message
      const loadingMsg: Message = {
        id: Date.now().toString(),
        role: 'system',
        content: `⏳ Aplicando protocolo "${protocol.name}"...`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, loadingMsg]);

      // Call API to create prevention plan
      const response = await fetch('/api/prevention/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          protocol,
        }),
      });

      const result = await response.json();

      // Remove loading message
      setMessages((prev) => prev.filter((m) => m.id !== loadingMsg.id));

      if (result.success) {
        // Add success message
        const successMsg: Message = {
          id: Date.now().toString(),
          role: 'system',
          content: `✅ Protocolo aplicado exitosamente: "${protocol.name}"\n\n📋 Plan de prevención creado para ${selectedPatient.name}\n• ${protocol.interventions.length} intervenciones agregadas\n• Fuente: ${protocol.source} ${protocol.guidelineVersion}\n• Nivel de evidencia: Grade ${protocol.evidenceGrade}\n\nID del Plan: ${result.data.preventionPlanId}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, successMsg]);
      } else {
        // Add error message
        const errorMsg: Message = {
          id: Date.now().toString(),
          role: 'system',
          content: `❌ Error al aplicar protocolo: ${result.error || 'Unknown error'}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (error) {
      console.error('Error applying prevention protocol:', error);

      // Add error message
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: 'system',
        content: `❌ Error de conexión al aplicar protocolo. Por favor, intente nuevamente.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
  };

  const handleViewFullHub = () => {
    // Navigate to prevention plans history page
    router.push(`/dashboard/prevention/plans?patientId=${selectedPatient.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-3xl">🦾</div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Copilot</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Asistente clínico inteligente • Holi Labs</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/dashboard/prevention/plans?patientId=${selectedPatient.id}`}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <span>🛡️</span>
                <span>Ver Planes de Prevención</span>
              </Link>
              <button
                onClick={() => setShowApiSetup(!showApiSetup)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  isConnected
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                }`}
              >
                {isConnected ? '✓ Conectado' : '⚠ Configurar API'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* API Setup Modal */}
      {showApiSetup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              Conectar {selectedModel.name}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Tu API key se almacena localmente y nunca se comparte. Solo se usa para conectar con {selectedModel.provider}.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleConnectAPI}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium"
                >
                  Conectar
                </button>
                <button
                  onClick={() => setShowApiSetup(false)}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Patient Selector Card */}
          <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg text-gray-900 dark:text-white">Pacientes</h2>
              <Link
                href="/dashboard/patients"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Ver todos
              </Link>
            </div>

            <input
              type="text"
              placeholder="Buscar paciente..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm mb-4 dark:bg-gray-700 dark:text-white"
            />

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {PATIENTS.map((patient) => (
                <button
                  key={patient.id}
                  onClick={() => {
                    setSelectedPatient(patient);
                    setClinicalNoteContext(''); // Reset clinical context for new patient
                    setMessages([
                      {
                        id: Date.now().toString(),
                        role: 'system',
                        content: `Contexto del paciente cargado: ${patient.name}, ${patient.age} años, ${patient.condition}. ${patient.summary}`,
                        timestamp: new Date(),
                      },
                    ]);
                  }}
                  className={`w-full p-3 rounded-lg text-left transition-all ${
                    selectedPatient.id === patient.id
                      ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border-2 border-blue-500'
                      : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl">{patient.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 dark:text-white truncate">
                        {patient.name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {patient.condition}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {patient.age} años
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Chat Interface */}
          <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col" style={{ height: '75vh' }}>
            {/* Patient Context Header */}
            <div className="border-b border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-3xl">{selectedPatient.emoji}</div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      {selectedPatient.name}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedPatient.summary}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1 font-medium">
                    Modelo LLM
                  </label>
                  <select
                    value={selectedModel.id}
                    onChange={(e) => {
                      const model = LLM_MODELS.find((m) => m.id === e.target.value)!;
                      setSelectedModel(model);
                      setIsConnected(false);
                    }}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                  >
                    {LLM_MODELS.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.icon} {model.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* CDS Warning Banner */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 p-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                ⚠️ <strong>Apoyo a la Decisión Clínica (CDS):</strong> Este sistema NO es diagnóstico. Todas las
                recomendaciones deben ser validadas por un profesional médico.
              </p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900/50">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-2xl rounded-2xl p-4 ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                        : message.role === 'system'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-800'
                        : 'bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white'
                    }`}
                  >
                    <div className="text-xs font-medium mb-2 opacity-75">
                      {message.role === 'user' ? 'Tú' : message.role === 'system' ? 'Sistema' : selectedModel.name}
                    </div>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {message.content}
                    </div>
                    <div className="text-xs mt-2 opacity-50">
                      {message.timestamp.toLocaleTimeString('es-MX', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
              <div className="flex gap-3 mb-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={
                    isConnected
                      ? `Pregunta sobre ${selectedPatient.name}...`
                      : 'Configura tu API key primero...'
                  }
                  disabled={!isConnected}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-700 dark:bg-gray-700 dark:text-white"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!isConnected || !input.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all"
                >
                  Enviar
                </button>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>
                  {isConnected ? `✓ Conectado a ${selectedModel.name}` : '⚠ No conectado'}
                </span>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" className="rounded dark:bg-gray-700 dark:border-gray-600" />
                  <span>Reconozco que esto es solo apoyo, no diagnóstico</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
            <div className="flex items-center space-x-3">
              <div className="text-3xl">💊</div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">Sugerir Medicación</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Recomendaciones basadas en evidencia
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-800 rounded-2xl p-4">
            <div className="flex items-center space-x-3">
              <div className="text-3xl">🔬</div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">Análisis de Laboratorio</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Interpretación de resultados
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-800 rounded-2xl p-4">
            <div className="flex items-center space-x-3">
              <div className="text-3xl">📋</div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">Diagnóstico Diferencial</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Lista de posibilidades clínicas
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Prevention Hub Sidebar - Real-time protocol suggestions */}
      <PreventionHubSidebar
        patientId={selectedPatient.id}
        patientData={{
          age: selectedPatient.ageNumeric,
          gender: selectedPatient.gender,
          isPregnant: (selectedPatient as any).isPregnant,
          labValues: selectedPatient.labValues,
        }}
        clinicalNote={clinicalNoteContext}
        medications={selectedPatient.medications || []}
        icd10Codes={selectedPatient.icd10Codes || []}
        onProtocolApply={handleProtocolApply}
        onViewFullHub={handleViewFullHub}
      />
    </div>
  );
}
