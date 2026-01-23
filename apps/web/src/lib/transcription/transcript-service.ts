/**
 * Transcript Service
 *
 * Orchestrates the full transcription pipeline:
 * 1. Transcribe audio with Deepgram (auto-language detection)
 * 2. Extract PatientState JSON from transcript
 * 3. Persist to database with cost tracking
 * 4. Queue for quality grading
 *
 * This service implements the data contract between AI Scribe
 * and Prevention Hub as specified in Protocol Omega.
 */

import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import type { PatientState } from '@med-app/types';
import {
  transcribeAudioWithDeepgram,
  calculateDeepgramCost,
  type DeepgramTranscriptResult,
} from './deepgram';
import { extractPatientState } from './patient-state-extractor';
import { queueForQualityGrading } from '@/lib/ai/quality';
import { trackUsage } from '@/lib/ai/usage-tracker';

// ============================================
// TYPES
// ============================================

export interface TranscriptServiceOptions {
  /** Preferred language code (null for auto-detect) */
  languageHint?: 'pt' | 'es' | 'en' | null;
  /** Whether to extract PatientState (default: true) */
  extractState?: boolean;
  /** Whether to queue for quality grading (default: true) */
  queueForGrading?: boolean;
  /** User ID for tracking */
  userId?: string;
  /** Clinic ID for cost allocation */
  clinicId?: string;
}

export interface TranscriptServiceResult {
  /** Transcription result from Deepgram */
  transcription: DeepgramTranscriptResult;
  /** Extracted PatientState (if enabled) */
  patientState: PatientState | null;
  /** Database record ID */
  transcriptionId: string;
  /** Session ID */
  sessionId: string;
  /** Total cost in cents */
  totalCostCents: number;
  /** Whether queued for quality grading */
  queuedForGrading: boolean;
}

// ============================================
// MAIN SERVICE FUNCTION
// ============================================

/**
 * Process audio through the full transcription pipeline
 *
 * @param sessionId - ScribeSession ID
 * @param audioBuffer - Decrypted audio buffer
 * @param options - Service options
 * @returns Complete transcription result with PatientState
 */
export async function processTranscription(
  sessionId: string,
  audioBuffer: Buffer,
  options: TranscriptServiceOptions = {}
): Promise<TranscriptServiceResult> {
  const {
    languageHint = null,
    extractState = true,
    queueForGrading = true,
    userId,
    clinicId,
  } = options;

  const startTime = performance.now();

  logger.info({
    event: 'transcription_pipeline_started',
    sessionId,
    audioSize: audioBuffer.length,
    languageHint,
    extractState,
  });

  try {
    // Step 1: Verify session exists
    const session = await prisma.scribeSession.findUnique({
      where: { id: sessionId },
      select: { id: true, patientId: true, clinicianId: true },
    });

    if (!session) {
      throw new Error(`ScribeSession not found: ${sessionId}`);
    }

    // Step 2: Transcribe with Deepgram
    const transcription = await transcribeAudioWithDeepgram(
      audioBuffer,
      languageHint
    );

    // Calculate cost
    const costCents = calculateDeepgramCost(transcription.durationSeconds / 60) * 100;

    // Step 3: Extract PatientState (if enabled)
    let patientState: PatientState | null = null;
    if (extractState && transcription.text.length > 50) {
      patientState = await extractPatientState(
        transcription.text,
        transcription.confidence
      );
    }

    // Step 4: Persist to database
    const transcriptionRecord = await prisma.transcription.upsert({
      where: { sessionId },
      create: {
        sessionId,
        rawText: transcription.text,
        segments: transcription.segments,
        speakerCount: transcription.speakerCount,
        confidence: transcription.confidence,
        wordCount: transcription.text.split(/\s+/).length,
        durationSeconds: Math.round(transcription.durationSeconds),
        model: 'nova-2',
        language: languageHint || 'auto',
        detectedLanguage: transcription.language,
        processingTime: transcription.processingTimeMs,
        patientState: patientState as unknown as Record<string, unknown>,
        stateVersion: '1.0',
        stateExtractedAt: patientState ? new Date() : null,
        costCents,
      },
      update: {
        rawText: transcription.text,
        segments: transcription.segments,
        speakerCount: transcription.speakerCount,
        confidence: transcription.confidence,
        wordCount: transcription.text.split(/\s+/).length,
        durationSeconds: Math.round(transcription.durationSeconds),
        detectedLanguage: transcription.language,
        processingTime: transcription.processingTimeMs,
        patientState: patientState as unknown as Record<string, unknown>,
        stateExtractedAt: patientState ? new Date() : null,
        costCents,
      },
    });

    // Step 5: Track usage
    await trackUsage({
      provider: 'deepgram',
      task: 'transcription',
      promptTokens: 0,
      completionTokens: transcription.text.split(/\s+/).length,
      success: true,
      latencyMs: transcription.processingTimeMs,
      userId: userId || session.clinicianId,
      clinicId,
    });

    // Step 6: Queue for quality grading (if enabled and we have content)
    let queuedForGradingResult = false;
    if (queueForGrading && transcription.text.length > 100) {
      try {
        await queueForQualityGrading(
          transcriptionRecord.id,
          transcription.text, // Original transcript is the source of truth
          patientState ? JSON.stringify(patientState) : transcription.text,
          'patient_state_extraction',
          'normal'
        );
        queuedForGradingResult = true;
      } catch (error) {
        logger.warn({
          event: 'quality_grading_queue_failed',
          sessionId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Update session status
    await prisma.scribeSession.update({
      where: { id: sessionId },
      data: {
        status: 'PROCESSING',
        processingCompletedAt: new Date(),
      },
    });

    const totalTime = Math.round(performance.now() - startTime);

    logger.info({
      event: 'transcription_pipeline_complete',
      sessionId,
      transcriptionId: transcriptionRecord.id,
      durationSeconds: transcription.durationSeconds,
      language: transcription.language,
      confidence: transcription.confidence,
      patientStateExtracted: !!patientState,
      costCents,
      totalTimeMs: totalTime,
      queuedForGrading: queuedForGradingResult,
    });

    return {
      transcription,
      patientState,
      transcriptionId: transcriptionRecord.id,
      sessionId,
      totalCostCents: costCents,
      queuedForGrading: queuedForGradingResult,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error({
      event: 'transcription_pipeline_failed',
      sessionId,
      error: errorMessage,
    });

    // Update session with error
    await prisma.scribeSession.update({
      where: { id: sessionId },
      data: {
        status: 'FAILED',
        processingError: errorMessage,
      },
    });

    throw error;
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get PatientState for a session
 */
export async function getPatientStateForSession(
  sessionId: string
): Promise<PatientState | null> {
  const transcription = await prisma.transcription.findUnique({
    where: { sessionId },
    select: { patientState: true },
  });

  if (!transcription?.patientState) {
    return null;
  }

  return transcription.patientState as unknown as PatientState;
}

/**
 * Update PatientState after corrections
 */
export async function updatePatientState(
  sessionId: string,
  updatedState: PatientState
): Promise<void> {
  await prisma.transcription.update({
    where: { sessionId },
    data: {
      patientState: updatedState as unknown as Record<string, unknown>,
      stateExtractedAt: new Date(),
    },
  });

  logger.info({
    event: 'patient_state_updated',
    sessionId,
  });
}

/**
 * Re-extract PatientState from existing transcript
 */
export async function reExtractPatientState(
  sessionId: string
): Promise<PatientState | null> {
  const transcription = await prisma.transcription.findUnique({
    where: { sessionId },
    select: { rawText: true, confidence: true },
  });

  if (!transcription) {
    return null;
  }

  const patientState = await extractPatientState(
    transcription.rawText,
    transcription.confidence
  );

  await prisma.transcription.update({
    where: { sessionId },
    data: {
      patientState: patientState as unknown as Record<string, unknown>,
      stateExtractedAt: new Date(),
    },
  });

  return patientState;
}

/**
 * Get transcription cost summary for a clinic
 */
export async function getTranscriptionCostSummary(
  clinicId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalCostCents: number;
  totalDurationMinutes: number;
  transcriptionCount: number;
  averageCostPerTranscription: number;
}> {
  const sessions = await prisma.scribeSession.findMany({
    where: {
      clinician: { clinicId },
      createdAt: { gte: startDate, lte: endDate },
    },
    include: {
      transcription: {
        select: {
          costCents: true,
          durationSeconds: true,
        },
      },
    },
  });

  const transcriptions = sessions
    .map(s => s.transcription)
    .filter((t): t is NonNullable<typeof t> => t !== null);

  const totalCostCents = transcriptions.reduce(
    (sum, t) => sum + Number(t.costCents || 0),
    0
  );

  const totalDurationMinutes = transcriptions.reduce(
    (sum, t) => sum + (t.durationSeconds || 0) / 60,
    0
  );

  return {
    totalCostCents,
    totalDurationMinutes: Math.round(totalDurationMinutes),
    transcriptionCount: transcriptions.length,
    averageCostPerTranscription:
      transcriptions.length > 0
        ? Math.round(totalCostCents / transcriptions.length)
        : 0,
  };
}

// ============================================
// EXPORTS
// ============================================

export const TranscriptService = {
  processTranscription,
  getPatientStateForSession,
  updatePatientState,
  reExtractPatientState,
  getTranscriptionCostSummary,
};

export default TranscriptService;
