/**
 * AI Router Tests
 *
 * Tests for smart routing with availability-aware provider selection.
 */

// Mock Redis before any imports
jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    keys: jest.fn().mockResolvedValue([]),
  })),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock the chat function
jest.mock('../chat', () => ({
  chat: jest.fn(),
  ClinicalSystemPrompts: {
    general: 'Test system prompt',
    differential: 'Differential prompt',
    drugInteractions: 'Drug interactions prompt',
    treatment: 'Treatment prompt',
  },
}));

import { routeAIRequest, AIRouter, type RouterConfig } from '../router';
import { setProviderStatus, clearAvailabilityCache } from '../availability-cache';

const { chat } = require('../chat');

describe('AI Router', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await clearAvailabilityCache();

    // Default successful response
    chat.mockResolvedValue({
      success: true,
      message: 'Test response',
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      },
    });
  });

  afterEach(async () => {
    await clearAvailabilityCache();
  });

  describe('Basic Routing', () => {
    it('should route simple queries to gemini by default', async () => {
      const response = await routeAIRequest({
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(response.success).toBe(true);
      expect(response.provider).toBe('gemini');
      expect(chat).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'gemini' })
      );
    });

    it('should route critical queries to claude', async () => {
      const response = await routeAIRequest(
        {
          messages: [{ role: 'user', content: 'Patient in emergency shock code blue' }],
        },
        { preferCheapest: false }
      );

      expect(response.success).toBe(true);
      expect(response.provider).toBe('claude');
    });

    it('should route complex queries to claude when not preferring cheapest', async () => {
      const response = await routeAIRequest(
        {
          messages: [{ role: 'user', content: 'Differential diagnosis for chronic fatigue with protocol guidelines' }],
        },
        { preferCheapest: false }
      );

      expect(response.success).toBe(true);
      expect(response.provider).toBe('claude');
    });

    it('should respect explicit provider selection', async () => {
      const response = await routeAIRequest({
        messages: [{ role: 'user', content: 'Simple question' }],
        provider: 'openai',
      });

      expect(response.success).toBe(true);
      expect(response.provider).toBe('openai');
      expect(chat).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'openai' })
      );
    });
  });

  describe('Complexity Analysis', () => {
    it('should classify short messages as simple', async () => {
      const response = await routeAIRequest({
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(response.routingMetadata?.complexity).toBe('simple');
    });

    it('should classify messages with critical keywords as critical', async () => {
      const response = await routeAIRequest(
        {
          messages: [{ role: 'user', content: 'Emergency! Patient has severe shock' }],
        },
        { preferCheapest: false }
      );

      expect(response.routingMetadata?.complexity).toBe('critical');
    });

    it('should classify messages with complex keywords as complex', async () => {
      const response = await routeAIRequest({
        messages: [{ role: 'user', content: 'Differential diagnosis for this case' }],
      });

      expect(response.routingMetadata?.complexity).toBe('complex');
    });

    it('should classify long conversations as complex', async () => {
      const response = await routeAIRequest({
        messages: [
          { role: 'user', content: 'Question 1' },
          { role: 'assistant', content: 'Answer 1' },
          { role: 'user', content: 'Question 2' },
          { role: 'assistant', content: 'Answer 2' },
          { role: 'user', content: 'Question 3' },
          { role: 'assistant', content: 'Answer 3' },
        ],
      });

      expect(response.routingMetadata?.complexity).toBe('complex');
    });
  });

  describe('Availability-Aware Routing', () => {
    it('should skip providers with open circuits', async () => {
      // Set gemini circuit to open
      await setProviderStatus({
        provider: 'gemini',
        isAvailable: false,
        lastChecked: Date.now(),
        consecutiveFailures: 5,
        circuitState: 'open',
      });

      const response = await routeAIRequest({
        messages: [{ role: 'user', content: 'Simple question' }],
      });

      // Should have routed to claude (next in fallback order)
      expect(response.provider).toBe('claude');
    });

    it('should fallback through providers on failure', async () => {
      // First call fails (gemini)
      chat
        .mockResolvedValueOnce({
          success: false,
          error: 'Gemini API error',
        })
        // Second call succeeds (claude)
        .mockResolvedValueOnce({
          success: true,
          message: 'Response from Claude',
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        });

      const response = await routeAIRequest({
        messages: [{ role: 'user', content: 'Test question' }],
      });

      expect(response.success).toBe(true);
      expect(response.provider).toBe('claude');
      expect(chat).toHaveBeenCalledTimes(2);
    });

    it('should record availability metrics on success', async () => {
      await routeAIRequest({
        messages: [{ role: 'user', content: 'Test' }],
      });

      // Check that provider status was updated
      const { getProviderStatus } = require('../availability-cache');
      const status = await getProviderStatus('gemini');

      expect(status).not.toBeNull();
      expect(status.isAvailable).toBe(true);
      expect(status.consecutiveFailures).toBe(0);
    });

    it('should record availability metrics on failure', async () => {
      chat.mockResolvedValue({
        success: false,
        error: 'API error',
      });

      await routeAIRequest({
        messages: [{ role: 'user', content: 'Test' }],
      });

      // Check that all providers have recorded failures
      const { getProviderStatus } = require('../availability-cache');

      // Note: All providers attempted and failed
      const geminiStatus = await getProviderStatus('gemini');
      expect(geminiStatus?.lastError).toBe('API error');
    });

    it('should disable availability cache when configured', async () => {
      // Set gemini circuit to open
      await setProviderStatus({
        provider: 'gemini',
        isAvailable: false,
        lastChecked: Date.now(),
        consecutiveFailures: 5,
        circuitState: 'open',
      });

      const response = await routeAIRequest(
        {
          messages: [{ role: 'user', content: 'Simple question' }],
        },
        { useAvailabilityCache: false }
      );

      // Should still use gemini (availability check disabled)
      expect(response.provider).toBe('gemini');
    });

    it('should allow half-open circuits for testing recovery', async () => {
      // Set gemini to half-open
      await setProviderStatus({
        provider: 'gemini',
        isAvailable: true, // Allow one request
        lastChecked: Date.now(),
        consecutiveFailures: 0,
        circuitState: 'half-open',
      });

      const response = await routeAIRequest({
        messages: [{ role: 'user', content: 'Test' }],
      });

      // Should use gemini (half-open allows requests)
      expect(response.provider).toBe('gemini');
    });
  });

  describe('Routing Metadata', () => {
    it('should include routing metadata in response', async () => {
      const response = await routeAIRequest({
        messages: [{ role: 'user', content: 'Test question' }],
      });

      expect(response.routingMetadata).toBeDefined();
      expect(response.routingMetadata?.complexity).toBe('simple');
      expect(response.routingMetadata?.estimatedCostCents).toBeGreaterThan(0);
      expect(response.routingMetadata?.responseTimeMs).toBeGreaterThanOrEqual(0);
      expect(response.routingMetadata?.usedFallback).toBe(false);
    });

    it('should indicate when fallback was used', async () => {
      chat
        .mockResolvedValueOnce({ success: false, error: 'Error' })
        .mockResolvedValueOnce({
          success: true,
          message: 'OK',
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        });

      const response = await routeAIRequest({
        messages: [{ role: 'user', content: 'Test' }],
      });

      expect(response.routingMetadata?.usedFallback).toBe(true);
    });
  });

  describe('AIRouter Helpers', () => {
    it('should route general queries via AIRouter.general', async () => {
      const response = await AIRouter.general([
        { role: 'user', content: 'General question' },
      ]);

      expect(response.provider).toBe('gemini');
    });

    it('should route differential queries via AIRouter.differential', async () => {
      const response = await AIRouter.differential([
        { role: 'user', content: 'Differential diagnosis needed' },
      ]);

      expect(response.provider).toBe('claude');
    });

    it('should route drug interaction queries via AIRouter.drugInteractions', async () => {
      const response = await AIRouter.drugInteractions([
        { role: 'user', content: 'Check drug interactions' },
      ]);

      expect(response.provider).toBe('claude');
    });

    it('should route treatment queries via AIRouter.treatment', async () => {
      const response = await AIRouter.treatment([
        { role: 'user', content: 'Treatment protocol' },
      ]);

      expect(response.provider).toBe('gemini');
    });

    it('should auto-route based on complexity via AIRouter.auto', async () => {
      const response = await AIRouter.auto([
        { role: 'user', content: 'Simple question' },
      ]);

      // Auto routing with default config prefers cheapest for non-critical
      expect(response.provider).toBe('gemini');
    });
  });

  describe('Cost Estimation', () => {
    it('should estimate costs correctly in metadata', async () => {
      const response = await routeAIRequest({
        messages: [{ role: 'user', content: 'Test' }],
      });

      // With 150 total tokens and gemini's rate
      // Cost should be low (gemini is cheapest)
      expect(response.routingMetadata?.estimatedCostCents).toBeLessThan(1);
    });
  });
});
