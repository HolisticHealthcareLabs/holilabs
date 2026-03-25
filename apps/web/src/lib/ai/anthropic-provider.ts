/**
 * Anthropic Provider (Claude)
 *
 * Implements AIProviderV2 with chat, streaming, and tool-calling support.
 * Uses the official @anthropic-ai/sdk.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { AIProviderV2 } from './provider-interface';
import type {
  ProviderChatRequest,
  ProviderChatResponse,
  ProviderStreamChunk,
  ChatMessage,
  ToolDefinition,
  ToolCall,
} from './types';
import logger from '@/lib/logger';

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

export class AnthropicProvider implements AIProviderV2 {
  readonly providerId = 'claude' as const;
  readonly defaultModel: string;
  readonly supportsStreaming = true;
  readonly supportsToolCalls = true;
  readonly supportsStructuredOutput = true;

  private client: Anthropic;

  constructor(apiKey: string, model?: string) {
    if (!apiKey) {
      throw new Error('Anthropic API Key is required');
    }
    this.client = new Anthropic({ apiKey });
    this.defaultModel = model ?? DEFAULT_MODEL;
  }

  async chat(request: ProviderChatRequest): Promise<ProviderChatResponse> {
    const model = request.model ?? this.defaultModel;
    const messages = toAnthropicMessages(request.messages);
    const system = request.systemPrompt || undefined;

    const params: Anthropic.MessageCreateParams = {
      model,
      max_tokens: request.maxTokens ?? 4096,
      messages,
      ...(system && { system }),
      ...(request.temperature != null && { temperature: request.temperature }),
    };

    if (request.tools?.length) {
      params.tools = request.tools.map(toAnthropicTool);
    }

    const msg = await this.client.messages.create(params);

    const content = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    const toolCalls: ToolCall[] = msg.content
      .filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
      .map((b) => ({
        id: b.id,
        name: b.name,
        arguments: b.input as Record<string, unknown>,
      }));

    return {
      content,
      ...(toolCalls.length > 0 && { toolCalls }),
      usage: {
        promptTokens: msg.usage.input_tokens,
        completionTokens: msg.usage.output_tokens,
        totalTokens: msg.usage.input_tokens + msg.usage.output_tokens,
      },
      model: msg.model,
      finishReason: msg.stop_reason === 'tool_use' ? 'tool_calls' : 'stop',
    };
  }

  async *stream(request: ProviderChatRequest): AsyncGenerator<ProviderStreamChunk> {
    const model = request.model ?? this.defaultModel;
    const messages = toAnthropicMessages(request.messages);
    const system = request.systemPrompt || undefined;

    const params: Anthropic.MessageCreateParams = {
      model,
      max_tokens: request.maxTokens ?? 4096,
      messages,
      stream: true,
      ...(system && { system }),
      ...(request.temperature != null && { temperature: request.temperature }),
    };

    if (request.tools?.length) {
      params.tools = request.tools.map(toAnthropicTool);
    }

    const stream = this.client.messages.stream(params as any);

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const delta = event.delta as any;
        if (delta.type === 'text_delta') {
          yield { type: 'text_delta', content: delta.text };
        }
      }
    }

    const finalMessage = await stream.finalMessage();
    yield {
      type: 'usage',
      usage: {
        promptTokens: finalMessage.usage.input_tokens,
        completionTokens: finalMessage.usage.output_tokens,
        totalTokens: finalMessage.usage.input_tokens + finalMessage.usage.output_tokens,
      },
    };
    yield { type: 'done' };
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.messages.create({
        model: this.defaultModel,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }],
      });
      return true;
    } catch {
      return false;
    }
  }

  /** @deprecated Use chat() instead. Kept for backward compatibility. */
  async generateResponse(prompt: string, context?: any): Promise<string> {
    const response = await this.chat({
      messages: [{ role: 'user', content: prompt }],
      ...(context?.systemPrompt && { systemPrompt: context.systemPrompt }),
    });
    return response.content;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function toAnthropicMessages(
  messages: ChatMessage[],
): Anthropic.MessageParam[] {
  return messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));
}

function toAnthropicTool(tool: ToolDefinition): Anthropic.Tool {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters as Anthropic.Tool['input_schema'],
  };
}
