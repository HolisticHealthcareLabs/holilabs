"use strict";
/**
 * Settings Page
 *
 * Beautiful settings interface for patient preferences and configuration
 */
'use client';
/**
 * Settings Page
 *
 * Beautiful settings interface for patient preferences and configuration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SettingsPage;
const react_1 = require("react");
const framer_motion_1 = require("framer-motion");
const navigation_1 = require("next/navigation");
function SettingsPage() {
    const router = (0, navigation_1.useRouter)();
    const [activeTab, setActiveTab] = (0, react_1.useState)('preferences');
    const [saving, setSaving] = (0, react_1.useState)(false);
    const [success, setSuccess] = (0, react_1.useState)(false);
    // Settings state
    const [settings, setSettings] = (0, react_1.useState)({
        preferences: {
            language: 'es',
            theme: 'light',
            timezone: 'America/Mexico_City',
        },
        notifications: {
            email: {
                appointments: true,
                medications: true,
                results: true,
                newsletters: false,
            },
            sms: {
                appointments: true,
                medications: true,
                results: false,
            },
            push: {
                appointments: true,
                medications: true,
                messages: true,
            },
        },
        privacy: {
            shareDataForResearch: false,
            allowMarketingCommunications: false,
        },
    });
    const handleSave = async () => {
        setSaving(true);
        setSuccess(false);
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setSaving(false);
        setSuccess(true);
        setTimeout(() => {
            setSuccess(false);
        }, 3000);
    };
    const handleLogout = async () => {
        if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
            // In production, call logout API
            router.push('/portal/login');
        }
    };
    return (<div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            Configuración
          </h1>
          <p className="text-gray-600">
            Gestiona tus preferencias y configuración de cuenta
          </p>
        </div>

        {/* Success Banner */}
        {success && (<framer_motion_1.motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
            </svg>
            <p className="text-green-800 font-medium">
              Configuración guardada correctamente
            </p>
          </framer_motion_1.motion.div>)}

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
          <div className="flex overflow-x-auto border-b border-gray-200">
            <button onClick={() => setActiveTab('preferences')} className={`flex-1 px-6 py-4 font-semibold text-sm whitespace-nowrap transition-all ${activeTab === 'preferences'
            ? 'bg-green-50 text-green-600 border-b-2 border-green-600'
            : 'text-gray-600 hover:bg-gray-50'}`}>
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                Preferencias
              </span>
            </button>
            <button onClick={() => setActiveTab('notifications')} className={`flex-1 px-6 py-4 font-semibold text-sm whitespace-nowrap transition-all ${activeTab === 'notifications'
            ? 'bg-green-50 text-green-600 border-b-2 border-green-600'
            : 'text-gray-600 hover:bg-gray-50'}`}>
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                </svg>
                Notificaciones
              </span>
            </button>
            <button onClick={() => setActiveTab('security')} className={`flex-1 px-6 py-4 font-semibold text-sm whitespace-nowrap transition-all ${activeTab === 'security'
            ? 'bg-green-50 text-green-600 border-b-2 border-green-600'
            : 'text-gray-600 hover:bg-gray-50'}`}>
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
                Seguridad
              </span>
            </button>
            <button onClick={() => setActiveTab('privacy')} className={`flex-1 px-6 py-4 font-semibold text-sm whitespace-nowrap transition-all ${activeTab === 'privacy'
            ? 'bg-green-50 text-green-600 border-b-2 border-green-600'
            : 'text-gray-600 hover:bg-gray-50'}`}>
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                </svg>
                Privacidad
              </span>
            </button>
          </div>

          <div className="p-6">
            {/* Preferences Tab */}
            {activeTab === 'preferences' && (<framer_motion_1.motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Idioma
                  </label>
                  <select value={settings.preferences.language} onChange={(e) => setSettings({
                ...settings,
                preferences: { ...settings.preferences, language: e.target.value },
            })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                    <option value="es">Español</option>
                    <option value="en">English</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Tema
                  </label>
                  <select value={settings.preferences.theme} onChange={(e) => setSettings({
                ...settings,
                preferences: { ...settings.preferences, theme: e.target.value },
            })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                    <option value="light">Claro</option>
                    <option value="dark">Oscuro</option>
                    <option value="auto">Automático</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Zona Horaria
                  </label>
                  <select value={settings.preferences.timezone} onChange={(e) => setSettings({
                ...settings,
                preferences: { ...settings.preferences, timezone: e.target.value },
            })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                    <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
                    <option value="America/Monterrey">Monterrey (GMT-6)</option>
                    <option value="America/Tijuana">Tijuana (GMT-8)</option>
                  </select>
                </div>
              </framer_motion_1.motion.div>)}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (<framer_motion_1.motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                {/* Email Notifications */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Notificaciones por Email
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(settings.notifications.email).map(([key, value]) => (<label key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {key === 'appointments' ? 'Citas' : key === 'medications' ? 'Medicamentos' : key === 'results' ? 'Resultados' : 'Boletines'}
                        </span>
                        <input type="checkbox" checked={value} onChange={(e) => setSettings({
                    ...settings,
                    notifications: {
                        ...settings.notifications,
                        email: { ...settings.notifications.email, [key]: e.target.checked },
                    },
                })} className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"/>
                      </label>))}
                  </div>
                </div>

                {/* SMS Notifications */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Notificaciones por SMS
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(settings.notifications.sms).map(([key, value]) => (<label key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {key === 'appointments' ? 'Citas' : key === 'medications' ? 'Medicamentos' : 'Resultados'}
                        </span>
                        <input type="checkbox" checked={value} onChange={(e) => setSettings({
                    ...settings,
                    notifications: {
                        ...settings.notifications,
                        sms: { ...settings.notifications.sms, [key]: e.target.checked },
                    },
                })} className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"/>
                      </label>))}
                  </div>
                </div>

                {/* Push Notifications */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Notificaciones Push (App Móvil)
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(settings.notifications.push).map(([key, value]) => (<label key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {key === 'appointments' ? 'Citas' : key === 'medications' ? 'Medicamentos' : 'Mensajes'}
                        </span>
                        <input type="checkbox" checked={value} onChange={(e) => setSettings({
                    ...settings,
                    notifications: {
                        ...settings.notifications,
                        push: { ...settings.notifications.push, [key]: e.target.checked },
                    },
                })} className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"/>
                      </label>))}
                  </div>
                </div>
              </framer_motion_1.motion.div>)}

            {/* Security Tab */}
            {activeTab === 'security' && (<framer_motion_1.motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <svg className="w-6 h-6 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                    </svg>
                    <div>
                      <h3 className="text-lg font-bold text-green-900 mb-1">
                        Tu cuenta está segura
                      </h3>
                      <p className="text-sm text-green-800">
                        Usamos autenticación sin contraseña (Magic Link) para mayor seguridad
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Sesión Actual
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Última sesión iniciada: Hoy
                  </p>
                  <button onClick={handleLogout} className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all">
                    Cerrar Sesión
                  </button>
                </div>
              </framer_motion_1.motion.div>)}

            {/* Privacy Tab */}
            {activeTab === 'privacy' && (<framer_motion_1.motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Uso de Datos
                  </h3>
                  <div className="space-y-3">
                    <label className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                      <input type="checkbox" checked={settings.privacy.shareDataForResearch} onChange={(e) => setSettings({
                ...settings,
                privacy: { ...settings.privacy, shareDataForResearch: e.target.checked },
            })} className="mt-1 w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"/>
                      <div>
                        <p className="text-sm font-medium text-gray-900 mb-1">
                          Compartir datos para investigación médica
                        </p>
                        <p className="text-xs text-gray-600">
                          Tus datos serán anonimizados y usados para mejorar tratamientos médicos
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                      <input type="checkbox" checked={settings.privacy.allowMarketingCommunications} onChange={(e) => setSettings({
                ...settings,
                privacy: { ...settings.privacy, allowMarketingCommunications: e.target.checked },
            })} className="mt-1 w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"/>
                      <div>
                        <p className="text-sm font-medium text-gray-900 mb-1">
                          Recibir comunicaciones de marketing
                        </p>
                        <p className="text-xs text-gray-600">
                          Ofertas especiales y novedades sobre servicios de salud
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-blue-900 mb-3">
                    🔒 Tu privacidad es importante
                  </h3>
                  <p className="text-sm text-blue-800">
                    Todos tus datos médicos están encriptados y protegidos según las normas HIPAA.
                    Lee nuestra{' '}
                    <a href="#" className="underline font-semibold">
                      Política de Privacidad
                    </a>
                    {' '}para más información.
                  </p>
                </div>
              </framer_motion_1.motion.div>)}
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <button onClick={handleSave} disabled={saving} className="px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            {saving ? (<>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                Guardando...
              </>) : (<>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                </svg>
                Guardar Cambios
              </>)}
          </button>
        </div>
      </div>
    </div>);
}
//# sourceMappingURL=page.js.map