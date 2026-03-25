/**
 * AI Providers
 *
 * Central export for all AI provider implementations.
 * Local: Ollama, vLLM
 * Cloud (OpenAI-compatible): Together, Groq, Cerebras, Mistral, DeepSeek
 */

// ── Base class ───────────────────────────────────────────────────────────────
export {
  OpenAICompatibleProvider,
  type OpenAICompatibleConfig,
} from './openai-compatible-provider';

// ── Local inference ──────────────────────────────────────────────────────────
export {
  OllamaProvider,
  OLLAMA_MODELS,
  type OllamaConfig,
} from './ollama-provider';

export {
  VLLMProvider,
  VLLM_MODELS,
  type VLLMConfig,
} from './vllm-provider';

// ── Cloud inference ──────────────────────────────────────────────────────────
export {
  TogetherProvider,
  TOGETHER_MODELS,
  TOGETHER_PRICING,
  type TogetherConfig,
} from './together-provider';

export { GroqProvider } from './groq-provider';
export { CerebrasProvider } from './cerebras-provider';
export { MistralProvider } from './mistral-provider';
export { DeepSeekProvider } from './deepseek-provider';

// ── Task-based router ────────────────────────────────────────────────────────
export {
  TaskRouter,
  selectModelForTask,
  type AITask,
  type ModelSelection,
  type TaskRouterConfig,
} from './task-router';
