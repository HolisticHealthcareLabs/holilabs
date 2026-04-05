/**
 * AI Provider Interfaces
 *
 * V1: Legacy single-method interface (generateResponse).
 * V2: Full contract for chat, streaming, tool calls, structured output.
 *
 * All new providers should implement AIProviderV2.
 * Existing callers using AIProvider continue to work — V2 providers
 * expose generateResponse() as a backward-compatible wrapper.
 */

import type {
  ProviderChatRequest,
  ProviderChatResponse,
  ProviderStreamChunk,
} from './types';

// ── V1 (Legacy) ─────────────────────────────────────────────────────────────

/**
 * @deprecated Implement AIProviderV2 instead. This interface is retained
 * for backward compatibility with existing callers.
 */
export interface AIProvider {
  generateResponse(prompt: string, context?: any): Promise<string>;
}

// ── V2 ───────────────────────────────────────────────────────────────────────

/**
 * Full provider contract. Every new provider implements this.
 *
 * `stream` and `healthCheck` are optional — providers that don't support
 * streaming simply omit the method, and callers check `supportsStreaming`.
 */
export interface AIProviderV2 {
  readonly providerId: string;
  readonly defaultModel: string;
  readonly supportsStreaming: boolean;
  readonly supportsToolCalls: boolean;
  readonly supportsStructuredOutput: boolean;

  /** Send a chat request and receive a complete response. */
  chat(request: ProviderChatRequest): Promise<ProviderChatResponse>;

  /** Stream a chat response as an async generator of chunks. */
  stream?(request: ProviderChatRequest): AsyncGenerator<ProviderStreamChunk>;

  /** Lightweight health check for circuit-breaker probes. */
  healthCheck?(): Promise<boolean>;

  /**
   * @deprecated Backward-compatible bridge for callers using the V1 interface.
   * Implementations should delegate to `this.chat(...)`.
   */
  generateResponse(prompt: string, context?: any): Promise<string>;
}

// ── Adapter ──────────────────────────────────────────────────────────────────

/**
 * Wraps a legacy AIProvider so it satisfies the AIProviderV2 contract.
 * Used by the factory when a provider hasn't been migrated yet.
 */
export class LegacyProviderAdapter implements AIProviderV2 {
  readonly providerId: string;
  readonly defaultModel: string;
  readonly supportsStreaming = false;
  readonly supportsToolCalls = false;
  readonly supportsStructuredOutput = false;

  constructor(
    private readonly legacy: AIProvider,
    providerId: string,
    defaultModel: string,
  ) {
    this.providerId = providerId;
    this.defaultModel = defaultModel;
  }

  async chat(request: ProviderChatRequest): Promise<ProviderChatResponse> {
    const lastUserMessage = [...request.messages]
      .reverse()
      .find((m) => m.role === 'user');
    const prompt = lastUserMessage?.content ?? '';

    const content = await this.legacy.generateResponse(prompt, {
      systemPrompt: request.systemPrompt,
    });

    return {
      content,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      model: request.model ?? this.defaultModel,
      finishReason: 'stop',
    };
  }

  async generateResponse(prompt: string, context?: any): Promise<string> {
    return this.legacy.generateResponse(prompt, context);
  }
}
