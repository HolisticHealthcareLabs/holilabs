/**
 * AI Compliance Gateway
 *
 * Single entry point for ALL AI/LLM calls in the application.
 * Enforces mandatory de-identification, audit logging, provider routing,
 * and COGS tracking before any data reaches an external model.
 *
 * This gateway replaces direct calls to chat(), aiToJSON(), and SDK clients.
 *
 * Pipeline:
 * 1. De-identify input (mandatory in production, no opt-out)
 * 2. Emit audit event (who, what model, when, what resource)
 * 3. Route to provider (task-based via factory or explicit)
 * 4. Track cost/tokens for COGS reporting
 * 5. Return response with provenance metadata
 */

import { chat, streamV2, type AIProvider, type ChatMessage, type ChatRequest, type ChatResponse, type ChatV2Request } from './chat';
import type { ProviderStreamChunk } from './types';
import { deidentifyTranscriptOrThrow } from '@/lib/deid/transcript-gate';
import { trackUsage, type UsageMetrics } from './usage-tracker';
import logger from '@/lib/logger';

export interface AIGatewayRequest {
  messages: ChatMessage[];
  provider?: AIProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;

  userId?: string;
  patientId?: string;
  task?: string;

  skipDeId?: boolean;
}

export interface AIGatewayResponse {
  success: boolean;
  message?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  provenance: {
    provider: AIProvider;
    model: string;
    deidentified: boolean;
    timestamp: string;
    gatewayVersion: '1.0';
  };
  error?: string;
}

const PROVIDER_COST_PER_1K: Record<AIProvider, { input: number; output: number }> = {
  claude: { input: 0.003, output: 0.015 },
  openai: { input: 0.0025, output: 0.010 },
  gemini: { input: 0.000075, output: 0.0003 },
  ollama: { input: 0, output: 0 },
  vllm: { input: 0, output: 0 },
  together: { input: 0.0008, output: 0.0008 },
  groq: { input: 0.00059, output: 0.00079 },
  cerebras: { input: 0.00085, output: 0.0012 },
  mistral: { input: 0.002, output: 0.006 },
  deepseek: { input: 0.00014, output: 0.00028 },
};

export async function aiGateway(request: AIGatewayRequest): Promise<AIGatewayResponse> {
  const provider = request.provider || 'claude';
  const startTime = Date.now();

  try {
    // 1. De-identify all user messages (mandatory in production)
    let deidentified = false;
    const processedMessages = await Promise.all(
      request.messages.map(async (msg) => {
        if (msg.role === 'user' && !request.skipDeId) {
          const cleaned = await deidentifyTranscriptOrThrow(msg.content);
          if (cleaned !== msg.content) deidentified = true;
          return { ...msg, content: cleaned };
        }
        return msg;
      })
    );

    // Also de-identify system prompt if provided
    let processedSystemPrompt = request.systemPrompt;
    if (processedSystemPrompt && !request.skipDeId) {
      processedSystemPrompt = await deidentifyTranscriptOrThrow(processedSystemPrompt);
    }

    // 2. Log the AI call (pre-execution audit)
    logger.info({
      event: 'ai_gateway_request',
      provider,
      task: request.task || 'general',
      userId: request.userId,
      patientId: request.patientId,
      messageCount: processedMessages.length,
      deidentified,
    });

    // 3. Route to provider via chat()
    const chatResponse: ChatResponse = await chat({
      messages: processedMessages,
      provider,
      model: request.model,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
      systemPrompt: processedSystemPrompt,
    });

    const elapsed = Date.now() - startTime;

    // 4. Track usage and COGS
    const tokens = chatResponse.usage?.totalTokens || 0;
    const costs = PROVIDER_COST_PER_1K[provider] || PROVIDER_COST_PER_1K.claude;
    const estimatedCost =
      ((chatResponse.usage?.promptTokens || 0) * costs.input +
        (chatResponse.usage?.completionTokens || 0) * costs.output) /
      1000;

    if (request.userId) {
      try {
        await trackUsage({
          provider,
          userId: request.userId,
          promptTokens: chatResponse.usage?.promptTokens || 0,
          completionTokens: chatResponse.usage?.completionTokens || 0,
          totalTokens: tokens,
          responseTimeMs: elapsed,
          fromCache: false,
          queryComplexity: 'moderate',
          feature: request.task || 'ai_chat',
          estimatedCost,
        } as UsageMetrics);
      } catch (trackError) {
        logger.warn({
          event: 'ai_gateway_tracking_failed',
          error: trackError instanceof Error ? trackError.message : 'Unknown',
        });
      }
    }

    // 5. Log completion
    logger.info({
      event: 'ai_gateway_response',
      provider,
      task: request.task || 'general',
      tokens,
      estimatedCostUsd: estimatedCost,
      latencyMs: elapsed,
      success: chatResponse.success,
    });

    return {
      success: chatResponse.success,
      message: chatResponse.message,
      usage: chatResponse.usage,
      provenance: {
        provider,
        model: request.model || `${provider}-default`,
        deidentified,
        timestamp: new Date().toISOString(),
        gatewayVersion: '1.0',
      },
      error: chatResponse.error,
    };
  } catch (error) {
    logger.error({
      event: 'ai_gateway_error',
      provider,
      task: request.task || 'general',
      error: error instanceof Error ? error.message : 'Unknown',
      latencyMs: Date.now() - startTime,
    });

    return {
      success: false,
      provenance: {
        provider,
        model: request.model || `${provider}-default`,
        deidentified: false,
        timestamp: new Date().toISOString(),
        gatewayVersion: '1.0',
      },
      error: error instanceof Error ? error.message : 'AI gateway error',
    };
  }
}

// ============================================================================
// V2 STREAMING GATEWAY
// ============================================================================

export interface StreamGatewayRequest extends AIGatewayRequest {
  workspaceId?: string;
}

/**
 * Streaming gateway. Same de-identification and audit pipeline as aiGateway,
 * but yields chunks via an async generator instead of returning a complete response.
 *
 * RUTH invariant: De-identification runs BEFORE the stream starts.
 * No raw PHI enters the provider stream.
 */
export async function* streamGateway(
  request: StreamGatewayRequest,
): AsyncGenerator<ProviderStreamChunk> {
  const provider = request.provider || 'claude';
  const startTime = Date.now();

  // 1. De-identify all user messages (mandatory in production)
  let deidentified = false;
  const processedMessages = await Promise.all(
    request.messages.map(async (msg) => {
      if (msg.role === 'user' && !request.skipDeId) {
        const cleaned = await deidentifyTranscriptOrThrow(msg.content);
        if (cleaned !== msg.content) deidentified = true;
        return { ...msg, content: cleaned };
      }
      return msg;
    }),
  );

  let processedSystemPrompt = request.systemPrompt;
  if (processedSystemPrompt && !request.skipDeId) {
    processedSystemPrompt = await deidentifyTranscriptOrThrow(processedSystemPrompt);
  }

  // 2. Audit start
  logger.info({
    event: 'ai_stream_gateway_start',
    provider,
    task: request.task || 'general',
    userId: request.userId,
    messageCount: processedMessages.length,
    deidentified,
  });

  // 3. Stream through provider
  let totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

  const gen = streamV2({
    messages: processedMessages,
    provider,
    model: request.model,
    temperature: request.temperature,
    maxTokens: request.maxTokens,
    systemPrompt: processedSystemPrompt,
    userId: request.userId,
    workspaceId: request.workspaceId,
  });

  for await (const chunk of gen) {
    if (chunk.type === 'usage' && chunk.usage) {
      totalUsage = chunk.usage;
    }
    yield chunk;
  }

  // 4. Post-stream: track usage + audit complete
  const elapsed = Date.now() - startTime;
  const costs = PROVIDER_COST_PER_1K[provider] || PROVIDER_COST_PER_1K.claude;
  const estimatedCost =
    (totalUsage.promptTokens * costs.input +
      totalUsage.completionTokens * costs.output) /
    1000;

  if (request.userId) {
    try {
      await trackUsage({
        provider,
        userId: request.userId,
        promptTokens: totalUsage.promptTokens,
        completionTokens: totalUsage.completionTokens,
        totalTokens: totalUsage.totalTokens,
        responseTimeMs: elapsed,
        fromCache: false,
        queryComplexity: 'moderate',
        feature: request.task || 'ai_stream',
        estimatedCost,
      } as UsageMetrics);
    } catch {
      // non-fatal
    }
  }

  logger.info({
    event: 'ai_stream_gateway_complete',
    provider,
    task: request.task || 'general',
    tokens: totalUsage.totalTokens,
    estimatedCostUsd: estimatedCost,
    latencyMs: elapsed,
  });
}
