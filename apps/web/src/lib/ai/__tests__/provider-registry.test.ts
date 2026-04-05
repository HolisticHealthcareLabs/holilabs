/**
 * Tests for Provider Governance Registry
 * Ensures registry stays aligned with AIProviderType and MODEL_CATALOG.
 */

import {
  PROVIDER_REGISTRY,
  getProviderGovernance,
  getAllProviders,
  getCloudProviders,
  getSelfHostedProviders,
} from '../provider-registry';
import { MODEL_CATALOG, type AIProviderType } from '../types';

const ALL_PROVIDER_IDS: AIProviderType[] = [
  'gemini', 'claude', 'openai', 'ollama', 'vllm', 'together',
  'groq', 'cerebras', 'mistral', 'deepseek',
];

describe('PROVIDER_REGISTRY', () => {
  it('has an entry for every AIProviderType', () => {
    const registryKeys = Object.keys(PROVIDER_REGISTRY).sort();
    // Registry uses 'anthropic' as key for 'claude' provider
    const expected = ALL_PROVIDER_IDS
      .map((id) => (id === 'claude' ? 'anthropic' : id))
      .sort();
    expect(registryKeys).toEqual(expected);
  });

  it('every entry has non-zero cost or is self-hosted', () => {
    for (const [key, entry] of Object.entries(PROVIDER_REGISTRY)) {
      if (entry.selfHosted) {
        expect(entry.costPer1kTokens.input).toBe(0);
        expect(entry.costPer1kTokens.output).toBe(0);
      } else {
        expect(entry.costPer1kTokens.input).toBeGreaterThan(0);
        expect(entry.costPer1kTokens.output).toBeGreaterThan(0);
      }
    }
  });

  it('every cloud provider requires de-identification', () => {
    for (const entry of getCloudProviders()) {
      expect(entry.requiresDeId).toBe(true);
    }
  });

  it('self-hosted providers do not require de-identification', () => {
    for (const entry of getSelfHostedProviders()) {
      expect(entry.requiresDeId).toBe(false);
    }
  });

  it('deepseek has CN data residency (RUTH flag)', () => {
    const ds = getProviderGovernance('deepseek');
    expect(ds).toBeDefined();
    expect(ds!.dataResidency).toContain('CN');
  });

  it('mistral has EU data residency (LGPD favorable)', () => {
    const m = getProviderGovernance('mistral');
    expect(m).toBeDefined();
    expect(m!.dataResidency).toContain('EU');
  });

  it('every MODEL_CATALOG provider has a registry entry', () => {
    const catalogProviders = [...new Set(MODEL_CATALOG.map((m) => m.provider))];
    for (const provider of catalogProviders) {
      const registryKey = provider === 'claude' ? 'anthropic' : provider;
      expect(PROVIDER_REGISTRY[registryKey]).toBeDefined();
    }
  });

  it('getAllProviders returns correct count', () => {
    expect(getAllProviders().length).toBe(Object.keys(PROVIDER_REGISTRY).length);
  });
});
