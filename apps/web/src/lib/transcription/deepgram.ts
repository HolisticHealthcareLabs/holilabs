/**
 * Deepgram Transcription Service
 *
 * 74% cheaper than AssemblyAI ($0.0043/min vs $0.017/min)
 * Medical-grade accuracy with speaker diarization
 * Native Portuguese and Spanish support
 */

import { createClient } from '@deepgram/sdk';

export interface DeepgramTranscriptSegment {
  speaker: string;
  speakerIndex?: number;
  role?: 'DOCTOR' | 'PATIENT' | 'UNKNOWN';
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

export interface DeepgramTranscriptResult {
  text: string;
  segments: DeepgramTranscriptSegment[];
  speakerCount: number;
  confidence: number;
  language: string;
  detectedLanguage?: string; // Language detected by Deepgram (if auto-detect enabled)
  durationSeconds: number;
  processingTimeMs: number;
}

/**
 * Initialize Deepgram client (lazy-loaded to avoid build-time errors)
 */
function getDeepgramClient() {
  if (!process.env.DEEPGRAM_API_KEY) {
    throw new Error('DEEPGRAM_API_KEY is not configured');
  }
  return createClient(process.env.DEEPGRAM_API_KEY);
}

/**
 * Transcribe audio buffer using Deepgram
 *
 * @param audioBuffer - Decrypted audio file buffer
 * @param languageCode - Optional. If not provided, auto-detects language (en/pt/es)
 * @returns Transcription result with speaker diarization
 *
 * Auto-Detection:
 * When languageCode is not provided, Deepgram will automatically detect
 * Portuguese, Spanish, and English. This is useful for:
 * - Multilingual clinics
 * - Patients who switch languages mid-consultation
 * - Unknown language scenarios
 */
export async function transcribeAudioWithDeepgram(
  audioBuffer: Buffer,
  languageCode?: 'en' | 'pt' | 'es'
): Promise<DeepgramTranscriptResult> {
  const startTime = Date.now();
  const autoDetect = !languageCode;

  try {
    const deepgram = getDeepgramClient();

    // Best-practice model selection:
    // - English: medical model
    // - Spanish/Portuguese/Auto: general Nova (medical model is not consistently supported cross-lingual)
    // When auto-detecting, use nova-3 which supports all languages
    const model = languageCode === 'en' ? 'nova-3-medical' : 'nova-3';

    // Build transcription options
    // When auto-detecting, we omit the language parameter and enable detect_language
    const transcriptionOptions: Record<string, unknown> = {
      model,
      smart_format: true, // Auto-format numbers, dates, times
      punctuate: true, // Add punctuation
      paragraphs: true, // Group into paragraphs
      diarize: true, // Speaker diarization
      diarize_version: '2023-09-27',
      utterances: true, // Group by speaker turns
      filler_words: false, // Remove "um", "ah" (cleaner medical notes)
      profanity_filter: false, // Don't filter medical terms
      numerals: true, // Convert "twenty three" → "23"
    };

    if (autoDetect) {
      // Auto-detect language - useful for multilingual clinics
      transcriptionOptions.detect_language = true;
    } else {
      // Known language - faster processing
      transcriptionOptions.language = languageCode;
      transcriptionOptions.detect_language = false;
    }

    // Call Deepgram API with medical-optimized settings
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      audioBuffer,
      transcriptionOptions
    );

    if (error) {
      throw new Error(`Deepgram API error: ${error.message}`);
    }

    if (!result) {
      throw new Error('Deepgram returned empty result');
    }

    // Extract full transcript text
    const transcriptText = result.results.channels[0].alternatives[0].transcript || '';

    // Extract speaker-diarized segments from utterances
    const utterances = result.results.utterances || [];
    const segments: DeepgramTranscriptSegment[] = utterances.map((utterance, index) => ({
      speaker: utterance.speaker === 0 ? 'Doctor' : 'Patient',
      speakerIndex: utterance.speaker,
      role: utterance.speaker === 0 ? 'DOCTOR' : 'PATIENT',
      text: utterance.transcript,
      startTime: utterance.start,
      endTime: utterance.end,
      confidence: utterance.confidence,
    }));

    // Calculate average confidence
    const avgConfidence = segments.length > 0
      ? segments.reduce((sum, seg) => sum + seg.confidence, 0) / segments.length
      : 0.95;

    // Count unique speakers
    const speakerCount = new Set(utterances.map(u => u.speaker)).size;

    // Get audio duration from metadata
    const durationSeconds = result.results.channels[0].alternatives[0].words?.slice(-1)[0]?.end || 0;

    // Extract detected language from Deepgram response
    const detectedLanguage = result.results.channels[0]?.detected_language || undefined;
    const finalLanguage = languageCode || detectedLanguage || 'unknown';

    const processingTimeMs = Date.now() - startTime;

    console.log(`✅ Deepgram transcription completed in ${processingTimeMs}ms`);
    console.log(`   Language: ${finalLanguage}${autoDetect ? ' (auto-detected)' : ''}, Duration: ${durationSeconds}s, Speakers: ${speakerCount}`);
    console.log(`   Words: ${result.results.channels[0].alternatives[0].words?.length || 0}, Confidence: ${(avgConfidence * 100).toFixed(1)}%`);

    return {
      text: transcriptText,
      segments,
      speakerCount,
      confidence: avgConfidence,
      language: finalLanguage,
      detectedLanguage: autoDetect ? detectedLanguage : undefined,
      durationSeconds,
      processingTimeMs,
    };
  } catch (error: any) {
    console.error('❌ Deepgram transcription error:', error);
    throw new Error(`Failed to transcribe with Deepgram: ${error.message}`);
  }
}

/**
 * Cost calculation for Deepgram
 *
 * Nova-2 model pricing: $0.0043/minute ($0.258/hour)
 *
 * Example:
 * - 15-minute consultation = $0.0645
 * - 100 consultations/month = $6.45
 *
 * Compare to AssemblyAI:
 * - 15-minute consultation = $0.255
 * - 100 consultations/month = $25.50
 *
 * Savings: 74% cheaper ($19.05/month for 100 consultations)
 */
export function calculateDeepgramCost(durationMinutes: number): number {
  const COST_PER_MINUTE = 0.0043;
  return durationMinutes * COST_PER_MINUTE;
}
