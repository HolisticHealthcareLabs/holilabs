/**
 * Recording Detail Page
 *
 * View transcript, SOAP notes, and audio from a consultation recording
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface Recording {
  id: string;
  status: string;
  audioUrl: string | null;
  transcript: string | null;
  aiGeneratedNotes: string | null;
  audioDuration: number | null;
  startedAt: string;
  endedAt: string | null;
  appointment: {
    title: string;
    startTime: string;
  };
  patient: {
    firstName: string;
    lastName: string;
    patientId: string;
  };
}

interface SOAPNotes {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export default function RecordingDetailPage() {
  const params = useParams();
  const recordingId = params.id as string;

  const [recording, setRecording] = useState<Recording | null>(null);
  const [soapNotes, setSOAPNotes] = useState<SOAPNotes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'transcript' | 'soap'>('soap');

  useEffect(() => {
    fetchRecording();
  }, [recordingId]);

  const fetchRecording = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/recordings/${recordingId}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al cargar grabación');
      }

      setRecording(data.data);

      // Parse SOAP notes if available
      if (data.data.aiGeneratedNotes) {
        try {
          const parsed = JSON.parse(data.data.aiGeneratedNotes);
          setSOAPNotes(parsed);
        } catch (e) {
          console.error('Error parsing SOAP notes:', e);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; label: string }> = {
      RECORDING: { bg: 'bg-red-100', text: 'text-red-700', label: 'Grabando' },
      PROCESSING: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Procesando' },
      TRANSCRIBING: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Transcribiendo' },
      COMPLETED: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completado' },
      FAILED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Fallido' },
    };

    const style = styles[status] || styles.PROCESSING;

    return (
      <span className={`px-3 py-1 ${style.bg} ${style.text} text-xs font-semibold rounded-full`}>
        {style.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg
              className="w-8 h-8 text-blue-600 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <p className="text-gray-600 font-medium">Cargando grabación...</p>
        </div>
      </div>
    );
  }

  if (error || !recording) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Error</h2>
          <p className="text-gray-600 mb-6 text-center">{error}</p>
          <Link
            href="/dashboard"
            className="block w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-center transition-colors"
          >
            Volver al Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver al Dashboard
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                Grabación de Consulta
              </h1>
              <p className="text-gray-600">
                {recording.patient.firstName} {recording.patient.lastName} •{' '}
                {formatDate(recording.startedAt)}
              </p>
            </div>
            {getStatusBadge(recording.status)}
          </div>
        </div>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Paciente
              </label>
              <p className="text-gray-900">
                {recording.patient.firstName} {recording.patient.lastName}
              </p>
              <p className="text-sm text-gray-600">{recording.patient.patientId}</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Cita
              </label>
              <p className="text-gray-900">{recording.appointment.title}</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Duración
              </label>
              <p className="text-gray-900">{formatDuration(recording.audioDuration)}</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Fecha
              </label>
              <p className="text-gray-900">{formatDate(recording.startedAt)}</p>
            </div>
          </div>
        </motion.div>

        {/* Audio Player */}
        {recording.audioUrl && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 mb-6"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              Audio de la Consulta
            </h2>
            <audio controls className="w-full" src={recording.audioUrl}>
              Tu navegador no soporta el elemento de audio.
            </audio>
          </motion.div>
        )}

        {/* Tabs */}
        {(soapNotes || recording.transcript) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden"
          >
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('soap')}
                className={`flex-1 px-6 py-4 font-semibold text-sm transition-all ${
                  activeTab === 'soap'
                    ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Notas SOAP
              </button>
              <button
                onClick={() => setActiveTab('transcript')}
                className={`flex-1 px-6 py-4 font-semibold text-sm transition-all ${
                  activeTab === 'transcript'
                    ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Transcripción
              </button>
            </div>

            <div className="p-6">
              {activeTab === 'soap' && soapNotes ? (
                <div className="space-y-6">
                  {/* Subjective */}
                  <div>
                    <h3 className="text-lg font-bold text-blue-900 mb-2 flex items-center gap-2">
                      <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-sm font-bold">
                        S
                      </span>
                      Subjetivo
                    </h3>
                    <p className="text-gray-700 leading-relaxed bg-blue-50 p-4 rounded-lg">
                      {soapNotes.subjective}
                    </p>
                  </div>

                  {/* Objective */}
                  <div>
                    <h3 className="text-lg font-bold text-green-900 mb-2 flex items-center gap-2">
                      <span className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-sm font-bold">
                        O
                      </span>
                      Objetivo
                    </h3>
                    <p className="text-gray-700 leading-relaxed bg-green-50 p-4 rounded-lg">
                      {soapNotes.objective}
                    </p>
                  </div>

                  {/* Assessment */}
                  <div>
                    <h3 className="text-lg font-bold text-purple-900 mb-2 flex items-center gap-2">
                      <span className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-sm font-bold">
                        A
                      </span>
                      Análisis
                    </h3>
                    <p className="text-gray-700 leading-relaxed bg-purple-50 p-4 rounded-lg">
                      {soapNotes.assessment}
                    </p>
                  </div>

                  {/* Plan */}
                  <div>
                    <h3 className="text-lg font-bold text-orange-900 mb-2 flex items-center gap-2">
                      <span className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center text-sm font-bold">
                        P
                      </span>
                      Plan
                    </h3>
                    <p className="text-gray-700 leading-relaxed bg-orange-50 p-4 rounded-lg">
                      {soapNotes.plan}
                    </p>
                  </div>
                </div>
              ) : activeTab === 'transcript' && recording.transcript ? (
                <div className="prose max-w-none">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {recording.transcript}
                  </p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-600">
                    {activeTab === 'soap' ? 'No hay notas SOAP disponibles' : 'No hay transcripción disponible'}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
