'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

// Mock patient data - 3 user stories
const PATIENTS = [
  {
    id: 'pt-001',
    name: 'María González',
    age: '45-54',
    condition: 'Diabetes Tipo 2',
    lastVisit: '2025-01-15',
    status: 'active',
    emoji: '👩',
    summary: 'Paciente con diabetes tipo 2, hipertensión controlada. Última HbA1c: 7.2%',
  },
  {
    id: 'pt-002',
    name: 'Carlos Silva',
    age: '60-69',
    condition: 'Post-IAM',
    lastVisit: '2025-01-10',
    status: 'monitoring',
    emoji: '👨',
    summary: 'Recuperación post-infarto. Función cardiaca estable. EF: 45%',
  },
  {
    id: 'pt-003',
    name: 'Ana Rodríguez',
    age: '30-39',
    condition: 'Asma',
    lastVisit: '2025-01-20',
    status: 'stable',
    emoji: '👩‍🦰',
    summary: 'Asma moderada persistente. Buen control con tratamiento actual',
  },
];

const LLM_MODELS = [
  { id: 'gpt-4', name: 'GPT-4 (OpenAI)', provider: 'OpenAI' },
  { id: 'claude-3', name: 'Claude 3 Opus (Anthropic)', provider: 'Anthropic' },
  { id: 'gemini-pro', name: 'Gemini Pro (Google)', provider: 'Google' },
  { id: 'local', name: 'Modelo Local Clínico', provider: 'Local' },
];

type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
};

export default function AIPage() {
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

  const handleSendMessage = () => {
    if (!input.trim() || !isConnected) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages([...messages, userMessage]);
    setInput('');

    // Simulate AI response (in production, call actual API)
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `[${selectedModel.name}] Respuesta simulada para: "${input}". En producción, esto llamará a la API real del LLM seleccionado con el contexto del paciente ${selectedPatient.name}.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
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

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Nav */}
      <header className="bg-primary text-white shadow-md">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="flex items-center space-x-3">
                <Image src="/logos/holi-light.svg" alt="Holi Labs" width={40} height={40} className="h-10 w-auto" />
                <span className="text-xl font-bold">VidaBanq</span>
              </Link>
              <span className="text-sm opacity-80">/ Asistente IA Clínico</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowApiSetup(!showApiSetup)}
                className={`px-4 py-2 rounded ${
                  isConnected ? 'bg-green-500' : 'bg-yellow-500'
                } hover:opacity-90`}
              >
                {isConnected ? '✓ Conectado' : '⚠ Configurar API'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* API Setup Modal */}
      {showApiSetup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Conectar {selectedModel.name}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <p className="text-sm text-gray-600">
                Tu API key se almacena localmente y nunca se comparte. Solo se usa para conectar con {selectedModel.provider}.
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={handleConnectAPI}
                  className="flex-1 bg-primary text-white px-4 py-2 rounded hover:bg-primary/90"
                >
                  Conectar
                </button>
                <button
                  onClick={() => setShowApiSetup(false)}
                  className="flex-1 bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Patient List */}
        <div className="w-80 bg-white border-r flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-bold text-lg mb-2">Pacientes</h2>
            <input
              type="text"
              placeholder="Buscar paciente..."
              className="w-full px-3 py-2 border rounded text-sm"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {PATIENTS.map((patient) => (
              <button
                key={patient.id}
                onClick={() => {
                  setSelectedPatient(patient);
                  setMessages([
                    {
                      id: Date.now().toString(),
                      role: 'system',
                      content: `Contexto del paciente cargado: ${patient.name}, ${patient.age} años, ${patient.condition}. ${patient.summary}`,
                      timestamp: new Date(),
                    },
                  ]);
                }}
                className={`w-full p-4 border-b hover:bg-gray-50 text-left transition ${
                  selectedPatient.id === patient.id ? 'bg-blue-50 border-l-4 border-l-primary' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="text-3xl">{patient.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{patient.name}</div>
                    <div className="text-sm text-gray-600 truncate">{patient.condition}</div>
                    <div className="text-xs text-gray-500 mt-1">{patient.age} años</div>
                    <div className={`text-xs mt-1 inline-block px-2 py-0.5 rounded ${
                      patient.status === 'active' ? 'bg-green-100 text-green-700' :
                      patient.status === 'monitoring' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {patient.status === 'active' ? 'Activo' : patient.status === 'monitoring' ? 'Monitoreo' : 'Estable'}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="p-4 border-t bg-gray-50">
            <Link
              href="/dashboard/patients"
              className="block text-center text-primary hover:underline text-sm"
            >
              + Ver todos los pacientes
            </Link>
          </div>
        </div>

        {/* Right Panel - Chat Interface */}
        <div className="flex-1 flex flex-col">
          {/* Patient Header */}
          <div className="bg-white border-b p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-4xl">{selectedPatient.emoji}</div>
                <div>
                  <h2 className="text-xl font-bold">{selectedPatient.name}</h2>
                  <p className="text-sm text-gray-600">{selectedPatient.summary}</p>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Modelo LLM</label>
                <select
                  value={selectedModel.id}
                  onChange={(e) => {
                    const model = LLM_MODELS.find((m) => m.id === e.target.value)!;
                    setSelectedModel(model);
                    setIsConnected(false);
                  }}
                  className="px-3 py-2 border rounded text-sm"
                >
                  {LLM_MODELS.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* CDS Warning Banner */}
          <div className="bg-yellow-50 border-b border-yellow-200 p-3">
            <p className="text-sm text-yellow-800">
              ⚠️ <strong>Apoyo a la Decisión Clínica (CDS):</strong> Este sistema NO es diagnóstico. Todas las
              recomendaciones deben ser validadas por un profesional médico.
            </p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-2xl rounded-lg p-4 ${
                    message.role === 'user'
                      ? 'bg-primary text-white'
                      : message.role === 'system'
                      ? 'bg-blue-100 text-blue-900 border border-blue-200'
                      : 'bg-white shadow-sm border'
                  }`}
                >
                  <div className="text-sm mb-1 opacity-75">
                    {message.role === 'user' ? 'Tú' : message.role === 'system' ? 'Sistema' : selectedModel.name}
                  </div>
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  <div className="text-xs mt-2 opacity-50">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="bg-white border-t p-4">
            <div className="flex space-x-2">
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
                className="flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
              />
              <button
                onClick={handleSendMessage}
                disabled={!isConnected || !input.trim()}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Enviar
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <span>
                {isConnected ? `✓ Conectado a ${selectedModel.name}` : '⚠ No conectado'}
              </span>
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="rounded" />
                <span>Reconozco que esto es solo apoyo, no diagnóstico</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
