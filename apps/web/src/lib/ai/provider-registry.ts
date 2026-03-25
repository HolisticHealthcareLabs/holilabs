/**
 * Provider Governance Registry
 *
 * Central metadata for all supported LLM providers.
 * Used by the workspace LLM config route and CFO COGS dashboard.
 *
 * Each entry captures data-residency constraints, certification status,
 * cost-per-1k-tokens, and hosting model so that RUTH can enforce
 * data-sovereignty rules and GORDON can calculate per-provider COGS.
 */

export interface ProviderGovernance {
  id: string;
  displayName: string;
  requiresDeId: boolean;
  dataResidency: string[];
  certifications: string[];
  costPer1kTokens: { input: number; output: number };
  selfHosted: boolean;
  supportsStreaming: boolean;
}

export const PROVIDER_REGISTRY: Record<string, ProviderGovernance> = {
  anthropic: {
    id: 'anthropic',
    displayName: 'Anthropic Claude',
    requiresDeId: true,
    dataResidency: ['US'],
    certifications: ['SOC2', 'HIPAA BAA'],
    costPer1kTokens: { input: 0.003, output: 0.015 },
    selfHosted: false,
    supportsStreaming: true,
  },
  openai: {
    id: 'openai',
    displayName: 'OpenAI GPT',
    requiresDeId: true,
    dataResidency: ['US'],
    certifications: ['SOC2', 'HIPAA BAA'],
    costPer1kTokens: { input: 0.005, output: 0.015 },
    selfHosted: false,
    supportsStreaming: true,
  },
  gemini: {
    id: 'gemini',
    displayName: 'Google Gemini',
    requiresDeId: true,
    dataResidency: ['US', 'EU'],
    certifications: ['SOC2', 'HIPAA BAA', 'ISO 27001'],
    costPer1kTokens: { input: 0.00035, output: 0.00105 },
    selfHosted: false,
    supportsStreaming: true,
  },
  ollama: {
    id: 'ollama',
    displayName: 'Ollama (Local)',
    requiresDeId: false,
    dataResidency: ['LOCAL'],
    certifications: [],
    costPer1kTokens: { input: 0, output: 0 },
    selfHosted: true,
    supportsStreaming: true,
  },
  vllm: {
    id: 'vllm',
    displayName: 'vLLM (Self-Hosted)',
    requiresDeId: false,
    dataResidency: ['LOCAL'],
    certifications: [],
    costPer1kTokens: { input: 0, output: 0 },
    selfHosted: true,
    supportsStreaming: true,
  },
  together: {
    id: 'together',
    displayName: 'Together AI',
    requiresDeId: true,
    dataResidency: ['US'],
    certifications: ['SOC2'],
    costPer1kTokens: { input: 0.0008, output: 0.0008 },
    selfHosted: false,
    supportsStreaming: true,
  },
  groq: {
    id: 'groq',
    displayName: 'Groq',
    requiresDeId: true,
    dataResidency: ['US'],
    certifications: ['SOC2'],
    costPer1kTokens: { input: 0.00059, output: 0.00079 },
    selfHosted: false,
    supportsStreaming: true,
  },
  cerebras: {
    id: 'cerebras',
    displayName: 'Cerebras',
    requiresDeId: true,
    dataResidency: ['US'],
    certifications: [],
    costPer1kTokens: { input: 0.00085, output: 0.0012 },
    selfHosted: false,
    supportsStreaming: true,
  },
  mistral: {
    id: 'mistral',
    displayName: 'Mistral AI',
    requiresDeId: true,
    dataResidency: ['EU'],
    certifications: ['SOC2'],
    costPer1kTokens: { input: 0.002, output: 0.006 },
    selfHosted: false,
    supportsStreaming: true,
  },
  deepseek: {
    id: 'deepseek',
    displayName: 'DeepSeek',
    requiresDeId: true,
    dataResidency: ['CN'],
    certifications: [],
    costPer1kTokens: { input: 0.00014, output: 0.00028 },
    selfHosted: false,
    supportsStreaming: true,
  },
};

export function getProviderGovernance(providerId: string): ProviderGovernance | undefined {
  return PROVIDER_REGISTRY[providerId];
}

export function getAllProviders(): ProviderGovernance[] {
  return Object.values(PROVIDER_REGISTRY);
}

export function getCloudProviders(): ProviderGovernance[] {
  return getAllProviders().filter(p => !p.selfHosted);
}

export function getSelfHostedProviders(): ProviderGovernance[] {
  return getAllProviders().filter(p => p.selfHosted);
}
