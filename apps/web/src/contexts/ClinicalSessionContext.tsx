'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface TranscriptSegment {
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
  isFinal?: boolean;
}

interface ExtractedSymptom {
  symptom: string;
  confidence: number;
  extractedAt: number;
}

interface SuggestedDiagnosis {
  condition: string;
  probability: 'high' | 'moderate' | 'low';
  reasoning: string;
  icd10Code?: string;
}

interface LiveSoapNote {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  chiefComplaint?: string;
  extractedSymptoms?: string[];
  vitalSigns?: Record<string, any>;
  lastUpdated: number;
}

interface ClinicalSessionState {
  transcript: TranscriptSegment[];
  liveSoapNote: LiveSoapNote | null;
  extractedSymptoms: ExtractedSymptom[];
  suggestedDiagnoses: SuggestedDiagnosis[];
  sessionId: string | null;
  isRecording: boolean;
  isProcessing: boolean;
}

interface ClinicalSessionContextType {
  state: ClinicalSessionState;
  updateTranscript: (segments: TranscriptSegment[]) => void;
  appendTranscript: (segment: TranscriptSegment) => void;
  updateLiveSoapNote: (updates: Partial<LiveSoapNote>) => void;
  addExtractedSymptom: (symptom: ExtractedSymptom) => void;
  addSuggestedDiagnosis: (diagnosis: SuggestedDiagnosis) => void;
  setSessionId: (id: string | null) => void;
  setIsRecording: (recording: boolean) => void;
  setIsProcessing: (processing: boolean) => void;
  reset: () => void;
}

const initialState: ClinicalSessionState = {
  transcript: [],
  liveSoapNote: null,
  extractedSymptoms: [],
  suggestedDiagnoses: [],
  sessionId: null,
  isRecording: false,
  isProcessing: false,
};

const ClinicalSessionContext = createContext<ClinicalSessionContextType | undefined>(undefined);

export function ClinicalSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ClinicalSessionState>(initialState);

  const updateTranscript = useCallback((segments: TranscriptSegment[]) => {
    setState((prev) => ({ ...prev, transcript: segments }));
  }, []);

  const appendTranscript = useCallback((segment: TranscriptSegment) => {
    setState((prev) => ({
      ...prev,
      transcript: [...prev.transcript, segment],
    }));
  }, []);

  const updateLiveSoapNote = useCallback((updates: Partial<LiveSoapNote>) => {
    setState((prev) => ({
      ...prev,
      liveSoapNote: {
        ...(prev.liveSoapNote || {}),
        ...updates,
        lastUpdated: Date.now(),
      } as LiveSoapNote,
    }));
  }, []);

  const addExtractedSymptom = useCallback((symptom: ExtractedSymptom) => {
    setState((prev) => ({
      ...prev,
      extractedSymptoms: [...prev.extractedSymptoms, symptom],
    }));
  }, []);

  const addSuggestedDiagnosis = useCallback((diagnosis: SuggestedDiagnosis) => {
    setState((prev) => ({
      ...prev,
      suggestedDiagnoses: [...prev.suggestedDiagnoses, diagnosis],
    }));
  }, []);

  const setSessionId = useCallback((id: string | null) => {
    setState((prev) => ({ ...prev, sessionId: id }));
  }, []);

  const setIsRecording = useCallback((recording: boolean) => {
    setState((prev) => ({ ...prev, isRecording: recording }));
  }, []);

  const setIsProcessing = useCallback((processing: boolean) => {
    setState((prev) => ({ ...prev, isProcessing: processing }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return (
    <ClinicalSessionContext.Provider
      value={{
        state,
        updateTranscript,
        appendTranscript,
        updateLiveSoapNote,
        addExtractedSymptom,
        addSuggestedDiagnosis,
        setSessionId,
        setIsRecording,
        setIsProcessing,
        reset,
      }}
    >
      {children}
    </ClinicalSessionContext.Provider>
  );
}

export function useClinicalSession() {
  const context = useContext(ClinicalSessionContext);
  if (context === undefined) {
    throw new Error('useClinicalSession must be used within a ClinicalSessionProvider');
  }
  return context;
}

