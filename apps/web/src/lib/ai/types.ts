/**
 * Unified AI Task Types and Configuration
 *
 * P2-005: Consolidates task types from router.ts and task-router.ts
 * into a single source of truth for AI routing.
 *
 * Previously:
 * - router.ts had ClinicalTask (kebab-case)
 * - task-router.ts had AITask (SCREAMING_SNAKE_CASE)
 * - factory.ts had its own task mapping
 *
 * Now: Single AITask type with unified configuration.
 */

/**
 * Unified AI provider types
 */
export type AIProviderType =
  | 'gemini' | 'claude' | 'openai'
  | 'ollama' | 'vllm' | 'together'
  | 'mistral' | 'groq' | 'cerebras' | 'deepseek';

// ── Provider V2 Request/Response Types ───────────────────────────────────────

export type ChatMessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMessage {
  role: ChatMessageRole;
  content: string;
  /** Present when role === 'tool' — the ID of the tool call this responds to. */
  toolCallId?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  /** JSON Schema describing the tool's parameters. */
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ProviderChatRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  tools?: ToolDefinition[];
  responseFormat?: 'text' | 'json';
  /** Provider-specific options (e.g., topP, topK). */
  extra?: Record<string, unknown>;
}

export interface ProviderChatResponse {
  content: string;
  toolCalls?: ToolCall[];
  usage: TokenUsage;
  model: string;
  finishReason: 'stop' | 'tool_calls' | 'length' | 'error';
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export type StreamChunkType = 'text_delta' | 'tool_call_delta' | 'usage' | 'done';

export interface ProviderStreamChunk {
  type: StreamChunkType;
  content?: string;
  toolCall?: Partial<ToolCall>;
  usage?: TokenUsage;
}

/** Static metadata for a model in the catalog. */
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
 *
 * Consolidates:
 * - ClinicalTask from router.ts (kebab-case)
 * - AITask from task-router.ts (SCREAMING_SNAKE_CASE)
 *
 * Uses kebab-case as the canonical format (more readable in logs/APIs).
 */
export type UnifiedAITask =
  // Safety-critical tasks → Claude (highest accuracy)
  | 'drug-interaction'      // Drug-drug, drug-food interactions
  | 'diagnosis-support'     // Differential diagnosis, clinical reasoning
  | 'prescription-review'   // Dosing, contraindications
  | 'lab-interpretation'    // Critical values, abnormal results

  // High-volume commodity tasks → Gemini (cost-efficient)
  | 'translation'           // Multi-language support
  | 'summarization'         // Document summarization
  | 'clinical-notes'        // SOAP notes, progress notes
  | 'patient-education'     // Educational materials
  | 'billing-codes'         // CPT, ICD lookup
  | 'scheduling'            // Appointment logic
  | 'referral-letter'       // Template-based letters

  // Specialized tasks → Domain-specific providers
  | 'transcript-summary'    // Local preferred (Ollama)
  | 'soap-generation'       // Complex reasoning (Claude)
  | 'icd-coding'            // Medical domain (Together/Meditron)

  // Default
  | 'general';              // Default routing

/**
 * Legacy AITask type from task-router.ts (SCREAMING_SNAKE_CASE)
 * @deprecated Use UnifiedAITask instead
 */
export type LegacyAITask =
  | 'TRANSCRIPT_SUMMARY'
  | 'SOAP_GENERATION'
  | 'DRUG_INTERACTION'
  | 'PRESCRIPTION_REVIEW'
  | 'ICD_CODING'
  | 'LAB_INTERPRETATION'
  | 'DIFFERENTIAL_DIAGNOSIS'
  | 'PATIENT_EDUCATION'
  | 'CLINICAL_NOTES'
  | 'TRANSLATION'
  | 'BILLING_CODES'
  | 'SCHEDULING'
  | 'REFERRAL_LETTER'
  | 'GENERAL';

/**
 * Configuration for a single task
 */
export interface TaskConfig {
  task: UnifiedAITask;
  primaryProvider: AIProviderType;
  fallbackProviders: AIProviderType[];
  /** If true, prefer local providers (Ollama/vLLM) when available */
  preferLocal: boolean;
  /** Estimated latency category */
  estimatedLatency: 'fast' | 'medium' | 'slow';
  /** Privacy level of the provider */
  privacyLevel: 'local' | 'self-hosted' | 'cloud';
  /** Estimated cost per 1k tokens in USD */
  estimatedCostPer1k: number;
  /** Human-readable rationale for this configuration */
  rationale: string;
}

/**
 * Unified task configuration
 *
 * Single source of truth for task-to-provider mappings.
 * Resolves divergences between router.ts and task-router.ts.
 */
export const UNIFIED_TASK_CONFIG: Record<UnifiedAITask, TaskConfig> = {
  // Safety-critical → Claude (highest accuracy), fallback: OpenAI, then Gemini
  'drug-interaction': {
    task: 'drug-interaction',
    primaryProvider: 'claude',
    fallbackProviders: ['openai', 'gemini'],
    preferLocal: false,
    estimatedLatency: 'medium',
    privacyLevel: 'cloud',
    estimatedCostPer1k: 0.015,
    rationale: 'Safety-critical: requires highest accuracy for drug interactions',
  },
  'diagnosis-support': {
    task: 'diagnosis-support',
    primaryProvider: 'claude',
    fallbackProviders: ['openai', 'gemini'],
    preferLocal: false,
    estimatedLatency: 'medium',
    privacyLevel: 'cloud',
    estimatedCostPer1k: 0.015,
    rationale: 'Critical: complex clinical reasoning requires highest quality',
  },
  'prescription-review': {
    task: 'prescription-review',
    primaryProvider: 'claude',
    fallbackProviders: ['openai', 'gemini'],
    preferLocal: false,
    estimatedLatency: 'medium',
    privacyLevel: 'cloud',
    estimatedCostPer1k: 0.015,
    rationale: 'Safety-critical: drug dosing accuracy is paramount',
  },
  'lab-interpretation': {
    task: 'lab-interpretation',
    primaryProvider: 'claude',
    fallbackProviders: ['openai', 'gemini'],
    preferLocal: false,
    estimatedLatency: 'medium',
    privacyLevel: 'cloud',
    estimatedCostPer1k: 0.015,
    rationale: 'Accuracy critical for abnormal/critical values',
  },

  // High-volume commodity → Gemini (cost-efficient), fallback: mistral (EU) → deepseek → claude
  'translation': {
    task: 'translation',
    primaryProvider: 'gemini',
    fallbackProviders: ['mistral', 'deepseek', 'claude'],
    preferLocal: false,
    estimatedLatency: 'fast',
    privacyLevel: 'cloud',
    estimatedCostPer1k: 0.0001,
    rationale: 'High volume commodity task, cost optimization priority',
  },
  'summarization': {
    task: 'summarization',
    primaryProvider: 'gemini',
    fallbackProviders: ['mistral', 'deepseek', 'claude'],
    preferLocal: false,
    estimatedLatency: 'fast',
    privacyLevel: 'cloud',
    estimatedCostPer1k: 0.0001,
    rationale: 'Commodity task, cost-efficient processing',
  },
  'clinical-notes': {
    task: 'clinical-notes',
    primaryProvider: 'gemini',
    fallbackProviders: ['mistral', 'groq', 'claude'],
    preferLocal: false,
    estimatedLatency: 'fast',
    privacyLevel: 'cloud',
    estimatedCostPer1k: 0.0001,
    rationale: 'High volume, moderate complexity, optimized for cost',
  },
  'patient-education': {
    task: 'patient-education',
    primaryProvider: 'gemini',
    fallbackProviders: ['mistral', 'claude'],
    preferLocal: false,
    estimatedLatency: 'fast',
    privacyLevel: 'cloud',
    estimatedCostPer1k: 0.0001,
    rationale: 'Template-based content, cost-efficient',
  },
  'billing-codes': {
    task: 'billing-codes',
    primaryProvider: 'gemini',
    fallbackProviders: ['mistral', 'claude'],
    preferLocal: false,
    estimatedLatency: 'fast',
    privacyLevel: 'cloud',
    estimatedCostPer1k: 0.0001,
    rationale: 'Lookup-like, deterministic, cost-efficient',
  },
  'scheduling': {
    task: 'scheduling',
    primaryProvider: 'gemini',
    fallbackProviders: ['groq', 'claude'],
    preferLocal: false,
    estimatedLatency: 'fast',
    privacyLevel: 'cloud',
    estimatedCostPer1k: 0.0001,
    rationale: 'Low stakes, high volume, cost-efficient',
  },
  'referral-letter': {
    task: 'referral-letter',
    primaryProvider: 'gemini',
    fallbackProviders: ['mistral', 'claude', 'ollama'],
    preferLocal: false,
    estimatedLatency: 'fast',
    privacyLevel: 'cloud',
    estimatedCostPer1k: 0.0001,
    rationale: 'Template-based, low risk, cost-efficient',
  },

  // Specialized tasks
  'transcript-summary': {
    task: 'transcript-summary',
    primaryProvider: 'ollama',
    fallbackProviders: ['deepseek', 'together', 'gemini'],
    preferLocal: true,
    estimatedLatency: 'fast',
    privacyLevel: 'local',
    estimatedCostPer1k: 0,
    rationale: 'Local inference preferred for privacy and speed; economy cloud fallbacks',
  },
  'soap-generation': {
    task: 'soap-generation',
    primaryProvider: 'claude',
    fallbackProviders: ['openai', 'gemini'],
    preferLocal: false,
    estimatedLatency: 'medium',
    privacyLevel: 'cloud',
    estimatedCostPer1k: 0.015,
    rationale: 'Complex clinical reasoning requires high accuracy',
  },
  'icd-coding': {
    task: 'icd-coding',
    primaryProvider: 'together',
    fallbackProviders: ['deepseek', 'gemini'],
    preferLocal: false,
    estimatedLatency: 'medium',
    privacyLevel: 'cloud',
    estimatedCostPer1k: 0.0002,
    rationale: 'Medical domain fine-tuned model (Meditron); economy cloud fallbacks',
  },

  // Default
  'general': {
    task: 'general',
    primaryProvider: 'gemini',
    fallbackProviders: ['groq', 'mistral', 'claude', 'ollama'],
    preferLocal: false,
    estimatedLatency: 'fast',
    privacyLevel: 'cloud',
    estimatedCostPer1k: 0.0001,
    rationale: 'Default cost-efficient option with broad fallback chain',
  },
};

/**
 * Map legacy SCREAMING_SNAKE_CASE task names to unified kebab-case
 */
export const LEGACY_TASK_MAP: Record<LegacyAITask, UnifiedAITask> = {
  'TRANSCRIPT_SUMMARY': 'transcript-summary',
  'SOAP_GENERATION': 'soap-generation',
  'DRUG_INTERACTION': 'drug-interaction',
  'PRESCRIPTION_REVIEW': 'prescription-review',
  'ICD_CODING': 'icd-coding',
  'LAB_INTERPRETATION': 'lab-interpretation',
  'DIFFERENTIAL_DIAGNOSIS': 'diagnosis-support',
  'PATIENT_EDUCATION': 'patient-education',
  'CLINICAL_NOTES': 'clinical-notes',
  'TRANSLATION': 'translation',
  'BILLING_CODES': 'billing-codes',
  'SCHEDULING': 'scheduling',
  'REFERRAL_LETTER': 'referral-letter',
  'GENERAL': 'general',
};

/**
 * Convert legacy task name to unified format
 */
export function normalizeTask(task: string): UnifiedAITask {
  // Check if it's a legacy SCREAMING_SNAKE_CASE task
  if (task in LEGACY_TASK_MAP) {
    return LEGACY_TASK_MAP[task as LegacyAITask];
  }
  // Check if it's already a unified task
  if (task in UNIFIED_TASK_CONFIG) {
    return task as UnifiedAITask;
  }
  // Default to general
  return 'general';
}

/**
 * Get task configuration
 */
export function getTaskConfig(task: string): TaskConfig {
  const normalizedTask = normalizeTask(task);
  return UNIFIED_TASK_CONFIG[normalizedTask];
}

/**
 * Get the primary provider for a task
 */
export function getProviderForTask(task: string): AIProviderType {
  return getTaskConfig(task).primaryProvider;
}

/**
 * Check if a task prefers local processing
 */
export function prefersLocalProvider(task: string): boolean {
  return getTaskConfig(task).preferLocal;
}

/**
 * List all tasks that require a specific provider
 */
export function getTasksForProvider(provider: AIProviderType): UnifiedAITask[] {
  return Object.values(UNIFIED_TASK_CONFIG)
    .filter((config) => config.primaryProvider === provider)
    .map((config) => config.task);
}

/**
 * List all safety-critical tasks (Claude-required)
 */
export function getSafetyCriticalTasks(): UnifiedAITask[] {
  return getTasksForProvider('claude');
}

/**
 * List all local-preferred tasks
 */
export function getLocalPreferredTasks(): UnifiedAITask[] {
  return Object.values(UNIFIED_TASK_CONFIG)
    .filter((config) => config.preferLocal)
    .map((config) => config.task);
}
