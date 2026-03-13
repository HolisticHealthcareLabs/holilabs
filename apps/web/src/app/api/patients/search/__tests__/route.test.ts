import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    userBehaviorEvent: { create: jest.fn() },
  },
}));

jest.mock('@/lib/search/meilisearch', () => ({
  searchPatients: jest.fn(),
  initializeMeilisearch: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/demo/synthetic', () => ({
  isDemoClinician: jest.fn().mockReturnValue(false),
  getSyntheticPatients: jest.fn(),
}));

jest.mock('@/lib/logger', () => {
  const mock = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
  return { __esModule: true, default: mock, logger: mock };
});

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn().mockImplementation((_err, opts) =>
    new (require('next/server').NextResponse)(JSON.stringify({ error: opts?.userMessage }), { status: 500 }),
  ),
}));

const { GET } = require('../route');
const { searchPatients } = require('@/lib/search/meilisearch');
const { isDemoClinician } = require('@/lib/demo/synthetic');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

describe('GET /api/patients/search', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns search results from Meilisearch', async () => {
    (searchPatients as jest.Mock).mockResolvedValue({
      hits: [{ id: 'p1', firstName: 'John' }],
      query: 'john',
      estimatedTotalHits: 1,
      limit: 20,
      offset: 0,
      processingTimeMs: 12,
    });

    const req = new NextRequest('http://localhost:3000/api/patients/search?q=john');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
  });

  it('returns 400 when limit exceeds 100', async () => {
    const req = new NextRequest('http://localhost:3000/api/patients/search?q=test&limit=200');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('Limit');
  });

  it('returns synthetic patients in demo mode', async () => {
    (isDemoClinician as jest.Mock).mockReturnValue(true);
    const { getSyntheticPatients } = require('@/lib/demo/synthetic');
    (getSyntheticPatients as jest.Mock).mockReturnValue([
      { firstName: 'Demo', lastName: 'Patient', mrn: 'MRN-1', isActive: true, isPalliativeCare: false, gender: 'M' },
    ]);

    const req = new NextRequest('http://localhost:3000/api/patients/search?q=demo');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 503 when Meilisearch is unavailable', async () => {
    const connErr = new Error('ECONNREFUSED');
    (connErr as any).code = 'ECONNREFUSED';
    (searchPatients as jest.Mock).mockRejectedValue(connErr);

    const req = new NextRequest('http://localhost:3000/api/patients/search?q=test');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data.error).toContain('Search service');
  });
});
