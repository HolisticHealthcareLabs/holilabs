import { NextRequest } from 'next/server';

jest.mock('@/lib/api/patient-portal-middleware', () => ({
  createPatientPortalRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findUnique: jest.fn() },
    preventionPlan: { findMany: jest.fn() },
    appointment: { findMany: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  session: { userId: 'pu-1', patientId: 'patient-1', email: 'patient@example.com' },
  requestId: 'req-1',
};

describe('GET /api/portal/prevention', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns prevention data with risk scores and plans', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({
      dateOfBirth: new Date('1975-06-15'),
      gender: 'MALE',
      cvdRiskScore: 12.5,
      diabetesRiskScore: 8,
      diabetesRiskDate: new Date(),
    });
    (prisma.preventionPlan.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);

    const res = await GET(new NextRequest('http://localhost:3000/api/portal/prevention'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.riskScores.length).toBeGreaterThanOrEqual(1);
    expect(data.riskScores[0].id).toBe('cvd');
  });

  it('returns 404 when patient not found', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await GET(new NextRequest('http://localhost:3000/api/portal/prevention'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
  });

  it('generates mock risk scores when no real scores exist', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({
      dateOfBirth: new Date('1975-06-15'),
      gender: 'MALE',
      cvdRiskScore: null,
      diabetesRiskScore: null,
      diabetesRiskDate: null,
    });
    (prisma.preventionPlan.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);

    const res = await GET(new NextRequest('http://localhost:3000/api/portal/prevention'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.riskScores.length).toBeGreaterThanOrEqual(1);
  });

  it('transforms prevention plans into interventions', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({
      dateOfBirth: new Date('1975-06-15'),
      gender: 'MALE',
      cvdRiskScore: 10,
      diabetesRiskScore: null,
      diabetesRiskDate: null,
    });
    (prisma.preventionPlan.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'plan-1',
        planName: 'CVD Plan',
        planType: 'CARDIOVASCULAR',
        status: 'ACTIVE',
        description: 'Heart health',
        evidenceLevel: 'A',
        followUpSchedule: { nextDate: new Date(Date.now() + 86400000 * 60).toISOString() },
        reviewedAt: null,
        completedAt: null,
        activatedAt: new Date(),
        updatedAt: new Date(),
        goals: [],
        recommendations: [],
        lifestyleChanges: null,
      },
    ]);
    (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);

    const res = await GET(new NextRequest('http://localhost:3000/api/portal/prevention'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.interventions.length).toBeGreaterThanOrEqual(1);
    expect(data.interventions[0].name).toBe('CVD Plan');
  });
});
