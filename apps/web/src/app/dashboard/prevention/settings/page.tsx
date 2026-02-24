'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings,
  Bell,
  Mail,
  Smartphone,
  MessageSquare,
  Monitor,
  Moon,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';

interface ChannelSettings {
  in_app: boolean;
  push: boolean;
  email: boolean;
  sms: boolean;
}

interface NotificationType {
  enabled: boolean;
  channels: ChannelSettings;
  reminderDays?: number[];
}

interface QuietHours {
  enabled: boolean;
  start: string;
  end: string;
  timezone: string;
}

interface Preferences {
  conditionDetected: NotificationType;
  screeningReminder: NotificationType & { reminderDays: number[] };
  screeningOverdue: NotificationType;
  screeningResult: NotificationType;
  planUpdated: NotificationType;
  quietHours?: QuietHours;
}

const DEFAULT_PREFERENCES: Preferences = {
  conditionDetected: {
    enabled: true,
    channels: { in_app: true, push: true, email: true, sms: false },
  },
  screeningReminder: {
    enabled: true,
    channels: { in_app: true, push: true, email: true, sms: true },
    reminderDays: [7, 3, 1],
  },
  screeningOverdue: {
    enabled: true,
    channels: { in_app: true, push: true, email: true, sms: true },
  },
  screeningResult: {
    enabled: true,
    channels: { in_app: true, push: true, email: true, sms: false },
  },
  planUpdated: {
    enabled: true,
    channels: { in_app: true, push: false, email: true, sms: false },
  },
};

const NOTIFICATION_TYPES: Array<{
  key: keyof Omit<Preferences, 'quietHours'>;
  label: string;
  description: string;
}> = [
  {
    key: 'conditionDetected',
    label: 'Condición Detectada',
    description: 'Cuando se detecta una nueva condición preventiva en un paciente',
  },
  {
    key: 'screeningReminder',
    label: 'Recordatorio de Tamizaje',
    description: 'Recordatorios antes de la fecha programada de tamizaje',
  },
  {
    key: 'screeningOverdue',
    label: 'Tamizaje Atrasado',
    description: 'Cuando un tamizaje supera su fecha límite',
  },
  {
    key: 'screeningResult',
    label: 'Resultado de Tamizaje',
    description: 'Cuando llegan resultados de un tamizaje preventivo',
  },
  {
    key: 'planUpdated',
    label: 'Plan Actualizado',
    description: 'Cuando se actualiza un plan de prevención',
  },
];

const CHANNEL_CONFIG = [
  { key: 'in_app' as const, label: 'En App', icon: Monitor },
  { key: 'push' as const, label: 'Push', icon: Smartphone },
  { key: 'email' as const, label: 'Email', icon: Mail },
  { key: 'sms' as const, label: 'SMS', icon: MessageSquare },
];

export default function PreventionSettingsPage() {
  const router = useRouter();
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [quietHours, setQuietHours] = useState<QuietHours>({
    enabled: false,
    start: '22:00',
    end: '07:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/prevention/notifications/preferences');
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to load preferences');
      }

      const data = result.data.preferences;

      // Merge with defaults to ensure complete structure
      setPreferences({
        conditionDetected: { ...DEFAULT_PREFERENCES.conditionDetected, ...data.conditionDetected },
        screeningReminder: { ...DEFAULT_PREFERENCES.screeningReminder, ...data.screeningReminder },
        screeningOverdue: { ...DEFAULT_PREFERENCES.screeningOverdue, ...data.screeningOverdue },
        screeningResult: { ...DEFAULT_PREFERENCES.screeningResult, ...data.screeningResult },
        planUpdated: { ...DEFAULT_PREFERENCES.planUpdated, ...data.planUpdated },
      });

      if (data.quietHours) {
        setQuietHours((prev) => ({ ...prev, ...data.quietHours }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/prevention/notifications/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...preferences,
          quietHours,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save preferences');
      }

      setSuccess('Preferencias guardadas exitosamente');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const toggleNotificationType = (key: keyof Omit<Preferences, 'quietHours'>) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        enabled: !prev[key].enabled,
      },
    }));
  };

  const toggleChannel = (
    typeKey: keyof Omit<Preferences, 'quietHours'>,
    channelKey: keyof ChannelSettings
  ) => {
    setPreferences((prev) => ({
      ...prev,
      [typeKey]: {
        ...prev[typeKey],
        channels: {
          ...prev[typeKey].channels,
          [channelKey]: !prev[typeKey].channels[channelKey],
        },
      },
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Cargando preferencias...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard/prevention')}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3">
                <Settings className="w-8 h-8 text-gray-600 dark:text-gray-400" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Preferencias de Notificaciones
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Configura cómo y cuándo recibir notificaciones de prevención
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Status Messages */}
        {error && (
          <div className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-lg border border-red-200 dark:border-red-800">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-center space-x-2 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 px-4 py-3 rounded-lg border border-green-200 dark:border-green-800">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Notification Types */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <Bell className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Tipos de Notificación
              </h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Activa o desactiva notificaciones y selecciona los canales para cada tipo
            </p>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {NOTIFICATION_TYPES.map((notifType) => {
              const pref = preferences[notifType.key];
              return (
                <div key={notifType.key} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {notifType.label}
                        </h3>
                        <button
                          onClick={() => toggleNotificationType(notifType.key)}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            pref.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              pref.enabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {notifType.description}
                      </p>
                    </div>
                  </div>

                  {/* Channel Toggles */}
                  {pref.enabled && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {CHANNEL_CONFIG.map((channel) => {
                        const isActive = pref.channels[channel.key];
                        const Icon = channel.icon;
                        return (
                          <button
                            key={channel.key}
                            onClick={() => toggleChannel(notifType.key, channel.key)}
                            className={`flex items-center space-x-2 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                              isActive
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                                : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{channel.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Quiet Hours */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Moon className="w-5 h-5 text-indigo-600" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Horas de Silencio
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                  Pausar notificaciones durante horarios específicos
                </p>
              </div>
            </div>
            <button
              onClick={() => setQuietHours((prev) => ({ ...prev, enabled: !prev.enabled }))}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                quietHours.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  quietHours.enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {quietHours.enabled && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Hora de Inicio
                </label>
                <input
                  type="time"
                  value={quietHours.start}
                  onChange={(e) => setQuietHours((prev) => ({ ...prev, start: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Hora de Fin
                </label>
                <input
                  type="time"
                  value={quietHours.end}
                  onChange={(e) => setQuietHours((prev) => ({ ...prev, end: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Zona Horaria
                </label>
                <input
                  type="text"
                  value={quietHours.timezone}
                  onChange={(e) => setQuietHours((prev) => ({ ...prev, timezone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  readOnly
                />
              </div>
            </div>
          )}
        </div>

        {/* Save Button (bottom) */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-2 px-8 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Guardar Preferencias</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
