/**
 * Ollama Provider
 *
 * Local inference using Ollama for privacy-preserving AI.
 * Best for: transcript summarization, fast local inference
 *
 * @see https://ollama.ai/
 * @see https://github.com/ollama/ollama/blob/main/docs/api.md
 */

import { AIProvider } from '../provider-interface';
import logger from '@/lib/logger';

export interface OllamaConfig {
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

const DEFAULT_CONFIG: Required<OllamaConfig> = {
  baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  model: process.env.OLLAMA_MODEL || 'phi3',
  temperature: 0.7,
  maxTokens: 4096,
  timeout: 30000,
};

export class OllamaProvider implements AIProvider {
  private config: Required<OllamaConfig>;

  constructor(config: OllamaConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async generateResponse(prompt: string, context?: any): Promise<string> {
    const { baseUrl, model, temperature, maxTokens, timeout } = this.config;

    try {
      const systemPrompt = context?.systemPrompt || '';
      const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

      const response = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt: fullPrompt,
          stream: false,
          options: {
            temperature,
            num_predict: maxTokens,
          },
        }),
        signal: AbortSignal.timeout(timeout),
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error({
          event: 'ollama_api_error',
          status: response.status,
          error,
        });
        throw new Error(`Ollama API error: ${response.status} - ${error}`);
      }

      const data = await response.json();

      logger.debug({
        event: 'ollama_response',
        model,
        promptTokens: data.prompt_eval_count,
        responseTokens: data.eval_count,
        totalDuration: data.total_duration,
      });

      return data.response || '';
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        logger.error({
          event: 'ollama_timeout',
          model,
          timeout,
        });
        throw new Error(`Ollama request timed out after ${timeout}ms`);
      }

      logger.error({
        event: 'ollama_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Check if Ollama is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch {
      return [];
    }
  }

  /**
   * Chat with conversation history (Ollama chat API)
   */
  async chat(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    context?: any
  ): Promise<string> {
    const { baseUrl, model, temperature, maxTokens, timeout } = this.config;

    try {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          stream: false,
          options: {
            temperature,
            num_predict: maxTokens,
          },
        }),
        signal: AbortSignal.timeout(timeout),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ollama chat API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      return data.message?.content || '';
    } catch (error) {
      logger.error({
        event: 'ollama_chat_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

/**
 * Recommended Ollama models for clinical tasks
 */
export const OLLAMA_MODELS = {
  // Fast, general purpose
  phi3: 'phi3',
  phi3Mini: 'phi3:mini',

  // Medical-focused (if available)
  meditron: 'meditron:7b',
  biomistral: 'biomistral:7b',

  // Larger, more capable
  mistral: 'mistral:7b',
  llama3: 'llama3:8b',
  codellama: 'codellama:7b',
} as const;
