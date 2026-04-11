/**
 * Auto-Compact Pipeline Tests
 *
 * Validates context compression:
 * - Token estimation (~4 chars/token)
 * - MicroCompact: trims large tool results, preserves protected tools
 * - AutoCompact: summarizes history when over threshold
 * - Protected categories (CDSS, consent) are NEVER compacted
 * - Context window lookup per model
 */

import {
  estimateTokens,
  estimateConversationTokens,
  getContextWindow,
  defaultCompactionConfig,
  microCompact,
  autoCompact,
  MODEL_CONTEXT_WINDOWS,
} from '../auto-compact';
import type { CompactionConfig } from '@holi/shared-kernel/agent/types';
import { PROTECTED_COMPACTION_CATEGORIES } from '@holi/shared-kernel/agent/types';

type ChatMessage = { role: 'system' | 'user' | 'assistant' | 'tool'; content: string };

function makeConfig(overrides: Partial<CompactionConfig> = {}): CompactionConfig {
  return {
    tokenThreshold: 1000,
    contextWindowSize: 2000,
    protectedCategories: PROTECTED_COMPACTION_CATEGORIES,
    ...overrides,
  };
}

describe('Token Estimation', () => {
  it('estimates ~4 chars per token', () => {
    expect(estimateTokens('test')).toBe(1);
    expect(estimateTokens('twelve chars')).toBe(3);
  });

  it('estimates conversation tokens with message overhead', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' },
    ];
    const tokens = estimateConversationTokens(messages);
    // 4 overhead + ceil(5/4) + 4 overhead + ceil(8/4) = 4+2+4+2 = 12
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBe(12);
  });
});

describe('Context Window', () => {
  it('returns known model context windows', () => {
    expect(getContextWindow('claude-opus-4-20250514')).toBe(200_000);
    expect(getContextWindow('gpt-4o')).toBe(128_000);
    expect(getContextWindow('gemini-2.5-pro')).toBe(1_000_000);
  });

  it('defaults to 32k for unknown models', () => {
    expect(getContextWindow('unknown-model')).toBe(32_000);
  });

  it('generates default compaction config at 70% threshold', () => {
    const config = defaultCompactionConfig('claude-opus-4-20250514');
    expect(config.tokenThreshold).toBe(Math.floor(200_000 * 0.7));
    expect(config.contextWindowSize).toBe(200_000);
    expect(config.protectedCategories).toBe(PROTECTED_COMPACTION_CATEGORIES);
  });
});

describe('MicroCompact', () => {
  it('passes through small results unchanged', () => {
    const result = microCompact('get_patient', '{"id":"p1"}', makeConfig());
    expect(result).toBe('{"id":"p1"}');
  });

  it('truncates large text results', () => {
    const longText = 'x'.repeat(3000);
    const result = microCompact('get_report', longText, makeConfig());
    expect(result.length).toBeLessThan(longText.length);
    expect(result).toContain('truncated');
  });

  it('compacts large JSON arrays to first 5 items', () => {
    const items = Array.from({ length: 20 }, (_, i) => ({ id: i, name: `Patient-${i}`, data: 'x'.repeat(100) }));
    const json = JSON.stringify({ results: items });
    const result = microCompact('search_patients', json, makeConfig());
    const parsed = JSON.parse(result);
    expect(parsed.results.length).toBeLessThanOrEqual(6); // 5 items + "...N more" string
  });

  it('NEVER trims protected tools (CDSS, consent, audit)', () => {
    const hugeResult = JSON.stringify({ trafficLight: 'RED', details: 'x'.repeat(5000) });
    const cdssResult = microCompact('cdss_evaluate', hugeResult, makeConfig());
    expect(cdssResult).toBe(hugeResult);

    const consentResult = microCompact('consent_check', hugeResult, makeConfig());
    expect(consentResult).toBe(hugeResult);

    const auditResult = microCompact('audit_log', hugeResult, makeConfig());
    expect(auditResult).toBe(hugeResult);
  });
});

describe('AutoCompact', () => {
  it('does not compact when under threshold', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi' },
    ];
    const result = autoCompact(messages, makeConfig({ tokenThreshold: 10000 }));
    expect(result.compacted).toBe(false);
    expect(result.messages).toBe(messages);
  });

  it('compacts when over threshold, preserving last 6 messages', () => {
    const messages: ChatMessage[] = [];
    // Generate enough messages to exceed threshold
    for (let i = 0; i < 20; i++) {
      messages.push({ role: 'user', content: `Question ${i}: ${'x'.repeat(200)}` });
      messages.push({ role: 'assistant', content: `Answer ${i}: ${'y'.repeat(200)}` });
    }

    const result = autoCompact(messages, makeConfig({ tokenThreshold: 100 }));
    expect(result.compacted).toBe(true);
    expect(result.messages.length).toBeLessThan(messages.length);

    // Last 6 messages preserved verbatim
    const last6 = messages.slice(-6);
    const resultLast6 = result.messages.slice(-6);
    expect(resultLast6).toEqual(last6);
  });

  it('includes CONTEXT SUMMARY in compacted output', () => {
    const messages: ChatMessage[] = [];
    for (let i = 0; i < 20; i++) {
      messages.push({ role: 'user', content: `Question ${i}: ${'x'.repeat(200)}` });
      messages.push({ role: 'assistant', content: `Answer ${i}: ${'y'.repeat(200)}` });
    }

    const result = autoCompact(messages, makeConfig({ tokenThreshold: 100 }));
    const summaryMsg = result.messages.find(m => m.content.includes('CONTEXT SUMMARY'));
    expect(summaryMsg).toBeDefined();
  });

  it('preserves CDSS result messages during compaction', () => {
    const cdssResult = JSON.stringify({ trafficLight: 'RED', alert: 'Drug interaction' });
    const messages: ChatMessage[] = [
      { role: 'user', content: 'Check safety' },
      { role: 'tool', content: cdssResult },
      ...Array.from({ length: 20 }, (_, i) => ([
        { role: 'user' as const, content: `Q${i}: ${'x'.repeat(200)}` },
        { role: 'assistant' as const, content: `A${i}: ${'y'.repeat(200)}` },
      ])).flat(),
    ];

    const result = autoCompact(messages, makeConfig({ tokenThreshold: 100 }));
    expect(result.compacted).toBe(true);
    // The CDSS tool result should be preserved (protected category)
    const hasCdss = result.messages.some(m => m.content.includes('trafficLight'));
    expect(hasCdss).toBe(true);
  });

  it('preserves consent decision messages during compaction', () => {
    const consentResult = JSON.stringify({ consentGranted: true, type: 'clinical_data' });
    const messages: ChatMessage[] = [
      { role: 'user', content: 'Check consent' },
      { role: 'tool', content: consentResult },
      ...Array.from({ length: 20 }, (_, i) => ([
        { role: 'user' as const, content: `Q${i}: ${'x'.repeat(200)}` },
        { role: 'assistant' as const, content: `A${i}: ${'y'.repeat(200)}` },
      ])).flat(),
    ];

    const result = autoCompact(messages, makeConfig({ tokenThreshold: 100 }));
    expect(result.compacted).toBe(true);
    const hasConsent = result.messages.some(m => m.content.includes('consentGranted'));
    expect(hasConsent).toBe(true);
  });

  it('does not compact when only recent messages exist', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'x'.repeat(2000) },
      { role: 'assistant', content: 'y'.repeat(2000) },
    ];
    // Over threshold but only 2 messages (less than RECENT_KEEP)
    const result = autoCompact(messages, makeConfig({ tokenThreshold: 10 }));
    expect(result.compacted).toBe(false);
  });
});
