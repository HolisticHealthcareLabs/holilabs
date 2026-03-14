import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/ai/router', () => ({
  routeAIRequest: jest.fn(),
}));

jest.mock('@/lib/ai/cache', () => ({
  cacheHealthCheck: jest.fn(),
}));

jest.mock('@/lib/ai/usage-tracker', () => ({
  compareProviderCosts: jest.fn(),
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn(),
}));

const { GET } = require('../route');
const { routeAIRequest } = require('@/lib/ai/router');
const { cacheHealthCheck } = require('@/lib/ai/cache');
const { compareProviderCosts } = require('@/lib/ai/usage-tracker');
const { safeErrorResponse } = require('@/lib/api/safe-error-response');

const ctx = { user: { id: 'admin-1', role: 'ADMIN' } };

beforeEach(() => {
  jest.clearAllMocks();
  (safeErrorResponse as jest.Mock).mockImplementation((_err: unknown, opts: any) =>
    new Response(JSON.stringify({ error: opts?.userMessage || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  );
  (cacheHealthCheck as jest.Mock).mockResolvedValue({
    isHealthy: true,
    isConfigured: true,
    stats: { totalKeys: 42, estimatedSize: '1.2 MB' },
  });
  (routeAIRequest as jest.Mock).mockResolvedValue({
    success: true,
    provider: 'gemini',
    message: 'First-line treatment for hypertension includes...',
    usage: { totalTokens: 150 },
  });
  (compareProviderCosts as jest.Mock).mockReturnValue([
    { provider: 'gemini', costPer1kTokens: 0.00019 },
  ]);
});

describe('GET /api/ai/test', () => {
  it('returns full AI stack diagnostics on success', async () => {
    const req = new NextRequest('http://localhost:3000/api/ai/test');
    const res = await GET(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.cache.isHealthy).toBe(true);
    expect(json.simpleQuery.success).toBe(true);
    expect(json.simpleQuery.provider).toBe('gemini');
    expect(json.costAnalysis).toBeDefined();
    expect(json.environment).toBeDefined();
    expect(Array.isArray(json.recommendations)).toBe(true);
  });

  it('reports cache as unhealthy when check fails', async () => {
    (cacheHealthCheck as jest.Mock).mockResolvedValue({
      isHealthy: false,
      isConfigured: false,
      error: 'Redis unavailable',
    });

    const req = new NextRequest('http://localhost:3000/api/ai/test');
    const res = await GET(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.cache.isHealthy).toBe(false);
    expect(json.cache.error).toBe('Redis unavailable');
  });

  it('reports AI query failure when router returns error', async () => {
    (routeAIRequest as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Provider unavailable',
    });

    const req = new NextRequest('http://localhost:3000/api/ai/test');
    const res = await GET(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.simpleQuery.success).toBe(false);
    expect(json.simpleQuery.error).toBe('Provider unavailable');
  });

  it('returns 500 via safeErrorResponse when an exception is thrown', async () => {
    (cacheHealthCheck as jest.Mock).mockRejectedValue(new Error('Catastrophic failure'));

    const req = new NextRequest('http://localhost:3000/api/ai/test');
    const res = await GET(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBeDefined();
  });
});
