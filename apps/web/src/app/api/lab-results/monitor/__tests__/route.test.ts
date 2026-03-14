import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue({ id: 'a1' }),
}));

jest.mock('@/lib/prevention/lab-result-monitors', () => ({
  monitorLabResult: jest.fn(),
}));

const { POST } = require('../route');
const { monitorLabResult } = require('@/lib/prevention/lab-result-monitors');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = {
  user: { id: 'clinician-1', email: 'clinician@holilabs.com', role: 'CLINICIAN' },
  params: {},
};

const validLabResult = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  patientId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567891',
  testName: 'HbA1c',
  loincCode: '4548-4',
  value: '8.5',
  unit: '%',
  flag: 'HIGH',
  observedAt: '2025-03-01T08:00:00.000Z',
};

describe('POST /api/lab-results/monitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (monitorLabResult as jest.Mock).mockResolvedValue({
      monitored: true,
      testType: 'METABOLIC',
      result: { preventionPlanCreated: true },
    });
  });

  it('monitors a valid lab result successfully', async () => {
    const req = new NextRequest('http://localhost:3000/api/lab-results/monitor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validLabResult),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.monitored).toBe(true);
    expect(data.data.result.preventionPlanCreated).toBe(true);
  });

  it('returns 400 when lab result fails validation', async () => {
    const req = new NextRequest('http://localhost:3000/api/lab-results/monitor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testName: 'HbA1c' }), // missing required fields
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('Invalid');
  });

  it('returns success even when no monitoring rule matched', async () => {
    (monitorLabResult as jest.Mock).mockResolvedValue({
      monitored: false,
      testType: null,
      result: null,
    });
    const req = new NextRequest('http://localhost:3000/api/lab-results/monitor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validLabResult),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.monitored).toBe(false);
  });

  it('returns 500 when monitorLabResult throws', async () => {
    (monitorLabResult as jest.Mock).mockRejectedValue(new Error('Monitor service down'));
    const req = new NextRequest('http://localhost:3000/api/lab-results/monitor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validLabResult),
    });
    const res = await POST(req, mockContext);

    expect(res.status).toBe(500);
  });
});
