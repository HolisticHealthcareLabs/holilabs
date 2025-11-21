'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import TranscriptViewer from '@/components/scribe/TranscriptViewer';
import SOAPNoteEditor from '@/components/scribe/SOAPNoteEditor';
import AudioWaveform from '@/components/scribe/AudioWaveform';
import VoiceActivityDetector from '@/components/scribe/VoiceActivityDetector';
import { RealTimeTranscription } from '@/components/scribe/RealTimeTranscription';

export const dynamic = 'force-dynamic';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  mrn: string;
  tokenId: string;
  dateOfBirth: string;
}

interface TranscriptSegment {
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

type RecordingState = 'idle' | 'recording' | 'paused' | 'processing' | 'completed';

export default function AIScribePage() {
  const sessionData = useSession();
  const session = sessionData?.data ?? null;
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([]);
  const [soapNote, setSoapNote] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [smartAutoPauseEnabled, setSmartAutoPauseEnabled] = useState(true);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [showAudioSourceModal, setShowAudioSourceModal] = useState(false);
  const [audioSource, setAudioSource] = useState<'microphone' | 'system' | 'both'>('microphone');
  const [useRealTimeTranscription, setUseRealTimeTranscription] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load patients
  useEffect(() => {
    if (session?.user?.id) {
      loadPatients();
    }
  }, [session]);

  const loadPatients = async () => {
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

  // Show audio source modal before recording
  const handleStartRecordingClick = () => {
    if (!selectedPatient) {
      alert('Por favor seleccione un paciente primero');
      return;
    }
    setShowAudioSourceModal(true);
  };

  // Start recording with selected audio source
  const startRecording = async () => {
    try {
      setShowAudioSourceModal(false);

      // Validate patient is selected
      if (!selectedPatient) {
        throw new Error('Please select a patient before recording');
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

      // Request audio access based on selected source
      let stream: MediaStream;
      try {
        if (audioSource === 'microphone') {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } else if (audioSource === 'system') {
          // Request screen capture with audio for system audio (videocalls)
          stream = await (navigator.mediaDevices as any).getDisplayMedia({
            audio: true,
            video: false
          });
        } else { // both
          // Get both microphone and system audio
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const systemStream = await (navigator.mediaDevices as any).getDisplayMedia({
            audio: true,
            video: false
          });
          // Mix both streams
          const audioContext = new AudioContext();
          const micSource = audioContext.createMediaStreamSource(micStream);
          const systemSource = audioContext.createMediaStreamSource(systemStream);
          const destination = audioContext.createMediaStreamDestination();
          micSource.connect(destination);
          systemSource.connect(destination);
          stream = destination.stream;
        }
      } catch (error) {
        console.error('Error accessing audio:', error);
        alert('Error al acceder al audio. Por favor verifica los permisos.');
        return;
      }
      setAudioStream(stream); // Store for waveform visualization

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

  // VAD: Handle voice activity changes
  const handleVoiceActivity = (isActive: boolean) => {
    setIsVoiceActive(isActive);
  };

  // VAD: Handle silence detection (auto-pause)
  const handleSilenceDetected = (silenceDurationMs: number) => {
    if (smartAutoPauseEnabled && recordingState === 'recording') {
      console.log(`Smart pause triggered after ${silenceDurationMs}ms of silence`);
      pauseRecording();
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

        // Finalize session and generate SOAP (triggers real AssemblyAI + Gemini processing)
        const finalizeResponse = await fetch(`/api/scribe/sessions/${sessionId}/finalize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!finalizeResponse.ok) {
          const errorData = await finalizeResponse.json();
          throw new Error(errorData.error || 'Failed to generate SOAP note');
        }

        const finalizeData = await finalizeResponse.json();

        // Load the full SOAP note with transcription data
        if (finalizeData.data?.soapNote?.id) {
          const noteResponse = await fetch(`/api/scribe/notes/${finalizeData.data.soapNote.id}`);
          if (noteResponse.ok) {
            const noteData = await noteResponse.json();
            setSoapNote(noteData.data);
          }
        }

        // Load the transcription with segments
        if (finalizeData.data?.transcription?.id) {
          const transcriptResponse = await fetch(`/api/scribe/sessions/${sessionId}`);
          if (transcriptResponse.ok) {
            const sessionData = await transcriptResponse.json();
            if (sessionData.data?.transcription?.segments) {
              setTranscriptSegments(sessionData.data.transcription.segments);
            }
          }
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
    setAudioStream(null); // Clear stream for waveform
  };

  // Reset for new recording
  const resetRecording = () => {
    setRecordingState('idle');
    setRecordingDuration(0);
    setTranscriptSegments([]);
    setSoapNote(null);
    setSessionId(null);
    audioChunksRef.current = [];
  };

  // Save SOAP note edits
  const handleSaveNote = async (updatedNote: Partial<any>) => {
    if (!soapNote?.id) return;

    try {
      const response = await fetch(`/api/scribe/notes/${soapNote.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedNote),
      });

      if (response.ok) {
        const updatedData = await response.json();
        setSoapNote(updatedData.data);
      }
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Error al guardar los cambios');
    }
  };

  // Sign and finalize SOAP note
  const handleSignNote = async () => {
    if (!soapNote?.id) return;

    const confirmed = confirm('¿Está seguro de firmar y finalizar esta nota? No podrá editarla después.');
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/scribe/notes/${soapNote.id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const signedData = await response.json();
        setSoapNote(signedData.data);
        alert('✅ Nota firmada exitosamente con hash blockchain');
      }
    } catch (error) {
      console.error('Error signing note:', error);
      alert('Error al firmar la nota');
    }
  };

  // Send WhatsApp notification to patient
  const handleNotifyPatient = async () => {
    if (!soapNote?.id) return;

    const confirmed = confirm('¿Enviar esta nota al paciente por WhatsApp?');
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/scribe/notes/${soapNote.id}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        alert(`✅ WhatsApp enviado exitosamente a ${data.data.sentTo}`);
      } else {
        const errorData = await response.json();
        alert(`❌ Error: ${errorData.error || 'No se pudo enviar WhatsApp'}`);
      }
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      alert('Error al enviar WhatsApp al paciente');
    }
  };

  // Handle transcript segment correction
  const handleSegmentCorrect = async (index: number, newText: string, originalText: string) => {
    if (!sessionId) return;

    try {
      // Update local state immediately for responsive UI
      const updatedSegments = [...transcriptSegments];
      updatedSegments[index] = { ...updatedSegments[index], text: newText };
      setTranscriptSegments(updatedSegments);

      // Save correction to database for error tracking and ML improvement
      const response = await fetch(`/api/scribe/sessions/${sessionId}/corrections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segmentIndex: index,
          originalText,
          correctedText: newText,
          confidence: transcriptSegments[index].confidence,
          speaker: transcriptSegments[index].speaker,
          startTime: transcriptSegments[index].startTime,
          endTime: transcriptSegments[index].endTime,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save correction');
      }

      console.log('✅ Correction saved successfully');
    } catch (error) {
      console.error('Error saving correction:', error);
      alert('Error al guardar la corrección. Intenta de nuevo.');

      // Reload session data from server to revert optimistic update
      try {
        const transcriptResponse = await fetch(`/api/scribe/sessions/${sessionId}`);
        if (transcriptResponse.ok) {
          const sessionData = await transcriptResponse.json();
          if (sessionData.data?.transcription?.segments) {
            setTranscriptSegments(sessionData.data.transcription.segments);
          }
        }
      } catch (reloadError) {
        console.error('Error reloading transcript:', reloadError);
      }
    }
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">AI Scribe</h1>
            <p className="text-gray-600 dark:text-gray-400">Record voice, get SOAP notes</p>
          </div>

          {/* Real-Time Transcription Toggle */}
          <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Real-Time Mode
            </span>
            <button
              onClick={() => setUseRealTimeTranscription(!useRealTimeTranscription)}
              disabled={recordingState !== 'idle'}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                useRealTimeTranscription ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
              } ${recordingState !== 'idle' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  useRealTimeTranscription ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {useRealTimeTranscription ? 'Live streaming' : 'Record then process'}
            </span>
          </div>
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Column 1: Patient Selection */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600">
              <h2 className="text-lg font-bold text-white">Seleccionar Paciente</h2>
            </div>
            <div className="p-4">
              <input
                type="text"
                placeholder="Buscar paciente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="mt-4 space-y-2 max-h-[600px] overflow-y-auto">
                {filteredPatients.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => setSelectedPatient(patient)}
                    disabled={recordingState !== 'idle'}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedPatient?.id === patient.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 shadow-sm'
                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
                    } ${recordingState !== 'idle' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {patient.firstName} {patient.lastName}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">MRN: {patient.mrn}</div>
                  </button>
                ))}
                {filteredPatients.length === 0 && (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    No se encontraron pacientes
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Recording Controls & Live Transcript */}
        <div className="lg:col-span-5">
          {useRealTimeTranscription ? (
            // Real-Time Transcription Mode
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden h-[800px]">
              <RealTimeTranscription
                patientId={selectedPatient?.id}
                onTranscriptUpdate={(segments) => {
                  // Convert segments to transcript format
                  const converted = segments
                    .filter(s => s.isFinal)
                    .map((s, idx) => ({
                      speaker: s.speaker !== undefined ? `Speaker ${s.speaker + 1}` : 'Speaker 1',
                      text: s.text,
                      startTime: idx * 1000, // Approximate
                      endTime: (idx + 1) * 1000,
                      confidence: s.confidence,
                    }));
                  setTranscriptSegments(converted);
                }}
                onRecordingStop={(finalTranscript) => {
                  console.log('Final transcript:', finalTranscript);
                  // TODO: Generate SOAP note from real-time transcript
                }}
                enableDiarization={true}
                language="en-US"
              />
            </div>
          ) : (
            // Traditional Recording Mode
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-purple-500 to-pink-600">
                <h2 className="text-lg font-bold text-white">Grabación</h2>
              </div>
              <div className="p-6">
              {/* Selected Patient Info */}
              {selectedPatient && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">Paciente Seleccionado</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {selectedPatient.firstName} {selectedPatient.lastName}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">MRN: {selectedPatient.mrn}</div>
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
                      ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                      : recordingState === 'paused'
                      ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                      : recordingState === 'processing'
                      ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                      : recordingState === 'completed'
                      ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {recordingState === 'recording' && (
                    <>
                      <div className="w-3 h-3 bg-red-600 dark:bg-red-500 rounded-full animate-pulse"></div>
                      <span className="font-bold">GRABANDO</span>
                    </>
                  )}
                  {recordingState === 'paused' && (
                    <>
                      <div className="w-3 h-3 bg-yellow-600 dark:bg-yellow-500 rounded-full"></div>
                      <span className="font-bold">PAUSADO</span>
                    </>
                  )}
                  {recordingState === 'processing' && (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 dark:border-blue-400"></div>
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
                  <div className="mt-4 text-4xl font-mono font-bold text-gray-900 dark:text-white">
                    {formatDuration(recordingDuration)}
                  </div>
                )}
              </div>

              {/* Audio Waveform Visualization (Abridge-style) */}
              <div className="mb-4">
                <AudioWaveform
                  stream={audioStream}
                  isRecording={recordingState === 'recording'}
                  className="h-32"
                />
              </div>

              {/* Voice Activity Detection (Nuance DAX-style) */}
              <div className="mb-6">
                <VoiceActivityDetector
                  stream={audioStream}
                  isRecording={recordingState === 'recording'}
                  onVoiceActivity={handleVoiceActivity}
                  onSilenceDetected={handleSilenceDetected}
                  silenceThresholdMs={smartAutoPauseEnabled ? 5000 : Infinity}
                  volumeThreshold={30}
                />
              </div>

              {/* Smart Auto-Pause Toggle */}
              {(recordingState === 'recording' || recordingState === 'paused') && (
                <div className="mb-6 flex items-center justify-between bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white">Auto Pause</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Pauses after 5 seconds of silence
                    </p>
                  </div>
                  <button
                    onClick={() => setSmartAutoPauseEnabled(!smartAutoPauseEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      smartAutoPauseEnabled ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        smartAutoPauseEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              )}

              {/* Recording Controls */}
              <div className="flex items-center justify-center space-x-4 mb-6">
                {recordingState === 'idle' && (
                  <button
                    onClick={handleStartRecordingClick}
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

              {/* Live Transcript with Speaker Diarization */}
              {transcriptSegments.length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                    <span className="mr-2">🎙️</span>
                    Transcript
                  </h3>
                  <TranscriptViewer
                    segments={transcriptSegments}
                    onSegmentCorrect={handleSegmentCorrect}
                    readonly={recordingState !== 'completed'}
                  />
                </div>
              )}
            </div>
          </div>
          )}
        </div>

        {/* Column 3: SOAP Note Editor */}
        <div className="lg:col-span-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-green-500 to-teal-600">
              <h2 className="text-lg font-bold text-white flex items-center">
                <span className="mr-2">📝</span>
                AI SOAP Note
              </h2>
            </div>
            <div className="p-6 max-h-[800px] overflow-y-auto">
              {!soapNote ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-12">
                  <div className="text-6xl mb-4">📝</div>
                  <p className="text-lg font-medium mb-2 dark:text-gray-300">
                    SOAP note appears after recording
                  </p>
                  <p className="text-sm text-gray-400">
                    Generated with AI
                  </p>
                </div>
              ) : (
                <SOAPNoteEditor
                  note={soapNote}
                  onSave={handleSaveNote}
                  onSign={handleSignNote}
                  onNotifyPatient={handleNotifyPatient}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Audio Source Selection Modal */}
      {showAudioSourceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Seleccionar Fuente de Audio
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Elige la fuente de audio para tu grabación médica
            </p>

            <div className="space-y-3">
              {/* Microphone Option */}
              <label className="flex items-center p-4 border-2 border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-blue-300 dark:hover:border-blue-500">
                <input
                  type="radio"
                  name="audioSource"
                  value="microphone"
                  checked={audioSource === 'microphone'}
                  onChange={(e) => setAudioSource(e.target.value as any)}
                  className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                />
                <div className="ml-4 flex items-center flex-1">
                  <span className="text-3xl mr-3">🎤</span>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">Micrófono del sistema</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Para consultas presenciales</div>
                  </div>
                </div>
              </label>

              {/* System Audio Option */}
              <label className="flex items-center p-4 border-2 border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-blue-300 dark:hover:border-blue-500">
                <input
                  type="radio"
                  name="audioSource"
                  value="system"
                  checked={audioSource === 'system'}
                  onChange={(e) => setAudioSource(e.target.value as any)}
                  className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                />
                <div className="ml-4 flex items-center flex-1">
                  <span className="text-3xl mr-3">💻</span>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">Audio del sistema</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Para videollamadas (Zoom, Meet, etc.)</div>
                  </div>
                </div>
              </label>

              {/* Both Option */}
              <label className="flex items-center p-4 border-2 border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-blue-300 dark:hover:border-blue-500">
                <input
                  type="radio"
                  name="audioSource"
                  value="both"
                  checked={audioSource === 'both'}
                  onChange={(e) => setAudioSource(e.target.value as any)}
                  className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                />
                <div className="ml-4 flex items-center flex-1">
                  <span className="text-3xl mr-3">🎧</span>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">Micrófono + Audio del sistema</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Captura ambos canales</div>
                  </div>
                </div>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAudioSourceModal(false)}
                className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={startRecording}
                className="flex-1 px-4 py-3 text-white bg-gradient-to-r from-red-500 to-pink-600 rounded-lg font-semibold hover:from-red-600 hover:to-pink-700 transition-all shadow-lg"
              >
                Iniciar Grabación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
