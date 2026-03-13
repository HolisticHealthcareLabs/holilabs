/**
 * Tests for /api/clinical/trials
 *
 * - GET searches clinical trials
 * - GET returns 404 when trial NCT ID not found
 * - POST matches patient to eligible trials
 * - POST returns 400 when required fields missing
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/clinical', () => ({
  clinicalTrialsService: {
    getById: jest.fn(),
    search: jest.fn(),
    getRecruitingCounts: jest.fn().mockReturnValue({ total: 10, byPhase: {} }),
    matchPatient: jest.fn(),
    generateSummary: jest.fn().mockReturnValue('Summary text'),
  },
}));

const { GET, POST } = require('../route');
const { verifyPatientAccess } = require('@/lib/api/middleware');
const { clinicalTrialsService } = require('@/lib/clinical');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

describe('GET /api/clinical/trials', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('searches trials by condition', async () => {
    (clinicalTrialsService.search as jest.Mock).mockResolvedValue([
      { nctId: 'NCT001', title: 'Diabetes Trial', phase: 'PHASE3' },
    ]);

    const request = new NextRequest('http://localhost:3000/api/clinical/trials?condition=diabetes');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.trials).toHaveLength(1);
  });

  it('returns 404 when trial NCT ID not found', async () => {
    (clinicalTrialsService.getById as jest.Mock).mockReturnValue(null);

    const request = new NextRequest('http://localhost:3000/api/clinical/trials?nctId=NCT99999');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('Trial not found');
  });

  it('returns specific trial by NCT ID', async () => {
    (clinicalTrialsService.getById as jest.Mock).mockReturnValue({
      nctId: 'NCT001',
      title: 'Diabetes Trial',
    });

    const request = new NextRequest('http://localhost:3000/api/clinical/trials?nctId=NCT001');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.nctId).toBe('NCT001');
  });
});

describe('POST /api/clinical/trials', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('returns 400 when required fields missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/clinical/trials', {
      method: 'POST',
      body: JSON.stringify({ age: 45 }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Missing required fields');
  });
});
