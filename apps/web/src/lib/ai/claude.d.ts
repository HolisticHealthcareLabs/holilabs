/**
 * Claude API Integration Service
 *
 * Handles all interactions with Anthropic's Claude API for clinical intelligence
 */
export interface ClaudeRequestOptions {
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    model?: 'claude-3-5-sonnet-20241022' | 'claude-3-opus-20240229' | 'claude-3-sonnet-20240229';
}
export interface ClaudeResponse {
    content: string;
    usage: {
        inputTokens: number;
        outputTokens: number;
    };
    model: string;
    stopReason: string;
}
/**
 * Send message to Claude with clinical context
 */
export declare function sendToClaude(message: string, options?: ClaudeRequestOptions): Promise<ClaudeResponse>;
/**
 * Summarize de-identified clinical document
 */
export declare function summarizeClinicalDocument(deidentifiedText: string, documentType?: 'lab_results' | 'consultation_notes' | 'discharge_summary' | 'prescription' | 'general'): Promise<ClaudeResponse>;
/**
 * Generate SOAP note from consultation transcript
 */
export declare function generateSOAPNote(transcriptText: string): Promise<ClaudeResponse>;
/**
 * Check for potential drug interactions
 */
export declare function checkDrugInteractions(medications: string[]): Promise<ClaudeResponse>;
/**
 * Answer clinical question with de-identified context
 */
export declare function answerClinicalQuestion(question: string, context?: string): Promise<ClaudeResponse>;
/**
 * Health check for Claude API
 */
export declare function healthCheck(): Promise<boolean>;
//# sourceMappingURL=claude.d.ts.map