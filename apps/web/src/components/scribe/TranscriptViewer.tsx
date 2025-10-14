'use client';

import { useState } from 'react';

interface TranscriptSegment {
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

interface TranscriptViewerProps {
  segments: TranscriptSegment[];
  onSegmentCorrect?: (index: number, newText: string, originalText: string) => void;
  readonly?: boolean;
}

export default function TranscriptViewer({
  segments,
  onSegmentCorrect,
  readonly = false
}: TranscriptViewerProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-green-100 text-green-700 border-green-300';
    if (confidence >= 0.85) return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    return 'bg-red-100 text-red-700 border-red-300';
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.9) return '✓ High';
    if (confidence >= 0.85) return '⚠ Review';
    return '⚠ Low - Please verify';
  };

  const handleStartEdit = (index: number, text: string) => {
    if (readonly) return;
    setEditingIndex(index);
    setEditText(text);
  };

  const handleSaveEdit = (index: number, originalText: string) => {
    if (editText.trim() && editText !== originalText) {
      onSegmentCorrect?.(index, editText.trim(), originalText);
    }
    setEditingIndex(null);
    setEditText('');
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditText('');
  };

  if (!segments || segments.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
        <p className="font-medium">No hay transcripción disponible</p>
        <p className="text-sm text-gray-400 mt-1">La transcripción aparecerá aquí después de procesar el audio</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
      {segments.map((segment, idx) => {
        const isLowConfidence = segment.confidence < 0.85;
        const isEditing = editingIndex === idx;
        const isHovered = hoveredIndex === idx;

        return (
          <div
            key={idx}
            onMouseEnter={() => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
            className={`relative group p-4 rounded-lg border-2 transition-all ${
              isEditing
                ? 'bg-blue-50 border-blue-400 shadow-lg'
                : isLowConfidence
                ? 'bg-yellow-50 border-yellow-300 hover:border-yellow-400'
                : segment.speaker === 'Doctor'
                ? 'bg-blue-50 border-blue-200 hover:border-blue-300'
                : 'bg-gray-50 border-gray-200 hover:border-gray-300'
            }`}
          >
            {/* Low Confidence Warning Banner */}
            {isLowConfidence && !isEditing && (
              <div className="absolute -top-2 left-4 bg-yellow-500 text-white text-xs px-3 py-1 rounded-full font-bold shadow-md flex items-center gap-1">
                <span>⚠️</span>
                <span>Baja confianza - Revisar</span>
              </div>
            )}

            {/* Speaker Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                    segment.speaker === 'Doctor'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-600 text-white'
                  }`}
                >
                  {segment.speaker === 'Doctor' ? '👨‍⚕️' : '🧑'} {segment.speaker}
                </span>
                <span className="text-xs text-gray-500 font-mono bg-white px-2 py-1 rounded">
                  {formatTime(segment.startTime)} → {formatTime(segment.endTime)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Confidence Badge */}
                <span
                  className={`text-xs px-3 py-1 rounded-full font-bold border-2 ${getConfidenceColor(
                    segment.confidence
                  )}`}
                  title={getConfidenceBadge(segment.confidence)}
                >
                  {Math.round(segment.confidence * 100)}%
                </span>

                {/* Edit Button */}
                {!readonly && !isEditing && isHovered && (
                  <button
                    onClick={() => handleStartEdit(idx, segment.text)}
                    className="text-xs px-3 py-1 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transition-colors flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Corregir
                  </button>
                )}
              </div>
            </div>

            {/* Transcript Text or Editor */}
            {isEditing ? (
              <div className="space-y-3">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full p-3 border-2 border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 leading-relaxed min-h-[100px] resize-y"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') handleCancelEdit();
                    if (e.key === 'Enter' && e.metaKey) handleSaveEdit(idx, segment.text);
                  }}
                />

                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-600 italic">
                    💡 Presiona ⌘+Enter para guardar rápidamente
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => handleSaveEdit(idx, segment.text)}
                      className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-md flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Guardar Corrección
                    </button>
                  </div>
                </div>

                {/* Original text for reference */}
                <div className="p-3 bg-gray-100 border-l-4 border-gray-400 rounded">
                  <p className="text-xs text-gray-600 font-semibold mb-1">Original (AI):</p>
                  <p className="text-sm text-gray-700 italic">{segment.text}</p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-gray-900 leading-relaxed text-[15px]">{segment.text}</p>

                {/* Confidence Details (for low confidence) */}
                {isLowConfidence && (
                  <div className="mt-3 p-2 bg-yellow-100 border-l-4 border-yellow-500 rounded text-xs">
                    <p className="font-semibold text-yellow-800">
                      ⚠️ Este segmento tiene baja confianza ({Math.round(segment.confidence * 100)}%)
                    </p>
                    <p className="text-yellow-700 mt-1">
                      Por favor revise y corrija si es necesario para asegurar precisión médica.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Summary Stats */}
      <div className="sticky bottom-0 bg-gradient-to-r from-gray-50 to-gray-100 border-t-2 border-gray-300 p-4 rounded-lg mt-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900">{segments.length}</p>
            <p className="text-xs text-gray-600 font-medium">Segmentos</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">
              {segments.filter(s => s.confidence >= 0.9).length}
            </p>
            <p className="text-xs text-gray-600 font-medium">Alta confianza</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">
              {segments.filter(s => s.confidence < 0.85).length}
            </p>
            <p className="text-xs text-gray-600 font-medium">Requieren revisión</p>
          </div>
        </div>
      </div>
    </div>
  );
}
