/**
 * Together.ai Provider
 *
 * Cloud inference using Together.ai for scalable model serving.
 * Supports open-source models with enterprise-grade reliability.
 *
 * @see https://together.ai/
 * @see https://docs.together.ai/reference/chat-completions
 */

import { AIProvider } from '../provider-interface';
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

const DEFAULT_CONFIG: Required<TogetherConfig> = {
  apiKey: process.env.TOGETHER_API_KEY || '',
  model: process.env.TOGETHER_MODEL || 'mistralai/Mistral-7B-Instruct-v0.3',
  temperature: 0.7,
  maxTokens: 4096,
  timeout: 60000,
  topP: 0.95,
  topK: 50,
  repetitionPenalty: 1.0,
};

const TOGETHER_API_BASE = 'https://api.together.xyz/v1';

export class TogetherProvider implements AIProvider {
  private config: Required<TogetherConfig>;

  constructor(config: TogetherConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (!this.config.apiKey) {
      throw new Error('Together.ai API key is required (set TOGETHER_API_KEY)');
    }
  }

  async generateResponse(prompt: string, context?: any): Promise<string> {
    const { apiKey, model, temperature, maxTokens, timeout, topP, topK, repetitionPenalty } =
      this.config;

    try {
      const systemPrompt = context?.systemPrompt || '';
      const messages: Array<{ role: string; content: string }> = [];

      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const response = await fetch(`${TOGETHER_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          top_p: topP,
          top_k: topK,
          repetition_penalty: repetitionPenalty,
        }),
        signal: AbortSignal.timeout(timeout),
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error({
          event: 'together_api_error',
          status: response.status,
          error,
        });
        throw new Error(`Together.ai API error: ${response.status} - ${error}`);
      }

      const data = await response.json();

      logger.debug({
        event: 'together_response',
        model,
        usage: data.usage,
      });

      return data.choices?.[0]?.message?.content || '';
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        logger.error({
          event: 'together_timeout',
          model,
          timeout,
        });
        throw new Error(`Together.ai request timed out after ${timeout}ms`);
      }

      logger.error({
        event: 'together_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
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
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.data?.map((m: any) => m.id) || data.map?.((m: any) => m.id) || [];
    } catch {
      return [];
    }
  }

  /**
   * Chat with conversation history
   */
  async chat(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    context?: any
  ): Promise<string> {
    const { apiKey, model, temperature, maxTokens, timeout, topP, topK, repetitionPenalty } =
      this.config;

    try {
      const response = await fetch(`${TOGETHER_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          top_p: topP,
          top_k: topK,
          repetition_penalty: repetitionPenalty,
        }),
        signal: AbortSignal.timeout(timeout),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Together.ai chat API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    } catch (error) {
      logger.error({
        event: 'together_chat_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get embeddings for text
   */
  async embed(texts: string | string[]): Promise<number[][]> {
    const { apiKey, timeout } = this.config;
    const input = Array.isArray(texts) ? texts : [texts];

    try {
      const response = await fetch(`${TOGETHER_API_BASE}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'togethercomputer/m2-bert-80M-8k-retrieval',
          input,
        }),
        signal: AbortSignal.timeout(timeout),
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
  // Fast, cost-effective
  mistral7b: 'mistralai/Mistral-7B-Instruct-v0.3',
  llama3_8b: 'meta-llama/Meta-Llama-3-8B-Instruct',

  // Medical-focused
  meditron7b: 'epfl-llm/meditron-7b',
  meditron70b: 'epfl-llm/meditron-70b',

  // High performance
  mixtral8x7b: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
  llama3_70b: 'meta-llama/Meta-Llama-3-70B-Instruct',
  qwen72b: 'Qwen/Qwen1.5-72B-Chat',

  // Code-focused
  codellama34b: 'codellama/CodeLlama-34b-Instruct-hf',

  // Embeddings
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
