import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/enterprise/auth', () => ({
  validateEnterpriseKey: jest.fn(),
}));

jest.mock('@/services/outcome-tracker.service', () => ({
  outcomeTrackerService: {
    getOverrideOutcomeCorrelation: jest.fn(),
    getAllOutcomes: jest.fn(),
  },
}));

const { GET } = require('../route');
const { validateEnterpriseKey } = require('@/lib/enterprise/auth');
const { outcomeTrackerService } = require('@/services/outcome-tracker.service');

const makeUnauthorizedResponse = () =>
  new (require('next/server').NextResponse)(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

describe('GET /api/enterprise/outcomes/correlation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (validateEnterpriseKey as jest.Mock).mockReturnValue({ authorized: true });
    (outcomeTrackerService.getOverrideOutcomeCorrelation as jest.Mock).mockReturnValue({
      overrideRate: 0.12,
      outcomeImprovement: 0.08,
    });
    (outcomeTrackerService.getAllOutcomes as jest.Mock).mockReturnValue([
      { id: 'o1', recordedAt: '2025-03-01T00:00:00Z', outcomeType: 'IMPROVED' },
      { id: 'o2', recordedAt: '2025-02-28T00:00:00Z', outcomeType: 'RESOLVED' },
    ]);
  });

  it('returns correlation data for authorized key', async () => {
    const req = new NextRequest('http://localhost:3000/api/enterprise/outcomes/correlation', {
      headers: { 'x-pharma-partner-key': 'valid-key-123' },
    });
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.__format).toBe('enterprise_outcome_correlation_v1');
    expect(data.correlation).toBeDefined();
    expect(Array.isArray(data.outcomes)).toBe(true);
  });

  it('returns 401 when API key is invalid', async () => {
    (validateEnterpriseKey as jest.Mock).mockReturnValue({
      authorized: false,
      response: makeUnauthorizedResponse(),
    });
    const req = new NextRequest('http://localhost:3000/api/enterprise/outcomes/correlation');
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it('sorts outcomes newest first', async () => {
    const req = new NextRequest('http://localhost:3000/api/enterprise/outcomes/correlation', {
      headers: { 'x-pharma-partner-key': 'valid-key-123' },
    });
    const res = await GET(req);
    const data = await res.json();

    expect(data.outcomes[0].recordedAt >= data.outcomes[1].recordedAt).toBe(true);
  });

  it('includes meta with apiVersion', async () => {
    const req = new NextRequest('http://localhost:3000/api/enterprise/outcomes/correlation', {
      headers: { 'x-pharma-partner-key': 'valid-key-123' },
    });
    const res = await GET(req);
    const data = await res.json();

    expect(data.meta.apiVersion).toBe('1.0.0');
  });
});
