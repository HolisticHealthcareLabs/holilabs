'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { ClinicalSessionProvider, useClinicalSession } from '@/contexts/ClinicalSessionContext';
import { Switch } from '@/components/ui/Switch';
import AudioWaveform from '@/components/scribe/AudioWaveform';
import TranscriptViewer from '@/components/scribe/TranscriptViewer';
import SOAPNoteEditor from '@/components/scribe/SOAPNoteEditor';
import { RealTimeTranscription } from '@/components/scribe/RealTimeTranscription';
import DiagnosisAssistant from '@/components/clinical/DiagnosisAssistant';
import { ToolDock } from '@/components/co-pilot/ToolDock';
import { CoPilotIntegrationBubble } from '@/components/dashboard/CoPilotIntegrationBubble';
import { PatientConsentModal } from '@/components/co-pilot/PatientConsentModal';
import { CoPilotOnboarding } from '@/components/co-pilot/CoPilotOnboarding';

export const dynamic = 'force-dynamic';

// Wrapper component to auto-fill DiagnosisAssistant from context
function DiagnosisAssistantWrapper({
  chiefComplaint,
  extractedSymptoms,
  patientId,
}: {
  chiefComplaint?: string;
  extractedSymptoms: string[];
  patientId?: string;
}) {

  return (
    <div className="space-y-4">
      {chiefComplaint && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700 animate-pulse">
          <div className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase mb-1">
            ✨ Auto-filled from Scribe
          </div>
          <div className="text-sm text-gray-900 dark:text-white font-medium">
            Chief Complaint: {chiefComplaint}
          </div>
          {extractedSymptoms.length > 0 && (
            <div className="mt-2">
              <div className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase mb-1">
                Extracted Symptoms:
              </div>
              <div className="flex flex-wrap gap-2">
                {extractedSymptoms.map((symptom, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-full text-xs"
                  >
                    {symptom}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <DiagnosisAssistant />
    </div>
  );
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  mrn: string;
  dateOfBirth: string;
}

function CoPilotContent() {
  const { data: session } = useSession();
  const {
    state,
    updateTranscript,
    appendTranscript,
    updateLiveSoapNote,
    addExtractedSymptom,
    setSessionId,
    setIsRecording,
    setIsProcessing,
  } = useClinicalSession();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [useRealTimeMode, setUseRealTimeMode] = useState(true);
  const [showAudioSourceModal, setShowAudioSourceModal] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [audioSource, setAudioSource] = useState<'microphone' | 'system' | 'both'>('microphone');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

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

  // Initialize Socket.io connection for real-time SOAP generation
  useEffect(() => {
    if (useRealTimeMode && state.isRecording && state.sessionId) {
      connectSocket();
    }

    return () => {
      if (wsRef.current) {
        (wsRef.current as any).disconnect?.();
      }
    };
  }, [useRealTimeMode, state.isRecording, state.sessionId]);

  const connectSocket = async () => {
    try {
      // Import socket.io client dynamically
      const { io } = await import('socket.io-client');
      
      // Get auth token
      const tokenResponse = await fetch('/api/auth/socket-token');
      if (!tokenResponse.ok) throw new Error('Failed to get socket token');

      const { token } = await tokenResponse.json();
      
      const socket = io({
        path: '/api/socket',
        auth: { token },
      });

      wsRef.current = socket as any;

      socket.on('connect', () => {
        console.log('✅ Co-Pilot Socket.io connected');
        
        // Join co-pilot session room
        socket.emit('co_pilot:join_session', { sessionId: state.sessionId });
      });

      socket.on('co_pilot:transcript_update', (data: any) => {
        appendTranscript({
          speaker: data.speaker || 'Speaker 1',
          text: data.text,
          startTime: data.startTime || Date.now(),
          endTime: data.endTime || Date.now(),
          confidence: data.confidence || 0.9,
          isFinal: data.isFinal || false,
        });
      });

      socket.on('co_pilot:soap_update', (data: any) => {
        updateLiveSoapNote({
          subjective: data.subjective,
          objective: data.objective,
          assessment: data.assessment,
          plan: data.plan,
          chiefComplaint: data.chiefComplaint,
          extractedSymptoms: data.extractedSymptoms,
          vitalSigns: data.vitalSigns,
        });
      });

      socket.on('co_pilot:symptom_extracted', (data: any) => {
        addExtractedSymptom({
          symptom: data.symptom,
          confidence: data.confidence || 0.8,
          extractedAt: Date.now(),
        });
      });

      socket.on('error', (error: any) => {
        console.error('Socket.io error:', error);
      });

      socket.on('disconnect', () => {
        console.log('Socket.io disconnected');
      });
    } catch (error) {
      console.error('Failed to connect Socket.io:', error);
    }
  };

  const handleStartRecording = async () => {
    if (!selectedPatient) {
      alert('Please select a patient first');
      return;
    }

    // Show consent modal first
    setShowConsentModal(true);
  };

  const handleConsentGranted = () => {
    setShowConsentModal(false);
    setShowAudioSourceModal(true);
  };

  const handleConsentDeclined = () => {
    setShowConsentModal(false);
    alert('Recording cannot proceed without patient consent.');
  };

  const startRecording = async () => {
    try {
      setShowAudioSourceModal(false);

      // Create session
      const sessionResponse = await fetch('/api/scribe/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: selectedPatient?.id }),
      });

      if (!sessionResponse.ok) throw new Error('Failed to create session');

      const sessionData = await sessionResponse.json();
      setSessionId(sessionData.data.id);
      setIsRecording(true);

      // Get audio stream
      let stream: MediaStream;
      try {
        if (audioSource === 'microphone') {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } else if (audioSource === 'system') {
          stream = await (navigator.mediaDevices as any).getDisplayMedia({
            audio: true,
            video: false,
          });
        } else {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const systemStream = await (navigator.mediaDevices as any).getDisplayMedia({
            audio: true,
            video: false,
          });
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
        alert('Error accessing audio. Please check permissions.');
        return;
      }

      setAudioStream(stream);

      if (useRealTimeMode) {
        // Real-time mode - WebSocket handles everything
        connectSocket();
      } else {
        // Traditional mode - use MediaRecorder
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm',
        });
        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start(1000);
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Error starting recording');
    }
  };

  const handleStopRecording = async () => {
    setIsRecording(false);
    setIsProcessing(true);

    if (audioStream) {
      audioStream.getTracks().forEach((track) => track.stop());
      setAudioStream(null);
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }

    // Finalize session
    if (state.sessionId) {
      try {
        const finalizeResponse = await fetch(`/api/scribe/sessions/${state.sessionId}/finalize`, {
          method: 'POST',
        });

        if (finalizeResponse.ok) {
          const finalizeData = await finalizeResponse.json();
          if (finalizeData.data?.soapNote) {
            updateLiveSoapNote({
              subjective: finalizeData.data.soapNote.subjective,
              objective: finalizeData.data.soapNote.objective,
              assessment: finalizeData.data.soapNote.assessment,
              plan: finalizeData.data.soapNote.plan,
            });
          }
        }
      } catch (error) {
        console.error('Error finalizing session:', error);
      }
    }

    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Onboarding Tour */}
      <CoPilotOnboarding />

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              Co-Pilot
            </h1>
            <p className="text-gray-700 dark:text-gray-200">
              Unified AI-powered clinical workspace
            </p>
          </div>

          {/* Compact Live Mode Toggle */}
          <div className="flex items-center gap-3">
            {useRealTimeMode && state.isRecording && (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Live Mode Active</span>
              </div>
            )}
            <Switch
              enabled={useRealTimeMode}
              onChange={setUseRealTimeMode}
              label="Live Mode"
              disabled={state.isRecording}
              size="sm"
              showPulse={false}
            />
          </div>
        </div>
      </div>

      {/* Patient Selection Section - TOP ROW */}
      <div className="bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-6 py-6 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto">
          {!selectedPatient ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center">
                  <span className="text-2xl">👤</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Select Patient
                  </h2>
                  <p className="text-sm text-gray-700 dark:text-gray-200">
                    Choose the patient for this consultation
                  </p>
                </div>
              </div>
              <input
                type="text"
                placeholder="Search by name or MRN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white mb-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                {filteredPatients.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => setSelectedPatient(patient)}
                    className="text-left p-4 rounded-lg border-2 border-gray-200 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
                  >
                    <div className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {patient.firstName} {patient.lastName}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">MRN: {patient.mrn}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-2 border-blue-500 dark:border-blue-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white text-xl font-bold">
                    {selectedPatient.firstName[0]}{selectedPatient.lastName[0]}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase mb-1">
                      Active Patient
                    </div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white">
                      {selectedPatient.firstName} {selectedPatient.lastName}
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-200">
                      MRN: {selectedPatient.mrn} • DOB: {new Date(selectedPatient.dateOfBirth).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPatient(null)}
                  disabled={state.isRecording}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Change Patient
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Co-Pilot AI Tools Section - BELOW PATIENT SELECTOR */}
      {selectedPatient && (
        <div className="bg-white dark:bg-gray-800 px-6 py-6 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500/20 to-amber-600/20 flex items-center justify-center">
                  <span className="text-2xl">⚡</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    AI Clinical Assistants
                  </h2>
                  <p className="text-sm text-gray-700 dark:text-gray-200">
                    Select AI tools to assist with this consultation
                  </p>
                </div>
              </div>

              {/* [+] Customize Button */}
              <div className="flex items-center gap-3" id="customize-button">
                <CoPilotIntegrationBubble
                  onToolSelect={(toolId) => {
                    console.log('Selected tool:', toolId);
                    // Handle tool selection - navigate or open modal
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tool Dock */}
      <ToolDock
        onToolSelect={(tool) => {
          console.log('Tool selected:', tool);
          // Context injection: tool will receive current transcript/patientId
        }}
        patientId={selectedPatient?.id}
        transcript={state.transcript.map(s => s.text).join(' ')}
      />

      {/* Split-Pane Layout */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-300px)]">
        {/* Left Panel: The Ear (Scribe) - Transcript & SOAP */}
        <div className="flex-1 lg:w-1/2 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto">
          <div className="p-6">

            {/* Audio Waveform */}
            {audioStream && (
              <div className="mb-6">
                <AudioWaveform
                  stream={audioStream}
                  isRecording={state.isRecording}
                  className="h-24"
                />
              </div>
            )}

            {/* Real-Time Transcription */}
            {useRealTimeMode && selectedPatient ? (
              <div className="mb-6">
                <RealTimeTranscription
                  patientId={selectedPatient.id}
                  onTranscriptUpdate={(segments) => {
                    const converted = segments
                      .filter((s) => s.isFinal)
                      .map((s, idx) => ({
                        speaker: s.speaker !== undefined ? `Speaker ${s.speaker + 1}` : 'Speaker 1',
                        text: s.text,
                        startTime: idx * 1000,
                        endTime: (idx + 1) * 1000,
                        confidence: s.confidence,
                        isFinal: s.isFinal,
                      }));
                    updateTranscript(converted);
                  }}
                  autoStart={false}
                  enableDiarization={true}
                />
              </div>
            ) : null}

            {/* Transcript Viewer */}
            {state.transcript.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  Live Transcript
                </h3>
                <TranscriptViewer
                  segments={state.transcript}
                  onSegmentCorrect={() => {}}
                  readonly={state.isRecording}
                />
              </div>
            )}

            {/* Live SOAP Note Preview */}
            {state.liveSoapNote && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  Live SOAP Note
                </h3>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                  {state.liveSoapNote.chiefComplaint && (
                    <div>
                      <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase mb-1">
                        Chief Complaint
                      </div>
                      <div className="text-sm text-gray-900 dark:text-white">
                        {state.liveSoapNote.chiefComplaint}
                      </div>
                    </div>
                  )}
                  {state.liveSoapNote.subjective && (
                    <div>
                      <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase mb-1">
                        Subjective
                      </div>
                      <div className="text-sm text-gray-900 dark:text-white">
                        {state.liveSoapNote.subjective}
                      </div>
                    </div>
                  )}
                  {state.liveSoapNote.objective && (
                    <div>
                      <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase mb-1">
                        Objective
                      </div>
                      <div className="text-sm text-gray-900 dark:text-white">
                        {state.liveSoapNote.objective}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: The Brain (Smart Diagnosis) */}
        <div className="flex-1 lg:w-1/2 bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-y-auto">
          <div className="p-6">
            <div className="backdrop-blur-xl bg-white/80 dark:bg-gray-800/80 rounded-2xl border border-white/30 dark:border-gray-700/50 shadow-2xl p-6
              before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-blue-500/5 before:to-purple-500/5 before:pointer-events-none
              relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center">
                    <Image
                      src="/icons/stethoscope (1).svg"
                      alt="Smart Diagnosis"
                      width={20}
                      height={20}
                      className="dark:invert"
                    />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Smart Diagnosis
                    </h2>
                    {selectedPatient && (
                      <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-semibold inline-block mt-1">
                        EHR Access Granted
                      </span>
                    )}
                  </div>
                </div>

                {/* Compact Recording Button */}
                {selectedPatient && (
                  <div>
                    {!state.isRecording ? (
                      <button
                        onClick={handleStartRecording}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full font-semibold transition-all shadow-lg hover:shadow-xl group"
                      >
                        <div className="w-3 h-3 bg-white rounded-full group-hover:animate-pulse"></div>
                        <span>Record</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleStopRecording}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full font-semibold transition-all shadow-lg animate-pulse"
                      >
                        <div className="w-3 h-3 bg-white rounded-sm"></div>
                        <span>Stop</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-200 mb-4">
                AI-powered diagnostic assistant with access to patient lab reports and medical history
              </p>

              {/* Diagnosis Assistant - Auto-filled from context */}
              <DiagnosisAssistantWrapper
                chiefComplaint={state.liveSoapNote?.chiefComplaint}
                extractedSymptoms={state.extractedSymptoms.map(s => s.symptom)}
                patientId={selectedPatient?.id}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Consent Modal */}
      {selectedPatient && (
        <PatientConsentModal
          isOpen={showConsentModal}
          onConsent={handleConsentGranted}
          onDecline={handleConsentDeclined}
          patientName={`${selectedPatient.firstName} ${selectedPatient.lastName}`}
        />
      )}

      {/* Audio Source Modal */}
      {showAudioSourceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Select Audio Source
            </h3>
            <div className="space-y-3 mb-6">
              <label className="flex items-center p-4 border-2 border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                <input
                  type="radio"
                  name="audioSource"
                  value="microphone"
                  checked={audioSource === 'microphone'}
                  onChange={(e) => setAudioSource(e.target.value as any)}
                  className="mr-4"
                />
                <span className="text-lg mr-3">🎤</span>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Microphone</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">For in-person consultations</div>
                </div>
              </label>
              <label className="flex items-center p-4 border-2 border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                <input
                  type="radio"
                  name="audioSource"
                  value="system"
                  checked={audioSource === 'system'}
                  onChange={(e) => setAudioSource(e.target.value as any)}
                  className="mr-4"
                />
                <span className="text-lg mr-3">💻</span>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">System Audio</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">For video calls</div>
                </div>
              </label>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAudioSourceModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={startRecording}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg font-semibold hover:from-red-600 hover:to-pink-700"
              >
                Start Recording
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CoPilotPage() {
  return (
    <ClinicalSessionProvider>
      <CoPilotContent />
    </ClinicalSessionProvider>
  );
}

