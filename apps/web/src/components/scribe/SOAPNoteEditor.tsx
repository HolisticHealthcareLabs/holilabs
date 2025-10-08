'use client';

import { useState, useEffect } from 'react';

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
  readOnly?: boolean;
}

export default function SOAPNoteEditor({
  note,
  onSave,
  onSign,
  onNotifyPatient,
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

      {/* Chief Complaint */}
      <div>
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
      <div className="border-l-4 border-blue-500 pl-4">
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
          <textarea
            value={editedNote.subjective || ''}
            onChange={(e) => setEditedNote({ ...editedNote, subjective: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        ) : (
          <p className="text-gray-900 whitespace-pre-wrap bg-blue-50 p-3 rounded-lg">
            {note.subjective}
          </p>
        )}
      </div>

      {/* Objective */}
      <div className="border-l-4 border-green-500 pl-4">
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
          <textarea
            value={editedNote.objective || ''}
            onChange={(e) => setEditedNote({ ...editedNote, objective: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
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
      <div className="border-l-4 border-purple-500 pl-4">
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
          <textarea
            value={editedNote.assessment || ''}
            onChange={(e) => setEditedNote({ ...editedNote, assessment: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
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
      <div className="border-l-4 border-orange-500 pl-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-orange-700 uppercase">Plan (P)</h3>
          <span
            className={`text-xs px-2 py-1 rounded ${getConfidenceColor(note.planConfidence)}`}
          >
            {Math.round(note.planConfidence * 100)}%
          </span>
        </div>
        {isEditing ? (
          <textarea
            value={editedNote.plan || ''}
            onChange={(e) => setEditedNote({ ...editedNote, plan: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
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
    </div>
  );
}
