"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FormResponsesPage;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const link_1 = __importDefault(require("next/link"));
function FormResponsesPage() {
    const params = (0, navigation_1.useParams)();
    const router = (0, navigation_1.useRouter)();
    const formId = params.id;
    const [formData, setFormData] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        fetchFormResponses();
    }, [formId]);
    const fetchFormResponses = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/forms/responses/${formId}`);
            if (!response.ok) {
                setError('Error al cargar las respuestas');
                return;
            }
            const data = await response.json();
            setFormData(data.form);
        }
        catch (err) {
            setError('Error de conexión');
            console.error('Error fetching form responses:', err);
        }
        finally {
            setLoading(false);
        }
    };
    const renderValue = (value) => {
        if (typeof value === 'boolean') {
            return value ? 'Sí' : 'No';
        }
        if (Array.isArray(value)) {
            return value.join(', ');
        }
        if (value === null || value === undefined || value === '') {
            return '(Sin respuesta)';
        }
        return String(value);
    };
    const downloadPDF = async () => {
        // TODO: Implement PDF generation
        alert('Funcionalidad de descarga PDF próximamente');
    };
    if (loading) {
        return (<div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
      </div>);
    }
    if (error || !formData) {
        return (<div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <p className="text-red-600 mb-4">{error || 'Formulario no encontrado'}</p>
          <link_1.default href="/dashboard/forms/sent" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
            Volver a Formularios Enviados
          </link_1.default>
        </div>
      </div>);
    }
    return (<div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <link_1.default href="/dashboard/forms/sent" className="text-gray-500 hover:text-gray-700 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
              </svg>
            </link_1.default>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{formData.template.title}</h1>
              <p className="text-gray-500 mt-1">
                Completado por {formData.patient.firstName} {formData.patient.lastName}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={downloadPDF} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">
            📥 Descargar PDF
          </button>
        </div>
      </div>

      {/* Completion Info */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Formulario Completado</h3>
            <p className="text-sm text-gray-600">
              {formData.completedAt
            ? new Date(formData.completedAt).toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            })
            : 'Fecha desconocida'}
            </p>
          </div>
        </div>
      </div>

      {/* Responses */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Respuestas del Paciente</h2>

          <div className="space-y-8">
            {formData.template.structure.sections.map((section, sectionIndex) => (<div key={section.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{section.title}</h3>
                {section.description && (<p className="text-gray-600 mb-4 text-sm">{section.description}</p>)}
                <div className="space-y-4">
                  {section.fields.map((field) => (<div key={field.id} className="bg-gray-50 rounded-lg p-4">
                      <label className="text-sm font-medium text-gray-700 block mb-2">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <p className="text-base text-gray-900">
                        {renderValue(formData.responses[field.id])}
                      </p>
                    </div>))}
                </div>
              </div>))}
          </div>

          {/* Signature */}
          {formData.signatureDataUrl && (<div className="mt-12 border-t border-gray-200 pt-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Firma Electrónica</h2>
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="border-2 border-green-500 rounded-lg bg-white p-4">
                  <img src={formData.signatureDataUrl} alt="Firma del paciente" className="max-h-48 mx-auto"/>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-sm text-green-700 font-medium">
                    Firmado electrónicamente por {formData.patient.firstName} {formData.patient.lastName}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Fecha de firma:{' '}
                  {formData.completedAt
                ? new Date(formData.completedAt).toLocaleString('es-ES')
                : 'Desconocida'}
                </p>
              </div>
            </div>)}
        </div>
      </div>

      {/* Security Notice */}
      <div className="text-center">
        <p className="text-sm text-gray-600">
          🔒 Todos los datos están cifrados y protegidos bajo cumplimiento HIPAA
        </p>
      </div>
    </div>);
}
//# sourceMappingURL=page.js.map