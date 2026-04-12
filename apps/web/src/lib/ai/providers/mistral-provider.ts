/**
 * Mistral Provider
 *
 * EU-hosted inference (Paris). Favorable for LGPD data residency.
 * OpenAI-compatible endpoint at https://api.mistral.ai/v1
 *
 * @see https://docs.mistral.ai/api/
 */

import { OpenAICompatibleProvider } from './openai-compatible-provider';

export class MistralProvider extends OpenAICompatibleProvider {
  constructor(apiKey?: string, model?: string) {
    super({
      apiKey: apiKey || process.env.MISTRAL_API_KEY || '',
      baseUrl: 'https://api.mistral.ai/v1',
      defaultModel: model ?? 'mistral-large-latest',
      providerId: 'mistral',
      timeout: 60_000,
    });
  }
}
