/**
 * Gemini Provider (Google AI)
 *
 * Implements AIProviderV2 using the @google/generative-ai SDK.
 * Default model updated to gemini-2.5-flash for cost efficiency.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIProviderV2 } from './provider-interface';
import type {
  ProviderChatRequest,
  ProviderChatResponse,
  ProviderStreamChunk,
  ChatMessage,
} from './types';
import logger from '@/lib/logger';

const DEFAULT_MODEL = 'gemini-2.5-flash';

export class GeminiProvider implements AIProviderV2 {
  readonly providerId = 'gemini' as const;
  readonly defaultModel: string;
  readonly supportsStreaming = true;
  readonly supportsToolCalls = true;
  readonly supportsStructuredOutput = true;

  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string, model?: string) {
    if (!apiKey) {
      throw new Error('Gemini API Key is required');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.defaultModel = model ?? DEFAULT_MODEL;
  }

  async chat(request: ProviderChatRequest): Promise<ProviderChatResponse> {
    const modelId = request.model ?? this.defaultModel;
    const model = this.genAI.getGenerativeModel({ model: modelId });

    const { history, lastUserContent } = toGeminiHistory(request.messages);

    const chat = model.startChat({
      history,
      ...(request.systemPrompt && {
        systemInstruction: { role: 'user', parts: [{ text: request.systemPrompt }] },
      }),
      generationConfig: {
        ...(request.maxTokens != null && { maxOutputTokens: request.maxTokens }),
        ...(request.temperature != null && { temperature: request.temperature }),
        ...(request.responseFormat === 'json' && { responseMimeType: 'application/json' }),
      },
    });

    const result = await chat.sendMessage(lastUserContent);
    const response = result.response;
    const text = response.text();

    const usage = response.usageMetadata;

    return {
      content: text,
      usage: {
        promptTokens: usage?.promptTokenCount ?? 0,
        completionTokens: usage?.candidatesTokenCount ?? 0,
        totalTokens: usage?.totalTokenCount ?? 0,
      },
      model: modelId,
      finishReason: 'stop',
    };
  }

  async *stream(request: ProviderChatRequest): AsyncGenerator<ProviderStreamChunk> {
    const modelId = request.model ?? this.defaultModel;
    const model = this.genAI.getGenerativeModel({ model: modelId });

    const { history, lastUserContent } = toGeminiHistory(request.messages);

    const chat = model.startChat({
      history,
      ...(request.systemPrompt && {
        systemInstruction: { role: 'user', parts: [{ text: request.systemPrompt }] },
      }),
      generationConfig: {
        ...(request.maxTokens != null && { maxOutputTokens: request.maxTokens }),
        ...(request.temperature != null && { temperature: request.temperature }),
      },
    });

    const result = await chat.sendMessageStream(lastUserContent);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        yield { type: 'text_delta', content: text };
      }
    }

    const aggregated = await result.response;
    const usage = aggregated.usageMetadata;
    if (usage) {
      yield {
        type: 'usage',
        usage: {
          promptTokens: usage.promptTokenCount ?? 0,
          completionTokens: usage.candidatesTokenCount ?? 0,
          totalTokens: usage.totalTokenCount ?? 0,
        },
      };
    }
    yield { type: 'done' };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.defaultModel });
      await model.generateContent('ping');
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

type GeminiContent = { role: 'user' | 'model'; parts: { text: string }[] };

function toGeminiHistory(messages: ChatMessage[]): {
  history: GeminiContent[];
  lastUserContent: string;
} {
  const converted: GeminiContent[] = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
      parts: [{ text: m.content }],
    }));

  const last = converted.pop();
  return {
    history: converted,
    lastUserContent: last?.parts[0]?.text ?? '',
  };
}
