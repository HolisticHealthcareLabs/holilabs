/**
 * Ollama Client
 * 
 * HTTP client for local Ollama server running Llama 3.1 8B.
 * Provides streaming and non-streaming inference endpoints.
 * 
 * @module sidecar/llm/ollama-client
 */

import { EventEmitter } from 'events';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface OllamaConfig {
    baseUrl: string;
    model: string;
    timeoutMs: number;
}

export interface OllamaGenerateRequest {
    model: string;
    prompt: string;
    stream?: boolean;
    options?: {
        temperature?: number;
        top_p?: number;
        num_predict?: number;
    };
    format?: 'json';
}

export interface OllamaGenerateResponse {
    model: string;
    response: string;
    done: boolean;
    context?: number[];
    total_duration?: number;
    load_duration?: number;
    prompt_eval_duration?: number;
    eval_count?: number;
    eval_duration?: number;
}

export interface OllamaHealthStatus {
    available: boolean;
    model: string;
    latencyMs?: number;
    error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OLLAMA CLIENT CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class OllamaClient extends EventEmitter {
    private config: OllamaConfig;
    private isAvailable: boolean = false;
    private lastHealthCheck: Date | null = null;

    constructor(config: Partial<OllamaConfig> = {}) {
        super();
        this.config = {
            baseUrl: config.baseUrl || 'http://localhost:11434',
            model: config.model || 'llama3.1:8b-instruct-q5_K_M',
            timeoutMs: config.timeoutMs || 30000,
        };
    }

    /**
     * Check if Ollama server is running and model is available
     */
    async healthCheck(): Promise<OllamaHealthStatus> {
        const startTime = Date.now();

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`${this.config.baseUrl}/api/tags`, {
                method: 'GET',
                signal: controller.signal,
            });

            clearTimeout(timeout);

            if (!response.ok) {
                this.isAvailable = false;
                return {
                    available: false,
                    model: this.config.model,
                    error: `Server returned ${response.status}`,
                };
            }

            const data = await response.json() as { models?: Array<{ name: string }> };
            const models = data.models || [];
            const modelInstalled = models.some(m =>
                m.name === this.config.model || m.name.startsWith(this.config.model.split(':')[0])
            );

            this.isAvailable = modelInstalled;
            this.lastHealthCheck = new Date();

            return {
                available: modelInstalled,
                model: this.config.model,
                latencyMs: Date.now() - startTime,
                error: modelInstalled ? undefined : `Model ${this.config.model} not found. Run: ollama pull ${this.config.model}`,
            };
        } catch (error) {
            this.isAvailable = false;
            return {
                available: false,
                model: this.config.model,
                error: error instanceof Error ? error.message : 'Connection failed',
            };
        }
    }

    /**
     * Generate a completion (non-streaming)
     */
    async generate(prompt: string, options?: {
        temperature?: number;
        maxTokens?: number;
        jsonMode?: boolean;
    }): Promise<{ response: string; durationMs: number }> {
        if (!this.isAvailable) {
            const health = await this.healthCheck();
            if (!health.available) {
                throw new Error(`Ollama not available: ${health.error}`);
            }
        }

        const startTime = Date.now();

        const requestBody: OllamaGenerateRequest = {
            model: this.config.model,
            prompt,
            stream: false,
            options: {
                temperature: options?.temperature ?? 0.1,
                num_predict: options?.maxTokens ?? 512,
            },
            format: options?.jsonMode ? 'json' : undefined,
        };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

        try {
            const response = await fetch(`${this.config.baseUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
                signal: controller.signal,
            });

            clearTimeout(timeout);

            if (!response.ok) {
                throw new Error(`Ollama generate failed: ${response.status}`);
            }

            const data = await response.json() as OllamaGenerateResponse;

            return {
                response: data.response,
                durationMs: Date.now() - startTime,
            };
        } catch (error) {
            clearTimeout(timeout);
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error(`Ollama request timed out after ${this.config.timeoutMs}ms`);
            }
            throw error;
        }
    }

    /**
     * Generate a completion with streaming
     */
    async *generateStream(prompt: string, options?: {
        temperature?: number;
        maxTokens?: number;
    }): AsyncGenerator<string, void, unknown> {
        if (!this.isAvailable) {
            const health = await this.healthCheck();
            if (!health.available) {
                throw new Error(`Ollama not available: ${health.error}`);
            }
        }

        const requestBody: OllamaGenerateRequest = {
            model: this.config.model,
            prompt,
            stream: true,
            options: {
                temperature: options?.temperature ?? 0.1,
                num_predict: options?.maxTokens ?? 512,
            },
        };

        const response = await fetch(`${this.config.baseUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok || !response.body) {
            throw new Error(`Ollama stream failed: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(Boolean);

                for (const line of lines) {
                    try {
                        const data = JSON.parse(line) as OllamaGenerateResponse;
                        if (data.response) {
                            yield data.response;
                        }
                    } catch {
                        // Skip malformed JSON lines
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }

    /**
     * Get current availability status
     */
    getStatus(): { available: boolean; model: string; lastCheck: Date | null } {
        return {
            available: this.isAvailable,
            model: this.config.model,
            lastCheck: this.lastHealthCheck,
        };
    }
}
