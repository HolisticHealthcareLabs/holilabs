import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/ehr', () => ({
  getConnectionStatus: jest.fn(),
  disconnectProvider: jest.fn(),
  getProviderConfig: jest.fn(),
  EhrProviderId: {},
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue({ id: 'a1' }),
  auditView: jest.fn(),
  auditCreate: jest.fn(),
}));

const { GET, DELETE } = require('../route');
const { getConnectionStatus, disconnectProvider, getProviderConfig } = require('@/lib/ehr');

const ctx = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  params: { provider: 'epic' },
};

const mockStatus = {
  isConnected: true,
  connectedAt: new Date('2026-03-01'),
  expiresAt: new Date('2026-04-01'),
};

const mockConfig = {
  displayName: 'Epic',
  logoUrl: 'https://logos.example.com/epic.png',
  environment: 'production',
};

beforeEach(() => {
  jest.clearAllMocks();
  (getConnectionStatus as jest.Mock).mockResolvedValue(mockStatus);
  (getProviderConfig as jest.Mock).mockReturnValue(mockConfig);
  (disconnectProvider as jest.Mock).mockResolvedValue(undefined);
});

describe('GET /api/ehr/[provider]', () => {
  it('returns connection status for a valid provider', async () => {
    const req = new NextRequest('http://localhost:3000/api/ehr/epic');
    const res = await GET(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.status.isConnected).toBe(true);
    expect(json.data.provider.id).toBe('epic');
    expect(json.data.provider.name).toBe('Epic');
  });

  it('returns 400 for an invalid provider', async () => {
    const req = new NextRequest('http://localhost:3000/api/ehr/unknown-ehr');
    const res = await GET(req, { ...ctx, params: { provider: 'unknown-ehr' } });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toMatch(/invalid provider/i);
  });
});

describe('DELETE /api/ehr/[provider]', () => {
  it('disconnects from a valid provider and returns success', async () => {
    const req = new NextRequest('http://localhost:3000/api/ehr/epic', { method: 'DELETE' });
    const res = await DELETE(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.message).toMatch(/epic/i);
    expect(disconnectProvider).toHaveBeenCalledWith('clinician-1', 'epic');
  });

  it('returns 400 when trying to disconnect an invalid provider', async () => {
    const req = new NextRequest('http://localhost:3000/api/ehr/bad-provider', { method: 'DELETE' });
    const res = await DELETE(req, { ...ctx, params: { provider: 'bad-provider' } });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
  });
});
