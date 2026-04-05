/**
 * Together.ai Provider
 *
 * Cloud inference using Together.ai's OpenAI-compatible endpoint.
 * Extends OpenAICompatibleProvider — all chat/stream/tool logic is inherited.
 *
 * @see https://docs.together.ai/reference/chat-completions
 */

import { OpenAICompatibleProvider } from './openai-compatible-provider';
import type { AIProvider } from '../provider-interface';
import logger from '@/lib/logger';

export interface TogetherConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  topP?: number;
  topK?: number;
  repetitionPenalty?: number;
}

const TOGETHER_API_BASE = 'https://api.together.xyz/v1';

export class TogetherProvider extends OpenAICompatibleProvider implements AIProvider {
  private togetherConfig: Required<TogetherConfig>;

  constructor(config: TogetherConfig = {}) {
    const apiKey = config.apiKey || process.env.TOGETHER_API_KEY || '';
    const model = config.model || process.env.TOGETHER_MODEL || 'mistralai/Mistral-7B-Instruct-v0.3';

    super({
      apiKey,
      baseUrl: TOGETHER_API_BASE,
      defaultModel: model,
      providerId: 'together',
      timeout: config.timeout ?? 60_000,
    });

    this.togetherConfig = {
      apiKey,
      model,
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 4096,
      timeout: config.timeout ?? 60_000,
      topP: config.topP ?? 0.95,
      topK: config.topK ?? 50,
      repetitionPenalty: config.repetitionPenalty ?? 1.0,
    };
  }

  /**
   * Check if Together.ai API is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const models = await this.listModels();
      return models.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${TOGETHER_API_BASE}/models`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) return [];

      const data = await response.json();
      return data.data?.map((m: any) => m.id) || data.map?.((m: any) => m.id) || [];
    } catch {
      return [];
    }
  }

  /**
   * Get embeddings for text
   */
  async embed(texts: string | string[]): Promise<number[][]> {
    const input = Array.isArray(texts) ? texts : [texts];

    try {
      const response = await fetch(`${TOGETHER_API_BASE}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'togethercomputer/m2-bert-80M-8k-retrieval',
          input,
        }),
        signal: AbortSignal.timeout(this.togetherConfig.timeout),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Together.ai embeddings API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      return data.data?.map((d: any) => d.embedding) || [];
    } catch (error) {
      logger.error({
        event: 'together_embed_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

/**
 * Recommended Together.ai models for clinical tasks
 */
export const TOGETHER_MODELS = {
  mistral7b: 'mistralai/Mistral-7B-Instruct-v0.3',
  llama3_8b: 'meta-llama/Meta-Llama-3-8B-Instruct',
  meditron7b: 'epfl-llm/meditron-7b',
  meditron70b: 'epfl-llm/meditron-70b',
  mixtral8x7b: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
  llama3_70b: 'meta-llama/Meta-Llama-3-70B-Instruct',
  qwen72b: 'Qwen/Qwen1.5-72B-Chat',
  codellama34b: 'codellama/CodeLlama-34b-Instruct-hf',
  embeddings: 'togethercomputer/m2-bert-80M-8k-retrieval',
} as const;

/**
 * Together.ai pricing (per 1M tokens, as of 2024)
 */
export const TOGETHER_PRICING = {
  'mistralai/Mistral-7B-Instruct-v0.3': { input: 0.2, output: 0.2 },
  'meta-llama/Meta-Llama-3-8B-Instruct': { input: 0.2, output: 0.2 },
  'mistralai/Mixtral-8x7B-Instruct-v0.1': { input: 0.6, output: 0.6 },
  'meta-llama/Meta-Llama-3-70B-Instruct': { input: 0.9, output: 0.9 },
  'epfl-llm/meditron-7b': { input: 0.2, output: 0.2 },
  'epfl-llm/meditron-70b': { input: 0.9, output: 0.9 },
} as const;
