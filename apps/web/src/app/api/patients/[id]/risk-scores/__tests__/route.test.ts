import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findFirst: jest.fn() },
    riskScore: { findMany: jest.fn() },
  },
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  params: { id: 'patient-1' },
  requestId: 'req-1',
};

const mockScores = [
  {
    id: 'rs-1',
    riskType: 'CARDIOVASCULAR',
    algorithmVersion: '1.0',
    score: 12.5,
    scorePercentage: 12.5,
    category: 'HIGH',
    recommendation: 'Monitor BP',
    nextSteps: ['Schedule follow-up'],
    clinicalEvidence: { source: 'AHA' },
    calculatedAt: new Date(),
    expiresAt: new Date(Date.now() + 86400000 * 365),
  },
];

describe('GET /api/patients/[id]/risk-scores', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns risk scores for authorized clinician', async () => {
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue({ id: 'patient-1' });
    (prisma.riskScore.findMany as jest.Mock).mockResolvedValue(mockScores);

    const res = await GET(new NextRequest('http://localhost:3000/api/patients/patient-1/risk-scores'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.data[0].riskType).toBe('CARDIOVASCULAR');
  });

  it('returns empty array when no scores', async () => {
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue({ id: 'patient-1' });
    (prisma.riskScore.findMany as jest.Mock).mockResolvedValue([]);

    const res = await GET(new NextRequest('http://localhost:3000/api/patients/patient-1/risk-scores'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data).toEqual([]);
  });

  it('returns 400 when patient ID is missing', async () => {
    const ctx = { ...mockContext, params: {} };

    const res = await GET(new NextRequest('http://localhost:3000/api/patients//risk-scores'), ctx);
    const data = await res.json();

    expect(res.status).toBe(400);
  });

  it('returns 403 when access is denied', async () => {
    (verifyPatientAccess as jest.Mock).mockResolvedValue(false);

    const res = await GET(new NextRequest('http://localhost:3000/api/patients/patient-1/risk-scores'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(403);
  });

  it('returns 404 when patient not found', async () => {
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await GET(new NextRequest('http://localhost:3000/api/patients/patient-1/risk-scores'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
  });
});
