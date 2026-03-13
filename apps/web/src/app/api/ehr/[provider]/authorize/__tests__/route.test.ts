import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue({ id: 'audit-1' }),
}));

jest.mock('@/lib/auth', () => ({
  getServerSession: jest.fn(),
  authOptions: {},
}));

jest.mock('@/lib/ehr', () => ({
  generateAuthorizationUrl: jest.fn(),
  isProviderConfigured: jest.fn(),
}));

const { GET } = require('../route');
const { getServerSession } = require('@/lib/auth');
const { generateAuthorizationUrl, isProviderConfigured } = require('@/lib/ehr');

function makeRequest(provider: string, query = '') {
  return new NextRequest(
    `http://localhost:3000/api/ehr/${provider}/authorize${query ? '?' + query : ''}`
  );
}

describe('GET /api/ehr/[provider]/authorize', () => {
  beforeEach(() => jest.clearAllMocks());

  it('redirects to authorization URL for valid provider (302)', async () => {
    (isProviderConfigured as jest.Mock).mockReturnValue(true);
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'clinician-1', email: 'dr@holilabs.com' },
    });
    (generateAuthorizationUrl as jest.Mock).mockResolvedValue({
      url: 'https://epic.example.com/authorize?state=abc',
      state: 'state-123',
    });

    const res = await GET(makeRequest('epic'), { params: { provider: 'epic' } });

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('epic.example.com/authorize');
  });

  it('returns 400 for invalid provider', async () => {
    const res = await GET(makeRequest('invalidehr'), {
      params: { provider: 'invalidehr' },
    });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/invalid provider/i);
  });

  it('returns 400 when provider is not configured', async () => {
    (isProviderConfigured as jest.Mock).mockReturnValue(false);

    const res = await GET(makeRequest('epic'), { params: { provider: 'epic' } });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/not configured/i);
  });

  it('returns 401 when user is not authenticated', async () => {
    (isProviderConfigured as jest.Mock).mockReturnValue(true);
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const res = await GET(makeRequest('epic'), { params: { provider: 'epic' } });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/not authenticated/i);
  });
});
