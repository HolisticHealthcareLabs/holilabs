/**
 * Transcript Service Tests
 *
 * Tests for the full transcription pipeline:
 * - Deepgram transcription orchestration
 * - PatientState extraction integration
 * - Database persistence
 * - Cost tracking
 * - Quality grading queue
 */

// Mock dependencies first
jest.mock('@/lib/prisma', () => ({
  prisma: {
    scribeSession: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    transcription: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../deepgram', () => ({
  transcribeAudioWithDeepgram: jest.fn(),
  calculateDeepgramCost: jest.fn(),
}));

jest.mock('../patient-state-extractor', () => ({
  extractPatientState: jest.fn(),
}));

jest.mock('@/lib/ai/quality', () => ({
  queueForQualityGrading: jest.fn(),
}));

jest.mock('@/lib/ai/usage-tracker', () => ({
  trackUsage: jest.fn(),
}));

// Import mocks after jest.mock()
const { prisma } = require('@/lib/prisma');
const { transcribeAudioWithDeepgram, calculateDeepgramCost } = require('../deepgram');
const { extractPatientState } = require('../patient-state-extractor');
const { queueForQualityGrading } = require('@/lib/ai/quality');
const { trackUsage } = require('@/lib/ai/usage-tracker');

import {
  processTranscription,
  getPatientStateForSession,
  updatePatientState,
  reExtractPatientState,
  getTranscriptionCostSummary,
} from '../transcript-service';
import type { PatientState } from '@med-app/types';

// ============================================
// TEST FIXTURES
// ============================================

const mockSession = {
  id: 'session-123',
  patientId: 'patient-456',
  clinicianId: 'clinician-789',
};

const mockTranscriptionResult = {
  // Text must be > 100 characters for quality grading to be triggered
  text: 'Doctor: Hello, how are you feeling today? Patient: I have been feeling very tired and extremely thirsty lately. I also noticed my vision has been blurry.',
  segments: [
    { speaker: 'Doctor', text: 'Hello, how are you feeling today?', startTime: 0, endTime: 2.5, confidence: 0.95 },
    { speaker: 'Paciente', text: 'I have been feeling very tired and extremely thirsty lately. I also noticed my vision has been blurry.', startTime: 3.0, endTime: 7.0, confidence: 0.92 },
  ],
  speakerCount: 2,
  confidence: 0.935,
  language: 'en',
  durationSeconds: 120,
  processingTimeMs: 1500,
};

const mockPatientState: PatientState = {
  vitals: {
    bp_systolic: 140,
    bp_diastolic: 90,
  },
  meds: ['metformin'],
  conditions: ['E11.9'],
  symptoms: ['fatigue', 'thirst'],
  painPoints: [],
  timestamp: '2026-01-22T10:00:00Z',
  confidence: 0.85,
};

const mockTranscriptionRecord = {
  id: 'transcription-001',
  sessionId: 'session-123',
  rawText: mockTranscriptionResult.text,
  segments: mockTranscriptionResult.segments,
  speakerCount: 2,
  confidence: 0.935,
  wordCount: 28,
  durationSeconds: 120,
  model: 'nova-2',
  language: 'auto',
  detectedLanguage: 'en',
  processingTime: 1500,
  patientState: mockPatientState,
  stateVersion: '1.0',
  stateExtractedAt: new Date(),
  costCents: 0.86,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ============================================
// SETUP
// ============================================

describe('Transcript Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementations
    (prisma.scribeSession.findUnique as jest.Mock).mockResolvedValue(mockSession);
    (prisma.scribeSession.update as jest.Mock).mockResolvedValue({ ...mockSession, status: 'PROCESSING' });
    (transcribeAudioWithDeepgram as jest.Mock).mockResolvedValue(mockTranscriptionResult);
    (calculateDeepgramCost as jest.Mock).mockReturnValue(0.0086);
    (extractPatientState as jest.Mock).mockResolvedValue(mockPatientState);
    (prisma.transcription.upsert as jest.Mock).mockResolvedValue(mockTranscriptionRecord);
    (prisma.transcription.findUnique as jest.Mock).mockResolvedValue(mockTranscriptionRecord);
    (prisma.transcription.update as jest.Mock).mockResolvedValue(mockTranscriptionRecord);
    (queueForQualityGrading as jest.Mock).mockResolvedValue(undefined);
    (trackUsage as jest.Mock).mockResolvedValue(undefined);
  });

  // ============================================
  // processTranscription TESTS
  // ============================================

  describe('processTranscription', () => {
    const testAudioBuffer = Buffer.from('test audio data');

    it('should process transcription successfully with all defaults', async () => {
      const result = await processTranscription('session-123', testAudioBuffer);

      expect(result).toMatchObject({
        transcription: mockTranscriptionResult,
        patientState: mockPatientState,
        transcriptionId: 'transcription-001',
        sessionId: 'session-123',
        queuedForGrading: true,
      });
      expect(result.totalCostCents).toBeCloseTo(0.86, 1);
    });

    it('should verify session exists before transcription', async () => {
      await processTranscription('session-123', testAudioBuffer);

      expect(prisma.scribeSession.findUnique).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        select: { id: true, patientId: true, clinicianId: true },
      });
    });

    it('should throw error for non-existent session', async () => {
      (prisma.scribeSession.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(processTranscription('non-existent', testAudioBuffer))
        .rejects.toThrow('ScribeSession not found: non-existent');
    });

    it('should pass language hint to Deepgram', async () => {
      await processTranscription('session-123', testAudioBuffer, { languageHint: 'pt' });

      expect(transcribeAudioWithDeepgram).toHaveBeenCalledWith(testAudioBuffer, 'pt');
    });

    it('should use auto-detect when no language hint provided', async () => {
      await processTranscription('session-123', testAudioBuffer);

      expect(transcribeAudioWithDeepgram).toHaveBeenCalledWith(testAudioBuffer, null);
    });

    it('should skip PatientState extraction when disabled', async () => {
      const result = await processTranscription('session-123', testAudioBuffer, {
        extractState: false,
      });

      expect(extractPatientState).not.toHaveBeenCalled();
      expect(result.patientState).toBeNull();
    });

    it('should skip PatientState extraction for short transcripts', async () => {
      (transcribeAudioWithDeepgram as jest.Mock).mockResolvedValue({
        ...mockTranscriptionResult,
        text: 'Hello.', // Less than 50 characters
      });

      const result = await processTranscription('session-123', testAudioBuffer);

      expect(extractPatientState).not.toHaveBeenCalled();
      expect(result.patientState).toBeNull();
    });

    it('should persist transcription to database', async () => {
      await processTranscription('session-123', testAudioBuffer);

      expect(prisma.transcription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sessionId: 'session-123' },
          create: expect.objectContaining({
            sessionId: 'session-123',
            rawText: mockTranscriptionResult.text,
            model: 'nova-2',
            patientState: mockPatientState,
          }),
          update: expect.objectContaining({
            rawText: mockTranscriptionResult.text,
            patientState: mockPatientState,
          }),
        })
      );
    });

    it('should track usage with correct parameters', async () => {
      await processTranscription('session-123', testAudioBuffer, {
        userId: 'user-abc',
        clinicId: 'clinic-xyz',
      });

      expect(trackUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'deepgram',
          task: 'transcription',
          success: true,
          userId: 'user-abc',
          clinicId: 'clinic-xyz',
        })
      );
    });

    it('should use clinician ID when userId not provided', async () => {
      await processTranscription('session-123', testAudioBuffer);

      expect(trackUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'clinician-789',
        })
      );
    });

    it('should skip quality grading when disabled', async () => {
      const result = await processTranscription('session-123', testAudioBuffer, {
        queueForGrading: false,
      });

      expect(queueForQualityGrading).not.toHaveBeenCalled();
      expect(result.queuedForGrading).toBe(false);
    });

    it('should skip quality grading for short content', async () => {
      (transcribeAudioWithDeepgram as jest.Mock).mockResolvedValue({
        ...mockTranscriptionResult,
        text: 'Very short.', // Less than 100 characters
      });

      const result = await processTranscription('session-123', testAudioBuffer);

      expect(queueForQualityGrading).not.toHaveBeenCalled();
      expect(result.queuedForGrading).toBe(false);
    });

    it('should handle quality grading queue failure gracefully', async () => {
      (queueForQualityGrading as jest.Mock).mockRejectedValue(new Error('Queue unavailable'));

      const result = await processTranscription('session-123', testAudioBuffer);

      expect(result.queuedForGrading).toBe(false);
      // Should not throw, just log warning
    });

    it('should update session status on success', async () => {
      await processTranscription('session-123', testAudioBuffer);

      expect(prisma.scribeSession.update).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: expect.objectContaining({
          status: 'PROCESSING',
        }),
      });
    });

    it('should update session status on failure', async () => {
      const testError = new Error('Transcription failed');
      (transcribeAudioWithDeepgram as jest.Mock).mockRejectedValue(testError);

      await expect(processTranscription('session-123', testAudioBuffer))
        .rejects.toThrow('Transcription failed');

      expect(prisma.scribeSession.update).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: expect.objectContaining({
          status: 'FAILED',
          processingError: 'Transcription failed',
        }),
      });
    });

    it('should calculate cost correctly', async () => {
      // 120 seconds = 2 minutes, $0.0043/min = $0.0086
      (calculateDeepgramCost as jest.Mock).mockReturnValue(0.0086);

      const result = await processTranscription('session-123', testAudioBuffer);

      expect(calculateDeepgramCost).toHaveBeenCalledWith(2); // 120 seconds / 60
      expect(result.totalCostCents).toBeCloseTo(0.86, 1);
    });
  });

  // ============================================
  // getPatientStateForSession TESTS
  // ============================================

  describe('getPatientStateForSession', () => {
    it('should return PatientState for session', async () => {
      (prisma.transcription.findUnique as jest.Mock).mockResolvedValue({
        patientState: mockPatientState,
      });

      const result = await getPatientStateForSession('session-123');

      expect(result).toEqual(mockPatientState);
      expect(prisma.transcription.findUnique).toHaveBeenCalledWith({
        where: { sessionId: 'session-123' },
        select: { patientState: true },
      });
    });

    it('should return null when transcription not found', async () => {
      (prisma.transcription.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getPatientStateForSession('non-existent');

      expect(result).toBeNull();
    });

    it('should return null when patientState is null', async () => {
      (prisma.transcription.findUnique as jest.Mock).mockResolvedValue({
        patientState: null,
      });

      const result = await getPatientStateForSession('session-123');

      expect(result).toBeNull();
    });
  });

  // ============================================
  // updatePatientState TESTS
  // ============================================

  describe('updatePatientState', () => {
    it('should update PatientState in database', async () => {
      const updatedState: PatientState = {
        ...mockPatientState,
        symptoms: ['fatigue', 'thirst', 'blurry_vision'],
      };

      await updatePatientState('session-123', updatedState);

      expect(prisma.transcription.update).toHaveBeenCalledWith({
        where: { sessionId: 'session-123' },
        data: {
          patientState: updatedState,
          stateExtractedAt: expect.any(Date),
        },
      });
    });
  });

  // ============================================
  // reExtractPatientState TESTS
  // ============================================

  describe('reExtractPatientState', () => {
    it('should re-extract PatientState from existing transcript', async () => {
      (prisma.transcription.findUnique as jest.Mock).mockResolvedValue({
        rawText: mockTranscriptionResult.text,
        confidence: 0.92,
      });
      (extractPatientState as jest.Mock).mockResolvedValue(mockPatientState);

      const result = await reExtractPatientState('session-123');

      expect(result).toEqual(mockPatientState);
      expect(extractPatientState).toHaveBeenCalledWith(
        mockTranscriptionResult.text,
        0.92
      );
      expect(prisma.transcription.update).toHaveBeenCalled();
    });

    it('should return null when transcription not found', async () => {
      (prisma.transcription.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await reExtractPatientState('non-existent');

      expect(result).toBeNull();
      expect(extractPatientState).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // getTranscriptionCostSummary TESTS
  // ============================================

  describe('getTranscriptionCostSummary', () => {
    const startDate = new Date('2026-01-01');
    const endDate = new Date('2026-01-31');

    it('should return cost summary for clinic', async () => {
      const mockSessions = [
        {
          transcription: { costCents: 50, durationSeconds: 300 },
        },
        {
          transcription: { costCents: 75, durationSeconds: 450 },
        },
        {
          transcription: { costCents: 25, durationSeconds: 150 },
        },
      ];

      (prisma.scribeSession.findMany as jest.Mock) = jest.fn().mockResolvedValue(mockSessions);

      const result = await getTranscriptionCostSummary('clinic-123', startDate, endDate);

      expect(result).toEqual({
        totalCostCents: 150,
        totalDurationMinutes: 15, // 900 seconds / 60
        transcriptionCount: 3,
        averageCostPerTranscription: 50,
      });
    });

    it('should handle sessions without transcriptions', async () => {
      const mockSessions = [
        { transcription: { costCents: 50, durationSeconds: 300 } },
        { transcription: null },
      ];

      (prisma.scribeSession.findMany as jest.Mock) = jest.fn().mockResolvedValue(mockSessions);

      const result = await getTranscriptionCostSummary('clinic-123', startDate, endDate);

      expect(result.transcriptionCount).toBe(1);
      expect(result.totalCostCents).toBe(50);
    });

    it('should return zeros for empty results', async () => {
      (prisma.scribeSession.findMany as jest.Mock) = jest.fn().mockResolvedValue([]);

      const result = await getTranscriptionCostSummary('clinic-123', startDate, endDate);

      expect(result).toEqual({
        totalCostCents: 0,
        totalDurationMinutes: 0,
        transcriptionCount: 0,
        averageCostPerTranscription: 0,
      });
    });

    it('should handle null cost values', async () => {
      const mockSessions = [
        { transcription: { costCents: null, durationSeconds: 300 } },
        { transcription: { costCents: 50, durationSeconds: 300 } },
      ];

      (prisma.scribeSession.findMany as jest.Mock) = jest.fn().mockResolvedValue(mockSessions);

      const result = await getTranscriptionCostSummary('clinic-123', startDate, endDate);

      expect(result.totalCostCents).toBe(50);
    });
  });

  // ============================================
  // ERROR HANDLING TESTS
  // ============================================

  describe('Error Handling', () => {
    it('should handle Deepgram API errors', async () => {
      const testBuffer = Buffer.from('test audio');
      (transcribeAudioWithDeepgram as jest.Mock).mockRejectedValue(
        new Error('Deepgram API rate limit exceeded')
      );

      await expect(processTranscription('session-123', testBuffer))
        .rejects.toThrow('Deepgram API rate limit exceeded');

      expect(prisma.scribeSession.update).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: expect.objectContaining({
          status: 'FAILED',
          processingError: 'Deepgram API rate limit exceeded',
        }),
      });
    });

    it('should handle PatientState extraction errors gracefully', async () => {
      const testBuffer = Buffer.from('test audio');
      (extractPatientState as jest.Mock).mockRejectedValue(
        new Error('LLM extraction failed')
      );

      // Should throw the error since PatientState extraction is critical
      await expect(processTranscription('session-123', testBuffer))
        .rejects.toThrow('LLM extraction failed');
    });

    it('should handle database errors', async () => {
      const testBuffer = Buffer.from('test audio');
      (prisma.transcription.upsert as jest.Mock).mockRejectedValue(
        new Error('Database connection lost')
      );

      await expect(processTranscription('session-123', testBuffer))
        .rejects.toThrow('Database connection lost');
    });
  });

  // ============================================
  // INTEGRATION TESTS (Pipeline Flow)
  // ============================================

  describe('Pipeline Flow Integration', () => {
    it('should complete full pipeline with all features enabled', async () => {
      const testBuffer = Buffer.from('test audio');

      const result = await processTranscription('session-123', testBuffer, {
        languageHint: 'en',
        extractState: true,
        queueForGrading: true,
        userId: 'user-123',
        clinicId: 'clinic-456',
      });

      // Verify all steps were executed
      expect(prisma.scribeSession.findUnique).toHaveBeenCalled();
      expect(transcribeAudioWithDeepgram).toHaveBeenCalledWith(testBuffer, 'en');
      expect(extractPatientState).toHaveBeenCalled();
      expect(prisma.transcription.upsert).toHaveBeenCalled();
      expect(trackUsage).toHaveBeenCalled();
      expect(queueForQualityGrading).toHaveBeenCalled();
      expect(prisma.scribeSession.update).toHaveBeenCalled();

      // Verify result structure
      expect(result).toMatchObject({
        transcription: expect.any(Object),
        patientState: expect.any(Object),
        transcriptionId: expect.any(String),
        sessionId: 'session-123',
        queuedForGrading: true,
      });
    });

    it('should complete pipeline with minimal features', async () => {
      const testBuffer = Buffer.from('test audio');

      (transcribeAudioWithDeepgram as jest.Mock).mockResolvedValue({
        ...mockTranscriptionResult,
        text: 'Hello.', // Short transcript
      });

      const result = await processTranscription('session-123', testBuffer, {
        extractState: false,
        queueForGrading: false,
      });

      expect(extractPatientState).not.toHaveBeenCalled();
      expect(queueForQualityGrading).not.toHaveBeenCalled();
      expect(result.patientState).toBeNull();
      expect(result.queuedForGrading).toBe(false);
    });
  });
});
