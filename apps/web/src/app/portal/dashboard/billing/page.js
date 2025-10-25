"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = BillingPage;
const react_1 = require("react");
const AuthProvider_1 = require("@/lib/auth/AuthProvider");
const InvoicesList_1 = __importDefault(require("@/components/invoices/InvoicesList"));
const InvoiceForm_1 = __importDefault(require("@/components/invoices/InvoiceForm"));
function BillingPage() {
    const { patientId, loading } = (0, AuthProvider_1.useAuth)();
    const [showForm, setShowForm] = (0, react_1.useState)(false);
    const [refreshKey, setRefreshKey] = (0, react_1.useState)(0);
    // Show loading state while auth is being determined
    if (loading) {
        return (<div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>);
    }
    // If no patient ID, show error
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
            <div className="text-4xl">💳</div>
            <h1 className="text-3xl font-bold text-gray-900">
              Facturación y Pagos
            </h1>
          </div>
          <p className="text-sm text-gray-600">
            Gestiona tus facturas, pagos y métodos de pago. Sistema compatible
            con facturación electrónica (CFDI) para México.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Facturas Pendientes
                </p>
                <p className="text-3xl font-bold text-yellow-600 mt-2">-</p>
              </div>
              <div className="text-4xl">📋</div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Saldo Pendiente
                </p>
                <p className="text-3xl font-bold text-red-600 mt-2">-</p>
              </div>
              <div className="text-4xl">💰</div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Facturas Pagadas
                </p>
                <p className="text-3xl font-bold text-green-600 mt-2">-</p>
              </div>
              <div className="text-4xl">✅</div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Pagado Este Mes
                </p>
                <p className="text-3xl font-bold text-blue-600 mt-2">-</p>
              </div>
              <div className="text-4xl">📊</div>
            </div>
          </div>
        </div>

        {/* Payment Methods Info */}
        <div className="bg-gradient-to-r from-green-50 to-teal-50 border-l-4 border-green-500 p-6 rounded-lg mb-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-bold text-green-900 mb-2">
                Métodos de Pago Disponibles
              </h3>
              <ul className="space-y-1 text-sm text-green-800">
                <li>
                  💳 <strong>Tarjeta de Crédito/Débito:</strong> Procesamiento
                  seguro con Stripe
                </li>
                <li>
                  🏦 <strong>Transferencia Bancaria:</strong> CLABE o SPEI
                </li>
                <li>
                  💵 <strong>Efectivo:</strong> Pago en sucursal con recibo
                </li>
                <li>
                  🏥 <strong>Seguro Médico:</strong> Facturación directa a
                  aseguradoras
                </li>
                <li>
                  📅 <strong>Planes de Pago:</strong> Pagos diferidos disponibles
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* CFDI Info */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-6 rounded-lg mb-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-bold text-blue-900 mb-2">
                Facturación Electrónica (CFDI)
              </h3>
              <p className="text-sm text-blue-800 mb-2">
                Todas las facturas son compatibles con el sistema de Comprobante
                Fiscal Digital por Internet (CFDI) del SAT.
              </p>
              <ul className="space-y-1 text-sm text-blue-800">
                <li>• Timbrado automático según normativa del SAT</li>
                <li>• Generación de XML y PDF</li>
                <li>• Envío por correo electrónico</li>
                <li>• Cancelación en línea cuando sea necesario</li>
                <li>
                  • Almacenamiento seguro de comprobantes fiscales por 5 años
                </li>
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
              Nueva Factura
            </button>
          </div>)}

        {/* Form or List View */}
        {showForm ? (<div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Nueva Factura</h2>
              <button onClick={handleFormCancel} className="text-gray-600 hover:text-gray-800">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <InvoiceForm_1.default patientId={patientId} onSuccess={handleFormSuccess} onCancel={handleFormCancel}/>
          </div>) : (<InvoicesList_1.default key={refreshKey} patientId={patientId} onInvoiceCreated={() => setRefreshKey((prev) => prev + 1)}/>)}

        {/* Tax & Compliance Notice */}
        <div className="mt-8 bg-gray-100 border border-gray-300 rounded-lg p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-2">
            Aviso Fiscal y de Cumplimiento
          </h3>
          <p className="text-xs text-gray-700 leading-relaxed">
            Esta plataforma cumple con la normativa del Servicio de
            Administración Tributaria (SAT) de México para la emisión de
            Comprobantes Fiscales Digitales por Internet (CFDI). Todos los pagos
            son procesados de forma segura cumpliendo con los estándares PCI DSS.
            Para consultas fiscales, contacta a nuestro equipo de soporte o a tu
            contador de confianza. Los comprobantes fiscales se conservan durante
            el plazo establecido por la ley (5 años).
          </p>
        </div>
      </div>
    </div>);
}
//# sourceMappingURL=page.js.map