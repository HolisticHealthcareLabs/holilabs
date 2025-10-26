'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getTemplatesByLanguage,
  type SOAPTemplate,
} from '@/lib/templates/soap-templates';
import VersionHistoryModal from './VersionHistoryModal';
import VoiceInputButton from './VoiceInputButton';
import QuickInterventionsPanel from './QuickInterventionsPanel';
import PainScaleSelector from './PainScaleSelector';
import { TemplatePicker } from '@/components/templates/TemplatePicker';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';
import { VoiceCommandFeedback } from '@/components/voice/VoiceCommandFeedback';
import {
  createSOAPEditorCommands,
  type SOAPEditorCommandHandlers,
} from '@/lib/voice/soapEditorCommands';
import { MicrophoneIcon, StopIcon } from '@heroicons/react/24/solid';

interface Diagnosis {
  icd10Code: string;
  description: string;
  isPrimary?: boolean;
}

interface Procedure {
  cptCode: string;
  description: string;
}

interface Medication {
  action: string;
  name: string;
  dose: string;
  frequency: string;
  duration: string;
}

interface VitalSigns {
  bp?: string;
  hr?: string;
  temp?: string;
  rr?: string;
  spo2?: string;
  weight?: string;
}

interface SOAPNote {
  id: string;
  chiefComplaint: string;
  subjective: string;
  subjectiveConfidence: number;
  objective: string;
  objectiveConfidence: number;
  assessment: string;
  assessmentConfidence: number;
  plan: string;
  planConfidence: number;
  overallConfidence: number;
  diagnoses?: Diagnosis[];
  procedures?: Procedure[];
  medications?: Medication[];
  vitalSigns?: VitalSigns;
  status: string;
}

interface SOAPNoteEditorProps {
  note: SOAPNote;
  onSave: (updatedNote: Partial<SOAPNote>) => void;
  onSign: () => void;
  onNotifyPatient?: () => void;
  patientId?: string;
  readOnly?: boolean;
}

export default function SOAPNoteEditor({
  note,
  onSave,
  onSign,
  onNotifyPatient,
  patientId,
  readOnly = false,
}: SOAPNoteEditorProps) {
  const [editedNote, setEditedNote] = useState<Partial<SOAPNote>>({
    chiefComplaint: note.chiefComplaint,
    subjective: note.subjective,
    objective: note.objective,
    assessment: note.assessment,
    plan: note.plan,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'es' | 'pt'>('es');
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showPainScale, setShowPainScale] = useState(false);
  const [activeVoiceField, setActiveVoiceField] = useState<
    'subjective' | 'objective' | 'assessment' | 'plan' | null
  >(null);
  const [templatePickerTarget, setTemplatePickerTarget] = useState<
    'subjective' | 'objective' | 'assessment' | 'plan' | null
  >(null);
  const [voiceCommandsEnabled, setVoiceCommandsEnabled] = useState(false);

  // Section refs for navigation
  const chiefComplaintRef = useRef<HTMLDivElement>(null);
  const subjectiveRef = useRef<HTMLDivElement>(null);
  const objectiveRef = useRef<HTMLDivElement>(null);
  const assessmentRef = useRef<HTMLDivElement>(null);
  const planRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // Voice Command Handlers
  // ============================================================================

  const jumpToSection = useCallback((section: 'subjective' | 'objective' | 'assessment' | 'plan' | 'chief-complaint') => {
    const refMap = {
      'chief-complaint': chiefComplaintRef,
      'subjective': subjectiveRef,
      'objective': objectiveRef,
      'assessment': assessmentRef,
      'plan': planRef,
    };

    const ref = refMap[section];
    if (ref?.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Flash the section to indicate focus
      ref.current.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
      setTimeout(() => {
        if (ref.current) {
          ref.current.style.backgroundColor = '';
        }
      }, 1000);
    }
  }, []);

  const insertTemplateByName = useCallback(async (templateName: string) => {
    // Try to find template by name (fuzzy match)
    const allTemplates = getTemplatesByLanguage(selectedLanguage);
    const template = allTemplates.find((t) =>
      t.name.toLowerCase().includes(templateName.toLowerCase())
    );

    if (template) {
      applyTemplate(template);
    } else {
      console.warn(`Template not found: ${templateName}`);
    }
  }, [selectedLanguage]);

  const addMedicationVoice = useCallback((params: { name: string; dose?: string; frequency?: string }) => {
    const medicationText = `• ${params.name}${params.dose ? ` ${params.dose}` : ''}${params.frequency ? ` - ${params.frequency}` : ''}`;

    setEditedNote((prev) => ({
      ...prev,
      plan: prev.plan ? `${prev.plan}\n${medicationText}` : medicationText,
    }));
  }, []);

  const addDiagnosisVoice = useCallback((params: { name: string; code?: string }) => {
    const diagnosisText = `• ${params.name}${params.code ? ` (${params.code})` : ''}`;

    setEditedNote((prev) => ({
      ...prev,
      assessment: prev.assessment ? `${prev.assessment}\n${diagnosisText}` : diagnosisText,
    }));
  }, []);

  const insertTextToSection = useCallback((section: string, text: string) => {
    setEditedNote((prev) => ({
      ...prev,
      [section]: prev[section] ? `${prev[section]}\n${text}` : text,
    }));
  }, []);

  const voiceCommandHandlers: SOAPEditorCommandHandlers = {
    jumpToSection,
    insertTemplate: insertTemplateByName,
    insertText: insertTextToSection,
    save: handleSave,
    saveAndSign: onSign,
    cancel: handleCancel,
    startEditing: () => setIsEditing(true),
    addMedication: addMedicationVoice,
    addDiagnosis: addDiagnosisVoice,
    showTemplates: () => setShowTemplates(true),
    hideTemplates: () => setShowTemplates(false),
  };

  // Create voice commands
  const voiceCommands = createSOAPEditorCommands(voiceCommandHandlers);

  // Initialize voice commands hook
  const voiceCommandsState = useVoiceCommands({
    commands: voiceCommands,
    language: selectedLanguage === 'pt' ? 'pt' : 'es',
    debug: true,
    onCommandExecuted: (command) => {
      console.log('[Voice Command] Executed:', command);
    },
    onError: (error) => {
      console.error('[Voice Command] Error:', error);
    },
  });

  // ICD-10 validation regex
  const validateICD10 = (code: string): boolean => {
    return /^[A-Z]\d{2}(\.\d{1,2})?$/.test(code);
  };

  // CPT validation regex
  const validateCPT = (code: string): boolean => {
    return /^\d{5}$/.test(code);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-green-100 text-green-700 border-green-300';
    if (confidence >= 0.7) return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    return 'bg-red-100 text-red-700 border-red-300';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.9) return 'Alta confianza';
    if (confidence >= 0.7) return 'Confianza media';
    return 'Baja confianza - Revisar';
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(editedNote);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedNote({
      chiefComplaint: note.chiefComplaint,
      subjective: note.subjective,
      objective: note.objective,
      assessment: note.assessment,
      plan: note.plan,
    });
    setIsEditing(false);
  };

  const applyTemplate = (template: SOAPTemplate) => {
    setEditedNote({
      chiefComplaint: template.chiefComplaint,
      subjective: template.subjective,
      objective: template.objective,
      assessment: template.assessment,
      plan: template.plan,
    });
    setIsEditing(true);
    setShowTemplates(false);
  };

  // Handler for voice input
  const handleVoiceTranscript = (text: string) => {
    if (!activeVoiceField) return;

    setEditedNote((prev) => ({
      ...prev,
      [activeVoiceField]: prev[activeVoiceField]
        ? `${prev[activeVoiceField]}\n${text}`
        : text,
    }));
  };

  // Handler for quick interventions (inserts into Plan section)
  const handleInsertIntervention = (text: string) => {
    setEditedNote((prev) => ({
      ...prev,
      plan: prev.plan ? `${prev.plan}\n• ${text}` : `• ${text}`,
    }));
  };

  // Handler for pain scale (inserts into Subjective section)
  const handlePainScoreSelection = (score: number, description: string) => {
    setEditedNote((prev) => ({
      ...prev,
      subjective: prev.subjective
        ? `${prev.subjective}\n${description}`
        : description,
    }));
  };

  // Handler for clinical template insertion
  const handleTemplateSelect = (content: string) => {
    if (!templatePickerTarget) return;

    setEditedNote((prev) => ({
      ...prev,
      [templatePickerTarget]: prev[templatePickerTarget]
        ? `${prev[templatePickerTarget]}\n\n${content}`
        : content,
    }));
    setTemplatePickerTarget(null);
  };

  const templates = getTemplatesByLanguage(selectedLanguage);

  return (
    <div className="space-y-6">
      {/* Overall Confidence Banner */}
      <div
        className={`p-4 rounded-lg border ${getConfidenceColor(note.overallConfidence)}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="font-bold">Confianza General: </span>
            <span>{getConfidenceLabel(note.overallConfidence)}</span>
          </div>
          <span className="text-2xl font-bold">{Math.round(note.overallConfidence * 100)}%</span>
        </div>
      </div>

      {/* Voice Commands Toggle */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-2 border-indigo-200 dark:border-indigo-700 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-100 flex items-center mb-1">
              <span className="mr-2">🎤</span>
              Voice Commands (Beta)
            </h3>
            <p className="text-sm text-indigo-700 dark:text-indigo-300">
              Hands-free documentation with intelligent commands
            </p>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
              Try: &quot;insert template chest pain&quot;, &quot;jump to assessment&quot;, &quot;add medication aspirin&quot;
            </p>
          </div>
          <button
            onClick={() => {
              if (voiceCommandsState.isListening) {
                voiceCommandsState.stopListening();
              } else {
                voiceCommandsState.startListening();
              }
            }}
            disabled={!voiceCommandsState.isSupported}
            className={`
              px-6 py-3 rounded-lg font-bold transition-all shadow-lg flex items-center gap-2
              ${
                voiceCommandsState.isListening
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            title={voiceCommandsState.isSupported ? (voiceCommandsState.isListening ? 'Stop listening' : 'Start voice commands') : 'Voice commands not supported'}
          >
            {voiceCommandsState.isListening ? (
              <>
                <StopIcon className="w-5 h-5" />
                <span>Stop Listening</span>
              </>
            ) : (
              <>
                <MicrophoneIcon className="w-5 h-5" />
                <span>Start Voice Commands</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Template Library (Nuance DAX Feature) */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-lg font-bold text-purple-900 flex items-center">
              <span className="mr-2">📋</span>
              Biblioteca de Plantillas
            </h3>
            <p className="text-sm text-purple-700">
              Ahorra 3-5 minutos usando plantillas pre-configuradas
            </p>
          </div>
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all font-semibold"
          >
            {showTemplates ? 'Ocultar' : 'Ver Plantillas'}
          </button>
        </div>

        {showTemplates && (
          <div className="mt-4 space-y-3">
            {/* Language Selector */}
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedLanguage('es')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  selectedLanguage === 'es'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-purple-700 border border-purple-300 hover:bg-purple-50'
                }`}
              >
                🇲🇽 Español
              </button>
              <button
                onClick={() => setSelectedLanguage('pt')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  selectedLanguage === 'pt'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-purple-700 border border-purple-300 hover:bg-purple-50'
                }`}
              >
                🇧🇷 Português
              </button>
            </div>

            {/* Template Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => applyTemplate(template)}
                  className="text-left p-4 bg-white border-2 border-purple-200 rounded-lg hover:border-purple-400 hover:shadow-md transition-all"
                >
                  <div className="font-bold text-purple-900 mb-1">{template.name}</div>
                  {template.specialty && (
                    <div className="text-xs text-purple-600 bg-purple-100 inline-block px-2 py-1 rounded-full mb-2">
                      {template.specialty}
                    </div>
                  )}
                  <div className="text-sm text-gray-600 line-clamp-2">
                    {template.chiefComplaint}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions Panel (Palliative Care) */}
      {isEditing && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setShowQuickActions(!showQuickActions)}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all font-semibold"
            >
              {showQuickActions ? '🔽 Ocultar' : '⚡ Ver'} Acciones Rápidas
            </button>
            <button
              onClick={() => setShowPainScale(!showPainScale)}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg hover:from-blue-600 hover:to-cyan-700 transition-all font-semibold"
            >
              {showPainScale ? '🔽 Ocultar' : '🩺 Ver'} Escala de Dolor
            </button>
          </div>

          {showQuickActions && (
            <QuickInterventionsPanel
              onInsertText={handleInsertIntervention}
              className="mb-4"
            />
          )}

          {showPainScale && (
            <PainScaleSelector
              onSelectPainScore={handlePainScoreSelection}
              patientId={patientId}
              className="mb-4"
            />
          )}
        </div>
      )}

      {/* Chief Complaint */}
      <div ref={chiefComplaintRef}>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Motivo de Consulta
        </label>
        {isEditing ? (
          <input
            type="text"
            value={editedNote.chiefComplaint || ''}
            onChange={(e) =>
              setEditedNote({ ...editedNote, chiefComplaint: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        ) : (
          <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{note.chiefComplaint}</p>
        )}
      </div>

      {/* Subjective */}
      <div ref={subjectiveRef} className="border-l-4 border-blue-500 pl-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-blue-700 uppercase">Subjetivo (S)</h3>
          <span
            className={`text-xs px-2 py-1 rounded ${getConfidenceColor(
              note.subjectiveConfidence
            )}`}
          >
            {Math.round(note.subjectiveConfidence * 100)}%
          </span>
        </div>
        {isEditing ? (
          <>
            <div className="flex items-center gap-2 mb-2">
              <VoiceInputButton
                onTranscript={handleVoiceTranscript}
                language="pt-BR"
                className=""
              />
              <button
                onClick={() =>
                  setActiveVoiceField(activeVoiceField === 'subjective' ? null : 'subjective')
                }
                className={`text-xs px-3 py-1 rounded ${
                  activeVoiceField === 'subjective'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                {activeVoiceField === 'subjective'
                  ? '✓ Voz activa'
                  : 'Activar voz'}
              </button>
              <button
                onClick={() => setTemplatePickerTarget('subjective')}
                className="text-xs px-3 py-1 rounded bg-purple-100 text-purple-700 hover:bg-purple-200 font-semibold"
              >
                📋 Insertar Plantilla
              </button>
            </div>
            <textarea
              value={editedNote.subjective || ''}
              onChange={(e) => setEditedNote({ ...editedNote, subjective: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </>
        ) : (
          <p className="text-gray-900 whitespace-pre-wrap bg-blue-50 p-3 rounded-lg">
            {note.subjective}
          </p>
        )}
      </div>

      {/* Objective */}
      <div ref={objectiveRef} className="border-l-4 border-green-500 pl-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-green-700 uppercase">Objetivo (O)</h3>
          <span
            className={`text-xs px-2 py-1 rounded ${getConfidenceColor(
              note.objectiveConfidence
            )}`}
          >
            {Math.round(note.objectiveConfidence * 100)}%
          </span>
        </div>
        {isEditing ? (
          <>
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() =>
                  setActiveVoiceField(activeVoiceField === 'objective' ? null : 'objective')
                }
                className={`text-xs px-3 py-1 rounded ${
                  activeVoiceField === 'objective'
                    ? 'bg-green-600 text-white'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {activeVoiceField === 'objective'
                  ? '✓ Voz activa'
                  : 'Activar voz'}
              </button>
              <button
                onClick={() => setTemplatePickerTarget('objective')}
                className="text-xs px-3 py-1 rounded bg-purple-100 text-purple-700 hover:bg-purple-200 font-semibold"
              >
                📋 Insertar Plantilla
              </button>
            </div>
            <textarea
              value={editedNote.objective || ''}
              onChange={(e) => setEditedNote({ ...editedNote, objective: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </>
        ) : (
          <p className="text-gray-900 whitespace-pre-wrap bg-green-50 p-3 rounded-lg">
            {note.objective}
          </p>
        )}

        {/* Vital Signs */}
        {note.vitalSigns && Object.keys(note.vitalSigns).length > 0 && (
          <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
            {note.vitalSigns.bp && (
              <div className="bg-white p-2 rounded border border-green-200">
                <div className="text-xs text-gray-600">Presión Arterial</div>
                <div className="font-bold text-gray-900">{note.vitalSigns.bp}</div>
              </div>
            )}
            {note.vitalSigns.hr && (
              <div className="bg-white p-2 rounded border border-green-200">
                <div className="text-xs text-gray-600">Frecuencia Cardíaca</div>
                <div className="font-bold text-gray-900">{note.vitalSigns.hr} bpm</div>
              </div>
            )}
            {note.vitalSigns.temp && (
              <div className="bg-white p-2 rounded border border-green-200">
                <div className="text-xs text-gray-600">Temperatura</div>
                <div className="font-bold text-gray-900">{note.vitalSigns.temp}°C</div>
              </div>
            )}
            {note.vitalSigns.rr && (
              <div className="bg-white p-2 rounded border border-green-200">
                <div className="text-xs text-gray-600">Frecuencia Respiratoria</div>
                <div className="font-bold text-gray-900">{note.vitalSigns.rr}/min</div>
              </div>
            )}
            {note.vitalSigns.spo2 && (
              <div className="bg-white p-2 rounded border border-green-200">
                <div className="text-xs text-gray-600">SpO₂</div>
                <div className="font-bold text-gray-900">{note.vitalSigns.spo2}%</div>
              </div>
            )}
            {note.vitalSigns.weight && (
              <div className="bg-white p-2 rounded border border-green-200">
                <div className="text-xs text-gray-600">Peso</div>
                <div className="font-bold text-gray-900">{note.vitalSigns.weight} kg</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Assessment */}
      <div ref={assessmentRef} className="border-l-4 border-purple-500 pl-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-purple-700 uppercase">Evaluación (A)</h3>
          <span
            className={`text-xs px-2 py-1 rounded ${getConfidenceColor(
              note.assessmentConfidence
            )}`}
          >
            {Math.round(note.assessmentConfidence * 100)}%
          </span>
        </div>
        {isEditing ? (
          <>
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() =>
                  setActiveVoiceField(activeVoiceField === 'assessment' ? null : 'assessment')
                }
                className={`text-xs px-3 py-1 rounded ${
                  activeVoiceField === 'assessment'
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                }`}
              >
                {activeVoiceField === 'assessment'
                  ? '✓ Voz activa'
                  : 'Activar voz'}
              </button>
              <button
                onClick={() => setTemplatePickerTarget('assessment')}
                className="text-xs px-3 py-1 rounded bg-purple-100 text-purple-700 hover:bg-purple-200 font-semibold"
              >
                📋 Insertar Plantilla
              </button>
            </div>
            <textarea
              value={editedNote.assessment || ''}
              onChange={(e) => setEditedNote({ ...editedNote, assessment: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </>
        ) : (
          <p className="text-gray-900 whitespace-pre-wrap bg-purple-50 p-3 rounded-lg">
            {note.assessment}
          </p>
        )}

        {/* Diagnoses with ICD-10 Validation */}
        {note.diagnoses && note.diagnoses.length > 0 && (
          <div className="mt-3 space-y-2">
            {note.diagnoses.map((dx, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border ${
                  validateICD10(dx.icd10Code)
                    ? 'bg-purple-50 border-purple-200'
                    : 'bg-red-50 border-red-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono font-bold text-purple-700">{dx.icd10Code}</span>
                    {dx.isPrimary && (
                      <span className="ml-2 text-xs bg-purple-600 text-white px-2 py-0.5 rounded">
                        Primario
                      </span>
                    )}
                    <p className="text-gray-700 text-sm mt-1">{dx.description}</p>
                  </div>
                  {!validateICD10(dx.icd10Code) && (
                    <span className="text-xs text-red-600 font-medium">⚠️ Código inválido</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Plan */}
      <div ref={planRef} className="border-l-4 border-orange-500 pl-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-orange-700 uppercase">Plan (P)</h3>
          <span
            className={`text-xs px-2 py-1 rounded ${getConfidenceColor(note.planConfidence)}`}
          >
            {Math.round(note.planConfidence * 100)}%
          </span>
        </div>
        {isEditing ? (
          <>
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() =>
                  setActiveVoiceField(activeVoiceField === 'plan' ? null : 'plan')
                }
                className={`text-xs px-3 py-1 rounded ${
                  activeVoiceField === 'plan'
                    ? 'bg-orange-600 text-white'
                    : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                }`}
              >
                {activeVoiceField === 'plan'
                  ? '✓ Voz activa'
                  : 'Activar voz'}
              </button>
              <button
                onClick={() => setTemplatePickerTarget('plan')}
                className="text-xs px-3 py-1 rounded bg-purple-100 text-purple-700 hover:bg-purple-200 font-semibold"
              >
                📋 Insertar Plantilla
              </button>
            </div>
            <textarea
              value={editedNote.plan || ''}
              onChange={(e) => setEditedNote({ ...editedNote, plan: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </>
        ) : (
          <p className="text-gray-900 whitespace-pre-wrap bg-orange-50 p-3 rounded-lg">
            {note.plan}
          </p>
        )}

        {/* Medications */}
        {note.medications && note.medications.length > 0 && (
          <div className="mt-3 space-y-2">
            {note.medications.map((med, idx) => (
              <div key={idx} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-bold text-orange-900">{med.name}</span>
                    <span className="ml-2 text-sm text-gray-600">
                      {med.dose} - {med.frequency}
                    </span>
                    {med.duration && (
                      <span className="ml-2 text-sm text-gray-500">({med.duration})</span>
                    )}
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      med.action === 'prescribe'
                        ? 'bg-green-100 text-green-700'
                        : med.action === 'discontinue'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {med.action}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Procedures with CPT Validation */}
        {note.procedures && note.procedures.length > 0 && (
          <div className="mt-3 space-y-2">
            {note.procedures.map((proc, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border ${
                  validateCPT(proc.cptCode)
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-red-50 border-red-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono font-bold text-orange-700">{proc.cptCode}</span>
                    <p className="text-gray-700 text-sm mt-1">{proc.description}</p>
                  </div>
                  {!validateCPT(proc.cptCode) && (
                    <span className="text-xs text-red-600 font-medium">⚠️ Código inválido</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="pt-6 border-t border-gray-200 space-y-3">
        {/* Version History Button - Always visible */}
        <button
          onClick={() => setIsHistoryModalOpen(true)}
          className="w-full px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-all border border-gray-300 flex items-center justify-center space-x-2"
        >
          <span>🕐</span>
          <span>Ver Historial de Versiones</span>
        </button>

        {!readOnly && (
          <>
            {!isEditing ? (
              <>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setIsEditing(true)}
                    disabled={note.status === 'SIGNED'}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ✏️ Editar Nota
                  </button>
                  <button
                    onClick={onSign}
                    disabled={note.status === 'SIGNED'}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white font-bold rounded-lg hover:from-green-600 hover:to-teal-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ✅ Firmar y Finalizar
                  </button>
                </div>

                {/* WhatsApp Notification Button */}
                {onNotifyPatient && note.status === 'SIGNED' && (
                  <button
                    onClick={onNotifyPatient}
                    className="w-full px-4 py-3 bg-gradient-to-r from-green-400 to-green-600 text-white font-bold rounded-lg hover:from-green-500 hover:to-green-700 transition-all shadow-lg flex items-center justify-center space-x-2"
                  >
                    <span>📱</span>
                    <span>Enviar al Paciente vía WhatsApp</span>
                  </button>
                )}
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="flex-1 px-4 py-3 bg-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-400 transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all shadow-lg disabled:opacity-50"
                >
                  {isSaving ? 'Guardando...' : '💾 Guardar Cambios'}
                </button>
              </div>
            )}
          </>
        )}

        {note.status === 'SIGNED' && (
          <div className="text-center py-3 bg-green-100 text-green-700 font-bold rounded-lg border border-green-300">
            ✅ Nota Firmada y Finalizada
          </div>
        )}
      </div>

      {/* Version History Modal */}
      <VersionHistoryModal
        noteId={note.id}
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      />

      {/* Clinical Template Picker */}
      <TemplatePicker
        isOpen={templatePickerTarget !== null}
        onSelect={handleTemplateSelect}
        onClose={() => setTemplatePickerTarget(null)}
      />

      {/* Voice Command Feedback */}
      <VoiceCommandFeedback
        isListening={voiceCommandsState.isListening}
        isProcessing={voiceCommandsState.isProcessing}
        transcript={voiceCommandsState.transcript}
        lastCommand={voiceCommandsState.lastCommand}
        error={voiceCommandsState.error}
        availableCommands={voiceCommandsState.getAvailableCommands()}
        showSuggestions={!voiceCommandsState.isListening && !voiceCommandsState.isProcessing}
      />
    </div>
  );
}
