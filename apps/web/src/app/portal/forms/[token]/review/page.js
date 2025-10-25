"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ReviewPage;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const framer_motion_1 = require("framer-motion");
const react_signature_canvas_1 = __importDefault(require("react-signature-canvas"));
function ReviewPage() {
    const params = (0, navigation_1.useParams)();
    const router = (0, navigation_1.useRouter)();
    const token = params.token;
    const signatureRef = (0, react_1.useRef)(null);
    const [formData, setFormData] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [submitting, setSubmitting] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [signatureDataUrl, setSignatureDataUrl] = (0, react_1.useState)(null);
    const [agreedToTerms, setAgreedToTerms] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        fetchForm();
    }, [token]);
    const fetchForm = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/forms/public/${token}`);
            if (!response.ok) {
                setError('Error al cargar el formulario');
                return;
            }
            const data = await response.json();
            setFormData(data.form);
        }
        catch (err) {
            setError('Error de conexión');
            console.error('Error fetching form:', err);
        }
        finally {
            setLoading(false);
        }
    };
    const clearSignature = () => {
        signatureRef.current?.clear();
        setSignatureDataUrl(null);
    };
    const saveSignature = () => {
        if (signatureRef.current?.isEmpty()) {
            setError('Por favor, firme antes de continuar');
            return;
        }
        const dataUrl = signatureRef.current?.toDataURL('image/png');
        setSignatureDataUrl(dataUrl || null);
    };
    const handleSubmit = async () => {
        if (!signatureDataUrl) {
            setError('Por favor, firme el formulario');
            return;
        }
        if (!agreedToTerms) {
            setError('Debe aceptar los términos para continuar');
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            const response = await fetch(`/api/forms/public/${token}/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    responses: formData?.responses,
                    signatureDataUrl,
                }),
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Error al enviar el formulario');
            }
            // Success - redirect to success page
            router.push(`/portal/forms/${token}/success`);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Error al enviar el formulario');
        }
        finally {
            setSubmitting(false);
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
    if (loading) {
        return (<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
      </div>);
    }
    if (error && !formData) {
        return (<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={() => router.push(`/portal/forms/${token}`)} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
            Volver al formulario
          </button>
        </div>
      </div>);
    }
    return (<div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <framer_motion_1.motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8">
            <h1 className="text-3xl font-bold mb-2">Revisión Final</h1>
            <p className="text-blue-100">
              Por favor, revise sus respuestas antes de firmar y enviar
            </p>
          </div>

          {/* Responses Review */}
          <div className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Sus Respuestas</h2>

            <div className="space-y-8">
              {formData?.template.structure.sections.map((section, sectionIndex) => (<div key={section.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">{section.title}</h3>
                  <div className="space-y-4">
                    {section.fields.map((field) => (<div key={field.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <label className="text-sm font-medium text-gray-700">{field.label}</label>
                          <button onClick={() => router.push(`/portal/forms/${token}`)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                            Editar
                          </button>
                        </div>
                        <p className="text-base text-gray-900">
                          {renderValue(formData?.responses[field.id])}
                        </p>
                      </div>))}
                  </div>
                </div>))}
            </div>

            {/* Signature Section */}
            <div className="mt-12 border-t border-gray-200 pt-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Firma Electrónica</h2>

              <div className="bg-gray-50 rounded-lg p-6">
                <p className="text-sm text-gray-600 mb-4">
                  Por favor, firme en el recuadro a continuación con su dedo o mouse
                </p>

                {!signatureDataUrl ? (<div>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white">
                      <react_signature_canvas_1.default ref={signatureRef} canvasProps={{
                className: 'w-full h-48 cursor-crosshair',
            }} backgroundColor="white"/>
                    </div>
                    <div className="flex items-center gap-3 mt-4">
                      <button onClick={clearSignature} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium">
                        Limpiar
                      </button>
                      <button onClick={saveSignature} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                        Guardar Firma
                      </button>
                    </div>
                  </div>) : (<div>
                    <div className="border-2 border-green-500 rounded-lg bg-white p-4">
                      <img src={signatureDataUrl} alt="Signature" className="max-h-48 mx-auto"/>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                      <span className="text-sm text-green-700 font-medium">Firma guardada</span>
                      <button onClick={() => {
                setSignatureDataUrl(null);
                clearSignature();
            }} className="ml-auto text-sm text-blue-600 hover:text-blue-800 font-medium">
                        Cambiar firma
                      </button>
                    </div>
                  </div>)}
              </div>

              {/* Terms Agreement */}
              <div className="mt-6">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"/>
                  <span className="text-sm text-gray-700">
                    Confirmo que he revisado todas mis respuestas y que la información proporcionada es correcta.
                    Entiendo que esta firma electrónica tiene la misma validez legal que una firma manuscrita.
                  </span>
                </label>
              </div>

              {/* Error Message */}
              {error && (<framer_motion_1.motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </framer_motion_1.motion.div>)}

              {/* Submit Button */}
              <div className="mt-8 flex items-center gap-4">
                <button onClick={() => router.push(`/portal/forms/${token}`)} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium">
                  Volver al formulario
                </button>
                <button onClick={handleSubmit} disabled={!signatureDataUrl || !agreedToTerms || submitting} className="flex-1 px-8 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 transition-all font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                  {submitting ? 'Enviando...' : 'Enviar Formulario'}
                </button>
              </div>
            </div>
          </div>
        </framer_motion_1.motion.div>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            🔒 Su información está protegida con cifrado de grado empresarial
          </p>
        </div>
      </div>
    </div>);
}
//# sourceMappingURL=page.js.map