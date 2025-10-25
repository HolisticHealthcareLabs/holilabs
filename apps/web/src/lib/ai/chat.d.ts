/**
 * AI Clinical Assistant
 * Powered by Claude 3.5 Sonnet (Anthropic) or GPT-4 (OpenAI)
 *
 * Features:
 * - Clinical decision support
 * - Differential diagnosis
 * - Treatment recommendations
 * - Drug interaction checks
 * - Patient data analysis
 */
export type AIProvider = 'claude' | 'openai' | 'gemini';
export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}
export interface ChatRequest {
    messages: ChatMessage[];
    provider?: AIProvider;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
}
export interface ChatResponse {
    success: boolean;
    message?: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    error?: string;
}
export declare const ClinicalSystemPrompts: {
    general: string;
    differential: string;
    drugInteractions: string;
    treatment: string;
};
/**
 * Send chat request to AI provider
 */
export declare function chat(request: ChatRequest): Promise<ChatResponse>;
/**
 * Generate patient context summary for AI
 */
export declare function buildPatientContext(patient: {
    ageBand?: string;
    gender?: string;
    medications?: Array<{
        name: string;
        dose: string;
    }>;
    diagnoses?: string[];
    allergies?: string[];
    vitalSigns?: Record<string, string>;
}): string;
/**
 * Check drug interactions using AI
 */
export declare function checkDrugInteractions(medications: Array<{
    name: string;
    dose: string;
}>): Promise<ChatResponse>;
/**
 * Get differential diagnosis suggestions
 */
export declare function getDifferentialDiagnosis(symptoms: string, patientContext?: string): Promise<ChatResponse>;
/**
 * Get treatment recommendations
 */
export declare function getTreatmentRecommendations(diagnosis: string, patientContext?: string): Promise<ChatResponse>;
//# sourceMappingURL=chat.d.ts.map