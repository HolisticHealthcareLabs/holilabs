/**
 * Tests for /api/pain-assessments
 *
 * - GET returns pain assessments for patient
 * - GET returns 400 when patientId missing
 * - POST creates new pain assessment
 * - POST returns 400 for invalid data
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
  prisma: {
    painAssessment: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    auditLog: { create: jest.fn().mockResolvedValue(undefined) },
  },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn().mockReturnValue(
    new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 })
  ),
}));

const { GET, POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

describe('GET /api/pain-assessments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('returns pain assessments for patient', async () => {
    (prisma.painAssessment.findMany as jest.Mock).mockResolvedValue([
      { id: 'pa-1', painScore: 5, assessedAt: new Date() },
      { id: 'pa-2', painScore: 3, assessedAt: new Date() },
    ]);

    const request = new NextRequest('http://localhost:3000/api/pain-assessments?patientId=patient-1');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(2);
    expect(data.stats.count).toBe(2);
    expect(data.stats.avgPainScore).toBe(4);
  });

  it('returns 400 when patientId missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/pain-assessments');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('patientId');
  });
});

describe('POST /api/pain-assessments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('creates new pain assessment', async () => {
    (prisma.painAssessment.create as jest.Mock).mockResolvedValue({
      id: 'pa-new',
      painScore: 6,
      patientId: 'clxxxxxxxxxxxxxxxxxxxxxxx',
    });

    const request = new NextRequest('http://localhost:3000/api/pain-assessments', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'clxxxxxxxxxxxxxxxxxxxxxxx',
        painScore: 6,
        quality: ['sharp'],
        aggravatingFactors: ['movement'],
        relievingFactors: ['rest'],
        interventionsGiven: ['ibuprofen'],
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.painScore).toBe(6);
  });

  it('returns 400 for invalid pain score', async () => {
    const request = new NextRequest('http://localhost:3000/api/pain-assessments', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'clxxxxxxxxxxxxxxxxxxxxxxx',
        painScore: 15,
        quality: [],
        aggravatingFactors: [],
        relievingFactors: [],
        interventionsGiven: [],
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Validation');
  });
});
