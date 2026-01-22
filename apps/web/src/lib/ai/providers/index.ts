/**
 * AI Providers
 *
 * Central export for all AI provider implementations.
 * Supports local (Ollama), self-hosted (vLLM), and cloud (Together.ai) inference.
 */

// Ollama - Local inference
export {
  OllamaProvider,
  OLLAMA_MODELS,
  type OllamaConfig,
} from './ollama-provider';

// vLLM - Self-hosted inference
export {
  VLLMProvider,
  VLLM_MODELS,
  type VLLMConfig,
} from './vllm-provider';

// Together.ai - Cloud inference
export {
  TogetherProvider,
  TOGETHER_MODELS,
  TOGETHER_PRICING,
  type TogetherConfig,
} from './together-provider';

// Task-based router
export {
  TaskRouter,
  selectModelForTask,
  type AITask,
  type ModelSelection,
  type TaskRouterConfig,
} from './task-router';
