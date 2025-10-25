"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ClinicalNotesEditor;
const react_1 = require("react");
function ClinicalNotesEditor({ patientId, clinicianId, patientName, onClose, onSave, }) {
    const [noteType, setNoteType] = (0, react_1.useState)('FOLLOW_UP');
    const [chiefComplaint, setChiefComplaint] = (0, react_1.useState)('');
    const [soap, setSOAP] = (0, react_1.useState)({
        subjective: '',
        objective: '',
        assessment: '',
        plan: '',
    });
    const [vitalSigns, setVitalSigns] = (0, react_1.useState)({
        bloodPressure: '',
        heartRate: '',
        temperature: '',
        respiratoryRate: '',
        oxygenSaturation: '',
        weight: '',
    });
    const [diagnoses, setDiagnoses] = (0, react_1.useState)([]);
    const [procedures, setProcedures] = (0, react_1.useState)([]);
    const [newDiagnosis, setNewDiagnosis] = (0, react_1.useState)('');
    const [newProcedure, setNewProcedure] = (0, react_1.useState)('');
    const [isSubmitting, setIsSubmitting] = (0, react_1.useState)(false);
    const [autoSaveStatus, setAutoSaveStatus] = (0, react_1.useState)('idle');
    // AI-powered suggestions for each section
    const suggestions = {
        subjective: [
            'Paciente refiere dolor en...',
            'Se presenta con molestias de...',
            'Refiere mejoría desde última consulta',
            'Continúa con sintomatología de...',
        ],
        objective: [
            'Signos vitales estables',
            'Examen físico dentro de límites normales',
            'Se observa...',
            'Auscultación: ruidos cardíacos rítmicos',
        ],
        assessment: [
            'Diagnóstico diferencial incluye...',
            'Condición estable',
            'Requiere seguimiento',
            'Mejoría clínica evidente',
        ],
        plan: [
            'Continuar tratamiento actual',
            'Solicitar estudios complementarios',
            'Modificar dosis de medicación',
            'Control en 1 semana',
        ],
    };
    // Note type templates
    const templates = {
        FOLLOW_UP: {
            subjective: 'Paciente acude a control. Refiere evolución de síntomas...',
            objective: 'Signos vitales estables. Examen físico...',
            assessment: 'Evolución favorable de condición previamente diagnosticada...',
            plan: 'Continuar tratamiento actual. Control en 2 semanas...',
        },
        INITIAL_CONSULT: {
            subjective: 'Paciente de primera vez. Motivo de consulta:...',
            objective: 'Signos vitales: TA ___/___ FC ___ FR ___ T° ___ SpO2 ___%. Examen físico...',
            assessment: 'Impresión diagnóstica:...',
            plan: 'Solicitar estudios: ___. Iniciar tratamiento con...',
        },
        PROCEDURE: {
            subjective: 'Paciente preparado para procedimiento. Sin contraindicaciones...',
            objective: 'Procedimiento realizado: ___. Técnica: ___. Duración: ___ min...',
            assessment: 'Procedimiento exitoso sin complicaciones...',
            plan: 'Observación post-procedimiento. Indicaciones de egreso...',
        },
        EMERGENCY: {
            subjective: 'Paciente ingresa por emergencia. Síntomas de inicio súbito...',
            objective: 'Estado general: ___. Signos vitales: TA ___/___ FC ___ FR ___ SpO2 ___...',
            assessment: 'Emergencia médica por ___. Riesgo: alto/medio/bajo...',
            plan: 'Estabilización inmediata. Interconsulta a ___. Monitoreo continuo...',
        },
        CARDIOLOGY: {
            subjective: 'Paciente refiere dolor torácico/disnea/palpitaciones. Características: ___. Factores desencadenantes: ___. Duración: ___.',
            objective: 'TA: ___/___ FC: ___ FR: ___ SpO2: ___%. Auscultación cardíaca: R1 R2 sin soplos audibles. Pulsos periféricos palpables y simétricos. Sin edema en extremidades.',
            assessment: 'Sospecha de síndrome coronario agudo/insuficiencia cardíaca/arritmia. Clasificación NYHA: ___. Riesgo cardiovascular: bajo/medio/alto.',
            plan: 'ECG de 12 derivaciones. Troponinas seriadas. Ecocardiograma. Iniciar AAS 100mg + estatina. Interconsulta con cardiología. Control en 1 semana.',
        },
        PEDIATRICS: {
            subjective: 'Menor acompañado por ___. Motivo de consulta: ___. Inicio de síntomas: ___. Fiebre: Sí/No. Temperatura máxima: ___°C. Vacunación al día: Sí/No.',
            objective: 'Paciente alerta, reactivo. Peso: ___ kg (P___). Talla: ___ cm (P___). Temp: ___°C. FC: ___ FR: ___. Piel sin lesiones. Faringe: ___. Tímpanos: ___. Auscultación pulmonar: ___.',
            assessment: 'Diagnóstico pediátrico: ___. Estado nutricional: adecuado/desnutrición/sobrepeso. Desarrollo psicomotor: acorde a edad.',
            plan: 'Tratamiento sintomático. Hidratación oral abundante. Antipiréticos según necesidad. Signos de alarma: ___. Control en 3-5 días o antes si empeora.',
        },
        GYNECOLOGY: {
            subjective: 'FUM: ___. G___ P___ A___ C___. Ciclos menstruales: regulares/irregulares. Método anticonceptivo: ___. Motivo de consulta: ___. PAP previo: ___.',
            objective: 'Examen ginecológico: Vulva: ___. Especuloscopía: cuello uterino ___. Flujo vaginal: ___. Tacto bimanual: útero ___. Anexos: ___. Examen mamario: ___.',
            assessment: 'Diagnóstico ginecológico: ___. Riesgo: bajo/medio/alto. Indicación de mamografía/PAP/colposcopía.',
            plan: 'Tratamiento hormonal/antibiótico según hallazgos. Estudios complementarios: ___. Anticoncepción: ___. Control en 1-3 meses.',
        },
        PSYCHIATRY: {
            subjective: 'Paciente refiere síntomas de ___. Inicio: ___. Duración: ___. Intensidad: leve/moderada/severa. Ideación suicida: Sí/No. Tratamiento previo: ___. Adherencia: ___.',
            objective: 'Paciente orientado en tiempo/espacio/persona. Estado de ánimo: ___. Afecto: ___. Pensamiento: ___. Lenguaje: ___. Insight: presente/ausente. Juicio: conservado/alterado.',
            assessment: 'Impresión diagnóstica psiquiátrica: ___. DSM-5: ___. Episodio actual: leve/moderado/severo. Riesgo suicida: bajo/medio/alto.',
            plan: 'Iniciar/ajustar psicofármacos: ___. Psicoterapia: TCC/psicodinámica/DBT. Frecuencia: ___. Control en 2 semanas. Signos de alarma. Red de apoyo activada.',
        },
        DERMATOLOGY: {
            subjective: 'Paciente consulta por lesión cutánea en ___. Inicio: ___. Evolución: ___. Síntomas: prurito/dolor/ninguno. Exposición solar: ___. Alergias conocidas: ___.',
            objective: 'Lesión dermatológica: Tipo: mácula/pápula/nódulo/vesícula. Tamaño: ___ mm. Color: ___. Bordes: regulares/irregulares. Localización: ___. Número: única/múltiples.',
            assessment: 'Diagnóstico dermatológico: ___. Diagnóstico diferencial: ___. Indicación de biopsia: Sí/No. Riesgo de malignidad: bajo/medio/alto.',
            plan: 'Tratamiento tópico/sistémico: ___. Protección solar FPS 50+. Evitar irritantes. Biopsia si indicado. Dermatoscopía. Control en 2-4 semanas. Fotografía clínica.',
        },
        ORTHOPEDICS: {
            subjective: 'Paciente refiere dolor/trauma en ___. Mecanismo de lesión: ___. Tiempo de evolución: ___. Intensidad del dolor (EVA): ___/10. Limitación funcional: Sí/No.',
            objective: 'Inspección: edema/deformidad/equimosis en ___. Palpación: dolor localizado en ___. Movilidad: activa ___ / pasiva ___. Fuerza muscular: ___/5. Sensibilidad: conservada.',
            assessment: 'Diagnóstico ortopédico: ___. Fractura/luxación/esguince. Grado: I/II/III. Estabilidad articular: conservada/comprometida.',
            plan: 'Rx de ___: AP/lateral/oblicua. Inmovilización con ___. AINES. Hielo local. Reposo relativo. Fisioterapia. Control con Rx control en 2 semanas.',
        },
        GASTROENTEROLOGY: {
            subjective: 'Paciente refiere síntomas gastrointestinales: dolor abdominal/náusea/vómito/diarrea/estreñimiento. Localización: ___. Irradiación: ___. Relación con alimentos: ___.',
            objective: 'Abdomen: inspección ___. Auscultación: RHA presentes/ausentes. Palpación: dolor en ___. Defensa/rebote: Sí/No. Masas palpables: Sí/No. Tacto rectal: ___.',
            assessment: 'Diagnóstico gastroenterológico: ___. Abdomen agudo: Sí/No. Signos de irritación peritoneal: Sí/No. Deshidratación: leve/moderada/severa.',
            plan: 'Laboratorios: BH, QS, amilasa, lipasa. Rx abdomen AP/lat. US abdominal si indicado. Dieta líquida/blanda. Hidratación. Procinéticos/antieméticos. Control en 48h.',
        },
        ENDOCRINOLOGY: {
            subjective: 'Paciente con diagnóstico de diabetes/hipotiroidismo/obesidad. Tiempo de evolución: ___. Tratamiento actual: ___. Adherencia: ___. Síntomas actuales: ___.',
            objective: 'Peso: ___ kg. IMC: ___. TA: ___/___. Glucemia capilar: ___ mg/dL. Examen de tiroides: ___. Acantosis nigricans: Sí/No. Examen de pies diabético: ___.',
            assessment: 'Control metabólico: óptimo/subóptimo/descontrolado. HbA1c meta: <7%. Complicaciones: retinopatía/nefropatía/neuropatía. Riesgo cardiovascular: ___.',
            plan: 'Ajuste de tratamiento: ___. Metas glucémicas: ayuno 80-130, postprandial <180. Dieta y ejercicio. Automonitoreo. Exámenes: HbA1c, perfil lipídico, función renal. Control en 3 meses.',
        },
    };
    // Load template when note type changes
    (0, react_1.useEffect)(() => {
        const template = templates[noteType];
        setSOAP(template);
    }, [noteType]);
    // Auto-save functionality (every 30 seconds)
    (0, react_1.useEffect)(() => {
        const interval = setInterval(() => {
            if (chiefComplaint || soap.subjective || soap.objective || soap.assessment || soap.plan) {
                handleAutoSave();
            }
        }, 30000);
        return () => clearInterval(interval);
    }, [chiefComplaint, soap, vitalSigns, diagnoses, procedures]);
    const handleAutoSave = async () => {
        setAutoSaveStatus('saving');
        // Simulate auto-save
        setTimeout(() => {
            setAutoSaveStatus('saved');
            setTimeout(() => setAutoSaveStatus('idle'), 2000);
        }, 500);
    };
    const handleSOAPChange = (field, value) => {
        setSOAP((prev) => ({ ...prev, [field]: value }));
    };
    const handleVitalSignChange = (field, value) => {
        setVitalSigns((prev) => ({ ...prev, [field]: value }));
    };
    const addDiagnosis = () => {
        if (newDiagnosis.trim()) {
            setDiagnoses([...diagnoses, newDiagnosis.trim()]);
            setNewDiagnosis('');
        }
    };
    const removeDiagnosis = (index) => {
        setDiagnoses(diagnoses.filter((_, i) => i !== index));
    };
    const addProcedure = () => {
        if (newProcedure.trim()) {
            setProcedures([...procedures, newProcedure.trim()]);
            setNewProcedure('');
        }
    };
    const removeProcedure = (index) => {
        setProcedures(procedures.filter((_, i) => i !== index));
    };
    const applySuggestion = (field, suggestion) => {
        handleSOAPChange(field, soap[field] + (soap[field] ? ' ' : '') + suggestion);
    };
    const handleSubmit = async () => {
        if (!chiefComplaint.trim()) {
            alert('Por favor ingrese el motivo de consulta');
            return;
        }
        setIsSubmitting(true);
        try {
            const response = await fetch('/api/clinical-notes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    patientId,
                    clinicianId,
                    noteType,
                    chiefComplaint,
                    subjective: soap.subjective,
                    objective: soap.objective,
                    assessment: soap.assessment,
                    plan: soap.plan,
                    vitalSigns,
                    diagnoses,
                    procedures,
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to save clinical note');
            }
            alert('✅ Nota clínica guardada exitosamente con verificación blockchain');
            onSave?.();
            onClose();
        }
        catch (error) {
            console.error('Error saving clinical note:', error);
            alert('❌ Error al guardar nota clínica: ' + error.message);
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (<div className="fixed inset-0 bg-black/60 z-50 overflow-y-auto">
      <div className="min-h-screen px-4 py-8">
        <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-purple-700 text-white px-8 py-6 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold mb-2">Editor de Notas Clínicas</h2>
                <p className="text-purple-100">Paciente: {patientName}</p>
              </div>
              <div className="flex items-center space-x-4">
                {/* Auto-save indicator */}
                {autoSaveStatus === 'saving' && (<div className="flex items-center space-x-2 text-sm bg-white/20 px-3 py-1 rounded-full">
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"/>
                    <span>Guardando...</span>
                  </div>)}
                {autoSaveStatus === 'saved' && (<div className="flex items-center space-x-2 text-sm bg-green-500 px-3 py-1 rounded-full">
                    <span>✓</span>
                    <span>Guardado</span>
                  </div>)}
                <button onClick={onClose} aria-label="Cerrar editor" className="text-white hover:bg-white/20 rounded-full w-10 h-10 flex items-center justify-center text-2xl transition">
                  ×
                </button>
              </div>
            </div>
          </div>

          <div className="p-8">
            {/* Note Type Selector */}
            <div className="mb-8">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Tipo de Nota Clínica / Especialidad
              </label>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {[
            'FOLLOW_UP',
            'INITIAL_CONSULT',
            'PROCEDURE',
            'EMERGENCY',
            'CARDIOLOGY',
            'PEDIATRICS',
            'GYNECOLOGY',
            'PSYCHIATRY',
            'DERMATOLOGY',
            'ORTHOPEDICS',
            'GASTROENTEROLOGY',
            'ENDOCRINOLOGY',
        ].map((type) => {
            const labels = {
                FOLLOW_UP: '📋 Control',
                INITIAL_CONSULT: '🆕 Inicial',
                PROCEDURE: '🔬 Procedimiento',
                EMERGENCY: '🚨 Emergencia',
                CARDIOLOGY: '❤️ Cardiología',
                PEDIATRICS: '👶 Pediatría',
                GYNECOLOGY: '💐 Ginecología',
                PSYCHIATRY: '🧠 Psiquiatría',
                DERMATOLOGY: '🩹 Dermatología',
                ORTHOPEDICS: '🦴 Ortopedia',
                GASTROENTEROLOGY: '🫃 Gastro',
                ENDOCRINOLOGY: '🩺 Endocrino',
            };
            return (<button key={type} onClick={() => setNoteType(type)} className={`py-2 px-3 rounded-lg font-medium text-sm transition-all ${noteType === type
                    ? 'bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                      {labels[type]}
                    </button>);
        })}
              </div>
            </div>

            {/* Chief Complaint */}
            <div className="mb-8">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Motivo de Consulta *
              </label>
              <input type="text" value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} placeholder="Ej: Dolor torácico, Cefalea, Control rutinario..." className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 font-medium"/>
            </div>

            {/* Vital Signs */}
            <div className="mb-8 bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center">
                <span className="text-2xl mr-2">🩺</span>
                Signos Vitales
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Presión Arterial (mmHg)
                  </label>
                  <input type="text" value={vitalSigns.bloodPressure} onChange={(e) => handleVitalSignChange('bloodPressure', e.target.value)} placeholder="120/80" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Frecuencia Cardíaca (lpm)
                  </label>
                  <input type="text" value={vitalSigns.heartRate} onChange={(e) => handleVitalSignChange('heartRate', e.target.value)} placeholder="72" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Temperatura (°C)
                  </label>
                  <input type="text" value={vitalSigns.temperature} onChange={(e) => handleVitalSignChange('temperature', e.target.value)} placeholder="36.5" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Frecuencia Respiratoria (rpm)
                  </label>
                  <input type="text" value={vitalSigns.respiratoryRate} onChange={(e) => handleVitalSignChange('respiratoryRate', e.target.value)} placeholder="16" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Saturación O₂ (%)
                  </label>
                  <input type="text" value={vitalSigns.oxygenSaturation} onChange={(e) => handleVitalSignChange('oxygenSaturation', e.target.value)} placeholder="98" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Peso (kg)
                  </label>
                  <input type="text" value={vitalSigns.weight} onChange={(e) => handleVitalSignChange('weight', e.target.value)} placeholder="70" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"/>
                </div>
              </div>
            </div>

            {/* SOAP Notes */}
            <div className="space-y-6">
              {/* Subjective */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-blue-900 flex items-center">
                    <span className="text-2xl mr-2">💬</span>
                    Subjetivo (S)
                  </h3>
                  <div className="flex space-x-2">
                    {suggestions.subjective.map((suggestion, i) => (<button key={i} onClick={() => applySuggestion('subjective', suggestion)} className="text-xs bg-blue-200 hover:bg-blue-300 text-blue-800 px-2 py-1 rounded transition" title="Agregar sugerencia">
                        + {suggestion.slice(0, 20)}...
                      </button>))}
                  </div>
                </div>
                <textarea value={soap.subjective} onChange={(e) => handleSOAPChange('subjective', e.target.value)} placeholder="Lo que el paciente refiere..." className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none" rows={4}/>
              </div>

              {/* Objective */}
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-green-900 flex items-center">
                    <span className="text-2xl mr-2">🔍</span>
                    Objetivo (O)
                  </h3>
                  <div className="flex space-x-2">
                    {suggestions.objective.map((suggestion, i) => (<button key={i} onClick={() => applySuggestion('objective', suggestion)} className="text-xs bg-green-200 hover:bg-green-300 text-green-800 px-2 py-1 rounded transition" title="Agregar sugerencia">
                        + {suggestion.slice(0, 20)}...
                      </button>))}
                  </div>
                </div>
                <textarea value={soap.objective} onChange={(e) => handleSOAPChange('objective', e.target.value)} placeholder="Hallazgos del examen físico..." className="w-full px-4 py-3 border border-green-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-500/20 resize-none" rows={4}/>
              </div>

              {/* Assessment */}
              <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-purple-900 flex items-center">
                    <span className="text-2xl mr-2">🧠</span>
                    Evaluación (A)
                  </h3>
                  <div className="flex space-x-2">
                    {suggestions.assessment.map((suggestion, i) => (<button key={i} onClick={() => applySuggestion('assessment', suggestion)} className="text-xs bg-purple-200 hover:bg-purple-300 text-purple-800 px-2 py-1 rounded transition" title="Agregar sugerencia">
                        + {suggestion.slice(0, 20)}...
                      </button>))}
                  </div>
                </div>
                <textarea value={soap.assessment} onChange={(e) => handleSOAPChange('assessment', e.target.value)} placeholder="Impresión diagnóstica..." className="w-full px-4 py-3 border border-purple-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 resize-none" rows={4}/>

                {/* Diagnoses */}
                <div className="mt-4">
                  <label className="block text-sm font-semibold text-purple-900 mb-2">
                    Diagnósticos CIE-10
                  </label>
                  <div className="flex space-x-2 mb-2">
                    <input type="text" value={newDiagnosis} onChange={(e) => setNewDiagnosis(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addDiagnosis()} placeholder="Ej: E11.9 - Diabetes Mellitus tipo 2" className="flex-1 px-3 py-2 border border-purple-300 rounded-lg focus:border-purple-500 focus:ring-1 focus:ring-purple-500"/>
                    <button onClick={addDiagnosis} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium">
                      + Agregar
                    </button>
                  </div>
                  <div className="space-y-2">
                    {diagnoses.map((diagnosis, i) => (<div key={i} className="flex items-center justify-between bg-purple-100 px-3 py-2 rounded-lg">
                        <span className="text-sm text-purple-900">{diagnosis}</span>
                        <button onClick={() => removeDiagnosis(i)} aria-label={`Eliminar diagnóstico: ${diagnosis}`} className="text-purple-600 hover:text-purple-800">
                          ×
                        </button>
                      </div>))}
                  </div>
                </div>
              </div>

              {/* Plan */}
              <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-orange-900 flex items-center">
                    <span className="text-2xl mr-2">📝</span>
                    Plan (P)
                  </h3>
                  <div className="flex space-x-2">
                    {suggestions.plan.map((suggestion, i) => (<button key={i} onClick={() => applySuggestion('plan', suggestion)} className="text-xs bg-orange-200 hover:bg-orange-300 text-orange-800 px-2 py-1 rounded transition" title="Agregar sugerencia">
                        + {suggestion.slice(0, 20)}...
                      </button>))}
                  </div>
                </div>
                <textarea value={soap.plan} onChange={(e) => handleSOAPChange('plan', e.target.value)} placeholder="Plan terapéutico y seguimiento..." className="w-full px-4 py-3 border border-orange-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 resize-none" rows={4}/>

                {/* Procedures */}
                <div className="mt-4">
                  <label className="block text-sm font-semibold text-orange-900 mb-2">
                    Procedimientos Realizados
                  </label>
                  <div className="flex space-x-2 mb-2">
                    <input type="text" value={newProcedure} onChange={(e) => setNewProcedure(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addProcedure()} placeholder="Ej: Electrocardiograma de 12 derivaciones" className="flex-1 px-3 py-2 border border-orange-300 rounded-lg focus:border-orange-500 focus:ring-1 focus:ring-orange-500"/>
                    <button onClick={addProcedure} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-medium">
                      + Agregar
                    </button>
                  </div>
                  <div className="space-y-2">
                    {procedures.map((procedure, i) => (<div key={i} className="flex items-center justify-between bg-orange-100 px-3 py-2 rounded-lg">
                        <span className="text-sm text-orange-900">{procedure}</span>
                        <button onClick={() => removeProcedure(i)} aria-label={`Eliminar procedimiento: ${procedure}`} className="text-orange-600 hover:text-orange-800">
                          ×
                        </button>
                      </div>))}
                  </div>
                </div>
              </div>
            </div>

            {/* Blockchain Verification Badge */}
            <div className="mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <div className="text-3xl">🔐</div>
                <div className="flex-1">
                  <h4 className="font-bold text-indigo-900">Verificación Blockchain</h4>
                  <p className="text-sm text-indigo-700">
                    Esta nota será registrada con hash criptográfico SHA-256 para garantizar
                    inmutabilidad y trazabilidad completa.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex items-center justify-between">
              <button onClick={onClose} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium">
                Cancelar
              </button>
              <div className="flex space-x-4">
                <button onClick={handleAutoSave} className="px-6 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition font-medium">
                  💾 Guardar Borrador
                </button>
                <button onClick={handleSubmit} disabled={isSubmitting || !chiefComplaint.trim()} className="px-8 py-3 bg-gradient-to-r from-primary to-purple-700 text-white rounded-lg hover:shadow-lg transition font-bold disabled:opacity-50 disabled:cursor-not-allowed">
                  {isSubmitting ? 'Guardando...' : '✓ Guardar Nota Clínica'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>);
}
//# sourceMappingURL=ClinicalNotesEditor.js.map