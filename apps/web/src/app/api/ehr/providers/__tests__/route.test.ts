import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/ehr', () => ({
  getAvailableProviders: jest.fn(),
  getAllConnectionStatuses: jest.fn(),
  isProviderConfigured: jest.fn(),
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue({ id: 'a1' }),
}));

const { GET } = require('../route');
const { getAvailableProviders, getAllConnectionStatuses, isProviderConfigured } = require('@/lib/ehr');

const ctx = { user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' } };

const mockProviders = [
  {
    id: 'epic',
    displayName: 'Epic',
    logoUrl: 'https://logos.example.com/epic.png',
    environment: 'production',
    launchTypes: ['standalone', 'ehr'],
    supportsRefreshToken: true,
    supportsBackendServices: false,
    requiresPKCE: true,
  },
  {
    id: 'cerner',
    displayName: 'Cerner',
    logoUrl: 'https://logos.example.com/cerner.png',
    environment: 'production',
    launchTypes: ['ehr'],
    supportsRefreshToken: true,
    supportsBackendServices: true,
    requiresPKCE: false,
  },
];

const mockStatuses = [
  { providerId: 'epic', isConnected: true, connectedAt: new Date('2026-03-01'), expiresAt: new Date('2026-04-01') },
];

beforeEach(() => {
  jest.clearAllMocks();
  (getAvailableProviders as jest.Mock).mockReturnValue(mockProviders);
  (getAllConnectionStatuses as jest.Mock).mockResolvedValue(mockStatuses);
  (isProviderConfigured as jest.Mock).mockReturnValue(true);
});

describe('GET /api/ehr/providers', () => {
  it('returns list of available EHR providers with their connection status', async () => {
    const req = new NextRequest('http://localhost:3000/api/ehr/providers');
    const res = await GET(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.providers).toHaveLength(2);
  });

  it('includes connection status for each provider', async () => {
    const req = new NextRequest('http://localhost:3000/api/ehr/providers');
    const res = await GET(req, ctx);
    const json = await res.json();

    const epic = json.data.providers.find((p: any) => p.id === 'epic');
    const cerner = json.data.providers.find((p: any) => p.id === 'cerner');

    expect(epic.isConnected).toBe(true);
    expect(cerner.isConnected).toBe(false);
  });

  it('includes capabilities for each provider', async () => {
    const req = new NextRequest('http://localhost:3000/api/ehr/providers');
    const res = await GET(req, ctx);
    const json = await res.json();

    const epic = json.data.providers.find((p: any) => p.id === 'epic');
    expect(epic.capabilities.requiresPKCE).toBe(true);
    expect(epic.capabilities.supportsRefreshToken).toBe(true);
  });

  it('returns empty providers list when no providers are available', async () => {
    (getAvailableProviders as jest.Mock).mockReturnValue([]);
    (getAllConnectionStatuses as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost:3000/api/ehr/providers');
    const res = await GET(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.providers).toHaveLength(0);
  });
});
