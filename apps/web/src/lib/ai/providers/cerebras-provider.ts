/**
 * Cerebras Provider
 *
 * Wafer-Scale inference for extremely fast token generation.
 * OpenAI-compatible endpoint at https://api.cerebras.ai/v1
 *
 * @see https://inference-docs.cerebras.ai/api-reference
 */

import { OpenAICompatibleProvider } from './openai-compatible-provider';

export class CerebrasProvider extends OpenAICompatibleProvider {
  constructor(apiKey?: string, model?: string) {
    super({
      apiKey: apiKey || process.env.CEREBRAS_API_KEY || '',
      baseUrl: 'https://api.cerebras.ai/v1',
      defaultModel: model ?? 'llama-3.3-70b',
      providerId: 'cerebras',
      timeout: 30_000,
    });
  }
}
