"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DeidTestPage;
const react_1 = require("react");
const DashboardLayout_1 = __importDefault(require("@/components/DashboardLayout"));
function DeidTestPage() {
    const [inputText, setInputText] = (0, react_1.useState)('');
    const [result, setResult] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const samplePHI = `Paciente: María González García
Fecha de nacimiento: 15 de marzo de 1985
Dirección: Calle Reforma 123, Ciudad de México, CP 06600
Teléfono: +52 55 1234 5678
Email: maria.gonzalez@email.com
CURP: GOGM850315MDFNRR09
Registro Médico: MRN-2024-8756

Historia Clínica:
Paciente de 39 años acude a consulta el 10 de enero de 2025 por dolor torácico.
Antecedentes: Diabetes Tipo 2 diagnosticada en 2018.
Medicamentos actuales: Metformina 500mg BID.

Dirección IP de acceso: 192.168.1.100
Portal del paciente: https://portal-pacientes.hospital.mx/maria-gonzalez`;
    const handleDeidentify = async () => {
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const response = await fetch('/api/deidentify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: inputText,
                    options: {
                        reversible: true,
                        auditLog: true,
                    },
                }),
            });
            const data = await response.json();
            if (response.ok) {
                setResult(data);
            }
            else {
                setError(data.error || 'Error al des-identificar');
            }
        }
        catch (err) {
            setError(err.message || 'Error de red');
        }
        finally {
            setLoading(false);
        }
    };
    return (<DashboardLayout_1.default>
      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Prueba de Des-identificación HIPAA
          </h1>
          <p className="text-gray-600">
            Método Safe Harbor - Detección de 18 identificadores HIPAA
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Texto Original (PHI)</h2>
              <button onClick={() => setInputText(samplePHI)} className="text-sm text-accent hover:text-primary transition font-semibold">
                Cargar Ejemplo
              </button>
            </div>

            <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Ingrese texto con información de salud protegida (PHI)..." className="w-full h-96 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent resize-none font-mono text-sm"/>

            <button onClick={handleDeidentify} disabled={!inputText || loading} className="mt-4 w-full bg-accent text-white py-3 rounded-lg font-semibold hover:bg-primary transition disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Des-identificando...' : 'Des-identificar Texto'}
            </button>
          </div>

          {/* Output */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Resultado Des-identificado</h2>

            {error && (<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                <strong>Error:</strong> {error}
              </div>)}

            {result && (<div className="space-y-4">
                {/* De-identified text */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Texto Des-identificado
                  </label>
                  <div className="p-4 bg-gray-50 border border-gray-300 rounded-lg h-64 overflow-y-auto font-mono text-sm whitespace-pre-wrap">
                    {result.deidentified}
                  </div>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">
                      {result.summary.totalDetected}
                    </div>
                    <div className="text-sm text-gray-600">PHI Detectado</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-3xl font-bold text-green-600">
                      {(result.summary.confidenceScore * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">Confianza</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-3xl font-bold text-purple-600">
                      {Object.keys(result.summary.byType).length}
                    </div>
                    <div className="text-sm text-gray-600">Tipos</div>
                  </div>
                </div>

                {/* By Type */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Identificadores Detectados por Tipo
                  </label>
                  <div className="space-y-2">
                    {Object.entries(result.summary.byType).map(([type, count]) => (<div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="font-mono text-sm text-gray-700">{type}</span>
                        <span className="px-3 py-1 bg-accent text-white rounded-full text-xs font-bold">
                          {count}
                        </span>
                      </div>))}
                  </div>
                </div>

                {/* Metadata */}
                <div className="p-4 bg-gray-50 border border-gray-300 rounded-lg">
                  <div className="text-xs text-gray-600 space-y-1">
                    <div><strong>Método:</strong> {result.metadata.method}</div>
                    <div><strong>Versión:</strong> {result.metadata.version}</div>
                    <div><strong>Timestamp:</strong> {new Date(result.metadata.timestamp).toLocaleString('es-MX')}</div>
                    <div><strong>Reversible:</strong> {result.tokenMapExport ? 'Sí (token map exportado)' : 'No'}</div>
                  </div>
                </div>

                {/* Token Map Warning */}
                {result.tokenMapExport && (<div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                      </svg>
                      <div className="text-sm text-yellow-800">
                        <strong>Token Map Generado:</strong> El mapa de tokens cifrado ha sido generado.
                        En producción, este debe ser almacenado de forma segura para permitir re-identificación autorizada.
                      </div>
                    </div>
                  </div>)}
              </div>)}

            {!result && !error && !loading && (<div className="h-96 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                  </svg>
                  <p>Ingrese texto y haga clic en "Des-identificar Texto"</p>
                </div>
              </div>)}
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-3">
            ℹ️ Acerca de la Des-identificación HIPAA Safe Harbor
          </h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p>
              Esta herramienta implementa el método Safe Harbor de HIPAA para des-identificación,
              que requiere la supresión de 18 identificadores específicos:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Nombres</li>
              <li>Ubicaciones geográficas (ciudad, dirección, código postal)</li>
              <li>Fechas (excepto año)</li>
              <li>Números de teléfono y fax</li>
              <li>Correos electrónicos</li>
              <li>Números de identificación (SSN, CURP, CPF, registro médico)</li>
              <li>Números de cuenta y certificados</li>
              <li>URLs y direcciones IP</li>
              <li>Identificadores de vehículos y dispositivos</li>
              <li>Identificadores biométricos y fotografías</li>
            </ul>
            <p className="mt-3">
              <strong>Modo Reversible:</strong> Los tokens generados permiten re-identificación autorizada
              usando criptografía AES-256.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout_1.default>);
}
//# sourceMappingURL=page.js.map