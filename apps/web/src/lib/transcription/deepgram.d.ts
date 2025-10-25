/**
 * Deepgram Transcription Service
 *
 * 74% cheaper than AssemblyAI ($0.0043/min vs $0.017/min)
 * Medical-grade accuracy with speaker diarization
 * Native Portuguese and Spanish support
 */
export interface DeepgramTranscriptSegment {
    speaker: string;
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
    durationSeconds: number;
    processingTimeMs: number;
}
/**
 * Transcribe audio buffer using Deepgram
 *
 * @param audioBuffer - Decrypted audio file buffer
 * @param languageCode - 'pt' (Portuguese) or 'es' (Spanish)
 * @returns Transcription result with speaker diarization
 */
export declare function transcribeAudioWithDeepgram(audioBuffer: Buffer, languageCode: 'pt' | 'es'): Promise<DeepgramTranscriptResult>;
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
export declare function calculateDeepgramCost(durationMinutes: number): number;
//# sourceMappingURL=deepgram.d.ts.map