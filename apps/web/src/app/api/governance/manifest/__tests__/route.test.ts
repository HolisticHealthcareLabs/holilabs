import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/governance/rules-manifest', () => ({
  RulesManifest: {
    getActiveManifest: jest.fn().mockReturnValue('v2.1.0'),
  },
}));

jest.mock('@/lib/clinical/governance-policy', () => ({
  getActiveContentBundle: jest.fn(),
  getActiveSignoffRecord: jest.fn(),
  getRuntimeContentStatus: jest.fn(),
}));

const { GET } = require('../route');
const { RulesManifest } = require('@/lib/governance/rules-manifest');
const { getActiveContentBundle, getActiveSignoffRecord, getRuntimeContentStatus } = require('@/lib/clinical/governance-policy');

const mockBundle = {
  contentBundleVersion: 'cbv-1',
  contentChecksum: 'abc123',
  protocolVersion: 'p-v2',
  lifecycleState: 'ACTIVE',
  signoffStatus: 'APPROVED',
  updatedAt: '2025-01-01T00:00:00Z',
};

const mockSignoff = {
  signedOffBy: 'Dr. Elena',
  role: 'CMO',
  signedOffAt: '2025-01-01T00:00:00Z',
  status: 'APPROVED',
  notes: null,
};

const mockContext = {
  user: { id: 'admin-1', email: 'admin@holilabs.com', role: 'ADMIN' },
  params: {},
};

describe('GET /api/governance/manifest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (RulesManifest.getActiveManifest as jest.Mock).mockReturnValue('v2.1.0');
    (getActiveContentBundle as jest.Mock).mockReturnValue(mockBundle);
    (getActiveSignoffRecord as jest.Mock).mockReturnValue(mockSignoff);
    (getRuntimeContentStatus as jest.Mock).mockReturnValue('VALID');
  });

  it('returns governance manifest with version and metric definitions', async () => {
    const req = new NextRequest('http://localhost:3000/api/governance/manifest');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.version).toBe('v2.1.0');
    expect(data.status).toBe('OPTIMAL');
    expect(data.metricDefinitions).toBeDefined();
  });

  it('includes content bundle and signoff data', async () => {
    const req = new NextRequest('http://localhost:3000/api/governance/manifest');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(data.contentBundle.contentBundleVersion).toBe('cbv-1');
    expect(data.signoff.signedOffBy).toBe('Dr. Elena');
  });

  it('reads filter params from query string', async () => {
    const req = new NextRequest('http://localhost:3000/api/governance/manifest?country=BR&site=SP');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(data.filters.country).toBe('BR');
    expect(data.filters.site).toBe('SP');
  });

  it('returns default filters when none are provided', async () => {
    const req = new NextRequest('http://localhost:3000/api/governance/manifest');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(data.filters.country).toBe('all');
    expect(data.filters.date).toBe('all');
  });
});
