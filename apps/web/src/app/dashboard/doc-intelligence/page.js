"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DocIntelligencePage;
const react_1 = require("react");
const DashboardLayout_1 = __importDefault(require("@/components/DashboardLayout"));
function DocIntelligencePage() {
    const [selectedFile, setSelectedFile] = (0, react_1.useState)(null);
    const [textInput, setTextInput] = (0, react_1.useState)('');
    const [documentType, setDocumentType] = (0, react_1.useState)('general');
    const [result, setResult] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const sampleClinicalNote = `Historia Clínica - Consulta Cardiología

Paciente: María González García
Fecha: 15 de enero de 2025
Edad: 58 años
MRN: 2024-CR-8756

Motivo de consulta:
Dolor torácico opresivo de 2 semanas de evolución, especialmente al esfuerzo.

Historia de la enfermedad actual:
Paciente refiere episodios de dolor precordial opresivo, irradiado a brazo izquierdo,
de aproximadamente 5-10 minutos de duración. Los síntomas mejoran con reposo.
Asocia disnea de moderados esfuerzos. Niega síncope o palpitaciones.

Antecedentes:
- Diabetes Mellitus tipo 2 (dx 2018)
- Hipertensión arterial (dx 2020)
- Dislipidemia

Medicamentos actuales:
- Metformina 850mg cada 12 horas
- Losartán 50mg cada 24 horas
- Atorvastatina 20mg cada noche

Examen físico:
TA: 145/88 mmHg, FC: 78 lpm, FR: 16 rpm, Sat O2: 97% aire ambiente
Peso: 72 kg, Talla: 1.62m, IMC: 27.4

Cardiovascular: Ruidos cardiacos rítmicos, sin soplos. Pulsos periféricos presentes.
Respiratorio: Murmullo vesicular conservado, sin agregados.

Plan:
1. ECG de reposo (realizado - sin cambios isquémicos agudos)
2. Solicitar prueba de esfuerzo
3. Laboratorios: perfil lipídico, HbA1c, troponinas
4. Agregar ácido acetilsalicílico 100mg/día
5. Control en 2 semanas con resultados

Impresión diagnóstica:
Probable angina estable, a descartar enfermedad arterial coronaria.

Dr. Carlos Ramírez
Cardiólogo
Cédula: 12345678`;
    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setTextInput(''); // Clear text input if file selected
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResult(null);
        const formData = new FormData();
        if (selectedFile) {
            formData.append('file', selectedFile);
        }
        else if (textInput) {
            formData.append('text', textInput);
        }
        else {
            setError('Por favor, proporcione un archivo PDF o texto');
            setLoading(false);
            return;
        }
        formData.append('documentType', documentType);
        try {
            const response = await fetch('/api/document-intelligence', {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();
            if (response.ok) {
                setResult(data);
            }
            else {
                setError(data.error || 'Error al procesar documento');
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
            Inteligencia de Documentos Clínicos
          </h1>
          <p className="text-gray-600">
            Extracción de PDF → Des-identificación HIPAA → Análisis con Claude 3.5 Sonnet
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <form onSubmit={handleSubmit}>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Subir Documento PDF
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-accent transition cursor-pointer">
                  <input type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" id="file-upload" disabled={loading}/>
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                    </svg>
                    <p className="text-gray-600">
                      {selectedFile ? selectedFile.name : 'Hacer clic o arrastrar PDF'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Máximo 10MB</p>
                  </label>
                </div>
              </div>

              {/* Text Input */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    O Pegar Texto
                  </label>
                  <button type="button" onClick={() => {
            setTextInput(sampleClinicalNote);
            setSelectedFile(null);
        }} className="text-sm text-accent hover:text-primary transition font-semibold">
                    Cargar Ejemplo
                  </button>
                </div>
                <textarea value={textInput} onChange={(e) => {
            setTextInput(e.target.value);
            setSelectedFile(null); // Clear file if text entered
        }} placeholder="Pegar nota clínica, resultados de laboratorio, etc..." className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent resize-none text-sm font-mono" disabled={loading}/>
              </div>
            </div>

            {/* Document Type */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tipo de Documento
              </label>
              <select value={documentType} onChange={(e) => setDocumentType(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent" disabled={loading}>
                <option value="general">General</option>
                <option value="lab_results">Resultados de Laboratorio</option>
                <option value="consultation_notes">Notas de Consulta</option>
                <option value="discharge_summary">Resumen de Alta</option>
                <option value="prescription">Prescripción</option>
              </select>
            </div>

            <button type="submit" disabled={loading || (!selectedFile && !textInput)} className="w-full bg-accent text-white py-4 rounded-lg font-semibold hover:bg-primary transition disabled:opacity-50 disabled:cursor-not-allowed text-lg">
              {loading ? 'Procesando...' : 'Analizar Documento'}
            </button>
          </form>
        </div>

        {/* Error */}
        {error && (<div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            <strong>Error:</strong> {error}
          </div>)}

        {/* Results */}
        {result && (<div className="space-y-6">
            {/* Processing Steps */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">✓ Procesamiento Completado</h2>
              <div className="flex items-center space-x-4">
                {result.metadata.processingSteps.map((step, i) => (<div key={i} className="flex items-center">
                    <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold">
                      {i + 1}. {step}
                    </div>
                    {i < result.metadata.processingSteps.length - 1 && (<svg className="w-6 h-6 text-green-500 mx-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                      </svg>)}
                  </div>))}
              </div>
            </div>

            {/* AI Analysis */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl shadow-md p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Análisis de IA Clínica</h2>
                  <p className="text-sm text-gray-600">Claude 3.5 Sonnet</p>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 mb-4">
                <div className="prose max-w-none">
                  <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                    {result.analysis.summary}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-600">
                <div>
                  <strong>Modelo:</strong> {result.analysis.model}
                </div>
                <div>
                  <strong>Tokens:</strong> {result.analysis.usage.inputTokens} entrada,{' '}
                  {result.analysis.usage.outputTokens} salida
                </div>
              </div>
            </div>

            {/* De-identification Stats */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Des-identificación HIPAA</h2>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">
                    {result.deidentification.phiDetected}
                  </div>
                  <div className="text-sm text-gray-600">PHI Detectado</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">
                    {(result.deidentification.confidenceScore * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Confianza</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-3xl font-bold text-purple-600">
                    {Object.keys(result.deidentification.byType).length}
                  </div>
                  <div className="text-sm text-gray-600">Tipos</div>
                </div>
              </div>

              <details className="cursor-pointer">
                <summary className="text-sm font-semibold text-gray-700 mb-2 hover:text-accent">
                  Ver Texto Des-identificado →
                </summary>
                <div className="mt-3 p-4 bg-gray-50 rounded-lg max-h-64 overflow-y-auto font-mono text-xs">
                  {result.deidentification.deidentifiedText}
                </div>
              </details>
            </div>

            {/* Security Notice */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                <div className="text-sm text-yellow-800">
                  <strong>Nota de Seguridad:</strong> Todo el texto fue des-identificado siguiendo el método
                  HIPAA Safe Harbor antes de ser enviado a Claude. El token map cifrado puede ser almacenado
                  de forma segura para re-identificación autorizada.
                </div>
              </div>
            </div>
          </div>)}

        {/* Loading State */}
        {loading && (<div className="bg-white rounded-xl shadow-md p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-accent mb-4"/>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Procesando Documento...</h3>
            <div className="space-y-2 text-gray-600">
              <p>⏳ Extrayendo texto del documento</p>
              <p>🔒 Des-identificando información sensible</p>
              <p>🤖 Analizando con Claude 3.5 Sonnet</p>
            </div>
          </div>)}
      </div>
    </DashboardLayout_1.default>);
}
//# sourceMappingURL=page.js.map