'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { ClinicalSessionProvider, useClinicalSession } from '@/contexts/ClinicalSessionContext';
import { DndContext, useDroppable, DragEndEvent, DragOverlay } from '@dnd-kit/core';
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

// Droppable Tool Workspace Component
interface DroppableToolWorkspaceProps {
  chiefComplaint?: string;
  extractedSymptoms?: string[];
  patientId?: string;
}

function DroppableToolWorkspace({ chiefComplaint, extractedSymptoms, patientId }: DroppableToolWorkspaceProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'tool-workspace',
  });

  return (
    <div
      ref={setNodeRef}
      className={`backdrop-blur-xl bg-white/80 dark:bg-gray-800/80 rounded-2xl border border-white/30 dark:border-gray-700/50 shadow-xl p-6 relative transition-all duration-300
        before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-blue-500/5 before:to-purple-500/5 before:pointer-events-none
        ${isOver ? 'ring-4 ring-blue-500/50 border-blue-500/50 shadow-2xl scale-[1.02]' : ''}`}
    >
      {/* Drop indicator when dragging */}
      {isOver && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center pointer-events-none z-10">
          <div className="bg-blue-500/90 text-white px-6 py-3 rounded-lg font-semibold shadow-lg">
            Drop tool here to activate
          </div>
        </div>
      )}

      {/* Diagnosis Assistant - Auto-filled from context */}
      <DiagnosisAssistantWrapper
        chiefComplaint={chiefComplaint}
        extractedSymptoms={extractedSymptoms || []}
        patientId={patientId}
      />
    </div>
  );
}

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const toolData = active.data.current;
    const dropZoneId = over.id;

    console.log('Tool dropped:', toolData?.tool?.name, 'on zone:', dropZoneId);

    // Handle tool activation based on drop zone
    if (toolData?.type === 'tool') {
      const tool = toolData.tool;

      // Trigger appropriate action based on tool type
      if (tool.id === 'ai-scribe') {
        // Scroll to transcript section
        document.querySelector('.flex-1.lg\\:w-1\\/2.border-r')?.scrollIntoView({ behavior: 'smooth' });
      } else if (tool.id === 'preventive-plan' && selectedPatient) {
        window.open(`/dashboard/prevention?patientId=${selectedPatient.id}`, '_blank');
      } else if (tool.id === 'risk-stratification' && selectedPatient) {
        window.open(`/dashboard/patients/${selectedPatient.id}?tab=risk`, '_blank');
      }
    }
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
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

        {/* Right Panel: Co-Pilot Toolkit */}
        <div className="flex-1 lg:w-1/2 bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-y-auto">
          <div className="p-6 space-y-6">
            
            {/* Header */}
            <div className="backdrop-blur-xl bg-white/80 dark:bg-gray-800/80 rounded-2xl border border-white/30 dark:border-gray-700/50 shadow-lg p-6 relative">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-600/20 flex items-center justify-center">
                      <svg className="w-6 h-6 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Co-Pilot
                      </h2>
                      {selectedPatient && (
                        <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-semibold inline-block mt-0.5">
                          EHR Access Granted
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    Modular digital toolkit customizable to your specialty needs
                  </p>
                </div>

                {/* Compact Recording Button */}
                {selectedPatient && (
                  <div className="flex-shrink-0">
                    {!state.isRecording ? (
                      <button
                        onClick={handleStartRecording}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full font-semibold transition-all shadow-lg hover:shadow-xl group"
                      >
                        <div className="w-3 h-3 bg-white rounded-full group-hover:animate-pulse"></div>
                        <span className="text-sm">Record</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleStopRecording}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full font-semibold transition-all shadow-lg animate-pulse"
                      >
                        <div className="w-3 h-3 bg-white rounded-sm"></div>
                        <span className="text-sm">Stop</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Modular Tools Grid */}
              <div className="grid grid-cols-3 gap-3 mt-6">
                {/* AI Scribe Tool */}
                <button
                  onClick={() => {
                    // AI Scribe is already active in this view (left panel)
                    // Scroll to transcript section
                    document.querySelector('.flex-1.lg\\:w-1\\/2.border-r')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="group relative p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-600/10 hover:from-purple-500/20 hover:to-pink-600/20 border border-purple-200/50 dark:border-purple-700/30 transition-all hover:shadow-lg"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-md">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 text-center leading-tight">AI Scribe</span>
                  </div>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-500/0 to-pink-600/0 group-hover:from-purple-500/5 group-hover:to-pink-600/5 transition-all"></div>
                </button>

                {/* Clinical Decision Support Tool */}
                <button
                  onClick={() => {
                    // Diagnosis Assistant is already shown below
                    // Scroll to it or show a notification
                    const diagnosisSection = document.querySelector('.backdrop-blur-xl.bg-white\\/80');
                    if (diagnosisSection) {
                      diagnosisSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }}
                  className="group relative p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-600/10 hover:from-cyan-500/20 hover:to-blue-600/20 border border-cyan-200/50 dark:border-cyan-700/30 transition-all hover:shadow-lg"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-md">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 text-center leading-tight">CDS</span>
                  </div>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-500/0 to-blue-600/0 group-hover:from-cyan-500/5 group-hover:to-blue-600/5 transition-all"></div>
                </button>

                {/* Risk Stratification Tool */}
                <button
                  onClick={() => {
                    if (selectedPatient) {
                      window.open(`/dashboard/patients/${selectedPatient.id}?tab=risk`, '_blank');
                    } else {
                      alert('Please select a patient first');
                    }
                  }}
                  className="group relative p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-600/10 hover:from-amber-500/20 hover:to-orange-600/20 border border-amber-200/50 dark:border-amber-700/30 transition-all hover:shadow-lg"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 text-center leading-tight">Risk Score</span>
                  </div>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-amber-500/0 to-orange-600/0 group-hover:from-amber-500/5 group-hover:to-orange-600/5 transition-all"></div>
                </button>

                {/* Prevention Hub Tool */}
                <button
                  onClick={() => {
                    if (selectedPatient) {
                      window.open(`/dashboard/prevention?patientId=${selectedPatient.id}`, '_blank');
                    } else {
                      alert('Please select a patient first');
                    }
                  }}
                  className="group relative p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-600/10 hover:from-emerald-500/20 hover:to-teal-600/20 border border-emerald-200/50 dark:border-emerald-700/30 transition-all hover:shadow-lg"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 text-center leading-tight">Prevention</span>
                  </div>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-500/0 to-teal-600/0 group-hover:from-emerald-500/5 group-hover:to-teal-600/5 transition-all"></div>
                </button>

                {/* Lab Insights Tool */}
                <button
                  onClick={() => {
                    if (selectedPatient) {
                      window.open(`/dashboard/patients/${selectedPatient.id}?tab=labs`, '_blank');
                    } else {
                      alert('Please select a patient first');
                    }
                  }}
                  className="group relative p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-600/10 hover:from-indigo-500/20 hover:to-purple-600/20 border border-indigo-200/50 dark:border-indigo-700/30 transition-all hover:shadow-lg"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 text-center leading-tight">Lab Insights</span>
                  </div>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500/0 to-purple-600/0 group-hover:from-indigo-500/5 group-hover:to-purple-600/5 transition-all"></div>
                </button>

                {/* Add More Tools Button */}
                <button
                  onClick={() => {
                    alert('Tool marketplace coming soon! You\'ll be able to add custom AI assistants, specialty-specific tools, and third-party integrations.');
                  }}
                  className="group relative p-4 rounded-xl border-2 border-dashed border-amber-300/50 dark:border-amber-600/30 hover:border-amber-400 dark:hover:border-amber-500 bg-amber-50/30 dark:bg-amber-900/10 hover:bg-amber-50/50 dark:hover:bg-amber-900/20 transition-all hover:shadow-lg"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative w-10 h-10 rounded-lg bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                      {/* Golden ring effect */}
                      <div className="absolute inset-0 rounded-lg border-2 border-amber-400/60 dark:border-amber-500/40 group-hover:border-amber-500 dark:group-hover:border-amber-400 transition-colors"></div>
                      <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 text-center leading-tight">Add Tool</span>
                  </div>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-amber-500/0 to-amber-600/0 group-hover:from-amber-500/5 group-hover:to-amber-600/5 transition-all"></div>
                </button>
              </div>
            </div>

            {/* Active Tool Content */}
            <DroppableToolWorkspace
              chiefComplaint={state.liveSoapNote?.chiefComplaint}
              extractedSymptoms={state.extractedSymptoms.map(s => s.symptom)}
              patientId={selectedPatient?.id}
            />
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
    </DndContext>
  );
}

export default function CoPilotPage() {
  return (
    <ClinicalSessionProvider>
      <CoPilotContent />
    </ClinicalSessionProvider>
  );
}

