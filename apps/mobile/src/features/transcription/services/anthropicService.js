"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.anthropicService = exports.AnthropicService = void 0;
const api_1 = require("@/config/api");
class AnthropicService {
    apiKey;
    constructor() {
        this.apiKey = api_1.API_CONFIG.ANTHROPIC_API_KEY;
    }
    /**
     * Transcribe audio file using Anthropic Claude API
     * Note: This is a placeholder. In production, you would:
     * 1. Upload audio to your backend
     * 2. Backend sends to Anthropic with audio-to-text prompt
     * 3. Return transcription with speaker diarization
     */
    async transcribeAudio(audioUri, patientContext) {
        try {
            // TODO: Implement actual API call
            // const formData = new FormData();
            // formData.append('audio', {
            //   uri: audioUri,
            //   type: 'audio/m4a',
            //   name: 'recording.m4a',
            // });
            // For now, return mock data
            const mockSegments = [
                {
                    speaker: 'patient',
                    text: 'I\'ve been experiencing headaches for the past week.',
                    timestamp: 5,
                    confidence: 0.95,
                },
                {
                    speaker: 'doctor',
                    text: 'Can you describe the headaches? Are they constant or intermittent?',
                    timestamp: 10,
                    confidence: 0.98,
                },
                {
                    speaker: 'patient',
                    text: 'They come and go, mostly in the mornings.',
                    timestamp: 15,
                    confidence: 0.93,
                },
            ];
            return {
                id: `trans_${Date.now()}`,
                recordingId: 'rec_placeholder',
                segments: mockSegments,
                fullText: mockSegments.map((s) => `${s.speaker.toUpperCase()}: ${s.text}`).join('\n'),
                language: 'en',
                status: 'completed',
                processingTime: 5000,
                createdAt: new Date().toISOString(),
            };
        }
        catch (error) {
            console.error('Transcription error:', error);
            throw new Error('Failed to transcribe audio');
        }
    }
    /**
     * Generate SOAP note from transcription using Claude
     */
    async generateSOAPNote(transcription) {
        try {
            // TODO: Call Anthropic API with medical prompt
            // const response = await fetch('https://api.anthropic.com/v1/messages', {
            //   method: 'POST',
            //   headers: {
            //     'Content-Type': 'application/json',
            //     'x-api-key': this.apiKey,
            //     'anthropic-version': '2023-06-01',
            //   },
            //   body: JSON.stringify({
            //     model: 'claude-3-5-sonnet-20241022',
            //     max_tokens: 4096,
            //     messages: [{
            //       role: 'user',
            //       content: `Generate a SOAP note from this medical consultation:\n\n${transcription.fullText}`,
            //     }],
            //   }),
            // });
            // Mock SOAP note
            return {
                subjective: 'Patient reports experiencing headaches for the past week, primarily in the mornings. Describes pain as intermittent.',
                objective: 'Patient appears alert and oriented. No visible signs of distress. Vital signs within normal limits.',
                assessment: 'Tension headaches, likely stress-related. Rule out migraines.',
                plan: '1. Recommend over-the-counter pain relief (acetaminophen 500mg as needed)\n2. Stress management techniques\n3. Follow-up in 2 weeks if symptoms persist\n4. Advise patient to keep headache diary',
                diagnoses: [
                    { code: 'R51', description: 'Headache', type: 'primary' },
                ],
            };
        }
        catch (error) {
            console.error('SOAP generation error:', error);
            throw new Error('Failed to generate SOAP note');
        }
    }
}
exports.AnthropicService = AnthropicService;
exports.anthropicService = new AnthropicService();
//# sourceMappingURL=anthropicService.js.map