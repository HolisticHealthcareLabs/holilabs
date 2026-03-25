import { AIProvider, AIProviderV2, LegacyProviderAdapter } from "./provider-interface";
import { GeminiProvider } from "./gemini-provider";
import { AnthropicProvider } from "./anthropic-provider";
import {
    OllamaProvider,
    VLLMProvider,
    TogetherProvider,
    GroqProvider,
    CerebrasProvider,
    MistralProvider,
    DeepSeekProvider,
} from "./providers";
import { createGeminiProvider } from "./vertex-ai-provider";
import { prisma } from "../prisma";
import { decryptPHIWithVersion } from "../security/encryption";
import logger from "@/lib/logger";
import { Redis } from "@upstash/redis";
// P2-005: Import unified types
import {
    type UnifiedAITask,
    getTaskConfig,
    prefersLocalProvider,
    getProviderForTask as getProviderTypeForTask,
} from "./types";

/**
 * Supported provider types
 */
export type ProviderType =
    | "gemini"
    | "google"
    | "anthropic"
    | "claude"
    | "ollama"
    | "vllm"
    | "together"
    | "groq"
    | "cerebras"
    | "mistral"
    | "deepseek";

// ---------------------------------------------------------------------------
// Redis cache for workspace LLM configs (encrypted blob, TTL 300s)
// ---------------------------------------------------------------------------
let _redis: Redis | null = null;
function getRedis(): Redis | null {
    if (_redis) return _redis;
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        _redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
    }
    return _redis;
}

async function getWorkspaceEncryptedKey(
    workspaceId: string,
    provider: string
): Promise<string | null> {
    const cacheKey = `workspace_llm_config:${workspaceId}:${provider}`;
    const redis = getRedis();

    if (redis) {
        try {
            const cached = await redis.get<string>(cacheKey);
            if (cached) return cached;
        } catch {
            // fall through to DB
        }
    }

    const config = await prisma.workspaceLLMConfig.findUnique({
        where: {
            workspaceId_provider: { workspaceId, provider },
            isActive: true,
        } as any,
        select: { encryptedKey: true },
    });

    if (!config) return null;

    if (redis) {
        try {
            await redis.setex(cacheKey, 300, config.encryptedKey);
        } catch {
            // cache failure is non-fatal
        }
    }

    return config.encryptedKey;
}

/**
 * Options for getProvider
 */
export interface GetProviderOptions {
    /**
     * P2-007: BYOK fail-fast option.
     * If true, throws an error when BYOK key decryption fails instead of silently
     * falling back to system provider. Use this when BYOK is required for compliance.
     * @default false
     */
    strictBYOK?: boolean;
}

/**
 * Custom error for BYOK failures
 */
export class BYOKError extends Error {
    constructor(
        message: string,
        public readonly provider: string,
        public readonly reason: 'decryption_failed' | 'key_null' | 'ownership_mismatch'
    ) {
        super(message);
        this.name = 'BYOKError';
    }
}

export class AIProviderFactory {
    /**
     * Gets the appropriate AI provider for a user.
     * Checks if the user has a BYOK key configured.
     * Defaults to Gemini (system key) if no BYOK key is found.
     *
     * @param userId The ID of the user making the request
     * @param preferredProvider Optional preference (e.g., "anthropic", "gemini", "ollama", "vllm", "together")
     * @param options Optional configuration for provider retrieval
     */
    static async getProvider(
        userId: string,
        preferredProvider?: string,
        options: GetProviderOptions & { workspaceId?: string } = {}
    ): Promise<AIProvider> {
        const { strictBYOK = false, workspaceId } = options;

        // 1. Check for local/self-hosted providers first (no API key needed)
        if (preferredProvider) {
            const localProvider = this.tryLocalProvider(preferredProvider);
            if (localProvider) {
                return localProvider;
            }
        }

        // 1b. Check workspace BYOK key (takes priority over user key)
        if (workspaceId && preferredProvider) {
            try {
                const encryptedKey = await getWorkspaceEncryptedKey(workspaceId, preferredProvider);
                if (encryptedKey) {
                    const decrypted = await decryptPHIWithVersion(encryptedKey);
                    if (decrypted) {
                        logger.info({
                            event: "ai_provider_workspace_byok_success",
                            provider: preferredProvider,
                        });
                        return this.createProvider(preferredProvider, decrypted);
                    }
                }
            } catch (err) {
                logger.warn({
                    event: "ai_provider_workspace_byok_failed",
                    provider: preferredProvider,
                    error: err instanceof Error ? err.message : String(err),
                });
                if (strictBYOK) {
                    throw new BYOKError(
                        "Workspace BYOK key decryption failed in strict mode.",
                        preferredProvider,
                        'decryption_failed'
                    );
                }
            }
        }

        // 2. Check for user-specific API keys
        const userKeys = await prisma.userAPIKey.findMany({
            where: { userId },
        });

        // 3. If user has a preferred provider and a key for it, use it (BYOK flow)
        if (preferredProvider) {
            const key = userKeys.find(k => k.provider.toLowerCase() === preferredProvider.toLowerCase());
            if (key) {
                // SECURITY: Verify key ownership via userId match (enforced by query)
                // The findMany query already filters by userId, ensuring this key belongs to the requesting user
                if (key.userId !== userId) {
                    // This should never happen if the query is correct, but defense-in-depth
                    logger.error({
                        event: "ai_provider_key_ownership_mismatch",
                        provider: preferredProvider,
                        // HIPAA: Do not log userId values
                    });
                    // P2-007: Always throw on ownership mismatch (security critical)
                    throw new BYOKError(
                        "BYOK key ownership verification failed",
                        preferredProvider,
                        'ownership_mismatch'
                    );
                }

                try {
                    const decryptedKey = await decryptPHIWithVersion(key.encryptedKey);
                    if (decryptedKey) {
                        logger.info({
                            event: "ai_provider_byok_success",
                            provider: preferredProvider,
                        });
                        return this.createProvider(preferredProvider, decryptedKey);
                    }
                    // Null decryption result - key was corrupted or invalid
                    logger.warn({
                        event: "ai_provider_key_decrypt_null",
                        provider: preferredProvider,
                    });

                    // P2-007: Fail-fast on null decryption in strict mode
                    if (strictBYOK) {
                        throw new BYOKError(
                            "BYOK key decryption returned null. Cannot use system provider in strict mode.",
                            preferredProvider,
                            'key_null'
                        );
                    }
                } catch (error) {
                    // Re-throw BYOKError without wrapping
                    if (error instanceof BYOKError) {
                        throw error;
                    }

                    logger.error({
                        event: "ai_provider_key_decrypt_failed",
                        provider: preferredProvider,
                        error: error instanceof Error ? error.message : String(error),
                    });

                    // P2-007: Fail-fast on decryption failure in strict mode
                    if (strictBYOK) {
                        throw new BYOKError(
                            "BYOK key decryption failed. Cannot use system provider in strict mode.",
                            preferredProvider,
                            'decryption_failed'
                        );
                    }
                }
                // SECURITY: Log that we're falling back from BYOK to system provider
                // This helps identify when user's intended key isn't being used
                logger.warn({
                    event: "ai_provider_byok_fallback",
                    provider: preferredProvider,
                    reason: "decryption_failed_or_null",
                });
            } else if (strictBYOK) {
                // P2-007: In strict mode, fail if user requested BYOK but has no key
                logger.error({
                    event: "ai_provider_byok_key_not_found",
                    provider: preferredProvider,
                });
                throw new BYOKError(
                    `No BYOK key found for provider ${preferredProvider}. Cannot use system provider in strict mode.`,
                    preferredProvider,
                    'key_null'
                );
            }
        }

        // 4. Try system-level providers
        // Check Together.ai first (cost-effective cloud option)
        const togetherKey = process.env.TOGETHER_API_KEY;
        if (togetherKey && (!preferredProvider || preferredProvider === "together")) {
            return new TogetherProvider({ apiKey: togetherKey });
        }

        // Then check Gemini (Google) — routes to Vertex AI or direct API based on config
        const systemGeminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
        const geminiBackend = process.env.AI_GEMINI_BACKEND;
        if (systemGeminiKey || geminiBackend === 'vertex') {
            return createGeminiProvider(systemGeminiKey);
        }

        // Finally check Anthropic
        const anthropicKey = process.env.ANTHROPIC_API_KEY;
        if (anthropicKey) {
            return new AnthropicProvider(anthropicKey);
        }

        throw new Error("No AI provider available. Configure GEMINI_API_KEY, ANTHROPIC_API_KEY, or TOGETHER_API_KEY.");
    }

    /**
     * Try to create a local/self-hosted provider (no API key needed)
     */
    private static tryLocalProvider(provider: string): AIProvider | null {
        switch (provider.toLowerCase()) {
            case "ollama":
                // Ollama runs locally, no API key needed
                // Only enable if explicitly configured via env to avoid selecting
                // localhost providers in environments where they are not running.
                if (!process.env.OLLAMA_BASE_URL && !process.env.OLLAMA_MODEL) {
                    return null;
                }
                return new OllamaProvider({
                    baseUrl: process.env.OLLAMA_BASE_URL,
                    model: process.env.OLLAMA_MODEL,
                });

            case "vllm":
                // vLLM is self-hosted, may have optional API key
                if (!process.env.VLLM_BASE_URL && !process.env.VLLM_MODEL) {
                    return null;
                }
                return new VLLMProvider({
                    baseUrl: process.env.VLLM_BASE_URL,
                    model: process.env.VLLM_MODEL,
                    apiKey: process.env.VLLM_API_KEY,
                });

            default:
                return null;
        }
    }

    /**
     * Create a provider instance with the given API key
     */
    private static createProvider(provider: string, apiKey: string): AIProvider {
        switch (provider.toLowerCase()) {
            case "gemini":
            case "google":
                return createGeminiProvider(apiKey);

            case "anthropic":
            case "claude":
                return new AnthropicProvider(apiKey);

            case "together":
                return new TogetherProvider({ apiKey });

            case "groq":
                return new GroqProvider(apiKey);

            case "cerebras":
                return new CerebrasProvider(apiKey);

            case "mistral":
                return new MistralProvider(apiKey);

            case "deepseek":
                return new DeepSeekProvider(apiKey);

            case "ollama":
                return new OllamaProvider({
                    baseUrl: process.env.OLLAMA_BASE_URL,
                    model: process.env.OLLAMA_MODEL,
                });

            case "vllm":
                return new VLLMProvider({
                    baseUrl: process.env.VLLM_BASE_URL,
                    model: process.env.VLLM_MODEL,
                    apiKey,
                });

            default:
                throw new Error(`Unsupported AI provider: ${provider}`);
        }
    }

    /**
     * Get a provider for a specific task (uses task-based routing)
     * @deprecated Use getProviderForUnifiedTask for unified task types
     */
    static async getProviderForTask(
        userId: string,
        task: "local" | "medical" | "general" | "safety-critical"
    ): Promise<AIProvider> {
        switch (task) {
            case "local":
                // Prefer local providers for privacy
                const ollamaProvider = this.tryLocalProvider("ollama");
                if (ollamaProvider) {
                    return ollamaProvider;
                }
                const vllmProvider = this.tryLocalProvider("vllm");
                if (vllmProvider) {
                    return vllmProvider;
                }
                // Fallback to cloud
                return this.getProvider(userId, "gemini");

            case "medical":
                // Prefer medical-focused models
                const togetherKey = process.env.TOGETHER_API_KEY;
                if (togetherKey) {
                    return new TogetherProvider({
                        apiKey: togetherKey,
                        model: "epfl-llm/meditron-7b",
                    });
                }
                // Fallback to Claude for accuracy
                return this.getProvider(userId, "claude");

            case "safety-critical":
                // Always use Claude for safety-critical tasks
                const anthropicKey = process.env.ANTHROPIC_API_KEY;
                if (anthropicKey) {
                    return new AnthropicProvider(anthropicKey);
                }
                // Fallback to best available
                return this.getProvider(userId);

            case "general":
            default:
                return this.getProvider(userId);
        }
    }

    /**
     * P2-005: Get a provider for a unified task type
     *
     * Uses the unified task configuration from types.ts to determine
     * the optimal provider for a given task, respecting local-first
     * preferences and fallback chains.
     *
     * @param userId The user ID for BYOK lookup
     * @param task The unified task type
     * @param options Optional provider options
     */
    static async getProviderForUnifiedTask(
        userId: string,
        task: UnifiedAITask,
        options: GetProviderOptions = {}
    ): Promise<AIProvider> {
        const config = getTaskConfig(task);

        logger.info({
            event: "ai_factory_task_routing",
            task,
            primaryProvider: config.primaryProvider,
            preferLocal: config.preferLocal,
        });

        // If task prefers local, try local providers first
        if (config.preferLocal) {
            const ollamaProvider = this.tryLocalProvider("ollama");
            if (ollamaProvider) {
                logger.info({
                    event: "ai_factory_local_provider_selected",
                    task,
                    provider: "ollama",
                });
                return ollamaProvider;
            }

            const vllmProvider = this.tryLocalProvider("vllm");
            if (vllmProvider) {
                logger.info({
                    event: "ai_factory_local_provider_selected",
                    task,
                    provider: "vllm",
                });
                return vllmProvider;
            }

            logger.info({
                event: "ai_factory_local_provider_unavailable",
                task,
                fallback: config.primaryProvider,
            });
        }

        // Use the primary provider from configuration
        return this.getProvider(userId, config.primaryProvider, options);
    }

    /**
     * Get an AIProviderV2 instance. If the resolved provider already
     * implements V2 it is returned directly; otherwise it is wrapped
     * in a LegacyProviderAdapter.
     */
    static async getProviderV2(
        userId: string,
        preferredProvider?: string,
        options: GetProviderOptions & { workspaceId?: string } = {}
    ): Promise<AIProviderV2> {
        const provider = await this.getProvider(userId, preferredProvider, options);

        // Anthropic, Gemini, Together, Groq, Cerebras, Mistral, DeepSeek
        // all implement AIProviderV2 natively now.
        if (isV2Provider(provider)) {
            return provider;
        }

        // Ollama, vLLM, VertexAI — wrapped until migrated
        const id = preferredProvider ?? 'unknown';
        return new LegacyProviderAdapter(provider, id, id);
    }
}

function isV2Provider(p: AIProvider): p is AIProviderV2 {
    return typeof (p as AIProviderV2).chat === 'function'
        && 'providerId' in p;
}

// P2-005: Re-export unified types for convenience
export { type UnifiedAITask } from "./types";
