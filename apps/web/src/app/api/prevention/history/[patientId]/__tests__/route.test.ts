import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  requirePatientAccess: () => jest.fn(),
}));

jest.mock('@/lib/services/prevention-history.service', () => ({
  getPreventionHistoryService: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/audit', () => ({
  auditView: jest.fn(),
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn(),
}));

const { GET } = require('../route');
const { getPreventionHistoryService } = require('@/lib/services/prevention-history.service');

const mockContext = {
  user: { id: 'doc-1', email: 'doc@test.com' },
  params: { patientId: 'patient-1' },
};

const mockHistory = {
  versions: [
    { id: 'v1', planId: 'plan-1', versionNumber: 1, createdAt: new Date() },
  ],
  timeline: [
    { id: 't1', event: 'plan_created', timestamp: new Date() },
  ],
  compliance: { screeningsCompleted: 2, screeningsTotal: 5, complianceRate: 0.4 },
};

// Stable service mock object — same reference each test
const mockService = { getCompleteHistory: jest.fn() };

describe('GET /api/prevention/history/[patientId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-register after resetMocks clears the implementation
    (getPreventionHistoryService as jest.Mock).mockReturnValue(mockService);
  });

  it('returns complete prevention history for a patient', async () => {
    mockService.getCompleteHistory.mockResolvedValue(mockHistory);

    const req = new NextRequest('http://localhost:3000/api/prevention/history/patient-1');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.versions).toHaveLength(1);
    expect(data.data.timeline).toHaveLength(1);
    expect(data.meta.latencyMs).toBeDefined();
  });

  it('returns 400 when patientId is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/history/');
    const res = await GET(req, { ...mockContext, params: {} });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Patient ID is required');
  });

  it('passes optional planId filter to service', async () => {
    mockService.getCompleteHistory.mockResolvedValue(mockHistory);

    const req = new NextRequest('http://localhost:3000/api/prevention/history/patient-1?planId=plan-1');
    await GET(req, mockContext);

    expect(mockService.getCompleteHistory).toHaveBeenCalledWith('patient-1', 'plan-1');
  });

  it('returns 500 when service throws', async () => {
    mockService.getCompleteHistory.mockRejectedValue(new Error('DB error'));

    const req = new NextRequest('http://localhost:3000/api/prevention/history/patient-1');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Failed to fetch prevention history');
  });
});
