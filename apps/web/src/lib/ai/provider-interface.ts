/**
 * Interface for AI Providers (Gemini, Anthropic, OpenAI, etc.)
 * Allows switching between providers transparently.
 */
export interface AIProvider {
    /**
     * Generates a text response from the AI model.
     * @param prompt The input prompt (already de-identified).
     * @param context Optional context object (e.g., system instructions, history).
     * @returns The generated text response.
     */
    generateResponse(prompt: string, context?: any): Promise<string>;
}
