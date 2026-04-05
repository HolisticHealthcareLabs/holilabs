/**
 * Tests for AIProviderV2 interface + LegacyProviderAdapter
 * All data is synthetic — NO PHI
 */

import { LegacyProviderAdapter, type AIProvider } from '../provider-interface';

describe('LegacyProviderAdapter', () => {
  const mockGenerateResponse = jest.fn();
  const mockLegacy: AIProvider = {
    generateResponse: mockGenerateResponse,
  };

  let adapter: LegacyProviderAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateResponse.mockResolvedValue('legacy response');
    adapter = new LegacyProviderAdapter(mockLegacy, 'test-provider', 'test-model-v1');
  });

  it('exposes correct metadata', () => {
    expect(adapter.providerId).toBe('test-provider');
    expect(adapter.defaultModel).toBe('test-model-v1');
    expect(adapter.supportsStreaming).toBe(false);
    expect(adapter.supportsToolCalls).toBe(false);
    expect(adapter.supportsStructuredOutput).toBe(false);
  });

  it('delegates generateResponse to legacy provider', async () => {
    const result = await adapter.generateResponse('hello', { systemPrompt: 'sys' });
    expect(result).toBe('legacy response');
    expect(mockLegacy.generateResponse).toHaveBeenCalledWith('hello', { systemPrompt: 'sys' });
  });

  it('chat() extracts last user message and delegates', async () => {
    const response = await adapter.chat({
      messages: [
        { role: 'user', content: 'first' },
        { role: 'assistant', content: 'reply' },
        { role: 'user', content: 'second question' },
      ],
      systemPrompt: 'You are a helpful assistant',
    });

    expect(mockLegacy.generateResponse).toHaveBeenCalledWith(
      'second question',
      { systemPrompt: 'You are a helpful assistant' },
    );
    expect(response.content).toBe('legacy response');
    expect(response.finishReason).toBe('stop');
    expect(response.usage.totalTokens).toBe(0);
  });

  it('chat() handles empty messages gracefully', async () => {
    const response = await adapter.chat({ messages: [] });
    expect(mockLegacy.generateResponse).toHaveBeenCalledWith('', { systemPrompt: undefined });
    expect(response.content).toBe('legacy response');
  });

  it('does not expose stream()', () => {
    expect((adapter as any).stream).toBeUndefined();
  });
});
