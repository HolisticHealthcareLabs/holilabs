/**
 * Groq Provider
 *
 * Ultra-low-latency inference via Groq's LPU hardware.
 * OpenAI-compatible endpoint at https://api.groq.com/openai/v1
 *
 * @see https://console.groq.com/docs/api-reference
 */

import { OpenAICompatibleProvider } from './openai-compatible-provider';

export class GroqProvider extends OpenAICompatibleProvider {
  constructor(apiKey?: string, model?: string) {
    super({
      apiKey: apiKey || process.env.GROQ_API_KEY || '',
      baseUrl: 'https://api.groq.com/openai/v1',
      defaultModel: model ?? 'llama-3.3-70b-versatile',
      providerId: 'groq',
      timeout: 30_000,
    });
  }
}
