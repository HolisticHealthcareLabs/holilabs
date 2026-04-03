import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/audit', () => ({ createAuditLog: jest.fn() }));

const mockSearchMessages = jest.fn();
jest.mock('@/lib/search/meilisearch', () => ({
  searchMessages: mockSearchMessages,
}));

const { GET } = require('../route');

const mockContext = {
  user: { id: 'doc-1', email: 'dr@test.com', role: 'CLINICIAN' },
};

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost:3000/api/messages/search');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

describe('GET /api/messages/search', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when query is missing', async () => {
    const res = await GET(makeRequest(), mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/search query/i);
  });

  it('returns search results with pagination', async () => {
    mockSearchMessages.mockResolvedValue({
      hits: [{ id: 'msg-1', body: 'lab results' }],
      estimatedTotalHits: 1,
      limit: 20,
      offset: 0,
      query: 'lab',
      processingTimeMs: 5,
    });

    const res = await GET(makeRequest({ q: 'lab' }), mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.messages).toHaveLength(1);
    expect(data.data.pagination.total).toBe(1);
  });

  it('returns 503 when Meilisearch is unavailable', async () => {
    mockSearchMessages.mockRejectedValue(new Error('MEILI connection refused'));

    const res = await GET(makeRequest({ q: 'test' }), mockContext);
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data.error).toMatch(/search service/i);
  });
});
