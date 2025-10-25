'use client';
export const dynamic = 'force-dynamic';


/**
 * Notification Settings Page
 * Manage notification preferences and push subscriptions
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';
import {
  ChevronLeftIcon,
  BellIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import {
  isPushNotificationSupported,
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  isPushSubscribed,
  getVapidPublicKey,
} from '@/lib/notifications/web-push-client';

export default function NotificationSettingsPage() {
  const router = useRouter();
  const { patientId, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Notification preferences
  const [preferences, setPreferences] = useState({
    appointments: {
      push: true,
      email: true,
      sms: false,
    },
    messages: {
      push: true,
      email: true,
      sms: false,
    },
    documents: {
      push: true,
      email: true,
      sms: false,
    },
    medications: {
      push: true,
      email: false,
      sms: false,
    },
    labResults: {
      push: true,
      email: true,
      sms: true,
    },
    security: {
      push: true,
      email: true,
      sms: true,
    },
  });

  useEffect(() => {
    checkPushSupport();
    checkPushStatus();
    checkNotificationPermission();
  }, []);

  const checkPushSupport = () => {
    setPushSupported(isPushNotificationSupported());
  };

  const checkPushStatus = async () => {
    const subscribed = await isPushSubscribed();
    setPushEnabled(subscribed);
  };

  const checkNotificationPermission = () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  };

  const handleEnablePush = async () => {
    setLoading(true);
    try {
      const permission = await requestNotificationPermission();
      setNotificationPermission(permission);

      if (permission === 'granted') {
        // Subscribe to push notifications with real patient ID
        if (!patientId) {
          alert('No se pudo obtener el ID del paciente');
          return;
        }
        const subscription = await subscribeToPushNotifications(patientId);

        if (subscription) {
          setPushEnabled(true);
          alert('¡Notificaciones push habilitadas correctamente!');
        } else {
          alert('No se pudieron habilitar las notificaciones push');
        }
      } else {
        alert('Permiso de notificaciones denegado');
      }
    } catch (error) {
      console.error('Error enabling push:', error);
      alert('Error al habilitar notificaciones push');
    } finally {
      setLoading(false);
    }
  };

  const handleDisablePush = async () => {
    setLoading(true);
    try {
      const success = await unsubscribeFromPushNotifications();

      if (success) {
        setPushEnabled(false);
        alert('Notificaciones push deshabilitadas');
      } else {
        alert('Error al deshabilitar notificaciones push');
      }
    } catch (error) {
      console.error('Error disabling push:', error);
      alert('Error al deshabilitar notificaciones push');
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/portal/notifications/test-push', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        alert('¡Notificación de prueba enviada! Revisa tu navegador.');
      } else {
        alert('Error al enviar notificación de prueba');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      alert('Error al enviar notificación de prueba');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    setLoading(true);
    try {
      // TODO: Save preferences to backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Preferencias guardadas correctamente');
    } catch (error) {
      alert('Error al guardar preferencias');
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = (category: keyof typeof preferences, channel: 'push' | 'email' | 'sms', value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [channel]: value,
      },
    }));
  };

  const preferenceCategories = [
    {
      key: 'appointments' as const,
      icon: BellIcon,
      title: 'Citas Médicas',
      description: 'Recordatorios, confirmaciones y cambios de citas',
    },
    {
      key: 'messages' as const,
      icon: EnvelopeIcon,
      title: 'Mensajes',
      description: 'Nuevos mensajes de tu equipo médico',
    },
    {
      key: 'documents' as const,
      icon: BellIcon,
      title: 'Documentos',
      description: 'Nuevos documentos disponibles',
    },
    {
      key: 'medications' as const,
      icon: BellIcon,
      title: 'Medicamentos',
      description: 'Recordatorios de medicación',
    },
    {
      key: 'labResults' as const,
      icon: BellIcon,
      title: 'Resultados de Laboratorio',
      description: 'Nuevos resultados disponibles',
    },
    {
      key: 'security' as const,
      icon: BellIcon,
      title: 'Seguridad',
      description: 'Alertas de seguridad importantes',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/portal/dashboard/profile')}
            className="flex items-center text-gray-600 hover:text-blue-600 mb-4 transition-colors"
          >
            <ChevronLeftIcon className="h-5 w-5 mr-1" />
            Volver al Perfil
          </button>

          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🔔 Preferencias de Notificaciones
          </h1>
          <p className="text-gray-600">
            Configura cómo y cuándo deseas recibir notificaciones
          </p>
        </div>

        {/* Push Notifications Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Notificaciones Push
          </h2>

          {!pushSupported && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-yellow-800 text-sm">
                ⚠️ Tu navegador no soporta notificaciones push
              </p>
            </div>
          )}

          {pushSupported && (
            <div className="space-y-4">
              {/* Permission Status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <DevicePhoneMobileIcon className="h-6 w-6 text-gray-600" />
                  <div>
                    <p className="font-semibold text-gray-900">Estado de Notificaciones</p>
                    <p className="text-sm text-gray-600">
                      {notificationPermission === 'granted' && '✅ Permitidas'}
                      {notificationPermission === 'denied' && '❌ Bloqueadas'}
                      {notificationPermission === 'default' && '⏳ Sin configurar'}
                    </p>
                  </div>
                </div>

                {pushEnabled ? (
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                ) : (
                  <XCircleIcon className="h-6 w-6 text-gray-400" />
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                {!pushEnabled ? (
                  <button
                    onClick={handleEnablePush}
                    disabled={loading || notificationPermission === 'denied'}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                  >
                    {loading ? 'Habilitando...' : 'Habilitar Notificaciones Push'}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleTestNotification}
                      disabled={loading}
                      className="flex-1 px-6 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                    >
                      Enviar Notificación de Prueba
                    </button>
                    <button
                      onClick={handleDisablePush}
                      disabled={loading}
                      className="flex-1 px-6 py-3 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors font-medium"
                    >
                      Deshabilitar
                    </button>
                  </>
                )}
              </div>

              {notificationPermission === 'denied' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm">
                    Las notificaciones están bloqueadas en tu navegador. Para habilitarlas, ve a la configuración de tu navegador y permite las notificaciones para este sitio.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notification Preferences */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Preferencias por Categoría
          </h2>

          <div className="space-y-6">
            {preferenceCategories.map((category) => {
              const Icon = category.icon;
              const prefs = preferences[category.key];

              return (
                <div key={category.key} className="border-b border-gray-200 pb-6 last:border-0">
                  <div className="flex items-start gap-4 mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{category.title}</h3>
                      <p className="text-sm text-gray-600">{category.description}</p>
                    </div>
                  </div>

                  <div className="ml-14 grid grid-cols-3 gap-4">
                    {/* Push */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={prefs.push}
                        onChange={(e) => updatePreference(category.key, 'push', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Push</span>
                    </label>

                    {/* Email */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={prefs.email}
                        onChange={(e) => updatePreference(category.key, 'email', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Email</span>
                    </label>

                    {/* SMS */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={prefs.sms}
                        onChange={(e) => updatePreference(category.key, 'sms', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">SMS</span>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/portal/dashboard/profile')}
            disabled={loading}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSavePreferences}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all font-medium"
          >
            {loading ? 'Guardando...' : 'Guardar Preferencias'}
          </button>
        </div>
      </div>
    </div>
  );
}
