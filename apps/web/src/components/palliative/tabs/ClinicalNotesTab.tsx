'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

interface SOAPNote {
  id: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  vitalSigns?: Record<string, any>;
  diagnoses?: string[];
  procedures?: string[];
  templateType?: string;
  isSigned: boolean;
  createdAt: string | Date;
  createdBy: string;
  patientNotified: boolean;
  blockchainTxHash?: string;
}

interface ClinicalNotesTabProps {
  soapNotes: SOAPNote[];
  patientId: string;
  onRefresh?: () => void;
}

export default function ClinicalNotesTab({
  soapNotes,
  patientId,
  onRefresh,
}: ClinicalNotesTabProps) {
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  // Sort notes by date (most recent first)
  const sortedNotes = [...soapNotes].sort((a, b) => {
    const dateA = typeof a.createdAt === 'string' ? parseISO(a.createdAt) : a.createdAt;
    const dateB = typeof b.createdAt === 'string' ? parseISO(b.createdAt) : b.createdAt;
    return dateB.getTime() - dateA.getTime();
  });

  // Filter notes
  const filteredNotes = filterType === 'all'
    ? sortedNotes
    : sortedNotes.filter(note => note.templateType === filterType);

  const getTemplateLabel = (type?: string) => {
    const labels: Record<string, string> = {
      PALLIATIVE_FOLLOWUP: 'Seguimiento Paliativo',
      PALLIATIVE_INITIAL: 'Evaluación Inicial Paliativa',
      PALLIATIVE_PROCEDURE: 'Procedimiento Paliativo',
      PALLIATIVE_EMERGENCY: 'Emergencia Paliativa',
    };
    return type ? labels[type] || type : 'Nota General';
  };

  const getTemplateIcon = (type?: string) => {
    const icons: Record<string, string> = {
      PALLIATIVE_FOLLOWUP: '🔄',
      PALLIATIVE_INITIAL: '📋',
      PALLIATIVE_PROCEDURE: '🏥',
      PALLIATIVE_EMERGENCY: '🚨',
    };
    return icons[type || ''] || '📝';
  };

  // Get unique template types
  const templateTypes = Array.from(new Set(soapNotes.map(n => n.templateType).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center">
            <span className="mr-2">📝</span>
            Notas Clínicas ({filteredNotes.length})
          </h3>
          <Link
            href={`/dashboard/scribe?patientId=${patientId}`}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
          >
            ➕ Nueva Nota SOAP
          </Link>
        </div>

        {/* Filter */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo de Nota</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todas las notas</option>
            {templateTypes.map((type) => (
              <option key={type} value={type}>
                {getTemplateIcon(type)} {getTemplateLabel(type)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Notes List */}
      {filteredNotes.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">Sin notas clínicas</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No hay notas clínicas registradas para este paciente.
          </p>
          <Link
            href={`/dashboard/scribe?patientId=${patientId}`}
            className="inline-block px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
          >
            ➕ Crear Primera Nota
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotes.map((note) => {
            const isExpanded = selectedNote === note.id;
            const createdDate = typeof note.createdAt === 'string'
              ? parseISO(note.createdAt)
              : note.createdAt;

            return (
              <div
                key={note.id}
                className={`bg-white border-2 ${
                  isExpanded ? 'border-blue-400' : 'border-gray-200'
                } rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden`}
              >
                {/* Note Header */}
                <button
                  onClick={() => setSelectedNote(isExpanded ? null : note.id)}
                  className="w-full p-5 text-left flex items-start space-x-4 hover:bg-gray-50 transition-colors"
                >
                  {/* Template Icon */}
                  <div className="text-4xl flex-shrink-0">
                    {getTemplateIcon(note.templateType)}
                  </div>

                  {/* Note Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="text-lg font-bold text-gray-900">
                          {getTemplateLabel(note.templateType)}
                        </h4>
                        <div className="text-sm text-gray-600">
                          {format(createdDate, "EEEE, dd 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {note.isSigned && (
                          <span className="px-2 py-1 bg-green-100 border border-green-300 text-green-900 text-xs font-bold rounded-full flex items-center space-x-1">
                            <span>✓</span>
                            <span>Firmada</span>
                          </span>
                        )}
                        {note.blockchainTxHash && (
                          <span className="px-2 py-1 bg-purple-100 border border-purple-300 text-purple-900 text-xs font-bold rounded-full flex items-center space-x-1">
                            <span>🔗</span>
                            <span>Blockchain</span>
                          </span>
                        )}
                        {note.patientNotified && (
                          <span className="px-2 py-1 bg-blue-100 border border-blue-300 text-blue-900 text-xs font-bold rounded-full flex items-center space-x-1">
                            <span>✉️</span>
                            <span>Notificado</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Preview of Subjective */}
                    <p className="text-sm text-gray-700 line-clamp-2">
                      <span className="font-semibold text-blue-800">S:</span> {note.subjective}
                    </p>

                    {/* Diagnoses & Procedures */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {note.diagnoses && note.diagnoses.length > 0 && (
                        <div className="flex items-center space-x-1 text-xs text-purple-700">
                          <span>🏥</span>
                          <span>{note.diagnoses.length} diagnóstico(s)</span>
                        </div>
                      )}
                      {note.procedures && note.procedures.length > 0 && (
                        <div className="flex items-center space-x-1 text-xs text-blue-700">
                          <span>💉</span>
                          <span>{note.procedures.length} procedimiento(s)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expand/Collapse Icon */}
                  <div className="text-2xl flex-shrink-0">
                    {isExpanded ? '🔼' : '🔽'}
                  </div>
                </button>

                {/* Expanded Content - SOAP Format */}
                {isExpanded && (
                  <div className="px-5 pb-5 space-y-4 border-t border-gray-200 pt-4">
                    {/* Vital Signs */}
                    {note.vitalSigns && Object.keys(note.vitalSigns).length > 0 && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <h5 className="text-sm font-bold text-gray-900 mb-3">📊 Signos Vitales</h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {Object.entries(note.vitalSigns).map(([key, value]) => (
                            <div key={key} className="text-sm">
                              <div className="text-xs text-gray-600 uppercase">{key}</div>
                              <div className="font-semibold text-gray-900">{String(value)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* SOAP Sections */}
                    <div className="space-y-4">
                      {/* Subjective */}
                      <div className="border-l-4 border-blue-500 pl-4">
                        <h5 className="text-sm font-bold text-blue-900 mb-2">
                          📢 SUBJETIVO (Narrativa del Paciente)
                        </h5>
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">{note.subjective}</p>
                      </div>

                      {/* Objective */}
                      <div className="border-l-4 border-green-500 pl-4">
                        <h5 className="text-sm font-bold text-green-900 mb-2">
                          🔍 OBJETIVO (Hallazgos Clínicos)
                        </h5>
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">{note.objective}</p>
                      </div>

                      {/* Assessment */}
                      <div className="border-l-4 border-purple-500 pl-4">
                        <h5 className="text-sm font-bold text-purple-900 mb-2">
                          🩺 EVALUACIÓN (Diagnóstico)
                        </h5>
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">{note.assessment}</p>

                        {note.diagnoses && note.diagnoses.length > 0 && (
                          <div className="mt-3">
                            <div className="text-xs font-semibold text-purple-800 mb-1">Diagnósticos:</div>
                            <div className="flex flex-wrap gap-2">
                              {note.diagnoses.map((dx, i) => (
                                <span key={i} className="px-2 py-1 bg-purple-100 text-purple-900 text-xs rounded-full">
                                  {dx}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Plan */}
                      <div className="border-l-4 border-orange-500 pl-4">
                        <h5 className="text-sm font-bold text-orange-900 mb-2">
                          📋 PLAN (Tratamiento)
                        </h5>
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">{note.plan}</p>

                        {note.procedures && note.procedures.length > 0 && (
                          <div className="mt-3">
                            <div className="text-xs font-semibold text-orange-800 mb-1">Procedimientos:</div>
                            <div className="flex flex-wrap gap-2">
                              {note.procedures.map((proc, i) => (
                                <span key={i} className="px-2 py-1 bg-orange-100 text-orange-900 text-xs rounded-full">
                                  {proc}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Blockchain Verification */}
                    {note.blockchainTxHash && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <h5 className="text-sm font-bold text-purple-900 mb-2">🔗 Verificación Blockchain</h5>
                        <div className="text-xs text-purple-900 font-mono break-all">
                          TX: {note.blockchainTxHash}
                        </div>
                        <p className="text-xs text-purple-700 mt-2">
                          Esta nota ha sido registrada en blockchain y no puede ser modificada.
                        </p>
                      </div>
                    )}

                    {/* Metadata */}
                    {/* Decorative - low contrast intentional for metadata timestamps */}
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <span>Creado por ID: {note.createdBy}</span>
                      <span>ID de Nota: {note.id.slice(0, 12)}...</span>
                    </div>

                    {/* Action Buttons */}
                    {!note.isSigned && (
                      <div className="flex space-x-3 pt-3">
                        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-semibold">
                          ✏️ Editar Nota
                        </button>
                        <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-semibold">
                          ✍️ Firmar Nota
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Summary Statistics */}
      {soapNotes.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300 rounded-xl p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-4">📊 Estadísticas de Notas</h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="text-xs text-blue-700 font-semibold mb-1">Total de Notas</div>
              <div className="text-3xl font-bold text-blue-900">{soapNotes.length}</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="text-xs text-green-700 font-semibold mb-1">Notas Firmadas</div>
              <div className="text-3xl font-bold text-green-900">
                {soapNotes.filter((n) => n.isSigned).length}
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-purple-200">
              <div className="text-xs text-purple-700 font-semibold mb-1">En Blockchain</div>
              <div className="text-3xl font-bold text-purple-900">
                {soapNotes.filter((n) => n.blockchainTxHash).length}
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-orange-200">
              <div className="text-xs text-orange-700 font-semibold mb-1">Paciente Notificado</div>
              <div className="text-3xl font-bold text-orange-900">
                {soapNotes.filter((n) => n.patientNotified).length}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
