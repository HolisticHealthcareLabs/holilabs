import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue({ id: 'a1' }),
}));

jest.mock('@/lib/demo/demo-patient-generator', () => ({
  createDemoPatient: jest.fn(),
}));

const { POST, GET } = require('../route');
const { createDemoPatient } = require('@/lib/demo/demo-patient-generator');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = {
  user: { id: 'clinician-1', email: 'clinician@holilabs.com', role: 'CLINICIAN' },
  params: {},
};

describe('POST /api/onboarding/demo-patient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (createDemoPatient as jest.Mock).mockResolvedValue({
      id: 'pat-demo-1',
      firstName: 'María',
      lastName: 'González',
    });
  });

  it('creates a demo patient for a valid scenario', async () => {
    const req = new NextRequest('http://localhost:3000/api/onboarding/demo-patient', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: 'diabetes' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.patient.id).toBe('pat-demo-1');
    expect(data.patient.scenario).toBe('diabetes');
  });

  it('returns 400 when scenario is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/onboarding/demo-patient', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('scenario');
  });

  it('returns 400 when scenario is invalid', async () => {
    const req = new NextRequest('http://localhost:3000/api/onboarding/demo-patient', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: 'cancer' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.validScenarios).toBeDefined();
  });

  it('calls createDemoPatient with correct userId and scenario', async () => {
    const req = new NextRequest('http://localhost:3000/api/onboarding/demo-patient', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: 'hypertension' }),
    });
    await POST(req, mockContext);

    expect(createDemoPatient).toHaveBeenCalledWith({
      userId: 'clinician-1',
      scenario: 'hypertension',
    });
  });
});

describe('GET /api/onboarding/demo-patient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('returns list of available scenarios', async () => {
    const req = new NextRequest('http://localhost:3000/api/onboarding/demo-patient');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.scenarios).toHaveLength(4);
    expect(data.scenarios.map((s: any) => s.id)).toContain('diabetes');
  });
});
