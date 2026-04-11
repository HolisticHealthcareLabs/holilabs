/**
 * OpenAI-Compatible Provider Base Class
 *
 * Many inference providers (Together, Groq, Cerebras, Mistral, DeepSeek)
 * expose an OpenAI-compatible /v1/chat/completions endpoint.
 *
 * This base class implements AIProviderV2 via raw fetch against that endpoint.
 * Concrete providers only need to set baseUrl, defaultModel, and providerId.
 */

import type { AIProviderV2 } from '../provider-interface';
import type {
  ProviderChatRequest,
  ProviderChatResponse,
  ProviderStreamChunk,
  ChatMessage,
  ToolDefinition,
  ToolCall,
  TokenUsage,
} from '../types';
import logger from '@/lib/logger';

export interface OpenAICompatibleConfig {
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
  providerId: string;
  timeout?: number;
  supportsToolCalls?: boolean;
  supportsStructuredOutput?: boolean;
}

interface OAIMessage {
  role: string;
  content: string;
  tool_call_id?: string;
}

interface OAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface OAIChoice {
  index: number;
  message: {
    role: string;
    content: string | null;
    tool_calls?: Array<{
      id: string;
      type: 'function';
      function: { name: string; arguments: string };
    }>;
  };
  finish_reason: string;
}

interface OAIResponse {
  id: string;
  model: string;
  choices: OAIChoice[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export class OpenAICompatibleProvider implements AIProviderV2 {
  readonly providerId: string;
  readonly defaultModel: string;
  readonly supportsStreaming = true;
  readonly supportsToolCalls: boolean;
  readonly supportsStructuredOutput: boolean;

  protected readonly apiKey: string;
  protected readonly baseUrl: string;
  protected readonly timeout: number;

  constructor(config: OpenAICompatibleConfig) {
    if (!config.apiKey) {
      throw new Error(`${config.providerId} API key is required`);
    }
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.defaultModel = config.defaultModel;
    this.providerId = config.providerId;
    this.timeout = config.timeout ?? 60_000;
    this.supportsToolCalls = config.supportsToolCalls ?? true;
    this.supportsStructuredOutput = config.supportsStructuredOutput ?? false;
  }

  async chat(request: ProviderChatRequest): Promise<ProviderChatResponse> {
    const model = request.model ?? this.defaultModel;
    const body: Record<string, unknown> = {
      model,
      messages: toOAIMessages(request.messages, request.systemPrompt),
      ...(request.maxTokens != null && { max_tokens: request.maxTokens }),
      ...(request.temperature != null && { temperature: request.temperature }),
      ...(request.responseFormat === 'json' && {
        response_format: { type: 'json_object' },
      }),
      ...request.extra,
    };

    if (request.tools?.length && this.supportsToolCalls) {
      body.tools = request.tools.map(toOAITool);
    }

    const data = await this.fetchCompletions<OAIResponse>(body);
    const choice = data.choices[0];

    const content = choice?.message?.content ?? '';
    const toolCalls = parseToolCalls(choice?.message?.tool_calls);
    const usage = parseUsage(data.usage);

    return {
      content,
      ...(toolCalls.length > 0 && { toolCalls }),
      usage,
      model: data.model || model,
      finishReason: mapFinishReason(choice?.finish_reason),
    };
  }

  async *stream(request: ProviderChatRequest): AsyncGenerator<ProviderStreamChunk> {
    const model = request.model ?? this.defaultModel;
    const body: Record<string, unknown> = {
      model,
      messages: toOAIMessages(request.messages, request.systemPrompt),
      stream: true,
      ...(request.maxTokens != null && { max_tokens: request.maxTokens }),
      ...(request.temperature != null && { temperature: request.temperature }),
      ...request.extra,
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`${this.providerId} streaming error: ${response.status} - ${errText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error(`${this.providerId}: no response body for stream`);

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const payload = trimmed.slice(6);
          if (payload === '[DONE]') {
            yield { type: 'done' };
            return;
          }

          try {
            const parsed = JSON.parse(payload);
            const delta = parsed.choices?.[0]?.delta;
            if (delta?.content) {
              yield { type: 'text_delta', content: delta.content };
            }
            if (parsed.usage) {
              yield { type: 'usage', usage: parseUsage(parsed.usage) };
            }
          } catch {
            // skip malformed SSE lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    yield { type: 'done' };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(5_000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /** @deprecated Use chat() instead. */
  async generateResponse(prompt: string, context?: any): Promise<string> {
    const response = await this.chat({
      messages: [{ role: 'user', content: prompt }],
      ...(context?.systemPrompt && { systemPrompt: context.systemPrompt }),
    });
    return response.content;
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  protected async fetchCompletions<T>(body: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const errText = await response.text();
      logger.error({
        event: `${this.providerId}_api_error`,
        status: response.status,
        error: errText,
      });
      throw new Error(`${this.providerId} API error: ${response.status} - ${errText}`);
    }

    return response.json();
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function toOAIMessages(messages: ChatMessage[], systemPrompt?: string): OAIMessage[] {
  const result: OAIMessage[] = [];
  if (systemPrompt) {
    result.push({ role: 'system', content: systemPrompt });
  }
  for (const m of messages) {
    if (m.role === 'system') {
      result.push({ role: 'system', content: m.content });
    } else if (m.role === 'tool') {
      result.push({ role: 'tool', content: m.content, tool_call_id: m.toolCallId });
    } else {
      result.push({ role: m.role, content: m.content });
    }
  }
  return result;
}

function toOAITool(tool: ToolDefinition): OAITool {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  };
}

function parseToolCalls(
  raw?: OAIChoice['message']['tool_calls'],
): ToolCall[] {
  if (!raw?.length) return [];
  return raw.map((tc) => ({
    id: tc.id,
    name: tc.function.name,
    arguments: JSON.parse(tc.function.arguments),
  }));
}

function parseUsage(
  raw?: { prompt_tokens: number; completion_tokens: number; total_tokens: number },
): TokenUsage {
  return {
    promptTokens: raw?.prompt_tokens ?? 0,
    completionTokens: raw?.completion_tokens ?? 0,
    totalTokens: raw?.total_tokens ?? 0,
  };
}

function mapFinishReason(reason?: string): ProviderChatResponse['finishReason'] {
  switch (reason) {
    case 'tool_calls':
      return 'tool_calls';
    case 'length':
      return 'length';
    case 'stop':
    default:
      return 'stop';
  }
}
