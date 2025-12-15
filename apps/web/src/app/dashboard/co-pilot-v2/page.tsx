'use client';

/**
 * Co-Pilot V2 - Futuristic Command Center
 * Enhanced modular interface with drag-and-drop tiles and QR pairing
 */

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SparklesIcon,
  MicrophoneIcon,
  DocumentTextIcon,
  ChartBarIcon,
  BeakerIcon,
  CogIcon,
  UserIcon,
  ClockIcon,
  HeartIcon,
  BoltIcon,
  BellIcon,
  QrCodeIcon,
  DocumentArrowDownIcon,
  PencilIcon,
  CameraIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';
import { ClinicalSessionProvider, useClinicalSession } from '@/contexts/ClinicalSessionContext';
import {
  TileManager,
  CommandCenterTile,
  PatientSearchTile,
  DiagnosisTile,
  QRPairingTile,
  VitalsTile,
  QuickActionsTile,
  NotificationsTile,
  Tooltip,
  ConnectionStatus,
  CommandPalette,
  KeyboardShortcutsOverlay,
  LoadingTile,
  ToastContainer,
} from '@/components/co-pilot';
import type { Command } from '@/components/co-pilot/CommandPalette';
import type { ToastProps } from '@/components/co-pilot/Toast';
import { useKeyboardShortcuts, type KeyboardShortcut } from '@/hooks/useKeyboardShortcuts';
import AudioWaveform from '@/components/scribe/AudioWaveform';
import TranscriptViewer from '@/components/scribe/TranscriptViewer';
import SOAPNoteEditor from '@/components/scribe/SOAPNoteEditor';
import { RealTimeTranscription } from '@/components/scribe/RealTimeTranscription';
import type { Patient } from '@prisma/client';

export const dynamic = 'force-dynamic';

function CoPilotCommandCenter() {
  const { data: session } = useSession();
  const { state, setIsRecording } = useClinicalSession();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [isRecording, setRecordingState] = useState(false);
  const [showPermissionManager, setShowPermissionManager] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  const [toasts, setToasts] = useState<Omit<ToastProps, 'onClose'>[]>([]);

  // Toast helper functions
  const addToast = (type: ToastProps['type'], title: string, message?: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // Load patients
  useEffect(() => {
    if (session?.user?.id) {
      loadPatients();
    }
  }, [session]);

  const loadPatients = async () => {
    setIsLoadingPatients(true);
    try {
      const response = await fetch('/api/patients');
      if (response.ok) {
        const data = await response.json();
        setPatients(data);
      }
    } catch (error) {
      console.error('Failed to load patients:', error);
    } finally {
      setIsLoadingPatients(false);
    }
  };

  const handleStartRecording = async () => {
    if (!selectedPatient) {
      addToast('warning', 'No Patient Selected', 'Please select a patient before starting recording.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      setRecordingState(true);
      setIsRecording(true);
      addToast('success', 'Recording Started', `Recording consultation for ${selectedPatient.firstName} ${selectedPatient.lastName}`);
    } catch (error) {
      console.error('Failed to start recording:', error);
      addToast('error', 'Recording Failed', 'Failed to access microphone. Please check permissions.');
    }
  };

  const handleStopRecording = () => {
    if (audioStream) {
      audioStream.getTracks().forEach((track) => track.stop());
      setAudioStream(null);
    }
    setRecordingState(false);
    setIsRecording(false);
    addToast('info', 'Recording Stopped', 'Processing transcript and generating SOAP notes...');
  };

  const handleDevicePaired = (deviceId: string) => {
    console.log('Device paired:', deviceId);
    addToast('success', 'Device Paired', 'Mobile device connected successfully.');
  };

  // Command Palette Commands
  const commands: Command[] = [
    {
      id: 'start-recording',
      label: 'Start Recording',
      description: 'Begin audio recording',
      icon: MicrophoneIcon,
      category: 'recording',
      keywords: ['record', 'audio', 'mic'],
      action: () => {
        if (!isRecording) handleStartRecording();
      },
    },
    {
      id: 'stop-recording',
      label: 'Stop Recording',
      description: 'End audio recording',
      icon: MicrophoneIcon,
      category: 'recording',
      keywords: ['stop', 'end', 'finish'],
      action: () => {
        if (isRecording) handleStopRecording();
      },
    },
    {
      id: 'select-patient',
      label: 'Select Patient',
      description: 'Choose a patient',
      icon: UserIcon,
      category: 'patient',
      keywords: ['patient', 'select', 'choose'],
      action: () => {
        // Focus patient search - could scroll to it
        document.getElementById('patient-search-tile')?.scrollIntoView({ behavior: 'smooth' });
      },
    },
    {
      id: 'view-vitals',
      label: 'View Vitals',
      description: 'See patient vital signs',
      icon: HeartIcon,
      category: 'navigation',
      keywords: ['vitals', 'heart', 'bp', 'temperature'],
      action: () => {
        document.getElementById('vitals-tile')?.scrollIntoView({ behavior: 'smooth' });
      },
    },
    {
      id: 'view-diagnosis',
      label: 'View AI Diagnosis',
      description: 'See AI-powered diagnosis',
      icon: SparklesIcon,
      category: 'navigation',
      keywords: ['diagnosis', 'ai', 'analysis'],
      action: () => {
        document.getElementById('diagnosis-tile')?.scrollIntoView({ behavior: 'smooth' });
      },
    },
    {
      id: 'quick-actions',
      label: 'Quick Actions',
      description: 'View quick action menu',
      icon: BoltIcon,
      category: 'navigation',
      keywords: ['actions', 'quick', 'shortcuts'],
      action: () => {
        document.getElementById('quick-actions-tile')?.scrollIntoView({ behavior: 'smooth' });
      },
    },
    {
      id: 'notifications',
      label: 'View Notifications',
      description: 'See all notifications',
      icon: BellIcon,
      category: 'navigation',
      keywords: ['notifications', 'alerts', 'messages'],
      action: () => {
        document.getElementById('notifications-tile')?.scrollIntoView({ behavior: 'smooth' });
      },
    },
    {
      id: 'settings',
      label: 'Open Settings',
      description: 'Configure command center',
      icon: CogIcon,
      category: 'general',
      keywords: ['settings', 'config', 'preferences'],
      action: () => {
        setShowPermissionManager(true);
      },
    },
    {
      id: 'keyboard-shortcuts',
      label: 'Keyboard Shortcuts',
      description: 'View all shortcuts',
      icon: BoltIcon,
      category: 'general',
      keywords: ['shortcuts', 'keys', 'help'],
      action: () => {
        setShowKeyboardShortcuts(true);
      },
    },
  ];

  // Keyboard Shortcuts
  const shortcuts: KeyboardShortcut[] = [
    {
      id: 'toggle-recording',
      keys: 'cmd+r',
      description: 'Start/stop recording',
      action: () => {
        if (isRecording) {
          handleStopRecording();
        } else {
          handleStartRecording();
        }
      },
      category: 'recording',
    },
    {
      id: 'open-command-palette',
      keys: 'cmd+k',
      description: 'Open command palette',
      action: () => {
        setShowCommandPalette(true);
      },
      category: 'navigation',
    },
    {
      id: 'show-shortcuts',
      keys: '?',
      description: 'Show keyboard shortcuts',
      action: () => {
        setShowKeyboardShortcuts(true);
      },
      category: 'general',
    },
    {
      id: 'open-settings',
      keys: 'cmd+,',
      description: 'Open settings',
      action: () => {
        setShowPermissionManager(true);
      },
      category: 'general',
    },
    {
      id: 'focus-patient-search',
      keys: 'cmd+p',
      description: 'Focus patient search',
      action: () => {
        document.getElementById('patient-search-tile')?.scrollIntoView({ behavior: 'smooth' });
      },
      category: 'patient',
    },
    {
      id: 'close-modal',
      keys: 'escape',
      description: 'Close modal/overlay',
      action: () => {
        setShowCommandPalette(false);
        setShowKeyboardShortcuts(false);
        setShowPermissionManager(false);
      },
      category: 'general',
    },
  ];

  // Initialize keyboard shortcuts
  useKeyboardShortcuts(shortcuts);

  // Track command usage
  const executeCommand = (commandId: string) => {
    const command = commands.find((cmd) => cmd.id === commandId);
    if (command) {
      command.action();
      // Update recent commands
      setRecentCommands((prev) => {
        const updated = [commandId, ...prev.filter((id) => id !== commandId)];
        return updated.slice(0, 5); // Keep only 5 recent
      });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 overflow-hidden">
      {/* Header Bar */}
      <motion.div
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="bg-black/30 backdrop-blur-xl border-b border-white/10 px-6 py-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/50">
              <SparklesIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">AI Command Center</h1>
              <p className="text-sm text-blue-200">Intelligent Clinical Decision Support</p>
            </div>
          </div>

          {/* Status Indicators */}
          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <ConnectionStatus
              isConnected={true}
              quality="excellent"
              connectedDevices={0}
              compact={false}
            />

            {isRecording && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-full"
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="w-3 h-3 bg-red-500 rounded-full"
                />
                <span className="text-red-200 text-sm font-medium">Recording</span>
              </motion.div>
            )}

            {selectedPatient && (
              <div className="px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full">
                <span className="text-white text-sm font-medium">
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </span>
              </div>
            )}

            {/* Quick Access Buttons */}
            <div className="flex items-center gap-2">
              <Tooltip content="Open Command Palette" position="bottom" shortcut="⌘K">
                <motion.button
                  onClick={() => setShowCommandPalette(true)}
                  whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.25)' }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center"
                >
                  <BoltIcon className="w-5 h-5 text-white" />
                </motion.button>
              </Tooltip>

              <Tooltip content="Keyboard Shortcuts" position="bottom" shortcut="?">
                <motion.button
                  onClick={() => setShowKeyboardShortcuts(true)}
                  whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.25)' }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center"
                >
                  <span className="text-white text-lg font-bold">?</span>
                </motion.button>
              </Tooltip>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Command Center */}
      <TileManager className="flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
          {/* Left Column - Patient & Recording */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="lg:col-span-4 space-y-6"
          >
            {/* Patient Search Tile */}
            {isLoadingPatients ? (
              <LoadingTile size="medium" variant="shimmer" />
            ) : (
              <div id="patient-search-tile">
                <PatientSearchTile
                  patients={patients}
                  selectedPatient={selectedPatient}
                  onSelectPatient={setSelectedPatient}
                />
              </div>
            )}

            {/* Recording Controls Tile */}
            <motion.div
              animate={isRecording ? {
                boxShadow: [
                  '0 0 0 0 rgba(239, 68, 68, 0.4)',
                  '0 0 0 8px rgba(239, 68, 68, 0)',
                ]
              } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="rounded-2xl"
            >
              <CommandCenterTile
                id="recording-controls"
                title="Recording Controls"
                subtitle={isRecording ? 'Active' : 'Ready'}
                icon={<MicrophoneIcon className="w-6 h-6 text-red-600" />}
                size="medium"
                variant={isRecording ? 'danger' : 'default'}
                isDraggable={true}
                isActive={isRecording}
              >
              <div className="space-y-4">
                {isRecording && audioStream && (
                  <AudioWaveform stream={audioStream} isRecording={isRecording} />
                )}

                <div className="flex gap-3">
                  {!isRecording ? (
                    <Tooltip content="Start Recording" position="top" shortcut="⌘R">
                      <motion.button
                        onClick={handleStartRecording}
                        disabled={!selectedPatient}
                        whileHover={{ scale: 1.02, boxShadow: '0 20px 40px rgba(239, 68, 68, 0.4)' }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                        className="flex-1 px-6 py-4 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/30"
                      >
                        <span className="flex items-center justify-center gap-2">
                          <MicrophoneIcon className="w-5 h-5" />
                          Start Recording
                        </span>
                      </motion.button>
                    </Tooltip>
                  ) : (
                    <Tooltip content="Stop Recording" position="top" shortcut="⌘R">
                      <motion.button
                        onClick={handleStopRecording}
                        whileHover={{ scale: 1.02, boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)' }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                        className="flex-1 px-6 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-semibold transition shadow-lg"
                      >
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-3 h-3 bg-white rounded-sm" />
                          Stop Recording
                        </span>
                      </motion.button>
                    </Tooltip>
                  )}
                </div>

                {!selectedPatient && (
                  <p className="text-sm text-amber-600 text-center">
                    Please select a patient to start recording
                  </p>
                )}
              </div>
            </CommandCenterTile>
            </motion.div>

            {/* QR Pairing Tile */}
            <QRPairingTile onDevicePaired={handleDevicePaired} />

            {/* Vitals Monitoring Tile */}
            <div id="vitals-tile">
              <VitalsTile
                patientId={selectedPatient?.id}
                tileId="vitals-tile"
              />
            </div>

            {/* Quick Actions Tile */}
            <div id="quick-actions-tile">
              <QuickActionsTile
                patientId={selectedPatient?.id}
                tileId="quick-actions-tile"
                onAction={(action) => console.log('Quick action:', action)}
              />
            </div>
          </motion.div>

          {/* Center Column - Transcript & SOAP */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="lg:col-span-4 space-y-6"
          >
            {/* Transcript Tile */}
            <CommandCenterTile
              id="transcript-tile"
              title="Live Transcript"
              subtitle={`${state.transcript.length} segments`}
              icon={<DocumentTextIcon className="w-6 h-6 text-green-600" />}
              size="large"
              variant="glass"
              isDraggable={true}
            >
              <div className="h-[400px] overflow-y-auto">
                {selectedPatient && isRecording ? (
                  <RealTimeTranscription patientId={selectedPatient.id} />
                ) : (
                  <TranscriptViewer segments={state.transcript} />
                )}

                {!isRecording && state.transcript.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center justify-center h-full text-center"
                  >
                    <div>
                      <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                      >
                        <DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      </motion.div>
                      <p className="text-gray-600 dark:text-gray-300 font-medium">No transcript yet</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                        Start recording to capture and transcribe the consultation
                      </p>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400"
                      >
                        <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded font-mono">
                          ⌘R
                        </kbd>
                        <span>to start</span>
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </div>
            </CommandCenterTile>

            {/* SOAP Notes Tile */}
            <CommandCenterTile
              id="soap-notes-tile"
              title="SOAP Notes"
              subtitle={state.liveSoapNote ? 'Draft' : 'No notes'}
              icon={<DocumentTextIcon className="w-6 h-6 text-blue-600" />}
              size="medium"
              variant="primary"
              isDraggable={true}
            >
              <div className="h-[300px] overflow-y-auto">
                {state.liveSoapNote ? (
                  <div className="space-y-4 text-sm">
                    {state.liveSoapNote.chiefComplaint && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">Chief Complaint</h4>
                        <p className="text-gray-700">{state.liveSoapNote.chiefComplaint}</p>
                      </div>
                    )}
                    {state.liveSoapNote.subjective && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">Subjective</h4>
                        <p className="text-gray-700">{state.liveSoapNote.subjective}</p>
                      </div>
                    )}
                    {state.liveSoapNote.objective && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">Objective</h4>
                        <p className="text-gray-700">{state.liveSoapNote.objective}</p>
                      </div>
                    )}
                    {state.liveSoapNote.assessment && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">Assessment</h4>
                        <p className="text-gray-700">{state.liveSoapNote.assessment}</p>
                      </div>
                    )}
                    {state.liveSoapNote.plan && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">Plan</h4>
                        <p className="text-gray-700">{state.liveSoapNote.plan}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center justify-center h-full text-center"
                  >
                    <div>
                      <motion.div
                        animate={{ rotate: [0, 5, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                      >
                        <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      </motion.div>
                      <p className="text-gray-600 dark:text-gray-300 font-medium text-sm">
                        No SOAP notes generated yet
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                        AI will generate notes from the transcript
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            </CommandCenterTile>
          </motion.div>

          {/* Right Column - Diagnosis & Analytics */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="lg:col-span-4 space-y-6"
          >
            {/* Diagnosis Tile */}
            <div id="diagnosis-tile">
              <DiagnosisTile
                chiefComplaint={state.liveSoapNote?.chiefComplaint}
                symptoms={state.extractedSymptoms.map(s => s.symptom)}
                patientId={selectedPatient?.id}
              />
            </div>

            {/* Lab Insights Tile */}
            <CommandCenterTile
              id="lab-insights-tile"
              title="Lab Insights"
              subtitle="AI-powered analysis"
              icon={<BeakerIcon className="w-6 h-6 text-purple-600" />}
              size="medium"
              variant="glass"
              isDraggable={true}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="text-center py-8"
              >
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                >
                  <BeakerIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                </motion.div>
                <p className="text-gray-600 dark:text-gray-300 font-medium text-sm">
                  No lab data available
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  Lab results will appear here when available
                </p>
              </motion.div>
            </CommandCenterTile>

            {/* Analytics Tile */}
            <CommandCenterTile
              id="analytics-tile"
              title="Session Analytics"
              subtitle="Performance metrics"
              icon={<ChartBarIcon className="w-6 h-6 text-indigo-600" />}
              size="small"
              variant="default"
              isDraggable={true}
            >
              <div className="grid grid-cols-2 gap-4">
                <motion.div
                  className="text-center"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div
                    key={state.transcript.length}
                    initial={{ scale: 1.2, color: '#3b82f6' }}
                    animate={{ scale: 1, color: '#111827' }}
                    transition={{ duration: 0.3 }}
                    className="text-2xl font-bold"
                  >
                    {state.transcript.length}
                  </motion.div>
                  <div className="text-xs text-gray-500">Segments</div>
                </motion.div>
                <motion.div
                  className="text-center"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div
                    key={state.extractedSymptoms.length}
                    initial={{ scale: 1.2, color: '#3b82f6' }}
                    animate={{ scale: 1, color: '#111827' }}
                    transition={{ duration: 0.3 }}
                    className="text-2xl font-bold"
                  >
                    {state.extractedSymptoms.length}
                  </motion.div>
                  <div className="text-xs text-gray-500">Symptoms</div>
                </motion.div>
              </div>
            </CommandCenterTile>

            {/* Notifications Tile */}
            <div id="notifications-tile">
              <NotificationsTile tileId="notifications-tile" />
            </div>
          </motion.div>
        </div>
      </TileManager>

      {/* Floating Action Button - Settings */}
      <Tooltip content="Open Settings" position="left" shortcut="⌘,">
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowPermissionManager(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 rounded-full shadow-2xl shadow-blue-500/50 flex items-center justify-center text-white z-50"
        >
          <CogIcon className="w-7 h-7" />
        </motion.button>
      </Tooltip>

      {/* Command Palette */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        commands={commands}
        recentCommands={recentCommands}
      />

      {/* Keyboard Shortcuts Overlay */}
      <KeyboardShortcutsOverlay
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
        shortcuts={shortcuts}
      />

      {/* Toast Notifications */}
      <ToastContainer
        toasts={toasts}
        onClose={removeToast}
        position="top-right"
      />
    </div>
  );
}

export default function CoPilotV2Page() {
  return (
    <ClinicalSessionProvider>
      <CoPilotCommandCenter />
    </ClinicalSessionProvider>
  );
}
