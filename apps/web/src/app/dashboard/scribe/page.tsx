'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  mrn: string;
  tokenId: string;
  dateOfBirth: string;
}

type RecordingState = 'idle' | 'recording' | 'paused' | 'processing' | 'completed';

export default function AIScribePage() {
  const [user, setUser] = useState<any>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [soapNote, setSoapNote] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load user and patients
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
        loadPatients(user.id);
      }
    });
  }, []);

  const loadPatients = async (userId: string) => {
    try {
      const response = await fetch(`/api/patients?limit=100`);
      if (response.ok) {
        const data = await response.json();
        setPatients(data.data || []);
      }
    } catch (error) {
      console.error('Error loading patients:', error);
    }
  };

  const filteredPatients = patients.filter(
    (p) =>
      p.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.mrn.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Start recording
  const startRecording = async () => {
    try {
      if (!selectedPatient) {
        alert('Por favor seleccione un paciente primero');
        return;
      }

      // Create scribe session
      const sessionResponse = await fetch('/api/scribe/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: selectedPatient.id }),
      });

      if (!sessionResponse.ok) {
        throw new Error('Failed to create session');
      }

      const sessionData = await sessionResponse.json();
      setSessionId(sessionData.data.id);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(1000); // Collect data every second
      setRecordingState('recording');

      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Error al iniciar la grabación. Por favor verifica los permisos del micrófono.');
    }
  };

  // Pause recording
  const pauseRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.pause();
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      setRecordingState('paused');
    }
  };

  // Resume recording
  const resumeRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'paused') {
      mediaRecorderRef.current.resume();
      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
      setRecordingState('recording');
    }
  };

  // Stop recording and process
  const stopRecording = async () => {
    if (!mediaRecorderRef.current || !sessionId) return;

    setRecordingState('processing');

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    mediaRecorderRef.current.stop();

    mediaRecorderRef.current.onstop = async () => {
      try {
        // Create audio blob
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        // Upload audio
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        formData.append('duration', recordingDuration.toString());

        const uploadResponse = await fetch(`/api/scribe/sessions/${sessionId}/audio`, {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload audio');
        }

        // Simulate transcription (in production, use Whisper API)
        const mockTranscript = `Doctor: Buenos días, ¿cómo se siente hoy?
Paciente: Buenos días doctor. Tengo dolor de cabeza desde hace 3 días.
Doctor: ¿El dolor es constante o viene y va?
Paciente: Es constante, sobre todo en la mañana.
Doctor: ¿Ha tomado algún medicamento?
Paciente: Sí, paracetamol pero no me ha ayudado mucho.
Doctor: Entiendo. Voy a examinarle. Presión arterial 120/80, temperatura 36.8. Todo normal.
Paciente: ¿Qué puede ser doctor?
Doctor: Parece ser cefalea tensional. Le voy a recetar un analgésico más fuerte y le recomiendo descanso.`;

        setTranscript(mockTranscript);

        // Finalize session and generate SOAP
        const finalizeResponse = await fetch(`/api/scribe/sessions/${sessionId}/finalize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcriptText: mockTranscript,
            segments: [
              { speaker: 'Doctor', text: 'Buenos días, ¿cómo se siente hoy?', startTime: 0, endTime: 2 },
              { speaker: 'Paciente', text: 'Buenos días doctor. Tengo dolor de cabeza desde hace 3 días.', startTime: 2, endTime: 6 },
            ],
          }),
        });

        if (!finalizeResponse.ok) {
          throw new Error('Failed to generate SOAP note');
        }

        const finalizeData = await finalizeResponse.json();

        // Load the SOAP note
        const noteResponse = await fetch(`/api/scribe/notes/${finalizeData.data.soapNote.id}`);
        if (noteResponse.ok) {
          const noteData = await noteResponse.json();
          setSoapNote(noteData.data);
        }

        setRecordingState('completed');
      } catch (error) {
        console.error('Error processing recording:', error);
        alert('Error al procesar la grabación');
        setRecordingState('idle');
      }
    };

    // Stop all tracks
    if (mediaRecorderRef.current.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
  };

  // Reset for new recording
  const resetRecording = () => {
    setRecordingState('idle');
    setRecordingDuration(0);
    setTranscript('');
    setSoapNote(null);
    setSessionId(null);
    audioChunksRef.current = [];
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Scribe</h1>
        <p className="text-gray-600">Grabación inteligente y generación automática de notas SOAP</p>
      </div>

      {/* 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Column 1: Patient Selection */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600">
              <h2 className="text-lg font-bold text-white">Seleccionar Paciente</h2>
            </div>
            <div className="p-4">
              <input
                type="text"
                placeholder="Buscar paciente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="mt-4 space-y-2 max-h-[600px] overflow-y-auto">
                {filteredPatients.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => setSelectedPatient(patient)}
                    disabled={recordingState !== 'idle'}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedPatient?.id === patient.id
                        ? 'bg-blue-50 border-blue-500 shadow-sm'
                        : 'bg-white border-gray-200 hover:border-blue-300'
                    } ${recordingState !== 'idle' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="font-semibold text-gray-900">
                      {patient.firstName} {patient.lastName}
                    </div>
                    <div className="text-sm text-gray-500">MRN: {patient.mrn}</div>
                  </button>
                ))}
                {filteredPatients.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    No se encontraron pacientes
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Recording Controls & Live Transcript */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-purple-500 to-pink-600">
              <h2 className="text-lg font-bold text-white">Grabación</h2>
            </div>
            <div className="p-6">
              {/* Selected Patient Info */}
              {selectedPatient && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-blue-600 font-medium">Paciente Seleccionado</div>
                      <div className="text-lg font-bold text-gray-900">
                        {selectedPatient.firstName} {selectedPatient.lastName}
                      </div>
                      <div className="text-sm text-gray-600">MRN: {selectedPatient.mrn}</div>
                    </div>
                    <div className="text-4xl">👤</div>
                  </div>
                </div>
              )}

              {/* Recording Status */}
              <div className="text-center mb-6">
                <div
                  className={`inline-flex items-center space-x-2 px-6 py-3 rounded-full ${
                    recordingState === 'recording'
                      ? 'bg-red-100 text-red-700'
                      : recordingState === 'paused'
                      ? 'bg-yellow-100 text-yellow-700'
                      : recordingState === 'processing'
                      ? 'bg-blue-100 text-blue-700'
                      : recordingState === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {recordingState === 'recording' && (
                    <>
                      <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                      <span className="font-bold">GRABANDO</span>
                    </>
                  )}
                  {recordingState === 'paused' && (
                    <>
                      <div className="w-3 h-3 bg-yellow-600 rounded-full"></div>
                      <span className="font-bold">PAUSADO</span>
                    </>
                  )}
                  {recordingState === 'processing' && (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
                      <span className="font-bold">PROCESANDO</span>
                    </>
                  )}
                  {recordingState === 'completed' && (
                    <>
                      <span className="text-2xl">✓</span>
                      <span className="font-bold">COMPLETADO</span>
                    </>
                  )}
                  {recordingState === 'idle' && (
                    <>
                      <span className="text-2xl">🎙️</span>
                      <span className="font-bold">LISTO</span>
                    </>
                  )}
                </div>
                {(recordingState === 'recording' || recordingState === 'paused') && (
                  <div className="mt-4 text-4xl font-mono font-bold text-gray-900">
                    {formatDuration(recordingDuration)}
                  </div>
                )}
              </div>

              {/* Recording Controls */}
              <div className="flex items-center justify-center space-x-4 mb-6">
                {recordingState === 'idle' && (
                  <button
                    onClick={startRecording}
                    disabled={!selectedPatient}
                    className="flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-red-500 to-pink-600 text-white font-bold rounded-full hover:from-red-600 hover:to-pink-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-2xl">🎙️</span>
                    <span>Iniciar Grabación</span>
                  </button>
                )}
                {recordingState === 'recording' && (
                  <>
                    <button
                      onClick={pauseRecording}
                      className="flex items-center space-x-2 px-6 py-3 bg-yellow-500 text-white font-bold rounded-full hover:bg-yellow-600 transition-all shadow-lg"
                    >
                      <span className="text-xl">⏸</span>
                      <span>Pausar</span>
                    </button>
                    <button
                      onClick={stopRecording}
                      className="flex items-center space-x-2 px-6 py-3 bg-red-600 text-white font-bold rounded-full hover:bg-red-700 transition-all shadow-lg"
                    >
                      <span className="text-xl">⏹</span>
                      <span>Finalizar</span>
                    </button>
                  </>
                )}
                {recordingState === 'paused' && (
                  <>
                    <button
                      onClick={resumeRecording}
                      className="flex items-center space-x-2 px-6 py-3 bg-green-500 text-white font-bold rounded-full hover:bg-green-600 transition-all shadow-lg"
                    >
                      <span className="text-xl">▶️</span>
                      <span>Continuar</span>
                    </button>
                    <button
                      onClick={stopRecording}
                      className="flex items-center space-x-2 px-6 py-3 bg-red-600 text-white font-bold rounded-full hover:bg-red-700 transition-all shadow-lg"
                    >
                      <span className="text-xl">⏹</span>
                      <span>Finalizar</span>
                    </button>
                  </>
                )}
                {recordingState === 'completed' && (
                  <button
                    onClick={resetRecording}
                    className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 transition-all shadow-lg"
                  >
                    <span className="text-xl">🔄</span>
                    <span>Nueva Grabación</span>
                  </button>
                )}
              </div>

              {/* Live Transcript */}
              {transcript && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Transcripción</h3>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-[400px] overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                      {transcript}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Column 3: SOAP Note Preview */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-green-500 to-teal-600">
              <h2 className="text-lg font-bold text-white">Nota SOAP</h2>
            </div>
            <div className="p-6">
              {!soapNote ? (
                <div className="text-center text-gray-500 py-12">
                  <div className="text-6xl mb-4">📝</div>
                  <p>La nota SOAP aparecerá aquí después de finalizar la grabación</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Chief Complaint */}
                  {soapNote.chiefComplaint && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold text-gray-500 uppercase">Motivo de Consulta</h3>
                      </div>
                      <p className="text-gray-900">{soapNote.chiefComplaint}</p>
                    </div>
                  )}

                  {/* Subjective */}
                  <div className="border-l-4 border-blue-500 pl-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-blue-700 uppercase">Subjetivo (S)</h3>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {Math.round(soapNote.subjectiveConfidence * 100)}%
                      </span>
                    </div>
                    <p className="text-gray-900 whitespace-pre-wrap">{soapNote.subjective}</p>
                  </div>

                  {/* Objective */}
                  <div className="border-l-4 border-green-500 pl-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-green-700 uppercase">Objetivo (O)</h3>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        {Math.round(soapNote.objectiveConfidence * 100)}%
                      </span>
                    </div>
                    <p className="text-gray-900 whitespace-pre-wrap">{soapNote.objective}</p>
                  </div>

                  {/* Assessment */}
                  <div className="border-l-4 border-purple-500 pl-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-purple-700 uppercase">Evaluación (A)</h3>
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                        {Math.round(soapNote.assessmentConfidence * 100)}%
                      </span>
                    </div>
                    <p className="text-gray-900 whitespace-pre-wrap">{soapNote.assessment}</p>
                    {soapNote.diagnoses && soapNote.diagnoses.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {soapNote.diagnoses.map((dx: any, idx: number) => (
                          <div key={idx} className="text-sm bg-purple-50 p-2 rounded">
                            <span className="font-mono font-bold text-purple-700">{dx.icd10Code}</span>
                            <span className="text-gray-700"> - {dx.description}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Plan */}
                  <div className="border-l-4 border-orange-500 pl-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-orange-700 uppercase">Plan (P)</h3>
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                        {Math.round(soapNote.planConfidence * 100)}%
                      </span>
                    </div>
                    <p className="text-gray-900 whitespace-pre-wrap">{soapNote.plan}</p>
                  </div>

                  {/* Actions */}
                  <div className="pt-6 border-t border-gray-200">
                    <button
                      className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white font-bold rounded-lg hover:from-green-600 hover:to-teal-700 transition-all shadow-lg"
                    >
                      Firmar y Guardar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
