import { NextRequest } from 'next/server';

jest.mock('@/lib/api/patient-portal-middleware', () => ({
  createPatientPortalRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    labResult: { findMany: jest.fn() },
  },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  session: { userId: 'pu-1', patientId: 'patient-1', email: 'p@test.com' },
  requestId: 'req-1',
};

const mockLabResult = {
  id: 'lr-1',
  testName: 'Hemoglobin',
  testCode: 'HGB',
  value: '14.5',
  unit: 'g/dL',
  referenceRange: '12.0-17.0',
  status: 'normal',
  resultDate: new Date('2024-01-15'),
  category: 'Hematology',
  notes: null,
};

describe('GET /api/portal/lab-results', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns lab results for authenticated patient', async () => {
    (prisma.labResult.findMany as jest.Mock).mockResolvedValue([mockLabResult]);

    const req = new NextRequest('http://localhost:3000/api/portal/lab-results');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.results).toHaveLength(1);
    expect(data.results[0].testName).toBe('Hemoglobin');
    expect(data.count).toBe(1);
  });

  it('parses reference range into min/max values', async () => {
    (prisma.labResult.findMany as jest.Mock).mockResolvedValue([mockLabResult]);

    const req = new NextRequest('http://localhost:3000/api/portal/lab-results');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(data.results[0].referenceMin).toBe(12);
    expect(data.results[0].referenceMax).toBe(17);
  });

  it('returns empty array when patient has no lab results', async () => {
    (prisma.labResult.findMany as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost:3000/api/portal/lab-results');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.results).toHaveLength(0);
    expect(data.count).toBe(0);
  });

  it('defaults missing fields with safe fallbacks', async () => {
    (prisma.labResult.findMany as jest.Mock).mockResolvedValue([
      { ...mockLabResult, testCode: null, unit: null, referenceRange: null, notes: null },
    ]);

    const req = new NextRequest('http://localhost:3000/api/portal/lab-results');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(data.results[0].testCode).toBe('N/A');
    expect(data.results[0].unit).toBe('');
  });
});
