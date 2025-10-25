"use strict";
/**
 * Shared Medical Record Public Viewer
 *
 * Public page for viewing shared medical records (no authentication required)
 * Accessed via secure share token
 */
'use client';
/**
 * Shared Medical Record Public Viewer
 *
 * Public page for viewing shared medical records (no authentication required)
 * Accessed via secure share token
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SharedRecordPage;
const react_1 = require("react");
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
const link_1 = __importDefault(require("next/link"));
function SharedRecordPage({ params }) {
    const [record, setRecord] = (0, react_1.useState)(null);
    const [shareInfo, setShareInfo] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const [requiresPassword, setRequiresPassword] = (0, react_1.useState)(false);
    const [password, setPassword] = (0, react_1.useState)('');
    const [isVerifying, setIsVerifying] = (0, react_1.useState)(false);
    const fetchSharedRecord = async (pwd) => {
        setIsVerifying(true);
        try {
            const url = new URL(`/api/shared/${params.shareToken}`, window.location.origin);
            if (pwd) {
                url.searchParams.set('password', pwd);
            }
            const response = await fetch(url.toString());
            const data = await response.json();
            if (!response.ok || !data.success) {
                if (data.requiresPassword) {
                    setRequiresPassword(true);
                    setError(data.error);
                }
                else {
                    throw new Error(data.error || 'Error al cargar el registro');
                }
            }
            else {
                setRecord(data.data.record);
                setShareInfo(data.data.share);
                setRequiresPassword(false);
                setError(null);
            }
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
        }
        finally {
            setIsLoading(false);
            setIsVerifying(false);
        }
    };
    (0, react_1.useEffect)(() => {
        fetchSharedRecord();
    }, [params.shareToken]);
    const handlePasswordSubmit = (e) => {
        e.preventDefault();
        fetchSharedRecord(password);
    };
    const handleDownloadPDF = async () => {
        if (!shareInfo?.allowDownload)
            return;
        // For shared records, we'd need to create a separate PDF endpoint
        // For now, show a message
        alert('La descarga de PDF está disponible solo para registros propios.');
    };
    // Password form
    if (requiresPassword && !record) {
        return (<div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Registro Protegido
            </h1>
            <p className="text-gray-600">
              Este registro requiere una contraseña para acceder
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" placeholder="Ingresa la contraseña" required/>
            </div>

            {error && (<div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>)}

            <button type="submit" disabled={isVerifying} className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {isVerifying ? (<>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Verificando...
                </>) : ('Acceder')}
            </button>
          </form>
        </div>
      </div>);
    }
    // Loading state
    if (isLoading) {
        return (<div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
          </svg>
          <p className="text-gray-600">Cargando registro compartido...</p>
        </div>
      </div>);
    }
    // Error state
    if (error || !record) {
        return (<div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            No se puede acceder al registro
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <link_1.default href="/portal/login" className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
            Ir al Portal del Paciente
          </link_1.default>
        </div>
      </div>);
    }
    const diagnoses = Array.isArray(record.diagnoses) ? record.diagnoses : [];
    const procedures = Array.isArray(record.procedures) ? record.procedures : [];
    const medications = Array.isArray(record.medications) ? record.medications : [];
    const vitalSigns = record.vitalSigns || {};
    return (<div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-xl shadow-lg p-6 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">VidaBanq Health AI</h1>
              <p className="text-green-100">Registro Médico Compartido</p>
            </div>
            <div className="text-right">
              <svg className="w-12 h-12 opacity-50 mb-2 ml-auto" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Share Info Banner */}
        {shareInfo && (<div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <div className="flex-1">
                {shareInfo.recipientName && (<p className="text-sm text-blue-900 mb-1">
                    <strong>Compartido con:</strong> {shareInfo.recipientName}
                  </p>)}
                {shareInfo.purpose && (<p className="text-sm text-blue-800 mb-1">
                    <strong>Propósito:</strong> {shareInfo.purpose}
                  </p>)}
                {shareInfo.expiresAt && (<p className="text-sm text-blue-800">
                    <strong>Expira:</strong>{' '}
                    {new Date(shareInfo.expiresAt).toLocaleString('es-MX', {
                    dateStyle: 'long',
                    timeStyle: 'short',
                })}
                  </p>)}
              </div>
            </div>
          </div>)}

        {/* Record Content (similar to authenticated view) */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {record.chiefComplaint || 'Consulta Médica'}
              </h2>
              <p className="text-gray-600">
                {(0, date_fns_1.format)(new Date(record.createdAt), "d 'de' MMMM 'de' yyyy 'a las' HH:mm", {
            locale: locale_1.es,
        })}
              </p>
            </div>
            <span className={`px-4 py-2 rounded-lg text-sm font-semibold ${record.status === 'SIGNED'
            ? 'bg-green-100 text-green-700'
            : 'bg-yellow-100 text-yellow-700'}`}>
              {record.status === 'SIGNED' ? '✓ Firmado' : 'Pendiente'}
            </span>
          </div>

          {/* Patient & Clinician Info */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Paciente</h3>
              <p className="font-semibold text-gray-900">
                {record.patient.firstName} {record.patient.lastName}
              </p>
              <p className="text-sm text-gray-600">
                Fecha de Nacimiento:{' '}
                {new Date(record.patient.dateOfBirth).toLocaleDateString('es-MX')}
              </p>
              <p className="text-sm text-gray-600">MRN: {record.patient.mrn}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Médico</h3>
              <p className="font-semibold text-gray-900">
                Dr. {record.clinician.firstName} {record.clinician.lastName}
              </p>
              <p className="text-sm text-gray-600">
                {record.clinician.specialty || 'Medicina General'}
              </p>
              {record.clinician.licenseNumber && (<p className="text-sm text-gray-600">
                  Cédula: {record.clinician.licenseNumber}
                </p>)}
            </div>
          </div>
        </div>

        {/* Vital Signs */}
        {Object.keys(vitalSigns).length > 0 && (<div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Signos Vitales</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {vitalSigns.bp && (<div className="bg-red-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600 mb-1">Presión Arterial</p>
                  <p className="text-2xl font-bold text-gray-900">{vitalSigns.bp}</p>
                  <p className="text-xs text-gray-500">mmHg</p>
                </div>)}
              {vitalSigns.hr && (<div className="bg-pink-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600 mb-1">Frecuencia Cardíaca</p>
                  <p className="text-2xl font-bold text-gray-900">{vitalSigns.hr}</p>
                  <p className="text-xs text-gray-500">lpm</p>
                </div>)}
              {vitalSigns.temp && (<div className="bg-orange-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600 mb-1">Temperatura</p>
                  <p className="text-2xl font-bold text-gray-900">{vitalSigns.temp}</p>
                  <p className="text-xs text-gray-500">°C</p>
                </div>)}
              {vitalSigns.rr && (<div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600 mb-1">Frecuencia Respiratoria</p>
                  <p className="text-2xl font-bold text-gray-900">{vitalSigns.rr}</p>
                  <p className="text-xs text-gray-500">rpm</p>
                </div>)}
              {vitalSigns.spo2 && (<div className="bg-cyan-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600 mb-1">Saturación O₂</p>
                  <p className="text-2xl font-bold text-gray-900">{vitalSigns.spo2}</p>
                  <p className="text-xs text-gray-500">%</p>
                </div>)}
              {vitalSigns.weight && (<div className="bg-green-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600 mb-1">Peso</p>
                  <p className="text-2xl font-bold text-gray-900">{vitalSigns.weight}</p>
                  <p className="text-xs text-gray-500">kg</p>
                </div>)}
            </div>
          </div>)}

        {/* SOAP Note */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-6 space-y-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Nota Clínica (SOAP)</h2>

          {/* Subjective */}
          <div className="border-l-4 border-blue-500 pl-6">
            <h3 className="text-lg font-bold text-blue-700 mb-3">Subjetivo (S)</h3>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
              {record.subjective}
            </p>
          </div>

          {/* Objective */}
          <div className="border-l-4 border-green-500 pl-6">
            <h3 className="text-lg font-bold text-green-700 mb-3">Objetivo (O)</h3>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
              {record.objective}
            </p>
          </div>

          {/* Assessment */}
          <div className="border-l-4 border-purple-500 pl-6">
            <h3 className="text-lg font-bold text-purple-700 mb-3">Evaluación (A)</h3>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed mb-4">
              {record.assessment}
            </p>

            {diagnoses.length > 0 && (<div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm font-semibold text-purple-900 mb-2">Diagnósticos:</p>
                <ul className="space-y-2">
                  {diagnoses.map((diag, i) => (<li key={i} className="flex items-start gap-2">
                      <span className="text-purple-600 mt-1">•</span>
                      <div>
                        <p className="font-medium text-gray-900">{diag.description}</p>
                        {diag.icd10Code && (<p className="text-xs text-gray-600">ICD-10: {diag.icd10Code}</p>)}
                      </div>
                    </li>))}
                </ul>
              </div>)}
          </div>

          {/* Plan */}
          <div className="border-l-4 border-orange-500 pl-6">
            <h3 className="text-lg font-bold text-orange-700 mb-3">Plan (P)</h3>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed mb-4">
              {record.plan}
            </p>

            {medications.length > 0 && (<div className="bg-orange-50 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-orange-900 mb-2">Medicamentos:</p>
                <ul className="space-y-2">
                  {medications.map((med, i) => (<li key={i} className="flex items-start gap-2">
                      <span className="text-orange-600 mt-1">💊</span>
                      <div>
                        <p className="font-medium text-gray-900">{med.medication}</p>
                        <p className="text-sm text-gray-600">
                          {med.dosage} - {med.frequency}
                        </p>
                      </div>
                    </li>))}
                </ul>
              </div>)}

            {procedures.length > 0 && (<div className="bg-orange-50 rounded-lg p-4">
                <p className="text-sm font-semibold text-orange-900 mb-2">Procedimientos:</p>
                <ul className="space-y-2">
                  {procedures.map((proc, i) => (<li key={i} className="flex items-start gap-2">
                      <span className="text-orange-600 mt-1">•</span>
                      <div>
                        <p className="font-medium text-gray-900">{proc.description}</p>
                        {proc.cptCode && (<p className="text-xs text-gray-600">CPT: {proc.cptCode}</p>)}
                      </div>
                    </li>))}
                </ul>
              </div>)}
          </div>
        </div>

        {/* Blockchain Verification */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">🔒 Registro Verificado</h3>
              <p className="text-sm text-gray-700 mb-3">
                Este registro está protegido con blockchain y no puede ser modificado.
              </p>
              <p className="text-xs font-mono text-gray-500 bg-white rounded px-3 py-2 break-all">
                Hash: {record.noteHash}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm">
          <p>Este registro médico ha sido compartido de forma segura</p>
          <p className="mt-1">
            Powered by <strong>VidaBanq Health AI</strong>
          </p>
        </div>
      </div>
    </div>);
}
//# sourceMappingURL=page.js.map