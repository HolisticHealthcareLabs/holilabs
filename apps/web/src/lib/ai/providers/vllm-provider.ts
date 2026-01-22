/**
 * vLLM Provider
 *
 * Self-hosted inference using vLLM for high-throughput production.
 * Uses OpenAI-compatible API endpoint.
 *
 * @see https://docs.vllm.ai/
 * @see https://docs.vllm.ai/en/latest/serving/openai_compatible_server.html
 */

import { AIProvider } from '../provider-interface';
import logger from '@/lib/logger';

export interface VLLMConfig {
  baseUrl?: string;
  model?: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  topP?: number;
}

const DEFAULT_CONFIG: Required<VLLMConfig> = {
  baseUrl: process.env.VLLM_BASE_URL || 'http://localhost:8000',
  model: process.env.VLLM_MODEL || 'mistralai/Mistral-7B-Instruct-v0.3',
  apiKey: process.env.VLLM_API_KEY || '',
  temperature: 0.7,
  maxTokens: 4096,
  timeout: 60000,
  topP: 0.95,
};

export class VLLMProvider implements AIProvider {
  private config: Required<VLLMConfig>;

  constructor(config: VLLMConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async generateResponse(prompt: string, context?: any): Promise<string> {
    const { baseUrl, model, apiKey, temperature, maxTokens, timeout, topP } = this.config;

    try {
      const systemPrompt = context?.systemPrompt || '';
      const messages: Array<{ role: string; content: string }> = [];

      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          top_p: topP,
        }),
        signal: AbortSignal.timeout(timeout),
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error({
          event: 'vllm_api_error',
          status: response.status,
          error,
        });
        throw new Error(`vLLM API error: ${response.status} - ${error}`);
      }

      const data = await response.json();

      logger.debug({
        event: 'vllm_response',
        model,
        usage: data.usage,
      });

      return data.choices?.[0]?.message?.content || '';
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        logger.error({
          event: 'vllm_timeout',
          model,
          timeout,
        });
        throw new Error(`vLLM request timed out after ${timeout}ms`);
      }

      logger.error({
        event: 'vllm_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Check if vLLM server is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * List available models on the vLLM server
   */
  async listModels(): Promise<string[]> {
    try {
      const headers: Record<string, string> = {};
      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const response = await fetch(`${this.config.baseUrl}/v1/models`, {
        headers,
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.data?.map((m: any) => m.id) || [];
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
    const { baseUrl, model, apiKey, temperature, maxTokens, timeout, topP } = this.config;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          top_p: topP,
        }),
        signal: AbortSignal.timeout(timeout),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`vLLM chat API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    } catch (error) {
      logger.error({
        event: 'vllm_chat_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get completion (non-chat format)
   */
  async complete(prompt: string): Promise<string> {
    const { baseUrl, model, apiKey, temperature, maxTokens, timeout, topP } = this.config;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(`${baseUrl}/v1/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          prompt,
          temperature,
          max_tokens: maxTokens,
          top_p: topP,
        }),
        signal: AbortSignal.timeout(timeout),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`vLLM completion API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.text || '';
    } catch (error) {
      logger.error({
        event: 'vllm_complete_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

/**
 * Recommended vLLM models for clinical tasks
 */
export const VLLM_MODELS = {
  // General purpose
  mistral7b: 'mistralai/Mistral-7B-Instruct-v0.3',
  llama3_8b: 'meta-llama/Meta-Llama-3-8B-Instruct',

  // Medical-focused
  meditron: 'epfl-llm/meditron-7b',
  meditron7b: 'epfl-llm/meditron-7b',
  biomistral7b: 'BioMistral/BioMistral-7B',

  // Larger models (if GPU allows)
  mistral8x7b: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
  llama3_70b: 'meta-llama/Meta-Llama-3-70B-Instruct',
} as const;
