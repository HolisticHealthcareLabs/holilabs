import { NextRequest } from 'next/server';

const mockCreate = jest.fn();
const MockAnthropic = jest.fn(() => ({
  messages: { create: mockCreate },
}));

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: MockAnthropic,
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { GET } = require('../route');

describe('GET /api/health/anthropic', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    MockAnthropic.mockImplementation(() => ({
      messages: { create: mockCreate },
    }));
    mockCreate.mockResolvedValue({
      id: 'msg-test',
      model: 'claude-sonnet-4-20250514',
      usage: { input_tokens: 5, output_tokens: 2 },
    });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns healthy when API key is configured and working', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.configured).toBe(true);
    expect(data.connected).toBe(true);
    expect(data.testResponse).toBeDefined();
  });

  it('returns error when API key is not configured', async () => {
    delete process.env.ANTHROPIC_API_KEY;

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.status).toBe('error');
    expect(data.configured).toBe(false);
  });
});
