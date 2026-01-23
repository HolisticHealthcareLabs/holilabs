/**
 * Availability Cache Tests
 *
 * Tests for the provider availability caching and circuit breaker functionality.
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

// Mock fetch for health checks
const mockFetch = jest.fn();
global.fetch = mockFetch;

import {
  getProviderStatus,
  setProviderStatus,
  recordSuccess,
  recordFailure,
  checkProviderHealth,
  getAvailableProviders,
  getBestAvailableProvider,
  clearAvailabilityCache,
  getAllProviderStatuses,
  type ProviderStatus,
} from '../availability-cache';

describe('Availability Cache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();

    // Set environment variables for health checks
    process.env.GOOGLE_AI_API_KEY = 'test-gemini-key';
    process.env.ANTHROPIC_API_KEY = 'test-claude-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.UPSTASH_REDIS_REST_URL = 'https://test-redis.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
  });

  afterEach(async () => {
    // Clear cache between tests
    await clearAvailabilityCache();
  });

  describe('Provider Status Management', () => {
    it('should return null for uncached provider status', async () => {
      const status = await getProviderStatus('gemini');
      // With mocked Redis returning undefined, we get null
      expect(status).toBeNull();
    });

    it('should cache and retrieve provider status', async () => {
      const status: ProviderStatus = {
        provider: 'gemini',
        isAvailable: true,
        lastChecked: Date.now(),
        consecutiveFailures: 0,
        circuitState: 'closed',
        responseTimeMs: 150,
      };

      await setProviderStatus(status);

      // Status is stored in memory cache
      const retrieved = await getProviderStatus('gemini');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.provider).toBe('gemini');
      expect(retrieved?.isAvailable).toBe(true);
      expect(retrieved?.circuitState).toBe('closed');
    });

    it('should handle circuit state transitions (closed -> open)', async () => {
      const status: ProviderStatus = {
        provider: 'claude',
        isAvailable: false,
        lastChecked: Date.now(),
        consecutiveFailures: 5,
        circuitState: 'open',
        lastError: 'API error',
      };

      await setProviderStatus(status);

      const retrieved = await getProviderStatus('claude');
      expect(retrieved?.circuitState).toBe('open');
      expect(retrieved?.isAvailable).toBe(false);
    });

    it('should transition from open to half-open after reset timeout', async () => {
      // Set status with lastChecked in the past (beyond reset timeout)
      const pastTime = Date.now() - 60000; // 60 seconds ago
      const status: ProviderStatus = {
        provider: 'openai',
        isAvailable: false,
        lastChecked: pastTime,
        consecutiveFailures: 5,
        circuitState: 'open',
        lastError: 'API error',
      };

      await setProviderStatus(status);

      // Get status should trigger transition to half-open
      const retrieved = await getProviderStatus('openai', { resetTimeoutMs: 30000 });
      expect(retrieved?.circuitState).toBe('half-open');
      expect(retrieved?.isAvailable).toBe(true); // Allow one request through
    });
  });

  describe('Recording Success/Failure', () => {
    it('should record successful request', async () => {
      await recordSuccess('gemini', 200);

      const status = await getProviderStatus('gemini');
      expect(status).not.toBeNull();
      expect(status?.isAvailable).toBe(true);
      expect(status?.consecutiveFailures).toBe(0);
      expect(status?.circuitState).toBe('closed');
      expect(status?.responseTimeMs).toBe(200);
    });

    it('should record failed request', async () => {
      await recordFailure('claude', 'API rate limit exceeded');

      const status = await getProviderStatus('claude');
      expect(status).not.toBeNull();
      expect(status?.consecutiveFailures).toBe(1);
      expect(status?.lastError).toBe('API rate limit exceeded');
    });

    it('should open circuit after threshold failures', async () => {
      // Record multiple failures
      await recordFailure('openai', 'Error 1', { failureThreshold: 3 });
      await recordFailure('openai', 'Error 2', { failureThreshold: 3 });
      await recordFailure('openai', 'Error 3', { failureThreshold: 3 });

      const status = await getProviderStatus('openai');
      expect(status?.circuitState).toBe('open');
      expect(status?.isAvailable).toBe(false);
      expect(status?.consecutiveFailures).toBe(3);
    });

    it('should reset consecutive failures on success', async () => {
      // Record some failures
      await recordFailure('gemini', 'Error 1');
      await recordFailure('gemini', 'Error 2');

      let status = await getProviderStatus('gemini');
      expect(status?.consecutiveFailures).toBe(2);

      // Record success
      await recordSuccess('gemini', 100);

      status = await getProviderStatus('gemini');
      expect(status?.consecutiveFailures).toBe(0);
      expect(status?.circuitState).toBe('closed');
    });
  });

  describe('Health Checks', () => {
    it('should check Gemini health successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [] }),
      });

      const status = await checkProviderHealth('gemini');
      expect(status.isAvailable).toBe(true);
      expect(status.circuitState).toBe('closed');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('generativelanguage.googleapis.com'),
        expect.any(Object)
      );
    });

    it('should check Claude health successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ content: [{ text: 'hi' }] }),
      });

      const status = await checkProviderHealth('claude');
      expect(status.isAvailable).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': 'test-claude-key',
          }),
        })
      );
    });

    it('should check OpenAI health successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const status = await checkProviderHealth('openai');
      expect(status.isAvailable).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/models',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-openai-key',
          }),
        })
      );
    });

    it('should mark provider unavailable on health check failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const status = await checkProviderHealth('gemini');
      expect(status.isAvailable).toBe(false);
      expect(status.lastError).toBe('Health check failed');
    });

    it('should handle network errors during health check', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const status = await checkProviderHealth('claude');
      expect(status.isAvailable).toBe(false);
      expect(status.lastError).toBe('Network error');
    });

    it('should return unavailable if API key is missing', async () => {
      delete process.env.GOOGLE_AI_API_KEY;

      const status = await checkProviderHealth('gemini');
      expect(status.isAvailable).toBe(false);
    });
  });

  describe('Provider Selection', () => {
    it('should return all providers when none have cached status', async () => {
      const available = await getAvailableProviders();
      expect(available).toContain('gemini');
      expect(available).toContain('claude');
      expect(available).toContain('openai');
    });

    it('should exclude providers with open circuits', async () => {
      // Set gemini circuit to open
      await setProviderStatus({
        provider: 'gemini',
        isAvailable: false,
        lastChecked: Date.now(),
        consecutiveFailures: 5,
        circuitState: 'open',
      });

      const available = await getAvailableProviders();
      expect(available).not.toContain('gemini');
      expect(available).toContain('claude');
      expect(available).toContain('openai');
    });

    it('should return best available provider in preferred order', async () => {
      // All providers available
      const best = await getBestAvailableProvider(['gemini', 'claude', 'openai']);
      expect(best).toBe('gemini'); // First in preferred order

      // Set gemini circuit to open
      await setProviderStatus({
        provider: 'gemini',
        isAvailable: false,
        lastChecked: Date.now(),
        consecutiveFailures: 5,
        circuitState: 'open',
      });

      const bestAfterGeminiDown = await getBestAvailableProvider(['gemini', 'claude', 'openai']);
      expect(bestAfterGeminiDown).toBe('claude'); // Next available
    });

    it('should return primary provider if all circuits are open', async () => {
      // Set all circuits to open
      for (const provider of ['gemini', 'claude', 'openai'] as const) {
        await setProviderStatus({
          provider,
          isAvailable: false,
          lastChecked: Date.now(),
          consecutiveFailures: 5,
          circuitState: 'open',
        });
      }

      const best = await getBestAvailableProvider(['gemini', 'claude', 'openai']);
      expect(best).toBe('gemini'); // Returns first as last resort
    });
  });

  describe('All Provider Statuses', () => {
    it('should return status for all providers', async () => {
      await setProviderStatus({
        provider: 'gemini',
        isAvailable: true,
        lastChecked: Date.now(),
        consecutiveFailures: 0,
        circuitState: 'closed',
      });

      const statuses = await getAllProviderStatuses();
      expect(statuses.gemini).not.toBeNull();
      expect(statuses.claude).toBeNull(); // Not set
      expect(statuses.openai).toBeNull(); // Not set
    });
  });

  describe('Cache Clearing', () => {
    it('should clear all cached statuses', async () => {
      // Set some statuses
      await setProviderStatus({
        provider: 'gemini',
        isAvailable: true,
        lastChecked: Date.now(),
        consecutiveFailures: 0,
        circuitState: 'closed',
      });

      await setProviderStatus({
        provider: 'claude',
        isAvailable: true,
        lastChecked: Date.now(),
        consecutiveFailures: 0,
        circuitState: 'closed',
      });

      // Clear cache
      await clearAvailabilityCache();

      // Verify cleared
      const geminiStatus = await getProviderStatus('gemini');
      const claudeStatus = await getProviderStatus('claude');

      expect(geminiStatus).toBeNull();
      expect(claudeStatus).toBeNull();
    });
  });
});
