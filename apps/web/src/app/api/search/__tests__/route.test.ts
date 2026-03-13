/**
 * Tests for GET /api/search
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/search', () => ({
  search: jest.fn(),
}));

jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { GET } = require('../route');
const { search } = require('@/lib/search');
const { checkRateLimit } = require('@/lib/rate-limit');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

const mockResults = [
  { id: 'patient-1', type: 'patient', label: 'Maria Silva', url: '/patients/patient-1' },
  { id: 'apt-1', type: 'appointment', label: 'Checkup – 2025-06-15', url: '/appointments/apt-1' },
];

describe('GET /api/search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (checkRateLimit as jest.Mock).mockResolvedValue(null);
  });

  it('returns search results for a valid query', async () => {
    (search as jest.Mock).mockResolvedValue(mockResults);

    const req = new NextRequest('http://localhost:3000/api/search?q=maria');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.results).toHaveLength(2);
    expect(data.data.query).toBe('maria');
    expect(data.data.count).toBe(2);
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'maria', userId: 'clinician-1', userType: 'clinician' })
    );
  });

  it('returns 400 when query parameter is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/search');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('"q"');
    expect(search).not.toHaveBeenCalled();
  });

  it('blocks request when rate limit is exceeded', async () => {
    const rateLimitResponse = new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
    });
    (checkRateLimit as jest.Mock).mockResolvedValue(rateLimitResponse);

    const req = new NextRequest('http://localhost:3000/api/search?q=test');
    const res = await GET(req, mockContext);

    expect(res.status).toBe(429);
    expect(search).not.toHaveBeenCalled();
  });

  it('returns 500 when search library throws', async () => {
    (search as jest.Mock).mockRejectedValue(new Error('Search index unavailable'));

    const req = new NextRequest('http://localhost:3000/api/search?q=maria');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
  });
});
