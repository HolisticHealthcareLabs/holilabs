import { Transcription } from '@/shared/types';
export declare class AnthropicService {
    private apiKey;
    constructor();
    /**
     * Transcribe audio file using Anthropic Claude API
     * Note: This is a placeholder. In production, you would:
     * 1. Upload audio to your backend
     * 2. Backend sends to Anthropic with audio-to-text prompt
     * 3. Return transcription with speaker diarization
     */
    transcribeAudio(audioUri: string, patientContext?: string): Promise<Transcription>;
    /**
     * Generate SOAP note from transcription using Claude
     */
    generateSOAPNote(transcription: Transcription): Promise<any>;
}
export declare const anthropicService: AnthropicService;
//# sourceMappingURL=anthropicService.d.ts.map