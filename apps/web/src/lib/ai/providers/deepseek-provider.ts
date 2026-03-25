/**
 * DeepSeek Provider
 *
 * Cost-effective reasoning and coding models.
 * OpenAI-compatible endpoint at https://api.deepseek.com
 *
 * WARNING: Data residency is CN (China). RUTH veto applies —
 * LGPD Art. 33 cross-border consent must be verified by the router
 * before routing any patient data to this provider.
 *
 * @see https://platform.deepseek.com/api-docs
 */

import { OpenAICompatibleProvider } from './openai-compatible-provider';

export class DeepSeekProvider extends OpenAICompatibleProvider {
  constructor(apiKey?: string, model?: string) {
    super({
      apiKey: apiKey || process.env.DEEPSEEK_API_KEY || '',
      baseUrl: 'https://api.deepseek.com',
      defaultModel: model ?? 'deepseek-chat',
      providerId: 'deepseek',
      timeout: 120_000,
      supportsToolCalls: model !== 'deepseek-reasoner',
    });
  }
}
