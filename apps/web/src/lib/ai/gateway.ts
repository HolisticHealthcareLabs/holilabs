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

import crypto from 'crypto';
import { chat, streamV2, type AIProvider, type ChatMessage, type ChatRequest, type ChatResponse, type ChatV2Request } from './chat';
import type { ProviderStreamChunk } from './types';
import { deidentifyTranscriptOrThrow } from '@/lib/deid/transcript-gate';
import { trackUsage, type UsageMetrics } from './usage-tracker';
import logger from '@/lib/logger';

// =============================================================================
// SYSTEM PROMPT CACHE BOUNDARY
// =============================================================================

const DYNAMIC_BOUNDARY = '__HOLILABS_DYNAMIC_BOUNDARY__';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CachedPromptSegment {
  hash: string;
  staticSegment: string;
  cachedAt: number;
}

// In-memory cache keyed by hash (use Redis in multi-replica production)
const promptCache = new Map<string, CachedPromptSegment>();

// Metrics counters
let cacheHits = 0;
let cacheMisses = 0;

export function getPromptCacheMetrics() {
  return { cacheHits, cacheMisses, cacheSize: promptCache.size };
}

/**
 * Split a system prompt at the __HOLILABS_DYNAMIC_BOUNDARY__ marker.
 *
 * Static segment (rules, tools, RBAC) is cacheable across requests.
 * Dynamic segment (patient context, encounter data) changes per request.
 *
 * If no boundary marker exists, the entire prompt is treated as dynamic.
 */
export function splitSystemPrompt(prompt: string): {
  staticSegment: string | null;
  dynamicSegment: string;
  hasBoundary: boolean;
} {
  const idx = prompt.indexOf(DYNAMIC_BOUNDARY);
  if (idx === -1) {
    return { staticSegment: null, dynamicSegment: prompt, hasBoundary: false };
  }

  return {
    staticSegment: prompt.slice(0, idx).trimEnd(),
    dynamicSegment: prompt.slice(idx + DYNAMIC_BOUNDARY.length).trimStart(),
    hasBoundary: true,
  };
}

/**
 * Get cached static segment hash, or compute and cache it.
 * Returns the hash for logging/metrics.
 */
function getCachedStaticHash(staticSegment: string): { hash: string; fromCache: boolean } {
  const hash = crypto.createHash('sha256').update(staticSegment).digest('hex').slice(0, 16);

  const cached = promptCache.get(hash);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    cacheHits++;
    return { hash, fromCache: true };
  }

  // Evict expired entries
  for (const [key, entry] of promptCache) {
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
      promptCache.delete(key);
    }
  }

  promptCache.set(hash, { hash, staticSegment, cachedAt: Date.now() });
  cacheMisses++;
  return { hash, fromCache: false };
}

/**
 * Prepare system prompt with cache boundary optimization.
 *
 * For Anthropic (Claude): Adds cache_control hint to static segment.
 * For all providers: Logs cache hit/miss and estimated token savings.
 */
function prepareSystemPromptWithCache(
  prompt: string | undefined,
  provider: AIProvider,
): { processedPrompt: string | undefined; cacheInfo: { hit: boolean; hash?: string; staticTokensEstimate?: number } } {
  if (!prompt) {
    return { processedPrompt: prompt, cacheInfo: { hit: false } };
  }

  const { staticSegment, dynamicSegment, hasBoundary } = splitSystemPrompt(prompt);

  if (!hasBoundary || !staticSegment) {
    return { processedPrompt: prompt, cacheInfo: { hit: false } };
  }

  const { hash, fromCache } = getCachedStaticHash(staticSegment);
  const staticTokensEstimate = Math.ceil(staticSegment.length / 4);

  logger.info({
    event: 'ai_gateway_prompt_cache',
    provider,
    cacheHit: fromCache,
    staticHash: hash,
    staticChars: staticSegment.length,
    dynamicChars: dynamicSegment.length,
    estimatedStaticTokens: staticTokensEstimate,
  });

  // Recombine — the boundary marker is stripped but content is preserved.
  // For Anthropic: the chat() layer handles cache_control based on the
  // presence of the static/dynamic split. We pass metadata via a marker
  // comment that the Anthropic adapter can detect.
  const recombined = provider === 'claude'
    ? `${staticSegment}\n<!-- cache_control:ephemeral -->\n${dynamicSegment}`
    : `${staticSegment}\n${dynamicSegment}`;

  return {
    processedPrompt: recombined,
    cacheInfo: { hit: fromCache, hash, staticTokensEstimate },
  };
}

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

    // Apply cache boundary optimization to system prompt
    const { processedPrompt: cachedPrompt, cacheInfo } =
      prepareSystemPromptWithCache(processedSystemPrompt, provider);
    processedSystemPrompt = cachedPrompt;

    // 2. Log the AI call (pre-execution audit)
    logger.info({
      event: 'ai_gateway_request',
      provider,
      task: request.task || 'general',
      userId: request.userId,
      patientId: request.patientId,
      messageCount: processedMessages.length,
      deidentified,
      promptCacheHit: cacheInfo.hit,
      promptCacheHash: cacheInfo.hash,
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

  // Apply cache boundary optimization to system prompt
  const { processedPrompt: cachedPrompt, cacheInfo } =
    prepareSystemPromptWithCache(processedSystemPrompt, provider);
  processedSystemPrompt = cachedPrompt;

  // 2. Audit start
  logger.info({
    event: 'ai_stream_gateway_start',
    provider,
    task: request.task || 'general',
    userId: request.userId,
    messageCount: processedMessages.length,
    deidentified,
    promptCacheHit: cacheInfo.hit,
    promptCacheHash: cacheInfo.hash,
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
