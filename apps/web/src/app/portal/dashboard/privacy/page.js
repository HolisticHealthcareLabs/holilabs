"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PrivacyControlPage;
const react_1 = require("react");
const AuthProvider_1 = require("@/lib/auth/AuthProvider");
const AccessGrantsList_1 = __importDefault(require("@/components/access-grants/AccessGrantsList"));
const AccessGrantForm_1 = __importDefault(require("@/components/access-grants/AccessGrantForm"));
function PrivacyControlPage() {
    const { patientId, loading } = (0, AuthProvider_1.useAuth)();
    const [showForm, setShowForm] = (0, react_1.useState)(false);
    const [refreshKey, setRefreshKey] = (0, react_1.useState)(0);
    // Show loading state while auth is being determined
    if (loading) {
        return (<div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>);
    }
    // If no patient ID, show error (should not happen if middleware is working)
    if (!patientId) {
        return (<div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Acceso Denegado
          </h2>
          <p className="text-gray-600">
            Debes iniciar sesión como paciente para acceder a esta página.
          </p>
        </div>
      </div>);
    }
    const handleFormSuccess = () => {
        setShowForm(false);
        setRefreshKey((prev) => prev + 1); // Trigger list refresh
    };
    const handleFormCancel = () => {
        setShowForm(false);
    };
    return (<div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-4xl">🔒</div>
            <h1 className="text-3xl font-bold text-gray-900">Control de Privacidad</h1>
          </div>
          <p className="text-sm text-gray-600">
            Gestiona quién puede acceder a tus datos médicos. Tu privacidad está en tus manos.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Permisos Activos</p>
                <p className="text-3xl font-bold text-green-600 mt-2">-</p>
              </div>
              <div className="text-4xl">✅</div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Permisos Revocados</p>
                <p className="text-3xl font-bold text-red-600 mt-2">-</p>
              </div>
              <div className="text-4xl">🚫</div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Accesos Este Mes</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">-</p>
              </div>
              <div className="text-4xl">👁️</div>
            </div>
          </div>
        </div>

        {/* Security Tips */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-6 rounded-lg mb-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-bold text-blue-900 mb-2">
                Consejos de Seguridad
              </h3>
              <ul className="space-y-1 text-sm text-blue-800">
                <li>• Revisa regularmente quién tiene acceso a tus datos</li>
                <li>• Establece fechas de vencimiento para accesos temporales</li>
                <li>• Revoca inmediatamente cualquier acceso que ya no sea necesario</li>
                <li>• Usa el permiso de "solo ver" cuando sea posible, evita "descargar" y "compartir"</li>
                <li>• Documenta el propósito de cada permiso para tu referencia futura</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Toggle Button */}
        {!showForm && (<div className="mb-6 flex justify-end">
            <button onClick={() => setShowForm(true)} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
              </svg>
              Otorgar Nuevo Acceso
            </button>
          </div>)}

        {/* Form or List View */}
        {showForm ? (<div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Nuevo Permiso de Acceso</h2>
              <button onClick={handleFormCancel} className="text-gray-600 hover:text-gray-800">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <AccessGrantForm_1.default patientId={patientId} onSuccess={handleFormSuccess} onCancel={handleFormCancel}/>
          </div>) : (<AccessGrantsList_1.default key={refreshKey} patientId={patientId} onGrantCreated={() => setRefreshKey((prev) => prev + 1)}/>)}

        {/* HIPAA Notice */}
        <div className="mt-8 bg-gray-100 border border-gray-300 rounded-lg p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-2">
            Aviso de Privacidad HIPAA
          </h3>
          <p className="text-xs text-gray-700 leading-relaxed">
            Esta plataforma cumple con las regulaciones de la Ley de Portabilidad y Responsabilidad de Seguros de Salud (HIPAA) de 1996.
            Todos los accesos a tus datos médicos son registrados y auditados. Tienes derecho a solicitar un reporte completo
            de quién ha accedido a tu información médica en cualquier momento. Para más información sobre tus derechos de privacidad,
            consulta nuestra Política de Privacidad o contacta a nuestro Oficial de Privacidad.
          </p>
        </div>
      </div>
    </div>);
}
//# sourceMappingURL=page.js.map