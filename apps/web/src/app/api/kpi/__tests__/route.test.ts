import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/kpi', () => ({
  getAllKPIs: jest.fn(),
  validateFilterState: jest.fn((f: any) => f),
  KPI_DICTIONARY: { revenue: { label: 'Revenue', unit: 'BRL' } },
}));

const { GET } = require('../route');
const { getAllKPIs } = require('@/lib/kpi');

const ctx = { user: { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' } };

const mockKpis = {
  revenue: { value: 50000, trend: 'up', delta: 12 },
  patients: { value: 320, trend: 'stable', delta: 0 },
};

describe('GET /api/kpi', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns KPI data', async () => {
    (getAllKPIs as jest.Mock).mockResolvedValue(mockKpis);

    const req = new NextRequest('http://localhost:3000/api/kpi');
    const res = await GET(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.revenue.value).toBe(50000);
    expect(json.patients.value).toBe(320);
  });

  it('includes definitions when requested', async () => {
    (getAllKPIs as jest.Mock).mockResolvedValue(mockKpis);

    const req = new NextRequest('http://localhost:3000/api/kpi?include=definitions');
    const res = await GET(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.kpis).toBeDefined();
    expect(json.definitions).toBeDefined();
    expect(json.definitions.revenue.label).toBe('Revenue');
  });

  it('passes date filters to getAllKPIs', async () => {
    (getAllKPIs as jest.Mock).mockResolvedValue(mockKpis);

    const req = new NextRequest(
      'http://localhost:3000/api/kpi?startDate=2025-01-01&endDate=2025-12-31'
    );
    await GET(req, ctx);

    const { validateFilterState } = require('@/lib/kpi');
    expect(validateFilterState).toHaveBeenCalledWith({
      startDate: '2025-01-01',
      endDate: '2025-12-31',
    });
  });
});
