"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SecurityPage;
/**
 * Security & Session Activity Page
 * View active sessions, login history, and security events
 */
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
const outline_1 = require("@heroicons/react/24/outline");
function SecurityPage() {
    const router = (0, navigation_1.useRouter)();
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [loginHistory, setLoginHistory] = (0, react_1.useState)([]);
    const [securityEvents, setSecurityEvents] = (0, react_1.useState)([]);
    const [currentSession, setCurrentSession] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        fetchSecurityData();
    }, []);
    const fetchSecurityData = async () => {
        try {
            setLoading(true);
            // TODO: Implement actual API endpoint
            // For now, showing mock data
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 800));
            // Mock current session
            setCurrentSession({
                id: 'current',
                ipAddress: '192.168.1.100',
                userAgent: navigator.userAgent,
                location: 'Ciudad de México, México',
                lastActivity: new Date().toISOString(),
                deviceType: 'desktop',
            });
            // Mock login history (last 10 logins)
            const mockHistory = Array.from({ length: 10 }, (_, i) => ({
                id: `login-${i}`,
                timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
                ipAddress: `192.168.1.${100 + i}`,
                userAgent: navigator.userAgent,
                location: i % 3 === 0 ? 'Ciudad de México, México' : i % 3 === 1 ? 'Guadalajara, México' : 'Monterrey, México',
                success: i !== 5, // One failed attempt
                deviceType: i % 2 === 0 ? 'desktop' : 'mobile',
            }));
            setLoginHistory(mockHistory);
            // Mock security events
            setSecurityEvents([
                {
                    id: 'event-1',
                    type: 'password_changed',
                    title: 'Contraseña cambiada',
                    description: 'Tu contraseña fue actualizada exitosamente',
                    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                    severity: 'info',
                },
            ]);
        }
        catch (error) {
            console.error('Error fetching security data:', error);
        }
        finally {
            setLoading(false);
        }
    };
    const getDeviceIcon = (deviceType) => {
        switch (deviceType) {
            case 'mobile':
            case 'tablet':
                return <outline_1.DevicePhoneMobileIcon className="h-5 w-5"/>;
            default:
                return <outline_1.ComputerDesktopIcon className="h-5 w-5"/>;
        }
    };
    const getDeviceLabel = (userAgent) => {
        if (userAgent.includes('iPhone'))
            return 'iPhone';
        if (userAgent.includes('iPad'))
            return 'iPad';
        if (userAgent.includes('Android'))
            return 'Android';
        if (userAgent.includes('Mac'))
            return 'Mac';
        if (userAgent.includes('Windows'))
            return 'Windows';
        return 'Desconocido';
    };
    const getBrowserLabel = (userAgent) => {
        if (userAgent.includes('Chrome'))
            return 'Chrome';
        if (userAgent.includes('Safari'))
            return 'Safari';
        if (userAgent.includes('Firefox'))
            return 'Firefox';
        if (userAgent.includes('Edge'))
            return 'Edge';
        return 'Desconocido';
    };
    if (loading) {
        return (<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>);
    }
    return (<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button onClick={() => router.push('/portal/dashboard/profile')} className="flex items-center text-gray-600 hover:text-blue-600 mb-4 transition-colors">
            <outline_1.ChevronLeftIcon className="h-5 w-5 mr-1"/>
            Volver al Perfil
          </button>

          <div className="flex items-center gap-3 mb-2">
            <outline_1.ShieldCheckIcon className="h-8 w-8 text-blue-600"/>
            <h1 className="text-4xl font-bold text-gray-900">
              Seguridad y Actividad
            </h1>
          </div>
          <p className="text-gray-600">
            Revisa tu actividad de inicio de sesión y eventos de seguridad
          </p>
        </div>

        {/* Current Session */}
        {currentSession && (<div className="bg-white rounded-xl shadow-sm border-2 border-green-200 p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <outline_1.ShieldCheckIcon className="h-6 w-6 text-green-600"/>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Sesión Actual</h2>
                <p className="text-sm text-green-600">Activa ahora</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                {getDeviceIcon(currentSession.deviceType)}
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {getDeviceLabel(currentSession.userAgent)}
                  </p>
                  <p className="text-xs text-gray-600">
                    {getBrowserLabel(currentSession.userAgent)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <outline_1.MapPinIcon className="h-5 w-5 text-gray-400"/>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {currentSession.location || currentSession.ipAddress}
                  </p>
                  <p className="text-xs text-gray-600">
                    IP: {currentSession.ipAddress}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <outline_1.ClockIcon className="h-5 w-5 text-gray-400"/>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Última actividad
                  </p>
                  <p className="text-xs text-gray-600">
                    {(0, date_fns_1.format)(new Date(currentSession.lastActivity), "d 'de' MMMM, HH:mm", {
                locale: locale_1.es,
            })}
                  </p>
                </div>
              </div>
            </div>
          </div>)}

        {/* Security Events */}
        {securityEvents.length > 0 && (<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Eventos de Seguridad Recientes
            </h2>

            <div className="space-y-4">
              {securityEvents.map((event) => (<div key={event.id} className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <outline_1.ShieldCheckIcon className="h-5 w-5 text-blue-600"/>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{event.title}</p>
                    <p className="text-sm text-gray-600">{event.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {(0, date_fns_1.format)(new Date(event.timestamp), "d 'de' MMMM 'a las' HH:mm", {
                    locale: locale_1.es,
                })}
                    </p>
                  </div>
                </div>))}
            </div>
          </div>)}

        {/* Login History */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Historial de Inicios de Sesión
          </h2>

          <div className="space-y-3">
            {loginHistory.map((login) => (<div key={login.id} className={`flex items-center gap-4 p-4 rounded-lg border ${login.success
                ? 'bg-white border-gray-200'
                : 'bg-red-50 border-red-200'}`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${login.success
                ? 'bg-gray-100 text-gray-600'
                : 'bg-red-100 text-red-600'}`}>
                  {login.success ? (getDeviceIcon(login.deviceType)) : (<outline_1.ExclamationTriangleIcon className="h-5 w-5"/>)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900">
                      {getDeviceLabel(login.userAgent)} · {getBrowserLabel(login.userAgent)}
                    </p>
                    {!login.success && (<span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                        Fallido
                      </span>)}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <outline_1.MapPinIcon className="h-3 w-3"/>
                      {login.location || login.ipAddress}
                    </span>
                    <span className="flex items-center gap-1">
                      <outline_1.ClockIcon className="h-3 w-3"/>
                      {(0, date_fns_1.format)(new Date(login.timestamp), "d MMM, HH:mm", {
                locale: locale_1.es,
            })}
                    </span>
                  </div>
                </div>
              </div>))}
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 mt-6">
          <p className="text-sm text-blue-800">
            <strong>💡 Consejo de seguridad:</strong> Si ves actividad sospechosa o inicios de sesión que no reconoces, cambia tu contraseña inmediatamente y contacta al soporte.
          </p>
        </div>
      </div>
    </div>);
}
//# sourceMappingURL=page.js.map