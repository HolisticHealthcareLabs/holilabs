/**
 * Tests for GET /api/dashboard/priority-patients
 *
 * - GET returns prioritized patient list sorted by urgency score
 * - GET filters patients by minScore parameter
 * - GET returns summary statistics with urgency breakdown
 * - GET returns empty data array when no patients are assigned
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

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    patient: { findMany: jest.fn() },
  },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

const prisma = require('@/lib/prisma').default;
const { GET } = require('../route');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

const makePatient = (overrides: Record<string, any> = {}) => ({
  id: 'patient-1',
  firstName: 'Jane',
  lastName: 'Doe',
  mrn: 'MRN001',
  tokenId: 'token-1',
  dateOfBirth: new Date('1980-05-15'),
  isActive: true,
  primaryCaregiverId: 'clinician-1',
  painAssessments: [],
  appointments: [],
  soapNotes: [],
  carePlans: [],
  ...overrides,
});

describe('GET /api/dashboard/priority-patients', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.patient.findMany as jest.Mock).mockResolvedValue([makePatient()]);
  });

  it('returns prioritized patient list with urgency scores', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/dashboard/priority-patients'
    );

    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeInstanceOf(Array);
    expect(data.data[0]).toHaveProperty('urgencyScore');
    expect(data.data[0]).toHaveProperty('urgencyReasons');
    expect(data.summary).toBeDefined();
  });

  it('returns summary statistics with urgency breakdown', async () => {
    (prisma.patient.findMany as jest.Mock).mockResolvedValue([
      makePatient({ id: 'p-1', painAssessments: [{ painScore: 9, assessedAt: new Date() }] }),
      makePatient({ id: 'p-2' }),
    ]);

    const request = new NextRequest(
      'http://localhost:3000/api/dashboard/priority-patients'
    );

    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(data.summary.totalPatients).toBeDefined();
    expect(data.summary.criticalUrgency).toBeDefined();
    expect(data.summary.highUrgency).toBeDefined();
    expect(data.generatedAt).toBeDefined();
  });

  it('filters patients by minScore query parameter', async () => {
    (prisma.patient.findMany as jest.Mock).mockResolvedValue([
      makePatient({ id: 'p-low' }),
      makePatient({ id: 'p-high', painAssessments: [{ painScore: 9, assessedAt: new Date() }] }),
    ]);

    const request = new NextRequest(
      'http://localhost:3000/api/dashboard/priority-patients?minScore=50'
    );

    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    data.data.forEach((p: any) => {
      expect(p.urgencyScore).toBeGreaterThanOrEqual(50);
    });
  });

  it('returns empty data array when no patients are assigned', async () => {
    (prisma.patient.findMany as jest.Mock).mockResolvedValue([]);

    const request = new NextRequest(
      'http://localhost:3000/api/dashboard/priority-patients'
    );

    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toEqual([]);
    expect(data.summary.totalPatients).toBe(0);
  });
});
