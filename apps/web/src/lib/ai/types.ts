/**
 * Unified AI Task Types and Configuration
 *
 * P2-005: Consolidates task types from router.ts and task-router.ts
 * into a single source of truth for AI routing.
 */

/**
 * Unified AI provider types
 */
export type AIProviderType =
  | 'gemini'
  | 'claude'
  | 'openai'
  | 'ollama'
  | 'vllm'
  | 'together'
  | 'groq'
  | 'mistral'
  | 'deepseek'
  | 'cerebras';

export interface ModelInfo {
  id: string;
  provider: AIProviderType;
  displayName: string;
  contextWindow: number;
  maxOutputTokens: number;
  costPer1kInput: number;
  costPer1kOutput: number;
  supportsTools: boolean;
  supportsStreaming: boolean;
  supportsVision: boolean;
  tier: 'frontier' | 'standard' | 'economy';
  dataResidency: string[];
}

export const MODEL_CATALOG: ModelInfo[] = [
  // ── Anthropic ────────────────────────────────────────────────────────────
  { id: 'claude-opus-4-20250514', provider: 'claude', displayName: 'Claude Opus 4', contextWindow: 200_000, maxOutputTokens: 32_000, costPer1kInput: 0.015, costPer1kOutput: 0.075, supportsTools: true, supportsStreaming: true, supportsVision: true, tier: 'frontier', dataResidency: ['US'] },
  { id: 'claude-sonnet-4-20250514', provider: 'claude', displayName: 'Claude Sonnet 4', contextWindow: 200_000, maxOutputTokens: 16_000, costPer1kInput: 0.003, costPer1kOutput: 0.015, supportsTools: true, supportsStreaming: true, supportsVision: true, tier: 'frontier', dataResidency: ['US'] },
  { id: 'claude-haiku-4-5-20251001', provider: 'claude', displayName: 'Claude Haiku 4.5', contextWindow: 200_000, maxOutputTokens: 8_192, costPer1kInput: 0.0008, costPer1kOutput: 0.004, supportsTools: true, supportsStreaming: true, supportsVision: true, tier: 'economy', dataResidency: ['US'] },

  // ── OpenAI ───────────────────────────────────────────────────────────────
  { id: 'gpt-4o', provider: 'openai', displayName: 'GPT-4o', contextWindow: 128_000, maxOutputTokens: 16_384, costPer1kInput: 0.0025, costPer1kOutput: 0.010, supportsTools: true, supportsStreaming: true, supportsVision: true, tier: 'frontier', dataResidency: ['US'] },
  { id: 'gpt-4o-mini', provider: 'openai', displayName: 'GPT-4o Mini', contextWindow: 128_000, maxOutputTokens: 16_384, costPer1kInput: 0.00015, costPer1kOutput: 0.0006, supportsTools: true, supportsStreaming: true, supportsVision: true, tier: 'economy', dataResidency: ['US'] },
  { id: 'o4-mini', provider: 'openai', displayName: 'o4-mini', contextWindow: 200_000, maxOutputTokens: 100_000, costPer1kInput: 0.0011, costPer1kOutput: 0.0044, supportsTools: true, supportsStreaming: true, supportsVision: false, tier: 'frontier', dataResidency: ['US'] },

  // ── Google ───────────────────────────────────────────────────────────────
  { id: 'gemini-2.5-pro', provider: 'gemini', displayName: 'Gemini 2.5 Pro', contextWindow: 1_000_000, maxOutputTokens: 65_536, costPer1kInput: 0.00125, costPer1kOutput: 0.010, supportsTools: true, supportsStreaming: true, supportsVision: true, tier: 'frontier', dataResidency: ['US', 'EU'] },
  { id: 'gemini-2.5-flash', provider: 'gemini', displayName: 'Gemini 2.5 Flash', contextWindow: 1_000_000, maxOutputTokens: 65_536, costPer1kInput: 0.000075, costPer1kOutput: 0.0003, supportsTools: true, supportsStreaming: true, supportsVision: true, tier: 'economy', dataResidency: ['US', 'EU'] },

  // ── Groq ─────────────────────────────────────────────────────────────────
  { id: 'llama-3.3-70b-versatile', provider: 'groq', displayName: 'Llama 3.3 70B (Groq)', contextWindow: 128_000, maxOutputTokens: 32_768, costPer1kInput: 0.00059, costPer1kOutput: 0.00079, supportsTools: true, supportsStreaming: true, supportsVision: false, tier: 'economy', dataResidency: ['US'] },
  { id: 'llama-3.1-8b-instant', provider: 'groq', displayName: 'Llama 3.1 8B (Groq)', contextWindow: 128_000, maxOutputTokens: 8_192, costPer1kInput: 0.00005, costPer1kOutput: 0.00008, supportsTools: true, supportsStreaming: true, supportsVision: false, tier: 'economy', dataResidency: ['US'] },

  // ── Cerebras ─────────────────────────────────────────────────────────────
  { id: 'llama-3.3-70b', provider: 'cerebras', displayName: 'Llama 3.3 70B (Cerebras)', contextWindow: 128_000, maxOutputTokens: 8_192, costPer1kInput: 0.00085, costPer1kOutput: 0.0012, supportsTools: true, supportsStreaming: true, supportsVision: false, tier: 'economy', dataResidency: ['US'] },

  // ── Mistral ──────────────────────────────────────────────────────────────
  { id: 'mistral-large-latest', provider: 'mistral', displayName: 'Mistral Large', contextWindow: 128_000, maxOutputTokens: 8_192, costPer1kInput: 0.002, costPer1kOutput: 0.006, supportsTools: true, supportsStreaming: true, supportsVision: false, tier: 'standard', dataResidency: ['EU'] },
  { id: 'codestral-latest', provider: 'mistral', displayName: 'Codestral', contextWindow: 256_000, maxOutputTokens: 8_192, costPer1kInput: 0.0003, costPer1kOutput: 0.0009, supportsTools: true, supportsStreaming: true, supportsVision: false, tier: 'standard', dataResidency: ['EU'] },

  // ── DeepSeek ─────────────────────────────────────────────────────────────
  { id: 'deepseek-chat', provider: 'deepseek', displayName: 'DeepSeek V3', contextWindow: 128_000, maxOutputTokens: 8_192, costPer1kInput: 0.00014, costPer1kOutput: 0.00028, supportsTools: true, supportsStreaming: true, supportsVision: false, tier: 'economy', dataResidency: ['CN'] },
  { id: 'deepseek-reasoner', provider: 'deepseek', displayName: 'DeepSeek R1', contextWindow: 128_000, maxOutputTokens: 8_192, costPer1kInput: 0.00055, costPer1kOutput: 0.00219, supportsTools: false, supportsStreaming: true, supportsVision: false, tier: 'standard', dataResidency: ['CN'] },
];

/**
 * Unified AI task type for all routing decisions.
 */
export type UnifiedAITask =
  | 'drug-interaction'
  | 'diagnosis-support'
  | 'prescription-review'
  | 'lab-interpretation'
  | 'translation'
  | 'summarization'
  | 'clinical-notes'
  | 'patient-education'
  | 'billing-codes'
  | 'scheduling'
  | 'referral-letter'
  | 'transcript-summary'
  | 'soap-generation'
  | 'icd-coding'
  | 'general';

/**
 * Configuration for a single task
 */
export interface TaskConfig {
  task: UnifiedAITask;
  primaryProvider: AIProviderType;
  fallbackProviders: AIProviderType[];
  preferLocal: boolean;
  estimatedLatency: 'fast' | 'medium' | 'slow';
  privacyLevel: 'local' | 'self-hosted' | 'cloud';
  estimatedCostPer1k: number;
  rationale: string;
}

/**
 * Unified task configuration
 */
export const UNIFIED_TASK_CONFIG: Record<UnifiedAITask, TaskConfig> = {
  'drug-interaction': {
    task: 'drug-interaction',
    primaryProvider: 'claude',
    fallbackProviders: ['openai', 'gemini'],
    preferLocal: false,
    estimatedLatency: 'medium',
    privacyLevel: 'cloud',
    estimatedCostPer1k: 0.015,
    rationale: 'Safety-critical: requires highest accuracy',
  },
  'diagnosis-support': {
    task: 'diagnosis-support',
    primaryProvider: 'claude',
    fallbackProviders: ['openai', 'gemini'],
    preferLocal: false,
    estimatedLatency: 'medium',
    privacyLevel: 'cloud',
    estimatedCostPer1k: 0.015,
    rationale: 'Critical: complex clinical reasoning',
  },
  'prescription-review': {
    task: 'prescription-review',
    primaryProvider: 'claude',
    fallbackProviders: ['openai', 'gemini'],
    preferLocal: false,
    estimatedLatency: 'medium',
    privacyLevel: 'cloud',
    estimatedCostPer1k: 0.015,
    rationale: 'Safety-critical: drug dosing accuracy',
  },
  'lab-interpretation': {
    task: 'lab-interpretation',
    primaryProvider: 'claude',
    fallbackProviders: ['openai', 'gemini'],
    preferLocal: false,
    estimatedLatency: 'medium',
    privacyLevel: 'cloud',
    estimatedCostPer1k: 0.015,
    rationale: 'Accuracy critical for abnormal values',
  },
  'translation': {
    task: 'translation',
    primaryProvider: 'gemini',
    fallbackProviders: ['mistral', 'deepseek', 'claude'],
    preferLocal: false,
    estimatedLatency: 'fast',
    privacyLevel: 'cloud',
    estimatedCostPer1k: 0.0001,
    rationale: 'High volume commodity task',
  },
  'summarization': {
    task: 'summarization',
    primaryProvider: 'gemini',
    fallbackProviders: ['mistral', 'deepseek', 'claude'],
    preferLocal: false,
    estimatedLatency: 'fast',
    privacyLevel: 'cloud',
    estimatedCostPer1k: 0.0001,
    rationale: 'Commodity task, cost-efficient',
  },
  'clinical-notes': {
    task: 'clinical-notes',
    primaryProvider: 'gemini',
    fallbackProviders: ['mistral', 'groq', 'claude'],
    preferLocal: false,
    estimatedLatency: 'fast',
    privacyLevel: 'cloud',
    estimatedCostPer1k: 0.0001,
    rationale: 'High volume, moderate complexity',
  },
  'patient-education': {
    task: 'patient-education',
    primaryProvider: 'gemini',
    fallbackProviders: ['mistral', 'claude'],
    preferLocal: false,
    estimatedLatency: 'fast',
    privacyLevel: 'cloud',
    estimatedCostPer1k: 0.0001,
    rationale: 'Template-based, cost-efficient',
  },
  'billing-codes': {
    task: 'billing-codes',
    primaryProvider: 'gemini',
    fallbackProviders: ['mistral', 'claude'],
    preferLocal: false,
    estimatedLatency: 'fast',
    privacyLevel: 'cloud',
    estimatedCostPer1k: 0.0001,
    rationale: 'Lookup-like, deterministic',
  },
  'scheduling': {
    task: 'scheduling',
    primaryProvider: 'gemini',
    fallbackProviders: ['groq', 'claude'],
    preferLocal: false,
    estimatedLatency: 'fast',
    privacyLevel: 'cloud',
    estimatedCostPer1k: 0.0001,
    rationale: 'Low stakes, high volume',
  },
  'referral-letter': {
    task: 'referral-letter',
    primaryProvider: 'gemini',
    fallbackProviders: ['mistral', 'claude', 'ollama'],
    preferLocal: false,
    estimatedLatency: 'fast',
    privacyLevel: 'cloud',
    estimatedCostPer1k: 0.0001,
    rationale: 'Template-based, low risk',
  },
  'transcript-summary': {
    task: 'transcript-summary',
    primaryProvider: 'ollama',
    fallbackProviders: ['deepseek', 'together', 'gemini'],
    preferLocal: true,
    estimatedLatency: 'fast',
    privacyLevel: 'local',
    estimatedCostPer1k: 0,
    rationale: 'Local inference preferred for privacy',
  },
  'soap-generation': {
    task: 'soap-generation',
    primaryProvider: 'claude',
    fallbackProviders: ['openai', 'gemini'],
    preferLocal: false,
    estimatedLatency: 'medium',
    privacyLevel: 'cloud',
    estimatedCostPer1k: 0.015,
    rationale: 'Complex clinical reasoning',
  },
  'icd-coding': {
    task: 'icd-coding',
    primaryProvider: 'together',
    fallbackProviders: ['deepseek', 'gemini'],
    preferLocal: false,
    estimatedLatency: 'medium',
    privacyLevel: 'cloud',
    estimatedCostPer1k: 0.0002,
    rationale: 'Medical domain fine-tuned model',
  },
  'general': {
    task: 'general',
    primaryProvider: 'gemini',
    fallbackProviders: ['groq', 'mistral', 'claude', 'ollama'],
    preferLocal: false,
    estimatedLatency: 'fast',
    privacyLevel: 'cloud',
    estimatedCostPer1k: 0.0001,
    rationale: 'Default cost-efficient option',
  },
};

export function getTaskConfig(task: UnifiedAITask): TaskConfig {
  return UNIFIED_TASK_CONFIG[task] || UNIFIED_TASK_CONFIG['general'];
}

export function isLocalPreferred(task: UnifiedAITask): boolean {
  return getTaskConfig(task).preferLocal;
}

export function getLocalPreferredTasks(): UnifiedAITask[] {
  return (Object.values(UNIFIED_TASK_CONFIG) as TaskConfig[])
    .filter((config) => config.preferLocal)
    .map((config) => config.task);
}
