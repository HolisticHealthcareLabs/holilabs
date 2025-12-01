/**
 * Recording Store - Zustand domain store for Co-Pilot recording sessions
 *
 * Features:
 * - Recording session management
 * - Transcription state
 * - AI-generated clinical notes
 * - Draft management
 * - Confidence scoring
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RecordingSession {
  id: string;
  patientId: string;
  patientName: string;
  providerId: string;
  providerName: string;
  appointmentId?: string;
  startTime: string; // ISO 8601
  endTime?: string; // ISO 8601
  duration: number; // seconds
  status: 'recording' | 'processing' | 'completed' | 'failed' | 'draft';
  audioFileUri?: string;
  audioFileSize?: number; // bytes
  transcription?: {
    text: string;
    segments: TranscriptionSegment[];
    language: string;
    confidence: number;
  };
  clinicalNote?: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    icd10Codes?: string[];
    cptCodes?: string[];
    medications?: string[];
    labs?: string[];
    followUp?: string;
    confidence: number;
  };
  aiInsights?: {
    keyFindings: string[];
    redFlags: string[];
    differentialDiagnosis?: string[];
    recommendedActions?: string[];
  };
  metadata?: {
    recordingQuality?: 'excellent' | 'good' | 'fair' | 'poor';
    backgroundNoise?: 'low' | 'medium' | 'high';
    speakerCount?: number;
  };
}

export interface TranscriptionSegment {
  id: string;
  speaker: 'patient' | 'provider' | 'unknown';
  text: string;
  startTime: number; // seconds from start
  endTime: number; // seconds from start
  confidence: number;
}

export interface RecordingFilters {
  patientId?: string;
  providerId?: string;
  status: 'all' | RecordingSession['status'];
  dateRange?: {
    start: string;
    end: string;
  };
  sortBy: 'date' | 'patient' | 'duration';
  sortOrder: 'asc' | 'desc';
}

interface RecordingStore {
  // State
  recordings: RecordingSession[];
  activeRecording: RecordingSession | null;
  selectedRecording: RecordingSession | null;
  filters: RecordingFilters;
  drafts: RecordingSession[]; // Unsaved or partially completed notes
  isRecording: boolean;
  isProcessing: boolean;
  error: string | null;

  // Actions - Recording Management
  setRecordings: (recordings: RecordingSession[]) => void;
  addRecording: (recording: RecordingSession) => void;
  updateRecording: (id: string, updates: Partial<RecordingSession>) => void;
  removeRecording: (id: string) => void;

  // Actions - Active Recording
  startRecording: (patientId: string, patientName: string, appointmentId?: string) => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => void;
  updateRecordingDuration: (duration: number) => void;

  // Actions - Transcription & AI Processing
  setTranscription: (id: string, transcription: RecordingSession['transcription']) => void;
  setClinicalNote: (id: string, clinicalNote: RecordingSession['clinicalNote']) => void;
  setAIInsights: (id: string, insights: RecordingSession['aiInsights']) => void;
  updateClinicalNoteField: (id: string, field: keyof RecordingSession['clinicalNote'], value: any) => void;

  // Actions - Drafts
  saveDraft: (recording: RecordingSession) => void;
  loadDraft: (id: string) => void;
  deleteDraft: (id: string) => void;
  clearDrafts: () => void;

  // Actions - Selection
  selectRecording: (recording: RecordingSession | null) => void;
  selectRecordingById: (id: string) => void;

  // Actions - Filters
  setPatientFilter: (patientId?: string) => void;
  setProviderFilter: (providerId?: string) => void;
  setStatusFilter: (status: RecordingFilters['status']) => void;
  setDateRangeFilter: (start?: string, end?: string) => void;
  setSortBy: (sortBy: RecordingFilters['sortBy']) => void;
  setSortOrder: (sortOrder: RecordingFilters['sortOrder']) => void;
  resetFilters: () => void;

  // Actions - State Management
  setProcessing: (isProcessing: boolean) => void;
  setError: (error: string | null) => void;

  // Getters
  getFilteredRecordings: () => RecordingSession[];
  getRecordingById: (id: string) => RecordingSession | undefined;
  getRecordingsByPatientId: (patientId: string) => RecordingSession[];
  getRecentRecordings: (limit?: number) => RecordingSession[];
  getDraftsByPatientId: (patientId: string) => RecordingSession[];
  getCompletedRecordings: () => RecordingSession[];
}

const defaultFilters: RecordingFilters = {
  status: 'all',
  sortBy: 'date',
  sortOrder: 'desc',
};

export const useRecordingStore = create<RecordingStore>()(
  persist(
    (set, get) => ({
      // Initial state
      recordings: [],
      activeRecording: null,
      selectedRecording: null,
      filters: defaultFilters,
      drafts: [],
      isRecording: false,
      isProcessing: false,
      error: null,

      // Recording Management
      setRecordings: (recordings) => set({ recordings }),

      addRecording: (recording) =>
        set((state) => ({
          recordings: [recording, ...state.recordings],
        })),

      updateRecording: (id, updates) =>
        set((state) => ({
          recordings: state.recordings.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
          activeRecording:
            state.activeRecording?.id === id
              ? { ...state.activeRecording, ...updates }
              : state.activeRecording,
          selectedRecording:
            state.selectedRecording?.id === id
              ? { ...state.selectedRecording, ...updates }
              : state.selectedRecording,
        })),

      removeRecording: (id) =>
        set((state) => ({
          recordings: state.recordings.filter((r) => r.id !== id),
          selectedRecording:
            state.selectedRecording?.id === id ? null : state.selectedRecording,
        })),

      // Active Recording
      startRecording: (patientId, patientName, appointmentId) => {
        const newRecording: RecordingSession = {
          id: `recording-${Date.now()}`,
          patientId,
          patientName,
          providerId: 'current-provider', // TODO: Get from auth store
          providerName: 'Dr. Current Provider', // TODO: Get from auth store
          appointmentId,
          startTime: new Date().toISOString(),
          duration: 0,
          status: 'recording',
        };

        set({
          activeRecording: newRecording,
          isRecording: true,
          error: null,
        });

        get().addRecording(newRecording);
      },

      pauseRecording: () => {
        set({ isRecording: false });
      },

      resumeRecording: () => {
        set({ isRecording: true });
      },

      stopRecording: () => {
        const { activeRecording } = get();
        if (activeRecording) {
          const now = new Date().toISOString();
          get().updateRecording(activeRecording.id, {
            endTime: now,
            status: 'processing',
          });

          set({
            isRecording: false,
            isProcessing: true,
          });

          // Save as draft initially
          get().saveDraft(activeRecording);
        }
      },

      updateRecordingDuration: (duration) => {
        const { activeRecording } = get();
        if (activeRecording) {
          get().updateRecording(activeRecording.id, { duration });
        }
      },

      // Transcription & AI Processing
      setTranscription: (id, transcription) => {
        get().updateRecording(id, { transcription });
      },

      setClinicalNote: (id, clinicalNote) => {
        get().updateRecording(id, { clinicalNote, status: 'completed' });
        set({ isProcessing: false });
      },

      setAIInsights: (id, aiInsights) => {
        get().updateRecording(id, { aiInsights });
      },

      updateClinicalNoteField: (id, field, value) => {
        const recording = get().getRecordingById(id);
        if (recording?.clinicalNote) {
          get().updateRecording(id, {
            clinicalNote: {
              ...recording.clinicalNote,
              [field]: value,
            },
          });
        }
      },

      // Drafts
      saveDraft: (recording) => {
        set((state) => {
          const existingDraftIndex = state.drafts.findIndex(
            (d) => d.id === recording.id
          );

          if (existingDraftIndex >= 0) {
            const newDrafts = [...state.drafts];
            newDrafts[existingDraftIndex] = recording;
            return { drafts: newDrafts };
          }

          return { drafts: [...state.drafts, recording] };
        });

        get().updateRecording(recording.id, { status: 'draft' });
      },

      loadDraft: (id) => {
        const draft = get().drafts.find((d) => d.id === id);
        if (draft) {
          get().selectRecording(draft);
        }
      },

      deleteDraft: (id) =>
        set((state) => ({
          drafts: state.drafts.filter((d) => d.id !== id),
        })),

      clearDrafts: () => set({ drafts: [] }),

      // Selection
      selectRecording: (recording) =>
        set({ selectedRecording: recording }),

      selectRecordingById: (id) => {
        const recording = get().getRecordingById(id);
        if (recording) {
          get().selectRecording(recording);
        }
      },

      // Filters
      setPatientFilter: (patientId) =>
        set((state) => ({
          filters: { ...state.filters, patientId },
        })),

      setProviderFilter: (providerId) =>
        set((state) => ({
          filters: { ...state.filters, providerId },
        })),

      setStatusFilter: (status) =>
        set((state) => ({
          filters: { ...state.filters, status },
        })),

      setDateRangeFilter: (start, end) =>
        set((state) => ({
          filters: {
            ...state.filters,
            dateRange: start && end ? { start, end } : undefined,
          },
        })),

      setSortBy: (sortBy) =>
        set((state) => ({
          filters: { ...state.filters, sortBy },
        })),

      setSortOrder: (sortOrder) =>
        set((state) => ({
          filters: { ...state.filters, sortOrder },
        })),

      resetFilters: () => set({ filters: defaultFilters }),

      // State Management
      setProcessing: (isProcessing) => set({ isProcessing }),
      setError: (error) => set({ error }),

      // Getters
      getFilteredRecordings: () => {
        const { recordings, filters } = get();
        let filtered = [...recordings];

        // Patient filter
        if (filters.patientId) {
          filtered = filtered.filter((r) => r.patientId === filters.patientId);
        }

        // Provider filter
        if (filters.providerId) {
          filtered = filtered.filter((r) => r.providerId === filters.providerId);
        }

        // Status filter
        if (filters.status !== 'all') {
          filtered = filtered.filter((r) => r.status === filters.status);
        }

        // Date range filter
        if (filters.dateRange) {
          const startDate = new Date(filters.dateRange.start);
          const endDate = new Date(filters.dateRange.end);

          filtered = filtered.filter((r) => {
            const recordingDate = new Date(r.startTime);
            return recordingDate >= startDate && recordingDate <= endDate;
          });
        }

        // Sort
        filtered.sort((a, b) => {
          let compareValue = 0;

          switch (filters.sortBy) {
            case 'date':
              compareValue =
                new Date(a.startTime).getTime() -
                new Date(b.startTime).getTime();
              break;
            case 'patient':
              compareValue = a.patientName.localeCompare(b.patientName);
              break;
            case 'duration':
              compareValue = a.duration - b.duration;
              break;
          }

          return filters.sortOrder === 'asc' ? compareValue : -compareValue;
        });

        return filtered;
      },

      getRecordingById: (id) => {
        return get().recordings.find((r) => r.id === id);
      },

      getRecordingsByPatientId: (patientId) => {
        const { recordings } = get();
        return recordings
          .filter((r) => r.patientId === patientId)
          .sort(
            (a, b) =>
              new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
          );
      },

      getRecentRecordings: (limit = 10) => {
        const { recordings } = get();
        return recordings
          .sort(
            (a, b) =>
              new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
          )
          .slice(0, limit);
      },

      getDraftsByPatientId: (patientId) => {
        const { drafts } = get();
        return drafts.filter((d) => d.patientId === patientId);
      },

      getCompletedRecordings: () => {
        const { recordings } = get();
        return recordings.filter((r) => r.status === 'completed');
      },
    }),
    {
      name: 'recording-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist drafts and filters
      partialize: (state) => ({
        drafts: state.drafts,
        filters: state.filters,
      }),
    }
  )
);

// Selector hooks for performance optimization
export const useActiveRecording = () =>
  useRecordingStore((state) => state.activeRecording);

export const useSelectedRecording = () =>
  useRecordingStore((state) => state.selectedRecording);

export const useIsRecording = () =>
  useRecordingStore((state) => state.isRecording);

export const useIsProcessing = () =>
  useRecordingStore((state) => state.isProcessing);

export const useRecordingDrafts = () =>
  useRecordingStore((state) => state.drafts);

export const useRecentRecordings = (limit?: number) =>
  useRecordingStore((state) => state.getRecentRecordings(limit));
