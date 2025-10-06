'use client';

/**
 * Settings Page - API Configuration & Preferences
 * Replaces manual .env editing with UI configuration
 *
 * Industry-grade settings management
 */

import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'ai' | 'communications' | 'preferences'>('ai');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // AI Settings
  const [aiConfig, setAiConfig] = useState({
    provider: 'claude',
    anthropicKey: '',
    openaiKey: '',
  });

  // Communications Settings
  const [commsConfig, setCommsConfig] = useState({
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioPhoneNumber: '',
    twilioWhatsAppNumber: '',
    resendApiKey: '',
    emailFrom: '',
  });

  // Load current settings
  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setAiConfig(data.data.ai || aiConfig);
          setCommsConfig(data.data.communications || commsConfig);
        }
      })
      .catch((err) => console.error('Failed to load settings:', err));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ai: aiConfig,
          communications: commsConfig,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSaveMessage('✅ Configuración guardada');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        setSaveMessage('❌ Error al guardar');
      }
    } catch (error) {
      setSaveMessage('❌ Error de conexión');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Configuración</h1>
          <p className="text-gray-600">
            Configura las integraciones de IA, comunicaciones y preferencias
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <button
                onClick={() => setActiveTab('ai')}
                className={`w-full text-left px-4 py-3 border-b border-gray-200 transition ${
                  activeTab === 'ai'
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                🤖 Inteligencia Artificial
              </button>
              <button
                onClick={() => setActiveTab('communications')}
                className={`w-full text-left px-4 py-3 border-b border-gray-200 transition ${
                  activeTab === 'communications'
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                📱 Comunicaciones
              </button>
              <button
                onClick={() => setActiveTab('preferences')}
                className={`w-full text-left px-4 py-3 transition ${
                  activeTab === 'preferences'
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                ⚙️ Preferencias
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {/* AI Settings */}
              {activeTab === 'ai' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                      Configuración de IA Médica
                    </h2>
                    <p className="text-sm text-gray-600 mb-6">
                      Conecta tu asistente de IA para soporte en decisiones clínicas
                    </p>
                  </div>

                  {/* Provider Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Proveedor de IA
                    </label>
                    <select
                      value={aiConfig.provider}
                      onChange={(e) => setAiConfig({ ...aiConfig, provider: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="claude">Claude 3.5 Sonnet (Recomendado para medicina)</option>
                      <option value="openai">OpenAI GPT-4</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      💡 Claude es HIPAA compliant y mejor para razonamiento médico
                    </p>
                  </div>

                  {/* Anthropic API Key */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Anthropic API Key
                    </label>
                    <input
                      type="password"
                      value={aiConfig.anthropicKey}
                      onChange={(e) => setAiConfig({ ...aiConfig, anthropicKey: e.target.value })}
                      placeholder="sk-ant-api03-..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Obtén tu clave en{' '}
                      <a
                        href="https://console.anthropic.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        console.anthropic.com
                      </a>
                    </p>
                  </div>

                  {/* OpenAI API Key */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      OpenAI API Key (Opcional)
                    </label>
                    <input
                      type="password"
                      value={aiConfig.openaiKey}
                      onChange={(e) => setAiConfig({ ...aiConfig, openaiKey: e.target.value })}
                      placeholder="sk-..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Obtén tu clave en{' '}
                      <a
                        href="https://platform.openai.com/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        platform.openai.com
                      </a>
                    </p>
                  </div>

                  {/* Info Box */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">
                      ¿Por qué necesito una API key?
                    </h3>
                    <p className="text-sm text-blue-800 mb-2">
                      Las claves API te permiten usar IA de manera segura y privada:
                    </p>
                    <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                      <li>Tus datos médicos nunca se comparten con terceros</li>
                      <li>Control total sobre uso y costos (~$15-75/mes)</li>
                      <li>Cumplimiento HIPAA con Anthropic Claude</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Communications Settings */}
              {activeTab === 'communications' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                      Configuración de Comunicaciones
                    </h2>
                    <p className="text-sm text-gray-600 mb-6">
                      Envía recordatorios automáticos por WhatsApp, SMS y Email
                    </p>
                  </div>

                  {/* Twilio WhatsApp */}
                  <div className="border-b border-gray-200 pb-6">
                    <h3 className="font-semibold text-gray-900 mb-3">📱 WhatsApp & SMS (Twilio)</h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Account SID
                        </label>
                        <input
                          type="text"
                          value={commsConfig.twilioAccountSid}
                          onChange={(e) =>
                            setCommsConfig({ ...commsConfig, twilioAccountSid: e.target.value })
                          }
                          placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Auth Token
                        </label>
                        <input
                          type="password"
                          value={commsConfig.twilioAuthToken}
                          onChange={(e) =>
                            setCommsConfig({ ...commsConfig, twilioAuthToken: e.target.value })
                          }
                          placeholder="********************************"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Número de Teléfono
                        </label>
                        <input
                          type="text"
                          value={commsConfig.twilioPhoneNumber}
                          onChange={(e) =>
                            setCommsConfig({ ...commsConfig, twilioPhoneNumber: e.target.value })
                          }
                          placeholder="+1234567890"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          WhatsApp Number
                        </label>
                        <input
                          type="text"
                          value={commsConfig.twilioWhatsAppNumber}
                          onChange={(e) =>
                            setCommsConfig({
                              ...commsConfig,
                              twilioWhatsAppNumber: e.target.value,
                            })
                          }
                          placeholder="whatsapp:+14155238886"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Usa el sandbox de Twilio para pruebas
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 mt-4">
                      Configura Twilio en{' '}
                      <a
                        href="https://console.twilio.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        console.twilio.com
                      </a>
                    </p>
                  </div>

                  {/* Resend Email */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">📧 Email (Resend)</h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Resend API Key
                        </label>
                        <input
                          type="password"
                          value={commsConfig.resendApiKey}
                          onChange={(e) =>
                            setCommsConfig({ ...commsConfig, resendApiKey: e.target.value })
                          }
                          placeholder="re_..."
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email From
                        </label>
                        <input
                          type="text"
                          value={commsConfig.emailFrom}
                          onChange={(e) =>
                            setCommsConfig({ ...commsConfig, emailFrom: e.target.value })
                          }
                          placeholder="Holi Labs <notifications@holilabs.com>"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 mt-4">
                      Configura Resend en{' '}
                      <a
                        href="https://resend.com/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        resend.com
                      </a>{' '}
                      (HIPAA compliant)
                    </p>
                  </div>
                </div>
              )}

              {/* Preferences */}
              {activeTab === 'preferences' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Preferencias</h2>
                    <p className="text-sm text-gray-600 mb-6">
                      Personaliza tu experiencia en Holi Labs
                    </p>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      🚧 Más opciones de preferencias próximamente (idioma, zona horaria,
                      notificaciones, etc.)
                    </p>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="flex items-center justify-between pt-6 border-t border-gray-200 mt-8">
                {saveMessage && (
                  <p
                    className={`text-sm font-medium ${
                      saveMessage.includes('✅') ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {saveMessage}
                  </p>
                )}
                <div className="ml-auto">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={`px-6 py-3 bg-gradient-to-r from-primary to-purple-700 text-white font-semibold rounded-lg transition-all ${
                      isSaving
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:shadow-lg hover:scale-105'
                    }`}
                  >
                    {isSaving ? 'Guardando...' : 'Guardar Configuración'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
