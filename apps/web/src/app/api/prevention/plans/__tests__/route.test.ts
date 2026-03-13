import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findUnique: jest.fn() },
    preventionPlan: { create: jest.fn(), findMany: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { POST, GET } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'doc-1', email: 'doc@test.com' },
};

const validProtocol = {
  id: 'proto-1',
  name: 'Cardiovascular Risk',
  description: 'Cardiovascular prevention protocol',
  conditionKey: 'cardiovascular',
  source: 'AHA',
  guidelineVersion: '2023',
  priority: 'HIGH',
  evidenceGrade: 'A',
  interventions: [
    { category: 'screening', intervention: 'Blood pressure check', evidence: 'Grade A', frequency: 'Annual' },
  ],
};

describe('POST /api/prevention/plans', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a prevention plan from a protocol', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({ id: 'p-1' });
    (prisma.preventionPlan.create as jest.Mock).mockResolvedValue({
      id: 'plan-1',
      planName: 'Cardiovascular Risk',
      planType: 'CARDIOVASCULAR',
      status: 'ACTIVE',
      guidelineSource: 'AHA 2023',
      createdAt: new Date(),
    });

    const req = new NextRequest('http://localhost:3000/api/prevention/plans', {
      method: 'POST',
      body: JSON.stringify({ patientId: 'p-1', protocol: validProtocol }),
    });

    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.planName).toBe('Cardiovascular Risk');
  });

  it('returns 400 for invalid schema', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/plans', {
      method: 'POST',
      body: JSON.stringify({ patientId: 'p-1' }),
    });

    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
  });

  it('returns 404 when patient not found', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/prevention/plans', {
      method: 'POST',
      body: JSON.stringify({ patientId: 'p-unknown', protocol: validProtocol }),
    });

    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toContain('Patient not found');
  });
});

describe('GET /api/prevention/plans', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns plans for a patient', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({ id: 'p-1' });
    (prisma.preventionPlan.findMany as jest.Mock).mockResolvedValue([
      { id: 'plan-1', status: 'ACTIVE', planName: 'CV Risk' },
      { id: 'plan-2', status: 'COMPLETED', planName: 'Diabetes' },
    ]);

    const res = await GET(new NextRequest('http://localhost:3000/api/prevention/plans?patientId=p-1'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.totalPlans).toBe(2);
    expect(data.data.activePlans).toBe(1);
  });

  it('returns 400 without patientId', async () => {
    const res = await GET(new NextRequest('http://localhost:3000/api/prevention/plans'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('patientId');
  });

  it('returns 404 when patient not found', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await GET(new NextRequest('http://localhost:3000/api/prevention/plans?patientId=p-unknown'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
  });
});
