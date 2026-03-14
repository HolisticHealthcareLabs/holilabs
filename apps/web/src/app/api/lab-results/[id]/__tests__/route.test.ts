import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    labResult: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn().mockReturnValue(
    new (require('next/server').NextResponse)(JSON.stringify({ error: 'Error' }), { status: 500 })
  ),
}));

const { GET, PATCH, DELETE } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = (id: string) => ({
  user: { id: 'clinician-1', email: 'clinician@holilabs.com', role: 'CLINICIAN' },
  params: { id },
});

const mockLabResult = {
  id: 'lr-1',
  testName: 'HbA1c',
  patientId: 'pat-1',
  resultDate: new Date(),
  status: 'FINAL',
  isAbnormal: false,
  isCritical: false,
  patient: { id: 'pat-1', firstName: 'Ana', lastName: 'Lima', mrn: 'MRN001', dateOfBirth: new Date() },
  accessGrants: [],
};

describe('GET /api/lab-results/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.labResult.findUnique as jest.Mock).mockResolvedValue(mockLabResult);
  });

  it('returns lab result with patient data', async () => {
    const req = new NextRequest('http://localhost:3000/api/lab-results/lr-1');
    const res = await GET(req, mockContext('lr-1'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.testName).toBe('HbA1c');
    expect(data.data.patient).toBeDefined();
  });

  it('returns 404 when lab result not found', async () => {
    (prisma.labResult.findUnique as jest.Mock).mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/lab-results/nonexistent');
    const res = await GET(req, mockContext('nonexistent'));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toContain('not found');
  });
});

describe('PATCH /api/lab-results/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.labResult.findUnique as jest.Mock).mockResolvedValue(mockLabResult);
    (prisma.labResult.update as jest.Mock).mockResolvedValue({ ...mockLabResult, status: 'FINAL', isCritical: true });
  });

  it('updates lab result successfully', async () => {
    const req = new NextRequest('http://localhost:3000/api/lab-results/lr-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'FINAL', isCritical: true }),
    });
    const res = await PATCH(req, mockContext('lr-1'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.isCritical).toBe(true);
  });

  it('returns 404 when lab result not found', async () => {
    (prisma.labResult.findUnique as jest.Mock).mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/lab-results/nonexistent', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'FINAL' }),
    });
    const res = await PATCH(req, mockContext('nonexistent'));

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/lab-results/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.labResult.findUnique as jest.Mock).mockResolvedValue(mockLabResult);
    (prisma.labResult.delete as jest.Mock).mockResolvedValue(undefined);
  });

  it('deletes lab result successfully', async () => {
    const req = new NextRequest('http://localhost:3000/api/lab-results/lr-1', { method: 'DELETE' });
    const res = await DELETE(req, mockContext('lr-1'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('deleted');
  });

  it('returns 404 when lab result not found', async () => {
    (prisma.labResult.findUnique as jest.Mock).mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/lab-results/nonexistent', { method: 'DELETE' });
    const res = await DELETE(req, mockContext('nonexistent'));

    expect(res.status).toBe(404);
  });
});
