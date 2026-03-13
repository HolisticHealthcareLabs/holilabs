import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  requirePatientAccess: () => jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findUnique: jest.fn() },
    riskScore: { findMany: jest.fn() },
    preventionPlan: { findMany: jest.fn() },
    screeningOutcome: { findMany: jest.fn() },
    preventionEncounterLink: { findMany: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn(),
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'doc-1', email: 'doc@test.com' },
  params: { patientId: 'patient-1' },
};

const mockPatient = {
  id: 'patient-1',
  firstName: 'Maria',
  lastName: 'Silva',
  dateOfBirth: new Date('1980-05-15'),
  gender: 'FEMALE',
  email: 'maria@test.com',
  phone: null,
  city: 'São Paulo',
  state: 'SP',
};

const mockRiskScore = {
  id: 'rs-1',
  riskType: 'ASCVD',
  score: 12.5,
  category: 'High',
  calculatedAt: new Date(),
  patientId: 'patient-1',
};

const mockScreeningOutcome = {
  id: 'so-1',
  screeningType: 'mammogram',
  patientId: 'patient-1',
  dueDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
  completedDate: null,
  scheduledDate: null,
  description: null,
};

describe('GET /api/prevention/hub/[patientId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Promise, 'allSettled').mockResolvedValue([
      { status: 'fulfilled', value: mockPatient },
      { status: 'fulfilled', value: [mockRiskScore] },
      { status: 'fulfilled', value: [] },
      { status: 'fulfilled', value: [mockScreeningOutcome] },
      { status: 'fulfilled', value: [] },
    ] as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns hub data including patient, risk scores, and interventions', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/hub/patient-1');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.patient.id).toBe('patient-1');
    expect(data.data.riskScores).toHaveLength(1);
    expect(data.data.riskScores[0].name).toBe('10-Year ASCVD Risk');
  });

  it('returns 400 when patientId is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/hub/');
    const res = await GET(req, { ...mockContext, params: {} });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Patient ID required');
  });

  it('returns 404 when patient not found', async () => {
    jest.spyOn(Promise, 'allSettled').mockResolvedValue([
      { status: 'fulfilled', value: null },
      { status: 'fulfilled', value: [] },
      { status: 'fulfilled', value: [] },
      { status: 'fulfilled', value: [] },
      { status: 'fulfilled', value: [] },
    ] as any);

    const req = new NextRequest('http://localhost:3000/api/prevention/hub/patient-1');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('Patient not found');
  });

  it('includes summary counts in response', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/hub/patient-1');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(data.data.summary).toMatchObject({
      overdueCount: expect.any(Number),
      dueCount: expect.any(Number),
      scheduledCount: expect.any(Number),
      completedCount: expect.any(Number),
      totalActive: expect.any(Number),
    });
  });
});
