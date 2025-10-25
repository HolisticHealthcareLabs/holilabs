"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ConsentManager;
const react_1 = require("react");
const templates = [
    {
        id: 'general',
        title: 'Consentimiento Informado para Consulta Médica General',
        content: `CONSENTIMIENTO INFORMADO PARA CONSULTA MÉDICA GENERAL

Yo, el paciente identificado en este documento, declaro que:

1. INFORMACIÓN PROPORCIONADA: He sido informado(a) de manera clara y comprensible sobre:
   - El propósito de la consulta médica
   - Los procedimientos diagnósticos que se realizarán
   - Los riesgos y beneficios asociados
   - Las alternativas de tratamiento disponibles

2. EXAMEN FÍSICO: Autorizo al médico tratante a realizar el examen físico necesario para evaluar mi condición de salud.

3. CONFIDENCIALIDAD: Entiendo que mi información médica será manejada de forma confidencial según las normativas de privacidad aplicables.

4. DERECHO A PREGUNTAR: He tenido la oportunidad de hacer preguntas y todas mis dudas han sido resueltas satisfactoriamente.

5. VOLUNTARIEDAD: Este consentimiento es otorgado de forma voluntaria y puedo revocarlo en cualquier momento.

Fecha: _________________
Firma del Paciente: _________________
Firma del Médico: _________________`,
    },
    {
        id: 'telehealth',
        title: 'Consentimiento para Telemedicina y Comunicación Electrónica',
        content: `CONSENTIMIENTO PARA TELEMEDICINA Y COMUNICACIÓN ELECTRÓNICA

Yo, el paciente identificado en este documento, doy mi consentimiento para:

1. CONSULTAS POR TELEMEDICINA: Participar en consultas médicas a través de plataformas de videoconferencia seguras.

2. LIMITACIONES TÉCNICAS: Entiendo que:
   - La calidad de la conexión puede afectar la consulta
   - No todos los diagnósticos pueden realizarse de forma remota
   - Puedo ser referido(a) a una consulta presencial si es necesario

3. COMUNICACIÓN ELECTRÓNICA: Autorizo la comunicación con mi equipo médico a través de:
   - Correo electrónico cifrado
   - Mensajería segura en plataforma
   - Llamadas telefónicas

4. PRIVACIDAD Y SEGURIDAD: Entiendo que se utilizarán medios seguros y cifrados para proteger mi información de salud.

5. EMERGENCIAS: Reconozco que la telemedicina NO es apropiada para emergencias médicas y debo acudir a servicios de urgencia cuando sea necesario.

Fecha: _________________
Firma del Paciente: _________________
Firma del Médico: _________________`,
    },
    {
        id: 'research',
        title: 'Autorización para Uso de Datos Anonimizados en Investigación/IA',
        content: `AUTORIZACIÓN PARA USO DE DATOS ANONIMIZADOS EN INVESTIGACIÓN/IA

Yo, el paciente identificado en este documento, autorizo:

1. ANONIMIZACIÓN DE DATOS: Que mis datos clínicos sean completamente anonimizados (des-identificados) eliminando toda información personal identificable.

2. USO EN INVESTIGACIÓN: Que mis datos anonimizados puedan ser utilizados para:
   - Investigación médica y científica
   - Desarrollo de modelos de inteligencia artificial clínica
   - Mejora de sistemas de apoyo a la decisión médica
   - Estudios epidemiológicos y de salud pública

3. BENEFICIOS: Entiendo que esta investigación puede:
   - Mejorar la calidad de la atención médica
   - Desarrollar nuevos tratamientos
   - Optimizar sistemas de salud

4. PROTECCIÓN DE PRIVACIDAD: Entiendo que:
   - Mis datos serán completamente anonimizados antes de su uso
   - No seré identificable en ninguna publicación o estudio
   - Mis datos nunca se venderán con fines comerciales

5. VOLUNTARIEDAD: Esta autorización es completamente voluntaria y puedo revocarla en cualquier momento sin afectar mi atención médica.

6. SIN COMPENSACIÓN: No recibiré compensación económica por el uso de mis datos anonimizados.

Fecha: _________________
Firma del Paciente: _________________
Testigo: _________________`,
    },
];
function ConsentManager() {
    const [selectedTemplate, setSelectedTemplate] = (0, react_1.useState)(null);
    const [isEditing, setIsEditing] = (0, react_1.useState)(false);
    const [editedContent, setEditedContent] = (0, react_1.useState)('');
    const [aiPrompt, setAiPrompt] = (0, react_1.useState)('');
    const [isProcessing, setIsProcessing] = (0, react_1.useState)(false);
    const [diffView, setDiffView] = (0, react_1.useState)(null);
    const handleEditWithAI = (template) => {
        setSelectedTemplate(template);
        setEditedContent(template.content);
        setIsEditing(true);
        setDiffView(null);
    };
    const handleGenerateModification = async () => {
        if (!aiPrompt.trim())
            return;
        setIsProcessing(true);
        // Simulate AI processing
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Simulate modification based on prompt
        let modified = editedContent;
        if (aiPrompt.toLowerCase().includes('cardiovascular')) {
            modified = editedContent.replace('- Los riesgos y beneficios asociados', `- Los riesgos y beneficios asociados
   - Los riesgos cardiovasculares específicos relacionados con mi condición`);
        }
        if (aiPrompt.toLowerCase().includes('cláusula') || aiPrompt.toLowerCase().includes('agregar')) {
            modified = modified + '\n\n7. CLÁUSULA ADICIONAL: [Contenido generado por IA basado en la solicitud]';
        }
        setDiffView({
            original: editedContent,
            modified: modified,
        });
        setIsProcessing(false);
    };
    const handleAcceptChanges = () => {
        if (diffView) {
            setEditedContent(diffView.modified);
            setDiffView(null);
            setAiPrompt('');
        }
    };
    const handleRejectChanges = () => {
        setDiffView(null);
        setAiPrompt('');
    };
    return (<div>
      {!isEditing ? (<>
          <h2 className="text-xl font-bold mb-4">Plantillas de Consentimiento</h2>

          <div className="space-y-4">
            {templates.map((template) => (<div key={template.id} className="border border-gray-200 rounded-lg p-6 hover:border-primary/50 transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-800 mb-2">{template.title}</h3>
                    <p className="text-sm text-gray-600">
                      Plantilla estándar lista para personalizar con IA
                    </p>
                  </div>
                  <button onClick={() => handleEditWithAI(template)} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition font-medium flex items-center space-x-2">
                    <span>✨</span>
                    <span>Editar con IA</span>
                  </button>
                </div>
              </div>))}
          </div>
        </>) : (<>
          {/* Editor Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Editor de Consentimiento con IA</h2>
            <button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition">
              ← Volver
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Document Viewer */}
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">Vista del Documento</h3>
              <div className="border-2 border-gray-300 rounded-lg p-6 bg-white h-[600px] overflow-y-auto">
                {diffView ? (<div className="space-y-2">
                    {diffView.modified.split('\n').map((line, i) => {
                    const originalLines = diffView.original.split('\n');
                    const isNew = !originalLines.includes(line);
                    const isDeleted = originalLines[i] && !diffView.modified.split('\n').includes(originalLines[i]);
                    return (<div key={i} className={`px-2 py-1 ${isNew
                            ? 'bg-green-100 border-l-4 border-green-500'
                            : isDeleted
                                ? 'bg-red-100 border-l-4 border-red-500 line-through'
                                : ''}`}>
                          {line || '\u00A0'}
                        </div>);
                })}
                  </div>) : (<pre className="whitespace-pre-wrap font-mono text-sm">{editedContent}</pre>)}
              </div>

              {diffView && (<div className="mt-4 flex space-x-3">
                  <button onClick={handleAcceptChanges} className="flex-1 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-semibold">
                    ✓ Aceptar Cambios
                  </button>
                  <button onClick={handleRejectChanges} className="flex-1 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-semibold">
                    ✗ Rechazar
                  </button>
                </div>)}
            </div>

            {/* AI Modification Panel */}
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">Panel de Modificación con IA</h3>
              <div className="border-2 border-purple-300 rounded-lg p-6 bg-purple-50">
                <div className="mb-4">
                  <label className="block font-medium text-gray-800 mb-2">
                    Instrucciones para la IA
                  </label>
                  <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="Ej: 'Agregar una cláusula sobre riesgo cardiovascular específico'" className="w-full p-4 border-2 border-purple-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 resize-none" rows={6}/>
                </div>

                <button onClick={handleGenerateModification} disabled={!aiPrompt.trim() || isProcessing} className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
                  {isProcessing ? (<span className="flex items-center justify-center space-x-2">
                      <span className="animate-spin">⚙️</span>
                      <span>Procesando con IA...</span>
                    </span>) : ('✨ Generar Modificación')}
                </button>

                <div className="mt-6 p-4 bg-white rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-gray-800 mb-2">💡 Ejemplos de Instrucciones:</h4>
                  <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                    <li>"Agregar cláusula sobre riesgo cardiovascular"</li>
                    <li>"Simplificar el lenguaje para pacientes de edad avanzada"</li>
                    <li>"Incluir información sobre procedimientos invasivos"</li>
                    <li>"Añadir sección sobre efectos secundarios"</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </>)}
    </div>);
}
//# sourceMappingURL=ConsentManager.js.map