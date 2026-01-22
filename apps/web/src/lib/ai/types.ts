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
export type AIProviderType = 'gemini' | 'claude' | 'openai' | 'ollama' | 'vllm' | 'together';

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
  // Safety-critical → Claude (highest accuracy)
  'drug-interaction': {
    task: 'drug-interaction',
    primaryProvider: 'claude',
    fallbackProviders: ['gemini'],
    preferLocal: false,
    estimatedLatency: 'medium',
    privacyLevel: 'cloud',
    estimatedCostPer1k: 0.015,
    rationale: 'Safety-critical: requires highest accuracy for drug interactions',
  },
  'diagnosis-support': {
    task: 'diagnosis-support',
    primaryProvider: 'claude',
    fallbackProviders: ['gemini'],
    preferLocal: false,
    estimatedLatency: 'medium',
    privacyLevel: 'cloud',
    estimatedCostPer1k: 0.015,
    rationale: 'Critical: complex clinical reasoning requires highest quality',
  },
  'prescription-review': {
    task: 'prescription-review',
    primaryProvider: 'claude',
    fallbackProviders: ['gemini'],
    preferLocal: false,
    estimatedLatency: 'medium',
    privacyLevel: 'cloud',
    estimatedCostPer1k: 0.015,
    rationale: 'Safety-critical: drug dosing accuracy is paramount',
  },
  'lab-interpretation': {
    task: 'lab-interpretation',
    primaryProvider: 'claude',
    fallbackProviders: ['gemini'],
    preferLocal: false,
    estimatedLatency: 'medium',
    privacyLevel: 'cloud',
    estimatedCostPer1k: 0.015,
    rationale: 'Accuracy critical for abnormal/critical values',
  },

  // High-volume commodity → Gemini (cost-efficient)
  'translation': {
    task: 'translation',
    primaryProvider: 'gemini',
    fallbackProviders: ['claude', 'together'],
    preferLocal: false,
    estimatedLatency: 'fast',
    privacyLevel: 'cloud',
    estimatedCostPer1k: 0.0001,
    rationale: 'High volume commodity task, cost optimization priority',
  },
  'summarization': {
    task: 'summarization',
    primaryProvider: 'gemini',
    fallbackProviders: ['claude'],
    preferLocal: false,
    estimatedLatency: 'fast',
    privacyLevel: 'cloud',
    estimatedCostPer1k: 0.0001,
    rationale: 'Commodity task, cost-efficient processing',
  },
  'clinical-notes': {
    task: 'clinical-notes',
    primaryProvider: 'gemini',
    fallbackProviders: ['claude', 'ollama'],
    preferLocal: false,
    estimatedLatency: 'fast',
    privacyLevel: 'cloud',
    estimatedCostPer1k: 0.0001,
    rationale: 'High volume, moderate complexity, optimized for cost',
  },
  'patient-education': {
    task: 'patient-education',
    primaryProvider: 'gemini',
    fallbackProviders: ['claude'],
    preferLocal: false,
    estimatedLatency: 'fast',
    privacyLevel: 'cloud',
    estimatedCostPer1k: 0.0001,
    rationale: 'Template-based content, cost-efficient',
  },
  'billing-codes': {
    task: 'billing-codes',
    primaryProvider: 'gemini',
    fallbackProviders: ['claude'],
    preferLocal: false,
    estimatedLatency: 'fast',
    privacyLevel: 'cloud',
    estimatedCostPer1k: 0.0001,
    rationale: 'Lookup-like, deterministic, cost-efficient',
  },
  'scheduling': {
    task: 'scheduling',
    primaryProvider: 'gemini',
    fallbackProviders: ['claude'],
    preferLocal: false,
    estimatedLatency: 'fast',
    privacyLevel: 'cloud',
    estimatedCostPer1k: 0.0001,
    rationale: 'Low stakes, high volume, cost-efficient',
  },
  'referral-letter': {
    task: 'referral-letter',
    primaryProvider: 'gemini',
    fallbackProviders: ['claude', 'ollama'],
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
    fallbackProviders: ['gemini', 'claude'],
    preferLocal: true,
    estimatedLatency: 'fast',
    privacyLevel: 'local',
    estimatedCostPer1k: 0,
    rationale: 'Local inference preferred for privacy and speed',
  },
  'soap-generation': {
    task: 'soap-generation',
    primaryProvider: 'claude',
    fallbackProviders: ['gemini'],
    preferLocal: false,
    estimatedLatency: 'medium',
    privacyLevel: 'cloud',
    estimatedCostPer1k: 0.015,
    rationale: 'Complex clinical reasoning requires high accuracy',
  },
  'icd-coding': {
    task: 'icd-coding',
    primaryProvider: 'together',
    fallbackProviders: ['claude', 'gemini'],
    preferLocal: false,
    estimatedLatency: 'medium',
    privacyLevel: 'cloud',
    estimatedCostPer1k: 0.0002,
    rationale: 'Medical domain fine-tuned model (Meditron)',
  },

  // Default
  'general': {
    task: 'general',
    primaryProvider: 'gemini',
    fallbackProviders: ['claude', 'together', 'ollama'],
    preferLocal: false,
    estimatedLatency: 'fast',
    privacyLevel: 'cloud',
    estimatedCostPer1k: 0.0001,
    rationale: 'Default cost-efficient option',
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
