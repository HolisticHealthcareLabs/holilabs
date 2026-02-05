'use client';
export const dynamic = 'force-dynamic';


/**
 * Calendar Integration Page
 * Conecta Google Calendar, Microsoft Outlook, o Apple Calendar
 * para gestionar citas de pacientes directamente en la app
 */

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

type CalendarProvider = 'google' | 'microsoft' | 'apple';

interface CalendarIntegration {
  id?: string;
  provider: CalendarProvider;
  connected: boolean;
  email?: string;
  lastSync?: string;
  calendarName?: string;
}

function AppointmentsContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<CalendarProvider | null>(null);
  const [showAppleModal, setShowAppleModal] = useState(false);
  const [appleCredentials, setAppleCredentials] = useState({ appleId: '', appPassword: '' });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [integrations, setIntegrations] = useState<CalendarIntegration[]>([
    { provider: 'google', connected: false },
    { provider: 'microsoft', connected: false },
    { provider: 'apple', connected: false },
  ]);

  // Load integration status on mount
  useEffect(() => {
    fetchIntegrationStatus();
  }, []);

  // Check for OAuth callback messages
  useEffect(() => {
    const success = searchParams?.get('success');
    const error = searchParams?.get('error');

    if (success === 'google_connected') {
      setMessage({ type: 'success', text: 'Google Calendar conectado exitosamente' });
      fetchIntegrationStatus();
    } else if (success === 'microsoft_connected') {
      setMessage({ type: 'success', text: 'Microsoft Outlook conectado exitosamente' });
      fetchIntegrationStatus();
    } else if (error) {
      setMessage({ type: 'error', text: `Error: ${error.replace(/_/g, ' ')}` });
    }

    // Clear message after 5 seconds
    if (success || error) {
      setTimeout(() => setMessage(null), 5000);
    }
  }, [searchParams]);

  const fetchIntegrationStatus = async () => {
    try {
      const response = await fetch('/api/calendar/status');
      const data = await response.json();

      if (data.success) {
        setIntegrations([
          {
            provider: 'google',
            connected: !!data.data.google,
            email: data.data.google?.calendarEmail,
            lastSync: data.data.google?.lastSyncAt,
            calendarName: data.data.google?.calendarName,
          },
          {
            provider: 'microsoft',
            connected: !!data.data.microsoft,
            email: data.data.microsoft?.calendarEmail,
            lastSync: data.data.microsoft?.lastSyncAt,
            calendarName: data.data.microsoft?.calendarName,
          },
          {
            provider: 'apple',
            connected: !!data.data.apple,
            email: data.data.apple?.calendarEmail,
            lastSync: data.data.apple?.lastSyncAt,
            calendarName: data.data.apple?.calendarName,
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch calendar status:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectCalendar = async (provider: CalendarProvider) => {
    setSelectedProvider(provider);

    if (provider === 'google') {
      // Redirect to Google OAuth
      window.location.href = '/api/calendar/google/authorize';
    } else if (provider === 'microsoft') {
      // Redirect to Microsoft OAuth
      window.location.href = '/api/calendar/microsoft/authorize';
    } else if (provider === 'apple') {
      // Show Apple credentials modal
      setShowAppleModal(true);
      setSelectedProvider(null);
    }
  };

  const connectAppleCalendar = async () => {
    if (!appleCredentials.appleId || !appleCredentials.appPassword) {
      setMessage({ type: 'error', text: 'Por favor completa todos los campos' });
      return;
    }

    setSelectedProvider('apple');

    try {
      const response = await fetch('/api/calendar/apple/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appleCredentials),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Apple Calendar conectado exitosamente' });
        setShowAppleModal(false);
        setAppleCredentials({ appleId: '', appPassword: '' });
        fetchIntegrationStatus();
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al conectar Apple Calendar' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al conectar Apple Calendar' });
    } finally {
      setSelectedProvider(null);
    }
  };

  const disconnectCalendar = async (provider: CalendarProvider) => {
    if (!confirm(`¿Estás seguro de desconectar ${getProviderName(provider)}?`)) {
      return;
    }

    setSelectedProvider(provider);

    try {
      const response = await fetch(`/api/calendar/${provider}/disconnect`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: `${getProviderName(provider)} desconectado exitosamente` });
        fetchIntegrationStatus();
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al desconectar' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al desconectar calendario' });
    } finally {
      setSelectedProvider(null);
    }
  };

  const getProviderIcon = (provider: CalendarProvider) => {
    switch (provider) {
      case 'google':
        return '🔵';
      case 'microsoft':
        return '🟦';
      case 'apple':
        return '⚫';
    }
  };

  const getProviderName = (provider: CalendarProvider) => {
    switch (provider) {
      case 'google':
        return 'Google Calendar';
      case 'microsoft':
        return 'Microsoft Outlook';
      case 'apple':
        return 'Apple Calendar';
    }
  };

  const getProviderColor = (provider: CalendarProvider) => {
    switch (provider) {
      case 'google':
        return 'from-blue-500 to-blue-600';
      case 'microsoft':
        return 'from-sky-500 to-blue-600';
      case 'apple':
        return 'from-gray-700 to-gray-900';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="container mx-auto px-6 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Link
              href="/dashboard"
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              ← Regresar
            </Link>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            📅 Gestión de Citas
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Conecta tu calendario para gestionar citas de pacientes de forma automática
          </p>
        </div>

        {/* Message Banner */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-300'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Features */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 mb-8 border border-blue-100 dark:border-blue-800">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">✨ Beneficios de la Integración</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-3">
              <span className="text-2xl">🔄</span>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Sincronización Automática</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Tus citas se actualizan en tiempo real en ambas plataformas
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">⏰</span>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Recordatorios Automáticos</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Los pacientes reciben notificaciones antes de su cita
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">👥</span>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Gestión Centralizada</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Administra todas tus citas desde un solo lugar
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">🔒</span>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Seguro y Privado</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Cumple con estándares HIPAA de privacidad médica
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Integrations */}
        <div className="grid md:grid-cols-3 gap-6">
          {integrations.map((integration) => {
            const isProcessing = selectedProvider === integration.provider;
            return (
              <div
                key={integration.provider}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <div className={`h-2 bg-gradient-to-r ${getProviderColor(integration.provider)}`} />
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-4xl">{getProviderIcon(integration.provider)}</span>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">
                          {getProviderName(integration.provider)}
                        </h3>
                        {integration.connected && (
                          <p className="text-xs text-green-600 dark:text-green-400 font-medium">✓ Conectado</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {integration.connected ? (
                    <div className="space-y-3">
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Cuenta</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{integration.email}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Última sincronización</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {integration.lastSync
                            ? new Date(integration.lastSync).toLocaleString('es-ES', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'N/A'}
                        </p>
                      </div>
                      <button
                        onClick={() => disconnectCalendar(integration.provider)}
                        disabled={isProcessing}
                        className="w-full px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                      >
                        {isProcessing ? 'Desconectando...' : 'Desconectar'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => connectCalendar(integration.provider)}
                      disabled={isProcessing || loading}
                      className={`w-full px-6 py-3 font-semibold text-white rounded-lg transition-all ${
                        isProcessing || loading
                          ? 'bg-gray-400 cursor-not-allowed'
                          : `bg-gradient-to-r ${getProviderColor(integration.provider)} hover:shadow-lg transform hover:scale-105`
                      }`}
                    >
                      {isProcessing ? (
                        <span className="flex items-center justify-center space-x-2">
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          <span>Conectando...</span>
                        </span>
                      ) : (
                        `Conectar con ${getProviderName(integration.provider)}`
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">📖 Cómo funciona</h3>
          <ol className="space-y-3">
            <li className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-bold">
                1
              </span>
              <p className="text-gray-700 dark:text-gray-300">
                Selecciona el calendario que deseas conectar (Google, Microsoft, o Apple)
              </p>
            </li>
            <li className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-bold">
                2
              </span>
              <p className="text-gray-700 dark:text-gray-300">
                Autoriza el acceso a tu calendario desde la ventana de autenticación
              </p>
            </li>
            <li className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-bold">
                3
              </span>
              <p className="text-gray-700 dark:text-gray-300">
                Una vez conectado, todas tus citas se sincronizarán automáticamente
              </p>
            </li>
            <li className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-bold">
                4
              </span>
              <p className="text-gray-700 dark:text-gray-300">
                Gestiona las citas de tus pacientes directamente desde Holi Labs
              </p>
            </li>
          </ol>
        </div>

        {/* Apple Calendar Modal */}
        {showAppleModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Conectar Apple Calendar
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Para conectar Apple Calendar, necesitas generar una contraseña específica de app desde tu cuenta de iCloud.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Apple ID
                  </label>
                  <input
                    type="email"
                    value={appleCredentials.appleId}
                    onChange={(e) => setAppleCredentials({ ...appleCredentials, appleId: e.target.value })}
                    placeholder="tu@icloud.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Contraseña específica de app
                  </label>
                  <input
                    type="password"
                    value={appleCredentials.appPassword}
                    onChange={(e) => setAppleCredentials({ ...appleCredentials, appPassword: e.target.value })}
                    placeholder="xxxx-xxxx-xxxx-xxxx"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <a
                      href="https://support.apple.com/es-es/HT204397"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      ¿Cómo generar una contraseña específica?
                    </a>
                  </p>
                </div>
              </div>
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowAppleModal(false);
                    setAppleCredentials({ appleId: '', appPassword: '' });
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={connectAppleCalendar}
                  disabled={!appleCredentials.appleId || !appleCredentials.appPassword}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-gray-700 to-gray-900 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Conectar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Support */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            ¿Necesitas ayuda? {' '}
            <Link href="/dashboard/settings" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
              Contacta soporte técnico
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AppointmentsPage() {
  return (
    <Suspense fallback={<div className="p-6">Cargando...</div>}>
      <AppointmentsContent />
    </Suspense>
  );
}
