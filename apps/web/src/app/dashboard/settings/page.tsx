'use client';
export const dynamic = 'force-dynamic';


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
    provider: 'gemini', // Default: Gemini (per user request)
    useCustomApiKey: false, // BYOK toggle
    geminiApiKey: '',
    anthropicKey: '',
    openaiKey: '',
    deepgramApiKey: '', // Transcription
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
                      Conecta tu asistente de IA para análisis de historiales médicos y planes de prevención
                    </p>
                  </div>

                  {/* BYOK Toggle */}
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">
                          🔑 Bring Your Own Key (BYOK)
                        </h3>
                        <p className="text-sm text-gray-600">
                          Usa tus propias claves API para control total y costos optimizados
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={aiConfig.useCustomApiKey}
                          onChange={(e) =>
                            setAiConfig({ ...aiConfig, useCustomApiKey: e.target.checked })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>

                  {!aiConfig.useCustomApiKey && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-sm text-green-800">
                        ✅ <strong>Modo Compartido:</strong> Usarás las claves API de Holi Labs (incluidas en tu suscripción). Límites de uso aplican según tu plan.
                      </p>
                    </div>
                  )}

                  {aiConfig.useCustomApiKey && (
                    <>
                      {/* Provider Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Proveedor de IA Principal
                        </label>
                        <select
                          value={aiConfig.provider}
                          onChange={(e) => setAiConfig({ ...aiConfig, provider: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        >
                          <option value="gemini">Google Gemini 1.5 Flash (Recomendado - Costo-efectivo)</option>
                          <option value="claude">Claude 3.5 Sonnet (Mayor calidad clínica)</option>
                          <option value="openai">OpenAI GPT-4 Turbo</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          💡 Gemini 1.5 Flash: ~$50/mes | Claude: ~$150/mes | GPT-4: ~$100/mes
                        </p>
                      </div>

                      {/* Gemini API Key */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Google Gemini API Key {aiConfig.provider === 'gemini' && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="password"
                          value={aiConfig.geminiApiKey}
                          onChange={(e) => setAiConfig({ ...aiConfig, geminiApiKey: e.target.value })}
                          placeholder="AIzaSy..."
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Obtén tu clave en{' '}
                          <a
                            href="https://aistudio.google.com/app/apikey"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            aistudio.google.com/apikey
                          </a>{' '}
                          (Gratis: 15 requests/min)
                        </p>
                      </div>

                      {/* Anthropic API Key */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Anthropic Claude API Key {aiConfig.provider === 'claude' && <span className="text-red-500">*</span>}
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
                          </a>{' '}
                          (HIPAA compliant)
                        </p>
                      </div>

                      {/* OpenAI API Key */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          OpenAI API Key {aiConfig.provider === 'openai' && <span className="text-red-500">*</span>}
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

                      {/* Transcription Keys */}
                      <div className="border-t border-gray-200 pt-6">
                        <h3 className="font-semibold text-gray-900 mb-4">
                          🎙️ Transcripción de Audio (Opcional)
                        </h3>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Deepgram API Key (Recomendado para español)
                            </label>
                            <input
                              type="password"
                              value={aiConfig.deepgramApiKey}
                              onChange={(e) =>
                                setAiConfig({ ...aiConfig, deepgramApiKey: e.target.value })
                              }
                              placeholder="••••••••••••••••••"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Obtén tu clave en{' '}
                              <a
                                href="https://console.deepgram.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                console.deepgram.com
                              </a>{' '}
                              (~$0.0043/min)
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Info Box - Security & De-identification */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-3">
                      🔒 Seguridad y Privacidad Médica (BYOK)
                    </h3>
                    <p className="text-sm text-blue-800 mb-3">
                      Las claves API te permiten usar IA de manera segura y privada:
                    </p>
                    <ul className="text-sm text-blue-800 space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold">✓</span>
                        <span>Información médica <strong>de-identificada</strong> con AWS Comprehend Medical (F1 &gt; 0.95)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold">✓</span>
                        <span>API keys <strong>encriptadas en reposo</strong> con AES-256 en PostgreSQL</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold">✓</span>
                        <span>Cumplimiento HIPAA con Anthropic Claude (BAA disponible)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold">✓</span>
                        <span>Control total: tus keys, tus costos, sin límites de uso</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold">✓</span>
                        <span>Auditoría completa de acceso a API keys (CREATED, ACCESSED, ROTATED, FAILED)</span>
                      </li>
                    </ul>
                    <div className="mt-4 pt-4 border-t border-blue-200">
                      <p className="text-xs text-blue-900 leading-relaxed">
                        <strong>Seguridad de Claves:</strong> API keys nunca se almacenan en texto plano. Se encriptan usando el encryption master key de tu organización antes de guardarlas en la base de datos. Solo usuarios autorizados pueden acceder a ellas, y cada acceso se registra para auditoría.
                      </p>
                      <p className="text-xs text-blue-700 mt-2">
                        💡 <strong>Basado en:</strong> GitHub Models BYOK, Auth0 Tenant Key Management, OpenAI Best Practices
                      </p>
                    </div>
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
