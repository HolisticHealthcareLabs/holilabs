/**
 * Provider Availability Cache
 *
 * Tracks AI provider health status to enable smart routing:
 * - Circuit breaker pattern: Temporarily disable failing providers
 * - Proactive health checks: Verify providers before routing
 * - Distributed caching: Share availability state across instances
 *
 * Benefits:
 * - Faster failover (skip known-down providers)
 * - Reduced API errors (route around failures)
 * - Better user experience (fewer failed requests)
 */

import { Redis } from '@upstash/redis';
import { logger } from '@/lib/logger';
import type { AIProvider } from './chat';

// ============================================================================
// Types
// ============================================================================

export interface ProviderStatus {
  provider: AIProvider;
  isAvailable: boolean;
  lastChecked: number; // Unix timestamp
  consecutiveFailures: number;
  lastError?: string;
  responseTimeMs?: number;
  circuitState: 'closed' | 'open' | 'half-open';
}

export interface AvailabilityConfig {
  // Circuit breaker settings
  failureThreshold: number; // Failures before opening circuit
  resetTimeoutMs: number; // Time before trying half-open
  halfOpenSuccessThreshold: number; // Successes to close circuit

  // Health check settings
  healthCheckIntervalMs: number; // How often to check health
  healthCheckTimeoutMs: number; // Timeout for health check requests
  cacheTimeoutMs: number; // How long to cache availability status
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_CONFIG: AvailabilityConfig = {
  failureThreshold: 3,
  resetTimeoutMs: 30000, // 30 seconds
  halfOpenSuccessThreshold: 2,
  healthCheckIntervalMs: 60000, // 1 minute
  healthCheckTimeoutMs: 5000, // 5 seconds
  cacheTimeoutMs: 10000, // 10 seconds
};

const CACHE_PREFIX = 'ai:availability:';

// ============================================================================
// Redis Client
// ============================================================================

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// In-memory fallback for when Redis is not available
const memoryCache = new Map<string, { status: ProviderStatus; expires: number }>();

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Get provider availability status from cache
 */
export async function getProviderStatus(
  provider: AIProvider,
  config: Partial<AvailabilityConfig> = {}
): Promise<ProviderStatus | null> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const cacheKey = `${CACHE_PREFIX}${provider}`;

  // Try Redis first
  if (redis) {
    try {
      const cached = await redis.get<ProviderStatus>(cacheKey);
      if (cached) {
        // Check if circuit breaker needs state transition
        return updateCircuitState(cached, fullConfig);
      }
    } catch (error) {
      logger.warn({
        event: 'availability_cache_redis_error',
        provider,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Fallback to memory cache
  const memoryCached = memoryCache.get(cacheKey);
  if (memoryCached && memoryCached.expires > Date.now()) {
    return updateCircuitState(memoryCached.status, fullConfig);
  }

  return null;
}

/**
 * Update provider availability status in cache
 */
export async function setProviderStatus(
  status: ProviderStatus,
  config: Partial<AvailabilityConfig> = {}
): Promise<void> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const cacheKey = `${CACHE_PREFIX}${status.provider}`;
  const ttlSeconds = Math.ceil(fullConfig.cacheTimeoutMs / 1000);

  // Store in Redis
  if (redis) {
    try {
      await redis.setex(cacheKey, ttlSeconds, status);
    } catch (error) {
      logger.warn({
        event: 'availability_cache_redis_set_error',
        provider: status.provider,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Always store in memory cache as backup
  memoryCache.set(cacheKey, {
    status,
    expires: Date.now() + fullConfig.cacheTimeoutMs,
  });
}

/**
 * Record a successful request to a provider
 */
export async function recordSuccess(
  provider: AIProvider,
  responseTimeMs: number,
  config: Partial<AvailabilityConfig> = {}
): Promise<void> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const currentStatus = await getProviderStatus(provider, config);

  const newStatus: ProviderStatus = {
    provider,
    isAvailable: true,
    lastChecked: Date.now(),
    consecutiveFailures: 0,
    responseTimeMs,
    circuitState: 'closed',
  };

  // If we were in half-open state, check if we should close the circuit
  if (currentStatus?.circuitState === 'half-open') {
    const successCount = (currentStatus.consecutiveFailures || 0) + 1;
    if (successCount >= fullConfig.halfOpenSuccessThreshold) {
      newStatus.circuitState = 'closed';
      logger.info({
        event: 'circuit_breaker_closed',
        provider,
        successCount,
      });
    } else {
      newStatus.circuitState = 'half-open';
      newStatus.consecutiveFailures = -successCount; // Negative to track successes in half-open
    }
  }

  await setProviderStatus(newStatus, config);
}

/**
 * Record a failed request to a provider
 */
export async function recordFailure(
  provider: AIProvider,
  error: string,
  config: Partial<AvailabilityConfig> = {}
): Promise<void> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const currentStatus = await getProviderStatus(provider, config);

  const consecutiveFailures = (currentStatus?.consecutiveFailures || 0) + 1;

  // Determine circuit state
  let circuitState: ProviderStatus['circuitState'] = 'closed';
  let isAvailable = true;

  if (consecutiveFailures >= fullConfig.failureThreshold) {
    circuitState = 'open';
    isAvailable = false;
    logger.warn({
      event: 'circuit_breaker_opened',
      provider,
      consecutiveFailures,
      error,
    });
  }

  const newStatus: ProviderStatus = {
    provider,
    isAvailable,
    lastChecked: Date.now(),
    consecutiveFailures,
    lastError: error,
    circuitState,
  };

  await setProviderStatus(newStatus, config);
}

/**
 * Update circuit breaker state based on time
 */
function updateCircuitState(
  status: ProviderStatus,
  config: AvailabilityConfig
): ProviderStatus {
  if (status.circuitState !== 'open') {
    return status;
  }

  const timeSinceLastCheck = Date.now() - status.lastChecked;

  // Transition from open to half-open after reset timeout
  if (timeSinceLastCheck >= config.resetTimeoutMs) {
    logger.info({
      event: 'circuit_breaker_half_open',
      provider: status.provider,
      timeSinceLastCheck,
    });

    return {
      ...status,
      circuitState: 'half-open',
      isAvailable: true, // Allow one request through
    };
  }

  return status;
}

// ============================================================================
// Health Check Functions
// ============================================================================

/**
 * Check if a provider is healthy by making a minimal API call
 */
export async function checkProviderHealth(
  provider: AIProvider,
  config: Partial<AvailabilityConfig> = {}
): Promise<ProviderStatus> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const startTime = Date.now();

  try {
    const isHealthy = await performHealthCheck(provider, fullConfig.healthCheckTimeoutMs);
    const responseTimeMs = Date.now() - startTime;

    if (isHealthy) {
      await recordSuccess(provider, responseTimeMs, config);
      return {
        provider,
        isAvailable: true,
        lastChecked: Date.now(),
        consecutiveFailures: 0,
        responseTimeMs,
        circuitState: 'closed',
      };
    } else {
      await recordFailure(provider, 'Health check returned false', config);
      return {
        provider,
        isAvailable: false,
        lastChecked: Date.now(),
        consecutiveFailures: 1,
        lastError: 'Health check failed',
        circuitState: 'closed',
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await recordFailure(provider, errorMessage, config);

    return {
      provider,
      isAvailable: false,
      lastChecked: Date.now(),
      consecutiveFailures: 1,
      lastError: errorMessage,
      circuitState: 'closed',
    };
  }
}

/**
 * Perform the actual health check for a provider
 */
async function performHealthCheck(
  provider: AIProvider,
  timeoutMs: number
): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    switch (provider) {
      case 'gemini':
        return await checkGeminiHealth(controller.signal);
      case 'claude':
        return await checkClaudeHealth(controller.signal);
      case 'openai':
        return await checkOpenAIHealth(controller.signal);
      default:
        return false;
    }
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Check Gemini API health
 */
async function checkGeminiHealth(signal: AbortSignal): Promise<boolean> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return false;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    { method: 'GET', signal }
  );

  return response.ok;
}

/**
 * Check Claude API health
 */
async function checkClaudeHealth(signal: AbortSignal): Promise<boolean> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return false;

  // Claude doesn't have a dedicated health endpoint, so we check if the API responds
  // Using a minimal request that will fail fast if there's an issue
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307', // Use cheapest model for health check
      max_tokens: 1,
      messages: [{ role: 'user', content: 'hi' }],
    }),
    signal,
  });

  // 200 = success, 400 = bad request (but API is up), 401 = auth issue
  // Only 5xx or network errors indicate the service is down
  return response.status < 500;
}

/**
 * Check OpenAI API health
 */
async function checkOpenAIHealth(signal: AbortSignal): Promise<boolean> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return false;

  const response = await fetch('https://api.openai.com/v1/models', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    signal,
  });

  return response.ok;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get all available providers (circuit not open)
 */
export async function getAvailableProviders(
  config: Partial<AvailabilityConfig> = {}
): Promise<AIProvider[]> {
  const providers: AIProvider[] = ['gemini', 'claude', 'openai'];
  const available: AIProvider[] = [];

  for (const provider of providers) {
    const status = await getProviderStatus(provider, config);

    // Include if no status (unknown) or circuit is not open
    if (!status || status.circuitState !== 'open') {
      available.push(provider);
    }
  }

  return available;
}

/**
 * Get the best available provider based on response time
 */
export async function getBestAvailableProvider(
  preferredOrder: AIProvider[] = ['gemini', 'claude', 'openai'],
  config: Partial<AvailabilityConfig> = {}
): Promise<AIProvider | null> {
  for (const provider of preferredOrder) {
    const status = await getProviderStatus(provider, config);

    // Use provider if:
    // 1. No cached status (unknown)
    // 2. Circuit is closed or half-open
    if (!status || status.circuitState !== 'open') {
      return provider;
    }
  }

  // All circuits are open - return first one in half-open state
  for (const provider of preferredOrder) {
    const status = await getProviderStatus(provider, config);
    if (status?.circuitState === 'half-open') {
      return provider;
    }
  }

  // All providers completely down - return primary as last resort
  logger.error({
    event: 'all_providers_unavailable',
    providers: preferredOrder,
  });

  return preferredOrder[0] || null;
}

/**
 * Clear all availability cache
 */
export async function clearAvailabilityCache(): Promise<void> {
  // Clear memory cache
  for (const key of memoryCache.keys()) {
    if (key.startsWith(CACHE_PREFIX)) {
      memoryCache.delete(key);
    }
  }

  // Clear Redis cache
  if (redis) {
    try {
      const keys = await redis.keys(`${CACHE_PREFIX}*`);
      if (keys && Array.isArray(keys) && keys.length > 0) {
        await Promise.all(keys.map(key => redis.del(key)));
      }
    } catch (error) {
      logger.warn({
        event: 'availability_cache_clear_error',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

/**
 * Get availability status for all providers
 */
export async function getAllProviderStatuses(
  config: Partial<AvailabilityConfig> = {}
): Promise<Record<AIProvider, ProviderStatus | null>> {
  const providers: AIProvider[] = ['gemini', 'claude', 'openai'];
  const statuses: Record<AIProvider, ProviderStatus | null> = {
    gemini: null,
    claude: null,
    openai: null,
  };

  for (const provider of providers) {
    statuses[provider] = await getProviderStatus(provider, config);
  }

  return statuses;
}
