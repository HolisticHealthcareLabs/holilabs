import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/kpi', () => ({
  getOverrideReasons: jest.fn(),
  validateFilterState: jest.fn().mockImplementation((f: any) => f),
}));

const { GET } = require('../route');
const { getOverrideReasons, validateFilterState } = require('@/lib/kpi');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = {
  user: { id: 'clinician-1', role: 'CLINICIAN' },
  params: {},
};

const mockOverrideReasons = [
  { reason: 'Patient preference', count: 12, percentage: 40 },
  { reason: 'Clinical judgment', count: 9, percentage: 30 },
];

describe('GET /api/kpi/overrides', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (getOverrideReasons as jest.Mock).mockResolvedValue(mockOverrideReasons);
  });

  it('returns override reasons successfully', async () => {
    const req = new NextRequest('http://localhost:3000/api/kpi/overrides');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].reason).toBe('Patient preference');
  });

  it('passes date filters to getOverrideReasons', async () => {
    const req = new NextRequest('http://localhost:3000/api/kpi/overrides?startDate=2025-01-01&endDate=2025-03-01');
    await GET(req, mockContext);

    expect(validateFilterState).toHaveBeenCalledWith({
      startDate: '2025-01-01',
      endDate: '2025-03-01',
    });
    expect(getOverrideReasons).toHaveBeenCalled();
  });

  it('returns 500 when getOverrideReasons throws', async () => {
    (getOverrideReasons as jest.Mock).mockRejectedValue(new Error('DB error'));
    const req = new NextRequest('http://localhost:3000/api/kpi/overrides');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toContain('override reasons');
  });

  it('sets Cache-Control header in response', async () => {
    const req = new NextRequest('http://localhost:3000/api/kpi/overrides');
    const res = await GET(req, mockContext);

    expect(res.headers.get('Cache-Control')).toContain('max-age=60');
  });
});
